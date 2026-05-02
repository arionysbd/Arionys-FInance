import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Founder from '@/models/Founder';

export async function GET() {
  try {
    await dbConnect();
    const founders = await Founder.find().select('-password');
    return NextResponse.json({ success: true, data: founders });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
