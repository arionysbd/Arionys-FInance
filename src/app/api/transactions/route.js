import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'approved'; // Default to approved for dashboard
    const type = searchParams.get('type');

    let query = { status };
    if (type) query.type = type;

    const transactions = await Transaction.find(query).populate('createdBy', 'name').sort({ date: -1 });
    return NextResponse.json({ success: true, data: transactions });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { type, amount, description, category, userId } = body;

    const transaction = await Transaction.create({
      type,
      amount,
      description,
      category,
      createdBy: userId,
      status: 'pending' // Force pending on creation
    });

    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
