import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import { getAuthUser, unauthorized } from '@/lib/auth';

// GET /api/notifications
export async function GET(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    const companyId = authUser.companyId;
    if (!companyId) return NextResponse.json({ success: false, message: 'Company required.' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const query = { companyId };
    
    // User-specific or broadcast to all
    query.$or = [
        { userId: authUser._id },
        { userId: null } // Broadcasts to company
    ];

    if (unreadOnly) {
        query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
      
    // Count total unread
    const unreadCountQuery = { companyId, isRead: false, $or: [{ userId: authUser._id }, { userId: null }] };
    const unreadCount = await Notification.countDocuments(unreadCountQuery);

    return NextResponse.json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
