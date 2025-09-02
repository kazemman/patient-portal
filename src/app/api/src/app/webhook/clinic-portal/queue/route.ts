import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { checkins, patients } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract and validate limit parameter
    const limitParam = searchParams.get('limit');
    let limit = 50; // default limit
    
    if (limitParam) {
      const parsedLimit = parseInt(limitParam);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        return NextResponse.json({ 
          error: "Limit must be a positive integer",
          code: "INVALID_LIMIT" 
        }, { status: 400 });
      }
      limit = Math.min(parsedLimit, 100); // max limit 100
    }

    // Query database with join between checkins and patients
    const queueData = await db
      .select({
        // Check-in details
        id: checkins.id,
        checkinTime: checkins.checkinTime,
        paymentMethod: checkins.paymentMethod,
        status: checkins.status,
        notes: checkins.notes,
        // Patient details
        patientId: checkins.patientId,
        firstName: patients.firstName,
        lastName: patients.lastName,
        phone: patients.phone,
        email: patients.email,
        idType: patients.idType,
        saIdNumber: patients.saIdNumber,
        passportNumber: patients.passportNumber,
        medicalAid: patients.medicalAid,
        medicalAidNumber: patients.medicalAidNumber,
      })
      .from(checkins)
      .innerJoin(patients, eq(checkins.patientId, patients.id))
      .where(eq(checkins.status, 'waiting'))
      .orderBy(asc(checkins.checkinTime))
      .limit(limit);

    // Calculate current waiting time and format response
    const currentTime = new Date();
    const queueWithWaitingTime = queueData.map(item => {
      const checkinTime = new Date(item.checkinTime);
      const waitingTimeMinutes = Math.floor((currentTime.getTime() - checkinTime.getTime()) / (1000 * 60));
      
      // Determine idValue based on idType
      const idValue = item.idType === 'sa_id' ? item.saIdNumber : item.passportNumber;
      
      return {
        // Check-in details
        id: item.id,
        checkin_time: item.checkinTime,
        payment_method: item.paymentMethod,
        status: item.status,
        notes: item.notes,
        // Patient details
        patientId: item.patientId,
        firstName: item.firstName,
        lastName: item.lastName,
        phone: item.phone,
        email: item.email,
        idValue: idValue,
        medicalAid: item.medicalAid,
        medicalAidNumber: item.medicalAidNumber,
        // Calculated fields
        waitingTimeMinutes: waitingTimeMinutes
      };
    });

    return NextResponse.json(queueWithWaitingTime, { status: 200 });

  } catch (error) {
    console.error('GET patient queue error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}