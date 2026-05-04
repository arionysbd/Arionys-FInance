import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import { sendEmail } from '@/lib/mail';

// Reference the same global OTP store used by send-otp
const otpStore = global.__otpStore || (global.__otpStore = new Map());

export async function POST(req) {
  try {
    await dbConnect();
    const { name, email, password, otp } = await req.json();

    // --- OTP Verification ---
    const stored = otpStore.get(email);
    if (!stored) {
      return NextResponse.json({ success: false, message: 'No verification code found. Please request a new one.' }, { status: 400 });
    }
    if (Date.now() > stored.expires) {
      otpStore.delete(email);
      return NextResponse.json({ success: false, message: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }
    if (stored.code !== otp) {
      return NextResponse.json({ success: false, message: 'Invalid verification code.' }, { status: 400 });
    }
    // OTP is valid — clear it
    otpStore.delete(email);

    const userExists = await User.findOne({ email });
    if (userExists) {
      return NextResponse.json({ success: false, message: 'User already exists' }, { status: 400 });
    }

    // Check if it's the first user
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'admin' : 'accountant';

    const isActive = userCount === 0;

    const user = await User.create({
      name,
      email,
      password,
      role,
      isActive
    });

    if (!isActive) {
      try {
        const admins = await User.find({ role: 'admin' });
        for (const admin of admins) {
          await sendEmail({
            to: admin.email,
            subject: 'New User Pending Approval',
            text: `A new user named ${name} (${email}) has registered and is pending approval.`,
            html: `
              <div style="font-family: sans-serif; padding: 20px;">
                <h2 style="color: #2563eb;">New User Registration</h2>
                <p>A new user has registered and requires your approval:</p>
                <ul>
                  <li><strong>Name:</strong> ${name}</li>
                  <li><strong>Email:</strong> ${email}</li>
                </ul>
                <div style="margin-top: 20px;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin}/users" 
                     style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                    Review User
                  </a>
                </div>
              </div>
            `
          });
        }
      } catch (mailError) {
        console.error('Failed to send admin notification:', mailError);
      }
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    return NextResponse.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        token
      }
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
