import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { sendEmail } from '@/lib/mail';

export async function POST(req) {
  try {
    await dbConnect();
    const { userId } = await req.json();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // In a real app, you'd generate a token. For now, we'll send a direct reset link.
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`; // Redirecting to login for now

    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      text: `Hello ${user.name}, you requested a password reset. Please contact your system administrator to proceed or visit ${resetUrl}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #2563eb;">Password Reset Requested</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>You (or someone else) requested a password reset for your Arionys Finance account.</p>
          <p>Since you are currently logged in, you can change your password directly in the Settings page. If you have been locked out, please contact the System Administrator to manually reset your credentials.</p>
          <div style="margin-top: 30px;">
            <a href="${resetUrl}" 
               style="background: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Return to Login
            </a>
          </div>
          <p style="margin-top: 20px; font-size: 0.8rem; color: #64748b;">If you did not request this, please ignore this email.</p>
        </div>
      `
    });

    return NextResponse.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
