import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { checkins } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Types
interface AttendRequestBody {
  checkin_id: number;
  notes?: string;
}

interface CheckinRecord {
  id: number;
  patientId: number;
  checkinTime: string;
  paymentMethod: string;
  status: string;
  waitingTimeMinutes: number | null;
  attendedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function PUT(request: NextRequest) {
  try {
    // Parse and validate request body
    let body: AttendRequestBody;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ 
        error: "Invalid JSON in request body",
        code: "INVALID_JSON" 
      }, { status: 400 });
    }

    const { checkin_id, notes } = body;

    // Validate required field
    if (checkin_id === undefined || checkin_id === null) {
      return NextResponse.json({ 
        error: "checkin_id is required",
        code: "MISSING_CHECKIN_ID" 
      }, { status: 400 });
    }

    // Validate checkin_id is a positive integer
    if (!Number.isInteger(checkin_id) || checkin_id <= 0) {
      return NextResponse.json({ 
        error: "checkin_id must be a positive integer",
        code: "INVALID_CHECKIN_ID" 
      }, { status: 400 });
    }

    // Find the check-in record with status 'waiting'
    const existingCheckins = await db.select()
      .from(checkins)
      .where(and(eq(checkins.id, checkin_id), eq(checkins.status, 'waiting')))
      .limit(1);

    if (existingCheckins.length === 0) {
      return NextResponse.json({ 
        error: "Check-in not found or not in waiting status",
        code: "CHECKIN_NOT_FOUND" 
      }, { status: 404 });
    }

    const checkinRecord = existingCheckins[0];
    const currentTime = new Date();
    const attendedAt = currentTime.toISOString();

    // Calculate waiting time in minutes between checkinTime and current time
    const checkinTime = new Date(checkinRecord.checkinTime);
    const waitingTimeMinutes = Math.round((currentTime.getTime() - checkinTime.getTime()) / (1000 * 60));

    // Prepare update data
    const updateData: Partial<CheckinRecord> = {
      status: 'attended',
      attendedAt,
      waitingTimeMinutes,
      updatedAt: currentTime.toISOString()
    };

    // Handle optional notes - append to existing notes if they exist
    if (notes !== undefined && notes !== null) {
      if (checkinRecord.notes && checkinRecord.notes.trim()) {
        updateData.notes = `${checkinRecord.notes}\n${notes}`;
      } else {
        updateData.notes = notes;
      }
    }

    // Update the check-in record
    const updatedRecords = await db.update(checkins)
      .set(updateData)
      .where(eq(checkins.id, checkin_id))
      .returning();

    if (updatedRecords.length === 0) {
      return NextResponse.json({ 
        error: "Failed to update check-in record",
        code: "UPDATE_FAILED" 
      }, { status: 500 });
    }

    // Return the updated record
    return NextResponse.json(updatedRecords[0], { status: 200 });

  } catch (error) {
    console.error('PUT queue attend error:', error);
    
    // Handle database constraint errors
    if (error instanceof Error) {
      if (error.message.includes('FOREIGN KEY constraint')) {
        return NextResponse.json({ 
          error: "Invalid checkin_id reference",
          code: "INVALID_REFERENCE" 
        }, { status: 400 });
      }
      
      if (error.message.includes('UNIQUE constraint')) {
        return NextResponse.json({ 
          error: "Constraint violation",
          code: "CONSTRAINT_VIOLATION" 
        }, { status: 409 });
      }
    }

    return NextResponse.json({ 
      error: "Internal server error occurred while processing attendance",
      code: "INTERNAL_SERVER_ERROR" 
    }, { status: 500 });
  }
}

// Handle unsupported HTTP methods
export async function GET() {
  return NextResponse.json({ 
    error: "Method not allowed. This endpoint only supports PUT requests.",
    code: "METHOD_NOT_ALLOWED" 
  }, { status: 405 });
}

export async function POST() {
  return NextResponse.json({ 
    error: "Method not allowed. This endpoint only supports PUT requests.",
    code: "METHOD_NOT_ALLOWED" 
  }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ 
    error: "Method not allowed. This endpoint only supports PUT requests.",
    code: "METHOD_NOT_ALLOWED" 
  }, { status: 405 });
}