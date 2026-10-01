import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import User from '@/models/User';
import Account from '@/models/Account';
import AuditLog from '@/models/AuditLog';
import { sendEmail } from '@/lib/mail';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth';
import { hasPermission, canPickTransactionAccount } from '@/lib/permissions';
import { typeLabel } from '@/lib/transactionTypes';

export async function GET(req) {
  try {
    await dbConnect();

    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();
    if (!hasPermission(authUser, 'dashboard', 'transactions', 'pending_approvals')) return forbidden('You do not have access to transactions.');

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status') || 'approved';
    const type = searchParams.get('type');
    // Always scope to the caller's own company — never trust a client companyId
    const companyId = authUser.companyId;
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const skip = (page - 1) * limit;

    let query = {};
    if (companyId) query.companyId = companyId;

    // Support comma separated status: status=approved,rejected
    if (statusParam.includes(',')) {
      query.status = { $in: statusParam.split(',') };
    } else {
      query.status = statusParam;
    }
    
    if (type) query.type = type;

    const transactions = await Transaction.find(query)
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .populate('account', 'bankName')
      .populate('toAccount', 'bankName')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await Transaction.countDocuments(query);
    const hasMore = total > skip + transactions.length;

    return NextResponse.json({ success: true, data: transactions, hasMore, total });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();

    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();
    if (!hasPermission(authUser, 'create_transaction')) return forbidden('You do not have access to create transactions.');

    const body = await req.json();
    const { type, amount, description, performedBy } = body;
    // General employees only record Inflow/Outflow and never choose the bank account
    const isGeneral = !canPickTransactionAccount(authUser);
    const account = isGeneral ? undefined : body.account;
    const toAccount = isGeneral ? undefined : body.toAccount;
    // Identity and company come from the verified token, not the request body
    const userId = authUser._id;
    const companyId = authUser.companyId;

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    // Manually recorded transactions; loan disbursements/repayments are created by the loan flow
    const allowedTypes = isGeneral ? ['revenue', 'expense'] : ['revenue', 'expense', 'investment', 'transfer'];
    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ success: false, message: isGeneral ? 'You can only record Inflow or Outflow.' : 'Invalid transaction type.' }, { status: 400 });
    }

    if (!(Number(amount) > 0)) {
      return NextResponse.json({ success: false, message: 'Amount must be greater than 0.' }, { status: 400 });
    }

    if (!description?.trim()) {
      return NextResponse.json({ success: false, message: 'Description is required.' }, { status: 400 });
    }

    if (!isGeneral && !account) {
      return NextResponse.json({ success: false, message: 'Account selection is mandatory' }, { status: 400 });
    }

    if (type === 'transfer' && !toAccount) {
      return NextResponse.json({ success: false, message: 'Destination account is mandatory for transfers' }, { status: 400 });
    }

    if (type === 'transfer' && String(account) === String(toAccount)) {
      return NextResponse.json({ success: false, message: 'Source and destination accounts must be different' }, { status: 400 });
    }

    // Accounts must belong to the caller's company
    const accountIds = isGeneral ? [] : type === 'transfer' ? [account, toAccount] : [account];
    if (accountIds.length) {
      const ownedAccounts = await Account.countDocuments({ _id: { $in: accountIds }, companyId });
      if (ownedAccounts !== accountIds.length) {
        return NextResponse.json({ success: false, message: 'Account not found.' }, { status: 404 });
      }
    }

    const transaction = await Transaction.create({
      type,
      amount: Number(amount),
      description,
      performedBy,
      createdBy: userId,
      companyId,
      account,
      toAccount: type === 'transfer' ? toAccount : undefined,
      status: 'pending' // Force pending on creation
    });

    await AuditLog.create({
      companyId,
      userId,
      actorName: authUser.name,
      action: 'created_transaction',
      entity: 'transaction',
      entityId: transaction._id,
      entityLabel: `${typeLabel(type)} transaction of ${amount} created`,
      newValue: { type, amount, status: 'pending' },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip || '',
      userAgent: req.headers.get('user-agent') || ''
    });

    // Notify CFOs
    try {
      // Everyone who can approve transactions
      const companyUsers = await User.find({ companyId, isActive: true });
      const cfos = companyUsers.filter(u => hasPermission(u, 'pending_approvals') && String(u._id) !== String(userId));
      const creator = await User.findById(userId);
      
      for (const cfo of cfos) {
        await sendEmail({
          to: cfo.email,
          subject: 'Action Required: New Transaction Pending Approval',
          text: `A new ${typeLabel(type)} of BDT ${amount} was recorded by ${creator.name}. Description: ${description}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 6px;">
              <h2 style="color: #2563eb;">New Transaction Recorded</h2>
              <p>A new transaction requires your approval:</p>
              <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Type:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${typeLabel(type)}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Amount:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">BDT ${amount.toLocaleString()}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Performed By:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${performedBy}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Description:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${description}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Recorded By:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${creator.name}</td></tr>
              </table>
              <div style="margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin}/pending" 
                   style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  Review Transaction
                </a>
              </div>
            </div>
          `
        });
      }
    } catch (mailError) {
      console.error('Failed to send admin notification:', mailError);
      // We don't fail the transaction if mail fails
    }

    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
