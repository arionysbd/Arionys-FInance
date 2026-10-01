import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { sendEmail } from '@/lib/mail';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth';
import { getUserPermissions, hasPermission, isOwner, sanitizePermissions, canSeeAccess, DEFAULT_PERMISSIONS } from '@/lib/permissions';

export async function GET(req) {
  try {
    await dbConnect();

    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();
    if (!hasPermission(authUser, 'employees')) return forbidden('You do not have access to employees.');

    const companyId = authUser.companyId;
    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    const Employee = (await import('@/models/Employee')).default;
    const Invite = (await import('@/models/Invite')).default;
    const pendingInvites = await Invite.find({ companyId, usedAt: null }).lean();
    const showAccess = canSeeAccess(authUser);
    const users = await User.find({ companyId }).select('-password').lean();
    const employees = await Employee.find({ companyId }).lean();
    
    const merged = [];
    const handledEmails = new Set();

    for (const u of users) {
      // The company owner is not listed or managed here (nor their own employee record)
      if (isOwner(u)) {
        handledEmails.add(u.email.toLowerCase());
        continue;
      }
      const emp = employees.find(e => e.email.toLowerCase() === u.email.toLowerCase());
      merged.push({
        ...u,
        _id: u._id,
        isUser: true,
        employeeDocId: emp?._id || null,
        fullName: emp?.fullName || u.name,
        designation: emp?.designation || '',
        empIdString: emp?.employeeId || '',
        phone: emp?.phone || u.phone || '',
        empStatus: emp?.status || (u.isActive ? 'active' : 'inactive'),
        salary: emp?.salary || 0,
        loanLimit: emp?.loanLimit || 0,
        joiningDate: emp?.joiningDate || null,
        profilePhoto: emp?.profilePhoto || '',
        permissions: showAccess ? getUserPermissions(u) : undefined,
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
          designation: emp.designation,
          empIdString: emp.employeeId,
          phone: emp.phone,
          empStatus: emp.status,
          salary: emp.salary || 0,
          loanLimit: emp.loanLimit || 0,
          joiningDate: emp.joiningDate || null,
          profilePhoto: emp.profilePhoto || '',
          permissions: showAccess
            ? sanitizePermissions(pendingInvites.find(i => i.email === emp.email.toLowerCase())?.permissions || DEFAULT_PERMISSIONS)
            : undefined,
          role: 'pending_invite',
          isActive: false,
        });
      }
    }

    return NextResponse.json({ success: true, data: merged });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// Shared rules for changing another member:
// the actor needs the Employees page, the owner can never be changed, and nobody can change themselves.
function checkCanManage(actor, target) {
  if (!hasPermission(actor, 'manage_employees')) return 'You do not have access to manage employees.';
  if (String(target.companyId) !== String(actor.companyId)) return 'You can only manage members of your own company.';
  if (isOwner(target)) return 'The company owner cannot be changed.';
  if (String(target._id) === String(actor._id)) return 'You cannot change your own access.';
  return null;
}

// PATCH /api/members — change a member's page access and/or account status.
// Body: { userId, permissions?, isActive? } or { employeeId, permissions } for a pending invite.
export async function PATCH(req) {
  try {
    await dbConnect();

    const actor = await getAuthUser(req);
    if (!actor) return unauthorized();
    if (!hasPermission(actor, 'manage_employees')) return forbidden('You do not have access to manage employees.');

    const body = await req.json();
    const { userId, employeeId, isActive } = body;
    const permissions = body.permissions !== undefined ? sanitizePermissions(body.permissions) : undefined;

    // Page access can only be changed from the company admin (owner) account
    if (permissions && !isOwner(actor)) {
      return forbidden('Only the company admin account can change page access.');
    }

    // Pending invite: update the access the person will get when they accept
    if (!userId && employeeId) {
      if (!permissions) {
        return NextResponse.json({ success: false, message: 'Nothing to update.' }, { status: 400 });
      }
      const Employee = (await import('@/models/Employee')).default;
      const Invite = (await import('@/models/Invite')).default;
      const employee = await Employee.findOne({ _id: employeeId, companyId: actor.companyId });
      if (!employee) {
        return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 });
      }
      await Invite.updateMany({ email: employee.email, companyId: actor.companyId, usedAt: null }, { $set: { permissions } });

      await AuditLog.create({
        companyId: actor.companyId,
        userId: actor._id,
        actorName: actor.name,
        action: 'access_changed',
        entity: 'employee',
        entityId: employee._id,
        entityLabel: `Updated invite access for ${employee.fullName} (${employee.email})`,
        newValue: { permissions },
        ipAddress: req.headers.get('x-forwarded-for') || req.ip || '',
        userAgent: req.headers.get('user-agent') || ''
      });

      return NextResponse.json({ success: true, data: { permissions } });
    }

    const target = await User.findById(userId);
    if (!target) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const manageError = checkCanManage(actor, target);
    if (manageError) return forbidden(manageError);

    const oldValue = { permissions: getUserPermissions(target), isActive: target.isActive };
    const isBeingApproved = isActive === true && target.isActive === false;

    if (permissions) target.permissions = permissions;
    if (isActive !== undefined) target.isActive = isActive;
    await target.save();

    await AuditLog.create({
      companyId: actor.companyId,
      userId: actor._id,
      actorName: actor.name,
      action: permissions ? 'access_changed' : 'status_changed',
      entity: 'user',
      entityId: target._id,
      entityLabel: `Updated ${target.name} (${target.email})`,
      oldValue,
      newValue: { permissions: getUserPermissions(target), isActive: target.isActive },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip || '',
      userAgent: req.headers.get('user-agent') || ''
    });

    if (isBeingApproved) {
      try {
        await sendEmail({
          to: target.email,
          subject: 'Your Arionys Finance Account is Approved',
          text: `Hello ${target.name},\n\nYour account has been approved. You can now log in.`,
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2 style="color: #10b981;">Account Approved</h2>
              <p>Hello <strong>${target.name}</strong>,</p>
              <p>Great news! Your account has been approved and you can now log in.</p>
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

    return NextResponse.json({
      success: true,
      data: { _id: target._id, isActive: target.isActive, permissions: getUserPermissions(target) },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await dbConnect();

    const actor = await getAuthUser(req);
    if (!actor) return unauthorized();

    const { userId, employeeId } = await req.json();

    if (!hasPermission(actor, 'manage_employees')) return forbidden('You do not have access to delete employees.');

    const Employee = (await import('@/models/Employee')).default;
    const Invite = (await import('@/models/Invite')).default;

    if (userId) {
      const target = await User.findById(userId);
      if (!target) {
        return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
      }

      const manageError = checkCanManage(actor, target);
      if (manageError) return forbidden(manageError);

      await User.findByIdAndDelete(userId);
      await Employee.findOneAndDelete({ userId });

      await AuditLog.create({
        companyId: actor.companyId,
        userId: actor._id,
        actorName: actor.name,
        action: 'deleted_user',
        entity: 'user',
        entityId: target._id,
        entityLabel: `Deleted user ${target.name} (${target.email})`,
        ipAddress: req.headers.get('x-forwarded-for') || req.ip || '',
        userAgent: req.headers.get('user-agent') || ''
      });

      return NextResponse.json({ success: true, message: 'Account deleted' });
    } else if (employeeId) {
      const target = await Employee.findById(employeeId);
      if (!target) {
        return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 });
      }
      
      if (String(target.companyId) !== String(actor.companyId)) {
         return NextResponse.json({ success: false, message: 'You can only manage members of your own company.' }, { status: 403 });
      }
      
      await Employee.findByIdAndDelete(employeeId);
      // also clean up any pending invites
      if (target.email) {
        await Invite.deleteMany({ email: target.email, companyId: actor.companyId });
      }

      await AuditLog.create({
        companyId: actor.companyId,
        userId: actor._id,
        actorName: actor.name,
        action: 'deleted_employee',
        entity: 'employee',
        entityId: target._id,
        entityLabel: `Deleted employee ${target.fullName} (${target.email})`,
        ipAddress: req.headers.get('x-forwarded-for') || req.ip || '',
        userAgent: req.headers.get('user-agent') || ''
      });

      return NextResponse.json({ success: true, message: 'Employee deleted' });
    }

    return NextResponse.json({ success: false, message: 'Must provide userId or employeeId' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
