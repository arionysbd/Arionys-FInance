import { NextResponse } from 'next/server';
import { getUserPermissions } from '@/lib/permissions';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import jwt from 'jsonwebtoken';

export async function POST(req) {
  try {
    await dbConnect();
    const { email, password } = await req.json();

    const user = await User.findOne({ email });

    // Block users who haven't confirmed their invitation yet
    if (user && user.inviteToken) {
      return NextResponse.json({ success: false, message: 'Please confirm your invitation email first.' }, { status: 401 });
    }

    if (user && user.password && (await user.matchPassword(password))) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
      
      await AuditLog.create({
        companyId: user.companyId,
        userId: user._id,
        actorName: user.name,
        action: 'user_login',
        entity: 'user',
        entityId: user._id,
        entityLabel: `User ${user.name} logged in`,
        ipAddress: req.headers.get('x-forwarded-for') || req.ip || '',
        userAgent: req.headers.get('user-agent') || ''
      });

      return NextResponse.json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: getUserPermissions(user),
          isActive: user.isActive,
          companyId: user.companyId,
          token
        }
      });
    } else {
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
