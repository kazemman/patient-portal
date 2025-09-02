import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { checkins } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkin_id, notes } = body;

    // Validate required field
    if (!checkin_id) {
      return NextResponse.json({ 
        error: "checkin_id is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    // Validate checkin_id is valid positive integer
    const checkinId = parseInt(checkin_id);
    if (isNaN(checkinId) || checkinId <= 0) {
      return NextResponse.json({ 
        error: "checkin_id must be a valid positive integer",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Find check-in with status = 'waiting'
    const existingCheckin = await db.select()
      .from(checkins)
      .where(and(eq(checkins.id, checkinId), eq(checkins.status, 'waiting')))
      .limit(1);

    if (existingCheckin.length === 0) {
      return NextResponse.json({ 
        error: 'Check-in not found or already attended/cancelled',
        code: 'CHECKIN_NOT_FOUND' 
      }, { status: 404 });
    }

    const checkin = existingCheckin[0];
    const attendedAt = new Date().toISOString();
    
    // Calculate waiting time in minutes
    const checkinTime = new Date(checkin.checkinTime);
    const attendedTime = new Date(attendedAt);
    const waitingTimeMinutes = Math.round((attendedTime.getTime() - checkinTime.getTime()) / (1000 * 60));

    // Prepare update data
    const updateData: any = {
      status: 'attended',
      attendedAt,
      waitingTimeMinutes,
      updatedAt: new Date().toISOString()
    };

    // Handle notes - append to existing if provided
    if (notes !== undefined) {
      if (checkin.notes) {
        updateData.notes = `${checkin.notes}\n${notes}`;
      } else {
        updateData.notes = notes;
      }
    }

    // Update the check-in record
    const updated = await db.update(checkins)
      .set(updateData)
      .where(eq(checkins.id, checkinId))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}