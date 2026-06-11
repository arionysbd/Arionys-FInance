import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { sendEmail } from '@/lib/mail';

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    const users = await User.find({ companyId }).select('-password');
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    await dbConnect();
    const { userId, role, isActive, adminId } = await req.json();

    const admin = await User.findById(adminId);
    if (!admin || !['admin', 'owner'].includes(admin.role)) {
      return NextResponse.json({ success: false, message: 'Only owners or admins can change roles or statuses' }, { status: 403 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Protection for Owner accounts
    if (user.role === 'owner') {
      if (role && role !== 'owner') {
        return NextResponse.json({ success: false, message: 'Owner role cannot be changed' }, { status: 400 });
      }
      if (isActive === false) {
        return NextResponse.json({ success: false, message: 'Owner account cannot be deactivated' }, { status: 400 });
      }
    }

    if (role) user.role = role.toLowerCase();
    
    // Check if user is being approved
    const isBeingApproved = isActive === true && user.isActive === false;
    
    if (isActive !== undefined) user.isActive = isActive;
    
    await user.save();

    if (isBeingApproved) {
      try {
        const roleLabelMap = {
          admin: 'Administrator',
          ceo: 'Chief Executive Officer',
          cfo: 'Chief Financial Officer',
          csuit: 'Executive Board',
          accountant: 'Accounts Manager',
        };
        const roleLabel = roleLabelMap[user.role?.toLowerCase()] || user.role;

        await sendEmail({
          to: user.email,
          subject: 'Your Arionys Finance Account is Approved',
          text: `Hello ${user.name},\n\nYour account has been approved by an administrator. You can now log in and access the dashboard. Your role: ${roleLabel}.`,
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2 style="color: #10b981;">Account Approved</h2>
              <p>Hello <strong>${user.name}</strong>,</p>
              <p>Great news! Your account has been approved by an administrator.</p>
              <p>You now have full access to the Arionys Finance platform with the role of <strong>${roleLabel}</strong>.</p>
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
    const { userId, adminId } = await req.json();

    const admin = await User.findById(adminId);
    if (!admin || !['admin', 'owner'].includes(admin.role)) {
      return NextResponse.json({ success: false, message: 'Only owners or admins can delete accounts' }, { status: 403 });
    }

    const targetUser = await User.findById(userId);
    if (targetUser && targetUser.role === 'owner') {
      return NextResponse.json({ success: false, message: 'Owner accounts cannot be deleted' }, { status: 400 });
    }

    await User.findByIdAndDelete(userId);
    return NextResponse.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
