import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Founder from '@/models/Founder';

export async function GET() {
  try {
    await dbConnect();
    
    const founders = [
      { name: 'Founder One', founderId: 'F001', password: 'password123' },
      { name: 'Founder Two', founderId: 'F002', password: 'password456' },
      { name: 'Founder Three', founderId: 'F003', password: 'password789' }
    ];

    await Founder.deleteMany();
    await Founder.create(founders);
    
    return NextResponse.json({ success: true, message: '3 Co-Founders seeded successfully!' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
