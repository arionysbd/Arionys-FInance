import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Invite from '@/models/Invite';
import Company from '@/models/Company';
import { sendEmail } from '@/lib/mail';
import { employeeInviteEmail } from '@/lib/emailTemplates';
import { getAuthUser, unauthorized } from '@/lib/auth';
import { hasPermission, isOwner, sanitizePermissions, DEFAULT_PERMISSIONS, PERMISSIONS } from '@/lib/permissions';

export async function POST(req) {
  try {
    await dbConnect();

    const actor = await getAuthUser(req);
    if (!actor) return unauthorized();

    if (!hasPermission(actor, 'manage_employees')) {
      return NextResponse.json(
        { success: false, message: 'You do not have access to invite members.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const email = body.email;
    // Only the company admin (owner) account chooses page access
    const permissions = isOwner(actor) ? sanitizePermissions(body.permissions ?? DEFAULT_PERMISSIONS) : DEFAULT_PERMISSIONS;

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email is required.' }, { status: 400 });
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


    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl?.origin || 'http://localhost:3000';
    const inviteUrl = `${appUrl}/invite/${token}`;

    const invitation = employeeInviteEmail({
      companyName,
      inviterName: actor.name,
      inviteUrl,
      accessLabels: PERMISSIONS.filter(p => permissions.includes(p.key)).map(p => p.label),
      expiresAt,
    });
    await sendEmail({ to: email, ...invitation });

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}. Link expires in 72 hours.`,
    }, { status: 201 });

  } catch (error) {
    console.error('Invite error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
