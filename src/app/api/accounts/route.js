import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Account from '@/models/Account';
import Transaction from '@/models/Transaction';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function GET(req) {
  try {
    await dbConnect();

    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();
    if (!hasPermission(authUser, 'accounts', 'create_transaction', 'transactions', 'loans', 'pending_approvals', 'dashboard')) return forbidden('You do not have access to accounts.');

    const companyId = authUser.companyId;
    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    const accounts = await Account.find({ companyId }).populate('createdBy', 'name').sort({ createdAt: -1 }).lean();

    // Current balance of each account from approved transactions (same rules as the dashboard)
    const movements = await Transaction.aggregate([
      { $match: { companyId, status: 'approved' } },
      {
        $project: {
          amount: 1,
          entries: {
            $switch: {
              branches: [
                { case: { $in: ['$type', ['revenue', 'investment', 'loan_repayment']] }, then: [{ acc: '$account', sign: 1 }] },
                { case: { $in: ['$type', ['expense', 'loan_disbursement']] }, then: [{ acc: '$account', sign: -1 }] },
                { case: { $eq: ['$type', 'transfer'] }, then: [{ acc: '$account', sign: -1 }, { acc: '$toAccount', sign: 1 }] },
              ],
              default: [],
            },
          },
        },
      },
      { $unwind: '$entries' },
      { $group: { _id: '$entries.acc', balance: { $sum: { $multiply: ['$amount', '$entries.sign'] } } } },
    ]);
    const balances = Object.fromEntries(movements.map(m => [String(m._id), m.balance]));
    const data = accounts.map(acc => ({ ...acc, balance: balances[String(acc._id)] || 0 }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();

    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();
    if (!hasPermission(authUser, 'accounts')) return forbidden('You do not have access to manage accounts.');

    const body = await req.json();
    const { accountNo, acName, bankName, branch, routingNo } = body;
    const userId = authUser._id;
    const companyId = authUser.companyId;

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    const account = await Account.create({
      accountNo,
      acName,
      bankName,
      branch,
      routingNo,
      createdBy: userId,
      companyId,
    });

    return NextResponse.json({ success: true, data: account }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: 'Account with this name already exists' }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
