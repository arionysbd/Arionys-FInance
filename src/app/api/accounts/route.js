import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Account from '@/models/Account';

export async function GET() {
  try {
    await dbConnect();
    const accounts = await Account.find().populate('createdBy', 'name').sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: accounts });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { accountNo, acName, bankName, branch, routingNo, userId } = body;

    const account = await Account.create({
      accountNo,
      acName,
      bankName,
      branch,
      routingNo,
      createdBy: userId,
    });

    return NextResponse.json({ success: true, data: account }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: 'Account with this name already exists' }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
