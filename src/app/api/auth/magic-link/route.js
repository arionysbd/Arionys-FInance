import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import { sendEmail } from '@/lib/mail';

export async function POST(req) {
  try {
    await dbConnect();
    const { email } = await req.json();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Generate a 15-minute token
    const token = jwt.sign(
      { id: user._id, email: user.email, purpose: 'magic-link' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const magicLink = `${appUrl}/verify?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: 'Your Arionys Finance Magic Link',
      text: `Click here to sign in to Arionys Finance: ${magicLink}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; text-align: center;">
          <h2 style="color: #2563eb;">Sign in to Arionys Finance</h2>
          <p>Click the button below to securely sign in to your account. This link expires in 15 minutes.</p>
          <div style="margin-top: 30px;">
            <a href="${magicLink}" 
               style="background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block;">
              Sign In Now
            </a>
          </div>
          <p style="margin-top: 30px; color: #64748b; font-size: 0.875rem;">
            If you didn't request this link, you can safely ignore this email.
          </p>
        </div>
      `
    });

    return NextResponse.json({ success: true, message: 'Magic link sent to your email' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
