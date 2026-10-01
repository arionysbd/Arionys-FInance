import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { sendEmail } from '@/lib/mail';
import { getAuthUser, unauthorized } from '@/lib/auth';

export async function POST(req) {
  try {
    await dbConnect();

    const user = await getAuthUser(req);
    if (!user) return unauthorized();

    const { transactionId, status } = await req.json();
    const userId = user._id;

    const authorizedRoles = ['owner', 'admin', 'ceo', 'cfo'];
    if (!authorizedRoles.includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Only Owner, Admin, CEO, or CFO can approve.' }, { status: 403 });
    }

    const transaction = await Transaction.findById(transactionId).populate('createdBy', 'name');
    if (!transaction) {
      return NextResponse.json({ success: false, message: 'Transaction not found' }, { status: 404 });
    }

    // Enforce tenant isolation: approvers can only act on their own company's transactions
    if (String(transaction.companyId) !== String(user.companyId)) {
      return NextResponse.json({ success: false, message: 'You can only review transactions for your own company.' }, { status: 403 });
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
        const notifiables = await User.find({ role: { $in: ['admin', 'ceo'] }, companyId: transaction.companyId });
        for (const notifiable of notifiables) {
          await sendEmail({
            to: notifiable.email,
            subject: 'Transaction Approved Notification',
            text: `A transaction of BDT ${transaction.amount} (${transaction.type}) has been approved by ${user.name}.`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 6px;">
                <h2 style="color: #10b981;">Transaction Approved</h2>
                <p>A transaction has been reviewed and approved:</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                  <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Type:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${transaction.type.toUpperCase()}</td></tr>
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
