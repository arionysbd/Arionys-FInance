import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Employee from '@/models/Employee';
import AuditLog from '@/models/AuditLog';
import { getAuthUser, unauthorized } from '@/lib/auth';

// GET /api/employees/[id]
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    const { id } = await params;
    const employee = await Employee.findOne({ _id: id, companyId: authUser.companyId })
      .populate('createdBy', 'name')
      .lean();

    if (!employee) {
      return NextResponse.json({ success: false, message: 'Employee not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: employee });
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

    const allowedRoles = ['owner', 'admin', 'ceo', 'cfo'];
    if (!allowedRoles.includes(authUser.role?.toLowerCase())) {
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
      oldValue: oldValues,
      newValue: updates,
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

    const allowedRoles = ['owner', 'admin', 'ceo'];
    if (!allowedRoles.includes(authUser.role?.toLowerCase())) {
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
