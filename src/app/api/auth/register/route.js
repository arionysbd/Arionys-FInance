import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

export async function POST(req) {
  try {
    await dbConnect();
    const { name, email, password } = await req.json();

    const userExists = await User.findOne({ email });
    if (userExists) {
      return NextResponse.json({ success: false, message: 'User already exists' }, { status: 400 });
    }

    // Check if it's the first user
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'admin' : 'accountant';

    const isActive = userCount === 0;

    const user = await User.create({
      name,
      email,
      password,
      role,
      isActive
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    return NextResponse.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        token
      }
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
