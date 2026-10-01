import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import EmployeeLoan from '@/models/EmployeeLoan';
import LoanRepayment from '@/models/LoanRepayment';
import Transaction from '@/models/Transaction';
import Account from '@/models/Account';
import AuditLog from '@/models/AuditLog';
import Notification from '@/models/Notification';
import { getAuthUser, unauthorized } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import mongoose from 'mongoose';

// GET /api/loans/[id]/repayments - Get repayments for a loan
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    const { id } = await params;
    
    // Verify loan exists and belongs to company
    const loan = await EmployeeLoan.findOne({ _id: id, companyId: authUser.companyId }).populate('employeeId', 'userId');
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

    const repayments = await LoanRepayment.find({ loanId: id, companyId: authUser.companyId })
      .populate('receivedIntoAccount', 'bankName accountType')
      .populate('recordedBy', 'name')
      .sort({ date: -1 })
      .lean();

    return NextResponse.json({ success: true, data: repayments });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST /api/loans/[id]/repayments - Add a repayment
export async function POST(req, { params }) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    if (!hasPermission(authUser, 'loans')) {
      return NextResponse.json({ success: false, message: 'Insufficient permissions to add repayments.' }, { status: 403 });
    }

    const { id } = await params;
    const loan = await EmployeeLoan.findOne({ _id: id, companyId: authUser.companyId }).session(session);
    
    if (!loan) {
      return NextResponse.json({ success: false, message: 'Loan not found.' }, { status: 404 });
    }

    if (!['active', 'partially_repaid', 'overdue'].includes(loan.status)) {
      return NextResponse.json({ success: false, message: `Cannot add repayment to loan in '${loan.status}' status.` }, { status: 400 });
    }

    const body = await req.json();
    const { amount, date, receivedIntoAccount, paymentMethod, reference, notes } = body;

    if (!amount || !receivedIntoAccount) {
      return NextResponse.json({ success: false, message: 'Amount and receiving account are required.' }, { status: 400 });
    }

    if (Number(amount) <= 0) {
      return NextResponse.json({ success: false, message: 'Repayment amount must be greater than 0.' }, { status: 400 });
    }

    if (Number(amount) > loan.outstandingAmount) {
        return NextResponse.json({ success: false, message: `Repayment amount cannot exceed the outstanding balance of ${loan.outstandingAmount}.` }, { status: 400 });
    }

    // Verify account
    const account = await Account.findOne({ _id: receivedIntoAccount, companyId: authUser.companyId });
    if (!account) {
        return NextResponse.json({ success: false, message: 'Receiving account not found.' }, { status: 404 });
    }

    // Create the transaction
    const repaymentTx = await Transaction.create([{
        type: 'loan_repayment',
        account: receivedIntoAccount,
        amount: Number(amount),
        currency: loan.currency || 'BDT',
        description: `Loan repayment received — ${loan.employeeName}${reference ? ` (Ref: ${reference})` : ''}`,
        performedBy: authUser.name,
        createdBy: authUser._id,
        companyId: authUser.companyId,
        status: 'approved',
        approvedBy: authUser._id,
        date: new Date(date || Date.now()),
        loanId: loan._id,
        category: 'loan_repayment',
    }], { session });

    // Create the repayment record
    const repayment = await LoanRepayment.create([{
        loanId: loan._id,
        companyId: authUser.companyId,
        employeeId: loan.employeeId,
        amount: Number(amount),
        currency: loan.currency || 'BDT',
        date: new Date(date || Date.now()),
        receivedIntoAccount,
        paymentMethod: paymentMethod || 'cash',
        reference,
        notes,
        recordedBy: authUser._id,
        transactionId: repaymentTx[0]._id,
    }], { session });

    // Update loan balances and status
    loan.totalRepaid += Number(amount);
    loan.outstandingAmount -= Number(amount);
    
    if (loan.outstandingAmount <= 0) {
        loan.status = 'completed';
        loan.completedAt = new Date();
    } else {
        // Keep overdue if it was overdue, otherwise partially_repaid
        loan.status = loan.status === 'overdue' ? 'overdue' : 'partially_repaid';
    }

    await loan.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Audit Log (outside transaction)
    await AuditLog.create({
      companyId: authUser.companyId,
      userId: authUser._id,
      actorName: authUser.name,
      action: 'added_loan_repayment',
      entity: 'loan',
      entityId: loan._id,
      entityLabel: `Repayment for ${loan.employeeName}`,
      newValue: { amount: Number(amount), newOutstanding: loan.outstandingAmount, newStatus: loan.status },
    });

    if (loan.status === 'completed') {
        await Notification.create({
            companyId: authUser.companyId,
            type: 'loan_completed',
            title: 'Employee Loan Completed',
            message: `The loan for ${loan.employeeName} has been fully repaid.`,
            relatedEntity: 'loan',
            relatedId: loan._id,
        });
    }

    return NextResponse.json({ success: true, data: repayment[0] }, { status: 201 });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
