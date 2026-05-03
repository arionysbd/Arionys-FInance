import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function PUT(req) {
  try {
    await dbConnect();
    const { userId, name, email, phone, position } = await req.json();

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return NextResponse.json({ success: false, message: 'Email already in use' }, { status: 400 });
      }
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (position !== undefined) user.position = position;

    await user.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        position: user.position,
        role: user.role
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
