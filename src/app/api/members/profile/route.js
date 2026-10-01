import { NextResponse } from 'next/server';
import { getUserPermissions } from '@/lib/permissions';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { getAuthUser, unauthorized } from '@/lib/auth';

export async function PUT(req) {
  try {
    await dbConnect();

    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    const { name, email, phone, position, password } = await req.json();
    const userId = authUser._id; // only ever edit your own profile

    if (!password) {
      return NextResponse.json({ success: false, message: 'Password is required' }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return NextResponse.json({ success: false, message: 'Incorrect password' }, { status: 401 });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email: new RegExp(`^${String(email).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
      if (existingUser) {
        return NextResponse.json({ success: false, message: 'Email already in use' }, { status: 400 });
      }
    }

    const previousEmail = user.email;
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (position !== undefined) user.position = position;

    await user.save();

    // Keep the linked employee record in step, otherwise the directory shows a duplicate person
    if (user.companyId) {
      const Employee = (await import('@/models/Employee')).default;
      const updates = { userId: user._id, email: user.email.toLowerCase() };
      if (name) updates.fullName = name;
      if (phone) updates.phone = phone;
      await Employee.findOneAndUpdate(
        { companyId: user.companyId, $or: [{ userId: user._id }, { email: previousEmail?.toLowerCase() }] },
        { $set: updates }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        position: user.position,
        role: user.role,
        permissions: getUserPermissions(user)
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
