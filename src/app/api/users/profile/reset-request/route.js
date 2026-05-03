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
      subject: 'Password Reset Request - Arionys Finance',
      text: `Hello ${user.name}, you requested a password reset. Please contact your system administrator to proceed or visit ${resetUrl}`,
      html: `
        <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0f172a; font-size: 28px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">Arionys<span style="color: #2563eb;">Finance</span></h1>
          </div>
          
          <div style="background-color: #f8fafc; border-radius: 16px; padding: 40px 30px; text-align: center; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
            <h2 style="color: #1e293b; font-size: 22px; margin-top: 0; margin-bottom: 16px; font-weight: 700;">Password Reset Requested</h2>
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">Hello <strong>${user.name}</strong>,</p>
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
              You (or someone else) requested a password reset for your Arionys Finance account. If you are currently logged in, you can change your password directly in the Settings page. Otherwise, return to the login screen to sign in.
            </p>
            
            <a href="${resetUrl}" style="background-color: #0f172a; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
              Return to Login
            </a>
            
            <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e2e8f0; text-align: left;">
              <p style="color: #64748b; font-size: 14px; margin-bottom: 8px; font-weight: 500;">Button not working? Copy and paste this link into your browser:</p>
              <a href="${resetUrl}" style="color: #2563eb; font-size: 14px; word-break: break-all; text-decoration: underline; line-height: 1.5;">
                ${resetUrl}
              </a>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 32px;">
            <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
              If you did not request this, please safely ignore this email.<br>No changes have been made to your credentials.
            </p>
            <p style="color: #94a3b8; font-size: 13px; margin: 0;">
              &copy; ${new Date().getFullYear()} Arionys Finance. All rights reserved.
            </p>
          </div>
        </div>
      `
    });

    return NextResponse.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
