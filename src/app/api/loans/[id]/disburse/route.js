import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import EmployeeLoan from '@/models/EmployeeLoan';
import Transaction from '@/models/Transaction';
import Account from '@/models/Account';
import AuditLog from '@/models/AuditLog';
import { getAuthUser, unauthorized } from '@/lib/auth';
import mongoose from 'mongoose';

export async function PATCH(req, { params }) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    const allowedRoles = ['owner', 'admin', 'ceo', 'cfo'];
    if (!allowedRoles.includes(authUser.role?.toLowerCase())) {
      return NextResponse.json({ success: false, message: 'Insufficient permissions to disburse loans.' }, { status: 403 });
    }

    const { id } = await params;
    const loan = await EmployeeLoan.findOne({ _id: id, companyId: authUser.companyId }).session(session);
    
    if (!loan) {
      return NextResponse.json({ success: false, message: 'Loan not found.' }, { status: 404 });
    }

    if (loan.status !== 'approved') {
      return NextResponse.json({ success: false, message: `Cannot disburse loan in '${loan.status}' status. Must be approved.` }, { status: 400 });
    }

    // Verify account exists
    const account = await Account.findOne({ _id: loan.paidFromAccount, companyId: authUser.companyId });
    if (!account) {
        return NextResponse.json({ success: false, message: 'Source account not found.' }, { status: 404 });
    }

    // Create the disbursement transaction
    const disbursementTx = await Transaction.create([{
        type: 'loan_disbursement',
        account: loan.paidFromAccount,
        amount: loan.amount,
        currency: loan.currency || 'BDT',
        description: `Employee loan disbursement — ${loan.employeeName}`,
        performedBy: authUser.name,
        createdBy: authUser._id,
        companyId: authUser.companyId,
        status: 'approved',
        approvedBy: authUser._id,
        date: new Date(),
        loanId: loan._id,
        category: 'employee_loan',
    }], { session });

    // Update loan status
    loan.status = 'active';
    loan.disbursedAt = new Date();
    loan.disbursementTransactionId = disbursementTx[0]._id;
    await loan.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Audit Log (outside transaction)
    await AuditLog.create({
      companyId: authUser.companyId,
      userId: authUser._id,
      actorName: authUser.name,
      action: 'disbursed_loan',
      entity: 'loan',
      entityId: loan._id,
      entityLabel: `Loan for ${loan.employeeName}`,
      oldValue: { status: 'approved' },
      newValue: { status: 'active', disbursedAt: loan.disbursedAt },
    });

    return NextResponse.json({ success: true, data: loan });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
