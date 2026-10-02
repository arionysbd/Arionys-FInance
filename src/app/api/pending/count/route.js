import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import EmployeeLoan from '@/models/EmployeeLoan';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

// GET /api/pending/count — just the number of items waiting for review (for the sidebar badge)
export async function GET(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();
    if (!hasPermission(authUser, 'pending_approvals')) return forbidden('You do not have access to approvals.');

    const companyId = authUser.companyId;
    const [transactions, loans] = await Promise.all([
      Transaction.countDocuments({ companyId, status: 'pending' }),
      EmployeeLoan.countDocuments({ companyId, status: 'pending_approval' }),
    ]);

    return NextResponse.json({ success: true, data: { transactions, loans, total: transactions + loans } });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
