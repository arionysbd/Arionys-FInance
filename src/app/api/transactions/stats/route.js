import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import Account from '@/models/Account';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function GET(req) {
  try {
    await dbConnect();

    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();
    if (!hasPermission(authUser, 'dashboard', 'transactions', 'reports')) return forbidden('You do not have access to transaction statistics.');

    const companyId = authUser.companyId;
    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    // Totals and per-account balances are computed by the database instead of loading every transaction
    const [typeTotals, accounts, movements] = await Promise.all([
      Transaction.aggregate([
        { $match: { companyId, status: 'approved' } },
        { $group: { _id: '$type', amount: { $sum: '$amount' } } },
      ]),
      Account.find({ companyId }).select('bankName').lean(),
      Transaction.aggregate([
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
      ]),
    ]);

    const byType = Object.fromEntries(typeTotals.map(t => [t._id, t.amount]));
    const balances = Object.fromEntries(movements.map(m => [String(m._id), m.balance]));

    const stats = {
      totalInvestment: byType.investment || 0,
      totalRevenue: byType.revenue || 0,
      totalExpense: byType.expense || 0,
    };
    stats.accountBalances = accounts.map(acc => ({
      accountId: String(acc._id),
      name: acc.bankName || 'Unknown Bank',
      balance: balances[String(acc._id)] || 0,
    }));
    // netBalance = sum of every account's running balance
    stats.netBalance = stats.accountBalances.reduce((sum, acc) => sum + acc.balance, 0);

    // Fetch total outstanding loans
    const EmployeeLoan = (await import('@/models/EmployeeLoan')).default;
    const [outstanding] = await EmployeeLoan.aggregate([
      { $match: { companyId, status: { $in: ['active', 'partially_repaid', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$outstandingAmount' } } },
    ]);
    stats.totalOutstandingLoans = outstanding?.total || 0;

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
