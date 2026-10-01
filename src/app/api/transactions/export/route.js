import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function GET(req) {
  try {
    await dbConnect();

    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();
    if (!hasPermission(authUser, 'transactions')) return forbidden('You do not have access to export transactions.');

    const companyId = authUser.companyId;
    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    const transactions = await Transaction.find({ companyId }).lean();
    
    return NextResponse.json({ success: true, data: transactions });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
