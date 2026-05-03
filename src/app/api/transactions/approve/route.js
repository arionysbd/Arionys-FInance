import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import User from '@/models/User';

export async function POST(req) {
  try {
    await dbConnect();
    const { transactionId, status, userId } = await req.json();

    const user = await User.findById(userId);
    const authorizedRoles = ['admin', 'ceo', 'cfo'];
    if (!user || !authorizedRoles.includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Only Admin, CEO, or CFO can approve.' }, { status: 403 });
    }

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return NextResponse.json({ success: false, message: 'Transaction not found' }, { status: 404 });
    }

    transaction.status = status; // approved or rejected
    transaction.approvedBy = userId;
    await transaction.save();

    return NextResponse.json({ success: true, data: transaction });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
