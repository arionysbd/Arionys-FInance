import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';

export async function GET() {
  try {
    await dbConnect();
    const transactions = await Transaction.find({ status: 'approved' });

    const stats = transactions.reduce((acc, curr) => {
      if (curr.type === 'investment') acc.totalInvestment += curr.amount;
      if (curr.type === 'revenue') acc.totalRevenue += curr.amount;
      if (curr.type === 'expense') acc.totalExpense += curr.amount;
      return acc;
    }, { totalInvestment: 0, totalRevenue: 0, totalExpense: 0 });

    stats.netBalance = stats.totalRevenue - stats.totalExpense + stats.totalInvestment;

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
