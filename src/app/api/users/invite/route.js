import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { queueEmail } from '@/lib/mail';
import { getAuthUser, unauthorized } from '@/lib/auth';
import { hasPermission, DEFAULT_PERMISSIONS } from '@/lib/permissions';

export async function POST(req) {
  try {
    await dbConnect();

    // Verify the requester is an authenticated admin
    const admin = await getAuthUser(req);
    if (!admin) return unauthorized();

    const { name, email } = await req.json();
    const permissions = DEFAULT_PERMISSIONS;

    if (!hasPermission(admin, 'manage_employees')) {
      return NextResponse.json(
        { success: false, message: 'You do not have access to invite users.' },
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

    // Generate a secure invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create the user without a password — they'll set it on confirmation
    const user = await User.create({
      name,
      email,
      role: 'member',
      permissions,
      isActive: false,
      companyId: admin.companyId,
      inviteToken,
      inviteExpires,
    });

    // Build the confirmation link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const confirmUrl = `${baseUrl}/invite/confirm?token=${inviteToken}`;

    // Send the confirmation email
    queueEmail({
      to: email,
      subject: 'You\'ve Been Invited to Arionys Finance',
      text: `Hello ${name},\n\nYou have been invited to join Arionys Finance. Please click the link below to set your password and activate your account:\n\n${confirmUrl}\n\nThis link will expire in 7 days.`,
      html: `
        <div style="font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto;">
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background: #0f172a; padding: 28px 32px;">
              <h1 style="margin: 0; font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em;">Arionys Finance</h1>
            </div>
            <div style="padding: 32px;">
              <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 800; color: #0f172a;">You're Invited</h2>
              <p style="margin: 0 0 24px; font-size: 14px; color: #64748b; line-height: 1.6;">
                Hello <strong>${name}</strong>, you have been invited to join Arionys Finance as <strong>${
                  role === 'ceo' ? 'Chief Executive Officer' :
                  role === 'cfo' ? 'Chief Financial Officer' :
                  role === 'csuit' ? 'Executive Board' :
                  role === 'accountant' ? 'Accounts Manager' :
                  role === 'admin' ? 'Administrator' : role
                }</strong>.
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; color: #64748b; line-height: 1.6;">
                Click the button below to set your password and activate your account.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${confirmUrl}" 
                   style="display: inline-block; background: #0f172a; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px;">
                  Accept Invitation
                </a>
              </div>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin-top: 24px;">
                <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
                  Or paste this link in your browser:
                </p>
                <p style="margin: 0; font-size: 13px; color: #0f172a; word-break: break-all; font-family: monospace;">
                  ${confirmUrl}
                </p>
              </div>
              <p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8;">
                This invitation link expires in 7 days. If you did not expect this email, you can safely ignore it.
              </p>
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
