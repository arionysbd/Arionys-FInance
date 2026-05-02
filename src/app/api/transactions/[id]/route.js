import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import Founder from '@/models/Founder';

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    const body = await req.json();
    const { type, amount, description, category, founderId, password } = body;

    // Verify password
    const founder = await Founder.findOne({ founderId });
    if (!founder || !(await founder.matchPassword(password))) {
      return NextResponse.json({ success: false, message: 'Invalid founder credentials' }, { status: 401 });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return NextResponse.json({ success: false, message: 'Transaction not found' }, { status: 404 });
    }

    transaction.type = type || transaction.type;
    transaction.amount = amount || transaction.amount;
    transaction.description = description || transaction.description;
    transaction.category = category || transaction.category;
    transaction.approvedBy = founderId;

    await transaction.save();

    return NextResponse.json({ success: true, data: transaction });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    const body = await req.json();
    const { founderId, password } = body;

    // Verify password
    const founder = await Founder.findOne({ founderId });
    if (!founder || !(await founder.matchPassword(password))) {
      return NextResponse.json({ success: false, message: 'Invalid founder credentials' }, { status: 401 });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return NextResponse.json({ success: false, message: 'Transaction not found' }, { status: 404 });
    }

    await transaction.deleteOne();

    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
