import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { bills, patients } from '@/db/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';

const VALID_STATUSES = ['pending', 'paid', 'overdue'];

function validateDate(dateString: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString === date.toISOString().split('T')[0];
}

function validateAmount(amount: any): boolean {
  return typeof amount === 'number' && amount > 0 && isFinite(amount);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single bill by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const bill = await db.select()
        .from(bills)
        .where(eq(bills.id, parseInt(id)))
        .limit(1);

      if (bill.length === 0) {
        return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
      }

      return NextResponse.json(bill[0]);
    }

    // List bills with filters
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const patientId = searchParams.get('patientId');
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') === 'asc' ? asc : desc;

    let query = db.select().from(bills);
    const conditions = [];

    if (search) {
      conditions.push(like(bills.description, `%${search}%`));
    }

    if (status && VALID_STATUSES.includes(status)) {
      conditions.push(eq(bills.status, status));
    }

    if (patientId && !isNaN(parseInt(patientId))) {
      conditions.push(eq(bills.patientId, parseInt(patientId)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const validSortFields = ['id', 'billDate', 'amount', 'status', 'dueDate', 'createdAt'];
    const sortField = validSortFields.includes(sort) ? sort : 'createdAt';
    
    query = query.orderBy(order(bills[sortField as keyof typeof bills]));

    const result = await query.limit(limit).offset(offset);

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const requestBody = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { patientId, billDate, amount, description, status, dueDate } = requestBody;

    // Validate required fields
    if (!patientId) {
      return NextResponse.json({ 
        error: "Patient ID is required",
        code: "MISSING_PATIENT_ID" 
      }, { status: 400 });
    }

    if (!billDate) {
      return NextResponse.json({ 
        error: "Bill date is required",
        code: "MISSING_BILL_DATE" 
      }, { status: 400 });
    }

    if (amount === undefined || amount === null) {
      return NextResponse.json({ 
        error: "Amount is required",
        code: "MISSING_AMOUNT" 
      }, { status: 400 });
    }

    if (!description) {
      return NextResponse.json({ 
        error: "Description is required",
        code: "MISSING_DESCRIPTION" 
      }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ 
        error: "Status is required",
        code: "MISSING_STATUS" 
      }, { status: 400 });
    }

    if (!dueDate) {
      return NextResponse.json({ 
        error: "Due date is required",
        code: "MISSING_DUE_DATE" 
      }, { status: 400 });
    }

    // Validate field formats
    if (isNaN(parseInt(patientId))) {
      return NextResponse.json({ 
        error: "Patient ID must be a valid number",
        code: "INVALID_PATIENT_ID" 
      }, { status: 400 });
    }

    if (!validateDate(billDate)) {
      return NextResponse.json({ 
        error: "Bill date must be a valid date in YYYY-MM-DD format",
        code: "INVALID_BILL_DATE" 
      }, { status: 400 });
    }

    if (!validateAmount(amount)) {
      return NextResponse.json({ 
        error: "Amount must be a positive number",
        code: "INVALID_AMOUNT" 
      }, { status: 400 });
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ 
        error: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    if (!validateDate(dueDate)) {
      return NextResponse.json({ 
        error: "Due date must be a valid date in YYYY-MM-DD format",
        code: "INVALID_DUE_DATE" 
      }, { status: 400 });
    }

    // Validate patient exists
    const patient = await db.select()
      .from(patients)
      .where(eq(patients.id, parseInt(patientId)))
      .limit(1);

    if (patient.length === 0) {
      return NextResponse.json({ 
        error: "Patient not found",
        code: "PATIENT_NOT_FOUND" 
      }, { status: 400 });
    }

    // Create bill
    const newBill = await db.insert(bills)
      .values({
        patientId: parseInt(patientId),
        billDate: billDate.trim(),
        amount: parseFloat(amount),
        description: description.trim(),
        status: status.trim(),
        dueDate: dueDate.trim(),
        createdAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newBill[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const requestBody = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Check if bill exists
    const existingBill = await db.select()
      .from(bills)
      .where(eq(bills.id, parseInt(id)))
      .limit(1);

    if (existingBill.length === 0) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const { patientId, billDate, amount, description, status, dueDate } = requestBody;
    const updates: any = {};

    // Validate and build updates object
    if (patientId !== undefined) {
      if (isNaN(parseInt(patientId))) {
        return NextResponse.json({ 
          error: "Patient ID must be a valid number",
          code: "INVALID_PATIENT_ID" 
        }, { status: 400 });
      }

      // Validate patient exists
      const patient = await db.select()
        .from(patients)
        .where(eq(patients.id, parseInt(patientId)))
        .limit(1);

      if (patient.length === 0) {
        return NextResponse.json({ 
          error: "Patient not found",
          code: "PATIENT_NOT_FOUND" 
        }, { status: 400 });
      }

      updates.patientId = parseInt(patientId);
    }

    if (billDate !== undefined) {
      if (!validateDate(billDate)) {
        return NextResponse.json({ 
          error: "Bill date must be a valid date in YYYY-MM-DD format",
          code: "INVALID_BILL_DATE" 
        }, { status: 400 });
      }
      updates.billDate = billDate.trim();
    }

    if (amount !== undefined) {
      if (!validateAmount(amount)) {
        return NextResponse.json({ 
          error: "Amount must be a positive number",
          code: "INVALID_AMOUNT" 
        }, { status: 400 });
      }
      updates.amount = parseFloat(amount);
    }

    if (description !== undefined) {
      if (!description || typeof description !== 'string') {
        return NextResponse.json({ 
          error: "Description must be a non-empty string",
          code: "INVALID_DESCRIPTION" 
        }, { status: 400 });
      }
      updates.description = description.trim();
    }

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ 
          error: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
      updates.status = status.trim();
    }

    if (dueDate !== undefined) {
      if (!validateDate(dueDate)) {
        return NextResponse.json({ 
          error: "Due date must be a valid date in YYYY-MM-DD format",
          code: "INVALID_DUE_DATE" 
        }, { status: 400 });
      }
      updates.dueDate = dueDate.trim();
    }

    // Always update updatedAt
    updates.updatedAt = new Date().toISOString();

    const updatedBill = await db.update(bills)
      .set(updates)
      .where(eq(bills.id, parseInt(id)))
      .returning();

    return NextResponse.json(updatedBill[0]);
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if bill exists
    const existingBill = await db.select()
      .from(bills)
      .where(eq(bills.id, parseInt(id)))
      .limit(1);

    if (existingBill.length === 0) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const deletedBill = await db.delete(bills)
      .where(eq(bills.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'Bill deleted successfully',
      deletedBill: deletedBill[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}