import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import EmployeeLoan from '@/models/EmployeeLoan';
import Transaction from '@/models/Transaction';
import Account from '@/models/Account';
import AuditLog from '@/models/AuditLog';
import Company from '@/models/Company';
import { getAuthUser, unauthorized } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { sendEmail } from '@/lib/mail';
import mongoose from 'mongoose';

export async function PATCH(req, { params }) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    if (!hasPermission(authUser, 'pending_approvals')) {
      return NextResponse.json({ success: false, message: 'Insufficient permissions to disburse loans.' }, { status: 403 });
    }

    const { id } = await params;
    const { paidFromAccount } = await req.json().catch(() => ({}));

    const loan = await EmployeeLoan.findOne({ _id: id, companyId: authUser.companyId }).session(session);
    
    if (!loan) {
      return NextResponse.json({ success: false, message: 'Loan not found.' }, { status: 404 });
    }

    if (loan.status !== 'approved') {
      return NextResponse.json({ success: false, message: `Cannot disburse loan in '${loan.status}' status. Must be approved.` }, { status: 400 });
    }

    // Verify account exists
    const accountId = paidFromAccount || loan.paidFromAccount;
    if (!accountId) {
      return NextResponse.json({ success: false, message: 'Source account not provided and not set on loan.' }, { status: 400 });
    }
    const account = await Account.findOne({ _id: accountId, companyId: authUser.companyId });
    if (!account) {
        return NextResponse.json({ success: false, message: 'Source account not found.' }, { status: 404 });
    }

    if (paidFromAccount && !loan.paidFromAccount) {
      loan.paidFromAccount = paidFromAccount;
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

    // Email the employee
    if (loan.employeeEmail) {
      const company = await Company.findById(authUser.companyId).lean();
      await sendEmail({
        to: loan.employeeEmail,
        subject: 'Employee Loan Activated — Arionys Finance',
        html: loanActivatedEmailHtml({
          employeeName: loan.employeeName,
          companyName: company?.name || 'Your Company',
          amount: loan.amount,
          currency: loan.currency || 'BDT',
          startDate: loan.startDate,
          endDate: loan.endDate,
        }),
        text: `Dear ${loan.employeeName}, your loan of ${loan.currency || 'BDT'} ${Number(loan.amount).toLocaleString()} has been activated and disbursed.`,
      }).catch(console.error);
    }

    return NextResponse.json({ success: true, data: loan });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  } finally {
    // Early returns and errors must never leave the transaction open
    if (session.inTransaction()) await session.abortTransaction().catch(() => {});
    session.endSession();
  }
}

function loanActivatedEmailHtml({ employeeName, companyName, amount, currency, startDate, endDate }) {
  const fmt = (v) => `${currency} ${Number(v).toLocaleString()}`;
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return `
<div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px 24px;">
    <h1 style="color: #fff; margin: 0; font-size: 20px; font-weight: 700;">Employee Loan Activated</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0 0; font-size: 14px;">${companyName}</p>
  </div>
  <div style="padding: 24px;">
    <p style="color: #334155; margin-bottom: 16px;">Dear ${employeeName},</p>
    <p style="color: #64748b; margin-bottom: 24px;">Your employee loan has been successfully activated and the funds have been disbursed. Here are your loan details:</p>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b; font-weight: 600;">Loan Amount</td><td style="padding: 10px 0; color: #0f172a; font-weight: 700; text-align: right;">${fmt(amount)}</td></tr>
      <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b; font-weight: 600;">Start Date</td><td style="padding: 10px 0; color: #0f172a; text-align: right;">${fmtDate(startDate)}</td></tr>
      <tr><td style="padding: 10px 0; color: #64748b; font-weight: 600;">End Date</td><td style="padding: 10px 0; color: #0f172a; text-align: right;">${fmtDate(endDate)}</td></tr>
    </table>
    <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Please note that repayments will be managed according to company policy. Contact your finance team if you have any questions.</p>
  </div>
  <div style="background: #f8faff; padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center;">
    <p style="color: #94a3b8; font-size: 11px; margin: 0;">Arionys Finance — Secure Financial Management</p>
  </div>
</div>`;
}
