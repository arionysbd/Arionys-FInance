import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { sendEmail } from '@/lib/mail';
import { getAuthUser, unauthorized } from '@/lib/auth';
import { hasPermission, isOwner, sanitizePermissions } from '@/lib/permissions';

export async function GET(req) {
  try {
    await dbConnect();

    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    const companyId = authUser.companyId;
    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    if (!hasPermission(authUser, 'manage_employees')) {
      return NextResponse.json({ success: false, message: 'You do not have access to users.' }, { status: 403 });
    }

    // Scope to the requester's company so users of other tenants are never exposed; never return secrets
    const users = await User.find({ companyId }).select('name email phone position isActive createdAt');
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    await dbConnect();

    const admin = await getAuthUser(req);
    if (!admin) return unauthorized();

    const { userId, permissions, isActive } = await req.json();

    if (!hasPermission(admin, 'manage_employees')) {
      return NextResponse.json({ success: false, message: 'You do not have access to manage users.' }, { status: 403 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Enforce tenant isolation
    if (String(user.companyId) !== String(admin.companyId)) {
      return NextResponse.json({ success: false, message: 'You can only manage users of your own company.' }, { status: 403 });
    }

    // The company owner and the caller's own account cannot be changed here
    if (isOwner(user) || String(user._id) === String(admin._id)) {
      return NextResponse.json({ success: false, message: 'This account cannot be changed.' }, { status: 400 });
    }

    if (permissions !== undefined) {
      if (!isOwner(admin)) {
        return NextResponse.json({ success: false, message: 'Only the company admin account can change page access.' }, { status: 403 });
      }
      user.permissions = sanitizePermissions(permissions);
    }
    
    // Check if user is being approved
    const isBeingApproved = isActive === true && user.isActive === false;
    
    if (isActive !== undefined) user.isActive = isActive;
    
    await user.save();

    if (isBeingApproved) {
      try {
        await sendEmail({
          to: user.email,
          subject: 'Your Arionys Finance Account is Approved',
          text: `Hello ${user.name},\n\nYour account has been approved by an administrator. You can now log in and access the dashboard.`,
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2 style="color: #10b981;">Account Approved</h2>
              <p>Hello <strong>${user.name}</strong>,</p>
              <p>Great news! Your account has been approved by an administrator.</p>
              <p>You now have full access to the Arionys Finance platform.</p>
              <div style="margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin}/login" 
                   style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  Log In Now
                </a>
              </div>
            </div>
          `
        });
      } catch (mailError) {
        console.error('Failed to send approval notification:', mailError);
      }
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await dbConnect();

    const admin = await getAuthUser(req);
    if (!admin) return unauthorized();

    const { userId } = await req.json();

    if (!hasPermission(admin, 'manage_employees')) {
      return NextResponse.json({ success: false, message: 'You do not have access to delete accounts.' }, { status: 403 });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }
    if (String(targetUser.companyId) !== String(admin.companyId)) {
      return NextResponse.json({ success: false, message: 'You can only manage users of your own company.' }, { status: 403 });
    }
    if (isOwner(targetUser) || String(targetUser._id) === String(admin._id)) {
      return NextResponse.json({ success: false, message: 'This account cannot be deleted.' }, { status: 400 });
    }

    await User.findByIdAndDelete(userId);
    return NextResponse.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
