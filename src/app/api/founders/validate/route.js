import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Founder from '@/models/Founder';

export async function POST(req) {
  try {
    await dbConnect();
    const { founderId, password } = await req.json();
    
    const founder = await Founder.findOne({ founderId });
    if (!founder) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 401 });
    }
    
    const isMatch = await founder.matchPassword(password);
    if (!isMatch) {
      return NextResponse.json({ success: false, message: 'Invalid password' }, { status: 401 });
    }
    
    return NextResponse.json({ success: true, name: founder.name });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
