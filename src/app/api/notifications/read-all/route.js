import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import { getAuthUser, unauthorized } from '@/lib/auth';

export async function PATCH(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    // Mark all notifications for this user (and company broadcasts) as read
    await Notification.updateMany(
        { 
            companyId: authUser.companyId, 
            isRead: false,
            $or: [{ userId: authUser._id }, { userId: null }]
        },
        { $set: { isRead: true } }
    );

    return NextResponse.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
