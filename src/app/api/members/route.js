import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { sendEmail } from '@/lib/mail';
import { getAuthUser, unauthorized } from '@/lib/auth';

export async function GET(req) {
  try {
    await dbConnect();

    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    const companyId = authUser.companyId;
    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

<<<<<<< Updated upstream
    const users = await User.find({ companyId }).select('-password');
    return NextResponse.json({ success: true, data: users });
=======
    const Employee = (await import('@/models/Employee')).default;
    const users = await User.find({ companyId }).select('-password').lean();
    const employees = await Employee.find({ companyId }).lean();
    
    const merged = [];
    const handledEmails = new Set();

    for (const u of users) {
      if (['owner', 'admin'].includes(u.role?.toLowerCase())) {
        continue;
      }
      const emp = employees.find(e => e.email.toLowerCase() === u.email.toLowerCase());
      merged.push({
        ...u,
        _id: u._id,
        isUser: true,
        employeeDocId: emp?._id || null,
        fullName: emp?.fullName || u.name,
        department: emp?.department || '',
        designation: emp?.designation || '',
        empIdString: emp?.employeeId || '',
        phone: emp?.phone || u.phone || '',
        empStatus: emp?.status || (u.isActive ? 'active' : 'inactive'),
        salary: emp?.salary || 0,
        loanLimit: emp?.loanLimit || 0,
        joiningDate: emp?.joiningDate || null,
        profilePhoto: emp?.profilePhoto || '',
      });
      handledEmails.add(u.email.toLowerCase());
    }

    for (const emp of employees) {
      if (!handledEmails.has(emp.email.toLowerCase())) {
        merged.push({
          _id: emp._id, // use employee id as react key
          isUser: false,
          employeeDocId: emp._id,
          name: emp.fullName,
          fullName: emp.fullName,
          email: emp.email,
          department: emp.department,
          designation: emp.designation,
          empIdString: emp.employeeId,
          phone: emp.phone,
          empStatus: emp.status,
          salary: emp.salary || 0,
          loanLimit: emp.loanLimit || 0,
          joiningDate: emp.joiningDate || null,
          profilePhoto: emp.profilePhoto || '',
          role: 'pending_invite',
          isActive: false,
        });
      }
    }

    return NextResponse.json({ success: true, data: merged });
>>>>>>> Stashed changes
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// Power hierarchy: higher number = more authority
const ROLE_POWER = {
  owner:     6,
  admin:     5,
  ceo:       4,
  cfo:       3,
  csuit:     2,
  accountant: 1,
};

const getPower = (role) => ROLE_POWER[role?.toLowerCase()] ?? 0;

export async function PATCH(req) {
  try {
    await dbConnect();

    const actor = await getAuthUser(req);
    if (!actor) return unauthorized();

    const { userId, role, isActive } = await req.json();

    const actorPower = getPower(actor.role);

    // Must have at least accountant-level power to do anything
    if (actorPower < 1) {
      return NextResponse.json({ success: false, message: 'Insufficient authority to manage members.' }, { status: 403 });
    }

    const target = await User.findById(userId);
    if (!target) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Tenant isolation
    if (String(target.companyId) !== String(actor.companyId)) {
      return NextResponse.json({ success: false, message: 'You can only manage members of your own company.' }, { status: 403 });
    }

    const targetPower = getPower(target.role);

    // Cannot modify anyone with equal or higher power
    if (actorPower <= targetPower) {
      return NextResponse.json({
        success: false,
        message: `You cannot modify a ${target.role} — they have equal or higher authority than you.`
      }, { status: 403 });
    }

    // If assigning a new role, cannot assign a role >= your own power
    if (role) {
      const newRolePower = getPower(role);
      if (newRolePower >= actorPower) {
        return NextResponse.json({
          success: false,
          message: `You cannot assign the "${role}" role — it equals or exceeds your own authority.`
        }, { status: 403 });
      }
      target.role = role.toLowerCase();
    }

    // Check if user is being approved
    const isBeingApproved = isActive === true && target.isActive === false;

    if (isActive !== undefined) target.isActive = isActive;

    await target.save();

    if (isBeingApproved) {
      try {
        const roleLabelMap = {
          admin: 'Administrator',
          ceo: 'Chief Executive Officer',
          cfo: 'Chief Financial Officer',
          csuit: 'Executive Board',
          accountant: 'Accounts Manager',
        };
        const roleLabel = roleLabelMap[target.role?.toLowerCase()] || target.role;

        await sendEmail({
          to: target.email,
          subject: 'Your Arionys Finance Account is Approved',
          text: `Hello ${target.name},\n\nYour account has been approved. You can now log in with the role: ${roleLabel}.`,
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2 style="color: #10b981;">Account Approved</h2>
              <p>Hello <strong>${target.name}</strong>,</p>
              <p>Great news! Your account has been approved.</p>
              <p>You now have full access with the role of <strong>${roleLabel}</strong>.</p>
              <div style="margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl?.origin}/login"
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

    return NextResponse.json({ success: true, data: target });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await dbConnect();

    const actor = await getAuthUser(req);
    if (!actor) return unauthorized();

    const { userId } = await req.json();

    const actorPower = getPower(actor.role);

    if (actorPower < 1) {
      return NextResponse.json({ success: false, message: 'Insufficient authority to delete members.' }, { status: 403 });
    }

    const target = await User.findById(userId);
    if (!target) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    if (String(target.companyId) !== String(actor.companyId)) {
      return NextResponse.json({ success: false, message: 'You can only manage members of your own company.' }, { status: 403 });
    }

    const targetPower = getPower(target.role);

    // Cannot delete anyone with equal or higher power
    if (actorPower <= targetPower) {
      return NextResponse.json({
        success: false,
        message: `You cannot delete a ${target.role} — they have equal or higher authority than you.`
      }, { status: 403 });
    }

    await User.findByIdAndDelete(userId);
    return NextResponse.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
