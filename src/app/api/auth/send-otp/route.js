import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { queueEmail } from '@/lib/mail';

// In-memory OTP store (sufficient for single-instance deployments)
// In production, consider using Redis or a DB collection with TTL
const otpStore = global.__otpStore || (global.__otpStore = new Map());

export async function POST(req) {
  try {
    await dbConnect();
    const { email, name } = await req.json();

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email is required.' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ success: false, message: 'This email is already registered.' }, { status: 400 });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with 10-minute expiry
    otpStore.set(email, {
      code: otp,
      expires: Date.now() + 10 * 60 * 1000,
      name: name || ''
    });

    // Send OTP email
    queueEmail({
      to: email,
      subject: 'Arionys Finance — Verification Code',
      text: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
      html: `
        <div style="font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto;">
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background: #0f172a; padding: 28px 32px;">
              <h1 style="margin: 0; font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em;">Arionys Finance</h1>
            </div>
            <div style="padding: 32px;">
              <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 800; color: #0f172a;">Verification Code</h2>
              <p style="margin: 0 0 24px; font-size: 14px; color: #64748b; line-height: 1.6;">
                Use the following code to verify your email address and complete your registration.
              </p>
              <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 36px; font-weight: 900; color: #0f172a; letter-spacing: 8px; font-family: monospace;">
                  ${otp}
                </span>
              </div>
              <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
                This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
              </p>
            </div>
          </div>
        </div>
      `
    });

    return NextResponse.json({ success: true, message: 'Verification code sent.' });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
