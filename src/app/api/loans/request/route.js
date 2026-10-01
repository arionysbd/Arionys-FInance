import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import EmployeeLoan from '@/models/EmployeeLoan';
import { getAuthUser, unauthorized } from '@/lib/auth';
import { getOrCreateOwnEmployee, submitLoan } from '@/lib/loanService';

// GET /api/loans/request — the signed-in user's own loans and requests
export async function GET(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();
    if (!authUser.companyId) return NextResponse.json({ success: false, message: 'Company required.' }, { status: 400 });

    const employee = await getOrCreateOwnEmployee(authUser);
    const loans = await EmployeeLoan.find({ companyId: authUser.companyId, employeeId: employee._id })
      .populate('approvedBy', 'name')
      .populate('rejectedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        employee: { fullName: employee.fullName, email: employee.email, loanLimit: employee.loanLimit || 0 },
        loans,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST /api/loans/request — any member requests a loan for themselves; it goes to Pending Approvals
export async function POST(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();
    if (!authUser.companyId) return NextResponse.json({ success: false, message: 'Company required.' }, { status: 400 });

    const { amount, startDate, endDate, notes } = await req.json();
    if (!notes?.trim()) {
      return NextResponse.json({ success: false, message: 'Please provide a reason for the loan request.' }, { status: 400 });
    }

    const employee = await getOrCreateOwnEmployee(authUser);

    // Requesters never choose the source account; approvers pick it at disbursement
    const result = await submitLoan({
      authUser,
      employeeId: employee._id,
      amount,
      startDate,
      endDate,
      notes: notes.trim(),
      origin: 'request',
    });
    if (result.error) {
      return NextResponse.json({ success: false, message: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, data: result.loan }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
