import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { sendEmail } from '@/lib/mail';

export async function POST(req) {
  try {
    await dbConnect();
    const { name, email, role, adminId } = await req.json();

    // Verify the requester is an admin or owner
    const admin = await User.findById(adminId);
    if (!admin || !['admin', 'owner'].includes(admin.role)) {
      return NextResponse.json(
        { success: false, message: 'Only owners or administrators can invite users.' },
        { status: 403 }
      );
    }

    // Check if a user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'A user with this email already exists.' },
        { status: 400 }
      );
    }

    // Generate a strong random password
    const generatedPassword = crypto.randomBytes(8).toString('hex');

    // Create the user
    const user = await User.create({
      name,
      email,
      password: generatedPassword,
      role: role || 'accountant',
      isActive: true,
      companyId: admin.companyId,
    });

    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin}/login`;

    // Send the email with credentials
    await sendEmail({
      to: email,
      subject: 'You\'ve Been Invited to Arionys Finance',
      text: `Hello ${name},\n\nYou have been invited to join Arionys Finance. Your account has been created.\n\nLogin Email: ${email}\nPassword: ${generatedPassword}\n\nPlease login at: ${loginUrl}`,
      html: `
        <div style="font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto;">
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background: #0f172a; padding: 28px 32px;">
              <h1 style="margin: 0; font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em;">Arionys Finance</h1>
            </div>
            <div style="padding: 32px;">
              <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 800; color: #0f172a;">You're Invited</h2>
              <p style="margin: 0 0 24px; font-size: 14px; color: #64748b; line-height: 1.6;">
                Hello <strong>${name}</strong>, you have been invited to join Arionys Finance as <strong>${role}</strong>.
              </p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
                  Your Login Credentials:
                </p>
                <p style="margin: 0 0 4px; font-size: 14px; color: #0f172a;">
                  <strong>Email:</strong> ${email}
                </p>
                <p style="margin: 0; font-size: 14px; color: #0f172a;">
                  <strong>Password:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${generatedPassword}</span>
                </p>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${loginUrl}" 
                   style="display: inline-block; background: #0f172a; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px;">
                  Log In Now
                </a>
              </div>
            </div>
          </div>
        </div>
      `
    });

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}`,
      data: { _id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive }
    }, { status: 201 });

  } catch (error) {
    console.error('Invite user error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
