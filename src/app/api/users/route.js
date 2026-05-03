import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { sendEmail } from '@/lib/mail';

export async function GET() {
  try {
    await dbConnect();
    const users = await User.find().select('-password');
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
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Only admins can change roles or statuses' }, { status: 403 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
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
          audit: 'Audit Officer',
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
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login" 
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
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Only admins can delete accounts' }, { status: 403 });
    }

    if (userId === adminId) {
      return NextResponse.json({ success: false, message: 'You cannot delete your own account' }, { status: 400 });
    }

    await User.findByIdAndDelete(userId);
    return NextResponse.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
