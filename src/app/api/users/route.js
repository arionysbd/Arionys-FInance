import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function GET() {
  try {
    await dbConnect();
    const users = await User.find().select('-password');
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    await dbConnect();
    const { userId, role, isActive, adminId } = await req.json();

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Only admins can change roles or statuses' }, { status: 403 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    if (role) user.role = role.toLowerCase();
    if (isActive !== undefined) user.isActive = isActive;
    
    await user.save();

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await dbConnect();
    const { userId, adminId } = await req.json();

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Only admins can delete accounts' }, { status: 403 });
    }

    if (userId === adminId) {
      return NextResponse.json({ success: false, message: 'You cannot delete your own account' }, { status: 400 });
    }

    await User.findByIdAndDelete(userId);
    return NextResponse.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
