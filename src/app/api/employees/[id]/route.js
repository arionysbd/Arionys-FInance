import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Employee from '@/models/Employee';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth';
import { getUserPermissions, hasPermission, isOwner } from '@/lib/permissions';

// GET /api/employees/[id]
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();
    if (!hasPermission(authUser, 'employees')) return forbidden('You do not have access to employees.');

    const { id } = await params;
    const employee = await Employee.findOne({ _id: id, companyId: authUser.companyId })
      .populate('createdBy', 'name')
      .lean();

    if (!employee) {
      return NextResponse.json({ success: false, message: 'Employee not found.' }, { status: 404 });
    }

    // Linked login account (role + access), matched by userId or by email within the company
    const accountQuery = employee.userId
      ? { _id: employee.userId }
      : { email: employee.email, companyId: authUser.companyId };
    const account = await User.findOne(accountQuery).select('role permissions isActive createdAt').lean();

    return NextResponse.json({
      success: true,
      data: {
        ...employee,
        account: account
          ? { isOwner: isOwner(account), permissions: getUserPermissions(account), isActive: account.isActive, createdAt: account.createdAt }
          : null,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PATCH /api/employees/[id]
export async function PATCH(req, { params }) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    if (!hasPermission(authUser, 'employees')) {
      return NextResponse.json({ success: false, message: 'Insufficient permissions.' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await Employee.findOne({ _id: id, companyId: authUser.companyId });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Employee not found.' }, { status: 404 });
    }

    const body = await req.json();
    const allowedFields = ['fullName', 'phone', 'department', 'designation', 'joiningDate', 'status', 'notes', 'employeeId', 'profilePhoto', 'salary', 'loanLimit'];
    const updates = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    if (updates.phone !== undefined && !String(updates.phone).trim()) {
      return NextResponse.json({ success: false, message: 'Phone number is required.' }, { status: 400 });
    }

    if (updates.profilePhoto !== undefined) {
      const photo = updates.profilePhoto;
      const isValidPhoto = photo === '' || (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo) && photo.length <= 700 * 1024);
      if (!isValidPhoto) {
        return NextResponse.json({ success: false, message: 'Profile photo must be a JPEG, PNG or WebP image under 500 KB.' }, { status: 400 });
      }
    }

    const oldValues = {};
    for (const key of Object.keys(updates)) oldValues[key] = existing[key];

    const updated = await Employee.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

    await AuditLog.create({
      companyId: authUser.companyId,
      userId: authUser._id,
      actorName: authUser.name,
      action: 'updated_employee',
      entity: 'employee',
      entityId: id,
      entityLabel: existing.fullName,
      oldValue: { ...oldValues, ...(oldValues.profilePhoto !== undefined && { profilePhoto: oldValues.profilePhoto ? '[photo]' : '' }) },
      newValue: { ...updates, ...(updates.profilePhoto !== undefined && { profilePhoto: updates.profilePhoto ? '[photo]' : '' }) },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

// DELETE /api/employees/[id] — soft delete (set status to inactive)
export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    if (!hasPermission(authUser, 'employees')) {
      return NextResponse.json({ success: false, message: 'Insufficient permissions.' }, { status: 403 });
    }

    const { id } = await params;
    const employee = await Employee.findOneAndUpdate(
      { _id: id, companyId: authUser.companyId },
      { status: 'terminated' },
      { new: true }
    );

    if (!employee) {
      return NextResponse.json({ success: false, message: 'Employee not found.' }, { status: 404 });
    }

    await AuditLog.create({
      companyId: authUser.companyId,
      userId: authUser._id,
      actorName: authUser.name,
      action: 'terminated_employee',
      entity: 'employee',
      entityId: id,
      entityLabel: employee.fullName,
    });

    return NextResponse.json({ success: true, message: 'Employee terminated.' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
