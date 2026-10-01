import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import EmployeeLoan from '@/models/EmployeeLoan';
import Employee from '@/models/Employee';
import { getAuthUser, unauthorized } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { submitLoan } from '@/lib/loanService';

// GET /api/loans
export async function GET(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    const companyId = authUser.companyId;
    if (!companyId) return NextResponse.json({ success: false, message: 'Company required.' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');
    const search = searchParams.get('search');

    const query = { companyId };
    
    // Loans / Pending Approvals access sees every loan; everyone else only sees their own
    if (!hasPermission(authUser, 'loans', 'pending_approvals')) {
      const empRecord = await Employee.findOne({ userId: authUser._id }).lean();
      if (!empRecord) {
        return NextResponse.json({ success: true, data: [] });
      }
      query.employeeId = empRecord._id;
    } else if (employeeId) {
      query.employeeId = employeeId;
    }

    if (status) {
      // Support comma-separated status values
      if (status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
    }
    if (search) {
      query.$or = [
        { employeeName: { $regex: search, $options: 'i' } },
        { employeeEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const loans = await EmployeeLoan.find(query)
      .populate('employeeId', 'fullName email department designation')
      .populate('paidFromAccount', 'bankName accountType')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: loans });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST /api/loans — create a loan for an employee (requires access to the Loans page).
// Employees asking for a loan for themselves use POST /api/loans/request instead.
export async function POST(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    if (!authUser.companyId) return NextResponse.json({ success: false, message: 'Company required.' }, { status: 400 });

    if (!hasPermission(authUser, 'loans')) {
      return NextResponse.json({ success: false, message: 'You do not have access to create loans. Please submit a loan request instead.' }, { status: 403 });
    }

    const { employeeId, paidFromAccount, amount, startDate, endDate, notes } = await req.json();
    if (!employeeId) {
      return NextResponse.json({ success: false, message: 'Please select an employee.' }, { status: 400 });
    }

    const result = await submitLoan({ authUser, employeeId, paidFromAccount, amount, startDate, endDate, notes, origin: 'issued' });
    if (result.error) {
      return NextResponse.json({ success: false, message: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, data: result.loan }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
