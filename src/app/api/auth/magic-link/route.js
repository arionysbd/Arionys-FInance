import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import { sendEmail } from '@/lib/mail';

export async function POST(req) {
  try {
    await dbConnect();
    const { email } = await req.json();
    const genericReply = NextResponse.json({ success: true, message: 'If an account exists for this email, a sign-in link has been sent.' });
    if (!email) return genericReply;

    // Same reply whether or not the account exists, so emails can't be probed
    const escaped = String(email).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({ email: new RegExp(`^${escaped}$`, 'i') });
    if (!user || user.isActive === false) return genericReply;

    // Generate a 15-minute token
    const token = jwt.sign(
      { id: user._id, email: user.email, purpose: 'magic-link' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const magicLink = `${appUrl}/verify?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: 'Secure Sign In - Arionys Finance',
      text: `Sign in to Arionys Finance by clicking this link: ${magicLink}`,
      html: `
        <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0f172a; font-size: 28px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">Arionys<span style="color: #2563eb;">Finance</span></h1>
          </div>
          
          <div style="background-color: #f8fafc; border-radius: 16px; padding: 40px 30px; text-align: center; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
            <h2 style="color: #1e293b; font-size: 22px; margin-top: 0; margin-bottom: 16px; font-weight: 700;">Secure Sign In</h2>
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
              Click the button below to securely sign in to your account. This link will expire in <strong>15 minutes</strong> for your security.
            </p>
            
            <a href="${magicLink}" style="background-color: #2563eb; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
              Sign In to Dashboard
            </a>
            
            <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e2e8f0; text-align: left;">
              <p style="color: #64748b; font-size: 14px; margin-bottom: 8px; font-weight: 500;">Button not working? Copy and paste this link into your browser:</p>
              <a href="${magicLink}" style="color: #2563eb; font-size: 14px; word-break: break-all; text-decoration: underline; line-height: 1.5;">
                ${magicLink}
              </a>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 32px;">
            <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
              If you didn't request this sign-in link, you can safely ignore this email.<br>No changes have been made to your account.
            </p>
            <p style="color: #94a3b8; font-size: 13px; margin: 0;">
              &copy; ${new Date().getFullYear()} Arionys Finance. All rights reserved.
            </p>
          </div>
        </div>
      `
    });

    return NextResponse.json({ success: true, message: 'Magic link sent to your email' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
