import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { patients, patientAuditLog } from '@/db/schema';
import { eq, and, gte, lte, desc, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract and validate patient ID
    const patientIdParam = searchParams.get('patientId');
    if (!patientIdParam) {
      return NextResponse.json({ 
        error: "Patient ID is required",
        code: "MISSING_PATIENT_ID" 
      }, { status: 400 });
    }
    
    const patientId = parseInt(patientIdParam);
    if (isNaN(patientId) || patientId <= 0) {
      return NextResponse.json({ 
        error: "Valid patient ID is required",
        code: "INVALID_PATIENT_ID" 
      }, { status: 400 });
    }

    // Validate patient exists
    const patient = await db.select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    
    if (patient.length === 0) {
      return NextResponse.json({ 
        error: 'Patient not found' 
      }, { status: 404 });
    }

    // Parse pagination parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Parse date filtering parameters
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const field = searchParams.get('field');

    // Build query conditions
    let conditions = [eq(patientAuditLog.patientId, patientId)];
    
    if (startDate) {
      conditions.push(gte(patientAuditLog.createdAt, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(patientAuditLog.createdAt, endDate));
    }
    
    if (field) {
      conditions.push(eq(patientAuditLog.fieldChanged, field));
    }

    const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Get total count
    const totalResult = await db.select({ count: count() })
      .from(patientAuditLog)
      .where(whereCondition);
    
    const total = totalResult[0]?.count || 0;

    // Get audit entries
    const auditEntries = await db.select({
      id: patientAuditLog.id,
      fieldChanged: patientAuditLog.fieldChanged,
      oldValue: patientAuditLog.oldValue,
      newValue: patientAuditLog.newValue,
      changedBy: patientAuditLog.changedBy,
      reason: patientAuditLog.reason,
      createdAt: patientAuditLog.createdAt
    })
      .from(patientAuditLog)
      .where(whereCondition)
      .orderBy(desc(patientAuditLog.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      auditHistory: auditEntries,
      total,
      limit,
      offset,
      patientId
    });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}