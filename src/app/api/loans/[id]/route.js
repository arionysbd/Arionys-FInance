import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import EmployeeLoan from '@/models/EmployeeLoan';
import Transaction from '@/models/Transaction';
import AuditLog from '@/models/AuditLog';
import { getAuthUser, unauthorized } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import mongoose from 'mongoose';

// GET /api/loans/[id]
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    const { id } = await params;
    const loan = await EmployeeLoan.findOne({ _id: id, companyId: authUser.companyId })
      .populate('employeeId')
      .populate('paidFromAccount')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .populate('disbursementTransactionId')
      .lean();

    if (!loan) {
      return NextResponse.json({ success: false, message: 'Loan not found.' }, { status: 404 });
    }

    // Without Loans / Pending Approvals access, a user may only open their own loan
    if (!hasPermission(authUser, 'loans', 'pending_approvals')) {
      const ownerUserId = loan.employeeId?.userId || null;
      const isOwnLoan = (ownerUserId && String(ownerUserId) === String(authUser._id))
        || loan.employeeEmail?.toLowerCase() === authUser.email?.toLowerCase();
      if (!isOwnLoan) {
        return NextResponse.json({ success: false, message: 'Loan not found.' }, { status: 404 });
      }
    }

    return NextResponse.json({ success: true, data: loan });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PATCH /api/loans/[id] - General updates (notes, maybe amounts if still draft/pending)
export async function PATCH(req, { params }) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    if (!hasPermission(authUser, 'loans')) {
      return NextResponse.json({ success: false, message: 'Insufficient permissions.' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await EmployeeLoan.findOne({ _id: id, companyId: authUser.companyId });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Loan not found.' }, { status: 404 });
    }

    const body = await req.json();
    const allowedFields = ['notes'];
    
    // Allow updating amount/dates only if not disbursed/active yet
    if (['draft', 'pending_approval', 'approved'].includes(existing.status)) {
        allowedFields.push('amount', 'startDate', 'endDate');
    }

    const updates = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field];
    }
    
    if (updates.amount) {
        updates.outstandingAmount = Number(updates.amount);
    }

    const oldValues = {};
    for (const key of Object.keys(updates)) oldValues[key] = existing[key];

    const updated = await EmployeeLoan.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

    if (Object.keys(updates).length > 0) {
        await AuditLog.create({
            companyId: authUser.companyId,
            userId: authUser._id,
            actorName: authUser.name,
            action: 'updated_loan',
            entity: 'loan',
            entityId: id,
            entityLabel: `Loan for ${existing.employeeName}`,
            oldValue: oldValues,
            newValue: updates,
        });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
