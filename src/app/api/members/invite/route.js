import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Invite from '@/models/Invite';
import Company from '@/models/Company';
import { sendEmail } from '@/lib/mail';
import { getAuthUser, unauthorized } from '@/lib/auth';
import { getUserPermissions, hasPermission, sanitizePermissions, DEFAULT_PERMISSIONS, PERMISSIONS } from '@/lib/permissions';

export async function POST(req) {
  try {
    await dbConnect();

    const actor = await getAuthUser(req);
    if (!actor) return unauthorized();

    if (!hasPermission(actor, 'employees')) {
      return NextResponse.json(
        { success: false, message: 'You do not have access to invite members.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const email = body.email;
    const permissions = sanitizePermissions(body.permissions ?? DEFAULT_PERMISSIONS);

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email is required.' }, { status: 400 });
    }

    // Users may only hand out pages they can open themselves
    const own = getUserPermissions(actor);
    if (permissions.some(k => !own.includes(k))) {
      return NextResponse.json(
        { success: false, message: 'You can only give access to pages you have access to yourself.' },
        { status: 403 }
      );
    }

    // Check if email is already a registered user in this company
    const existingUser = await User.findOne({ email: email.toLowerCase(), companyId: actor.companyId });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'This email already belongs to a member of your company.' },
        { status: 400 }
      );
    }

    // Invalidate any existing pending invite for this email + company
    await Invite.deleteMany({ email: email.toLowerCase(), companyId: actor.companyId });

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    await Invite.create({
      token,
      email: email.toLowerCase(),
      role: 'member',
      permissions,
      companyId: actor.companyId,
      invitedBy: actor._id,
      expiresAt,
    });

    const company = await Company.findById(actor.companyId).lean();
    const companyName = company?.name || 'Arionys Finance';

    const roleLabel = PERMISSIONS.filter(p => permissions.includes(p.key)).map(p => p.label).join(', ') || 'a team member';

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl?.origin || 'http://localhost:3000';
    const inviteUrl = `${appUrl}/invite/${token}`;

    await sendEmail({
      to: email,
      subject: `You've been invited to join ${companyName} on Arionys Finance`,
      text: `Hello,\n\nYou've been invited by ${actor.name} to join ${companyName} with access to: ${roleLabel}.\n\nClick the link below to create your account (valid for 72 hours):\n${inviteUrl}\n\nIf you did not expect this invitation, you can safely ignore this email.`,
      html: `
        <div style="font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto;">
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
            <div style="background: #0f172a; padding: 28px 32px;">
              <h1 style="margin: 0; font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em;">Arionys Finance</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">Secure Financial Management Platform</p>
            </div>
            <div style="padding: 36px 32px;">
              <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 800; color: #0f172a;">You're Invited 🎉</h2>
              <p style="margin: 0 0 28px; font-size: 14px; color: #64748b; line-height: 1.7;">
                <strong>${actor.name}</strong> has invited you to join <strong>${companyName}</strong> on Arionys Finance.
              </p>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #6366f1; border-radius: 6px; padding: 16px 20px; margin-bottom: 28px;">
                <p style="margin: 0 0 4px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8;">Your Role</p>
                <p style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">${roleLabel}</p>
                <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">${companyName}</p>
              </div>

              <p style="margin: 0 0 20px; font-size: 13px; color: #64748b; line-height: 1.6;">
                Click the button below to create your account. This invitation expires in <strong>72 hours</strong>.
              </p>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${inviteUrl}"
                   style="display: inline-block; background: #6366f1; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 800; font-size: 15px; letter-spacing: -0.01em;">
                  Create My Account →
                </a>
              </div>

              <p style="margin: 28px 0 0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.6;">
                Or copy this link:<br/>
                <a href="${inviteUrl}" style="color: #6366f1; word-break: break-all;">${inviteUrl}</a>
              </p>
            </div>
            <div style="background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px 32px;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
          </div>
        </div>
      `
    });

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}. Link expires in 72 hours.`,
    }, { status: 201 });

  } catch (error) {
    console.error('Invite error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
