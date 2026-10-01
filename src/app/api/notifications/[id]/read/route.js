import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import { getAuthUser, unauthorized } from '@/lib/auth';

export async function PATCH(req, { params }) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    const { id } = await params;
    
    // Need to verify it belongs to this company. 
    // If it's a broadcast (userId null), setting isRead true globally marks it read for everyone in the company.
    // For a real production system, broadcast read states are usually tracked via a separate junction table.
    // Given the scope, this is acceptable for now.
    
    const notification = await Notification.findOneAndUpdate(
        { _id: id, companyId: authUser.companyId },
        { isRead: true },
        { new: true }
    );

    if (!notification) {
      return NextResponse.json({ success: false, message: 'Notification not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: notification });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
