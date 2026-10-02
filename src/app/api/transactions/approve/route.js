import { NextResponse } from 'next/server';
import { typeLabel } from '@/lib/transactionTypes';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { queueEmail } from '@/lib/mail';
import { getAuthUser, unauthorized } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function POST(req) {
  try {
    await dbConnect();

    const user = await getAuthUser(req);
    if (!user) return unauthorized();

    const { transactionId, status, account } = await req.json();
    const userId = user._id;

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ success: false, message: 'Status must be approved or rejected.' }, { status: 400 });
    }

    if (!hasPermission(user, 'pending_approvals')) {
      return NextResponse.json({ success: false, message: 'You do not have access to approve transactions.' }, { status: 403 });
    }

    const transaction = await Transaction.findById(transactionId).populate('createdBy', 'name');
    if (!transaction) {
      return NextResponse.json({ success: false, message: 'Transaction not found' }, { status: 404 });
    }

    // Enforce tenant isolation: approvers can only act on their own company's transactions
    if (String(transaction.companyId) !== String(user.companyId)) {
      return NextResponse.json({ success: false, message: 'You can only review transactions for your own company.' }, { status: 403 });
    }

    // Only pending transactions can be reviewed; decisions are final
    if (transaction.status !== 'pending') {
      return NextResponse.json({ success: false, message: `This transaction was already ${transaction.status}.` }, { status: 409 });
    }

    // The approver chooses (or confirms) the bank account when approving a non-transfer transaction
    if (status === 'approved' && transaction.type !== 'transfer') {
      const accountId = account || transaction.account;
      if (!accountId) {
        return NextResponse.json({ success: false, message: 'Please choose the account for this transaction.' }, { status: 400 });
      }
      const Account = (await import('@/models/Account')).default;
      const owned = await Account.exists({ _id: accountId, companyId: user.companyId });
      if (!owned) {
        return NextResponse.json({ success: false, message: 'Account not found.' }, { status: 404 });
      }
      transaction.account = accountId;
    }

    transaction.status = status; // approved or rejected
    transaction.approvedBy = userId;
    await transaction.save();

    await AuditLog.create({
      companyId: user.companyId,
      userId,
      actorName: user.name,
      action: status === 'approved' ? 'approved_transaction' : 'rejected_transaction',
      entity: 'transaction',
      entityId: transaction._id,
      entityLabel: `Transaction of ${transaction.amount} was ${status}`,
      oldValue: { status: 'pending' },
      newValue: { status },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip || '',
      userAgent: req.headers.get('user-agent') || ''
    });

    // Notify Admin and CEO upon approval
    if (status === 'approved') {
      try {
        // Everyone else who can approve transactions
        const companyUsers = await User.find({ companyId: transaction.companyId, isActive: true });
        const notifiables = companyUsers.filter(u => hasPermission(u, 'pending_approvals') && String(u._id) !== String(userId));
        for (const notifiable of notifiables) {
          queueEmail({
            to: notifiable.email,
            subject: 'Transaction Approved Notification',
            text: `A transaction of BDT ${transaction.amount} (${typeLabel(transaction.type)}) has been approved by ${user.name}.`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 6px;">
                <h2 style="color: #10b981;">Transaction Approved</h2>
                <p>A transaction has been reviewed and approved:</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                  <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Type:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${typeLabel(transaction.type)}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Amount:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">BDT ${transaction.amount.toLocaleString()}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Performed By:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${transaction.performedBy || 'N/A'}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Description:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${transaction.description}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Recorded By:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${transaction.createdBy?.name || 'System'}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Approved By:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${user.name}</td></tr>
                </table>
              </div>
            `
          });
        }
      } catch (mailError) {
        console.error('Failed to send approval notification:', mailError);
      }
    }

    return NextResponse.json({ success: true, data: transaction });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
