import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

export async function POST(req) {
  try {
    await dbConnect();
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token is required' }, { status: 400 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.purpose !== 'magic-link') {
      return NextResponse.json({ success: false, message: 'Invalid token purpose' }, { status: 400 });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return NextResponse.json({ success: false, message: 'User no longer exists' }, { status: 404 });
    }

    // Generate a fresh session token
    const sessionToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    return NextResponse.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        companyId: user.companyId,
        token: sessionToken
      }
    });
  } catch (error) {
    const message = error.name === 'TokenExpiredError' ? 'Magic link has expired' : 'Invalid magic link';
    return NextResponse.json({ success: false, message }, { status: 401 });
  }
}
