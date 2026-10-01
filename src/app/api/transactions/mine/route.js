import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import Employee from '@/models/Employee';
import { getAuthUser, unauthorized } from '@/lib/auth';

const MONTHS_IN_TREND = 6;

// GET /api/transactions/mine — transactions recorded by the signed-in user (every status), with totals,
// a monthly trend and the user's employee profile. Used by the Personal Dashboard; never returns anyone else's records.
export async function GET(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();
    if (!authUser.companyId) return NextResponse.json({ success: false, message: 'Company required.' }, { status: 400 });

    const query = { companyId: authUser.companyId, createdBy: authUser._id };

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const trendStart = new Date(now.getFullYear(), now.getMonth() - (MONTHS_IN_TREND - 1), 1);

    const [transactions, byStatus, thisMonth, monthly, employee, approvedByTypeRows] = await Promise.all([
      Transaction.find(query)
        .populate('approvedBy', 'name')
        .populate('account', 'bankName')
        .populate('toAccount', 'bankName')
        .sort({ date: -1 })
        .limit(50)
        .lean(),
      Transaction.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { ...query, date: { $gte: monthStart } } },
        { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { ...query, date: { $gte: trendStart } } },
        {
          $group: {
            _id: { y: { $year: '$date' }, m: { $month: '$date' }, status: '$status' },
            amount: { $sum: '$amount' },
          },
        },
      ]),
      Employee.findOne({
        companyId: authUser.companyId,
        $or: [{ userId: authUser._id }, { email: authUser.email?.toLowerCase() }],
      }).select('fullName designation employeeId joiningDate loanLimit profilePhoto').lean(),
      Transaction.aggregate([
        { $match: { ...query, status: 'approved' } },
        { $group: { _id: '$type', amount: { $sum: '$amount' } } },
      ]),
    ]);

    const summary = {
      total: 0, totalAmount: 0,
      pending: 0, pendingAmount: 0,
      approved: 0, approvedAmount: 0,
      rejected: 0, rejectedAmount: 0,
      thisMonth: thisMonth[0]?.count || 0,
      thisMonthAmount: thisMonth[0]?.amount || 0,
      approvedByType: Object.fromEntries(approvedByTypeRows.map(r => [r._id, r.amount])),
    };
    for (const row of byStatus) {
      summary.total += row.count;
      summary.totalAmount += row.amount;
      if (['pending', 'approved', 'rejected'].includes(row._id)) {
        summary[row._id] = row.count;
        summary[`${row._id}Amount`] = row.amount;
      }
    }

    // One entry per month (oldest first), split by status
    const trend = [];
    for (let i = MONTHS_IN_TREND - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const entry = { label: d.toLocaleDateString('en-US', { month: 'short' }), approved: 0, pending: 0, rejected: 0 };
      for (const row of monthly) {
        if (row._id.y === d.getFullYear() && row._id.m === d.getMonth() + 1 && entry[row._id.status] !== undefined) {
          entry[row._id.status] += row.amount;
        }
      }
      trend.push(entry);
    }

    return NextResponse.json({ success: true, data: { transactions, summary, trend, employee } });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
