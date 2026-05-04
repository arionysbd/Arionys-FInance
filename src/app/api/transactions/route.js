import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import User from '@/models/User';
import { sendEmail } from '@/lib/mail';

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status') || 'approved';
    const type = searchParams.get('type');

    let query = {};
    
    // Support comma separated status: status=approved,rejected
    if (statusParam.includes(',')) {
      query.status = { $in: statusParam.split(',') };
    } else {
      query.status = statusParam;
    }
    
    if (type) query.type = type;

    const transactions = await Transaction.find(query)
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .sort({ date: -1 })
      .lean();
    return NextResponse.json({ success: true, data: transactions });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { type, amount, description, performedBy, userId } = body;

    const transaction = await Transaction.create({
      type,
      amount,
      description,
      performedBy,
      createdBy: userId,
      status: 'pending' // Force pending on creation
    });

    // Notify CFOs
    try {
      const cfos = await User.find({ role: 'cfo' });
      const creator = await User.findById(userId);
      
      for (const cfo of cfos) {
        await sendEmail({
          to: cfo.email,
          subject: 'Action Required: New Transaction Pending Approval',
          text: `A new ${type} of BDT ${amount} was recorded by ${creator.name}. Description: ${description}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 6px;">
              <h2 style="color: #2563eb;">New Transaction Recorded</h2>
              <p>A new transaction requires your approval:</p>
              <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Type:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${type.toUpperCase()}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Amount:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">BDT ${amount.toLocaleString()}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Performed By:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${performedBy}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Description:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${description}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Recorded By:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${creator.name}</td></tr>
              </table>
              <div style="margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin}/pending" 
                   style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  Review Transaction
                </a>
              </div>
            </div>
          `
        });
      }
    } catch (mailError) {
      console.error('Failed to send admin notification:', mailError);
      // We don't fail the transaction if mail fails
    }

    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
