import { db } from '@/db';
import { checkins } from '@/db/schema';

async function main() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(today.getDate() - 2);
    
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);
    
    const fourDaysAgo = new Date(today);
    fourDaysAgo.setDate(today.getDate() - 4);
    
    const fiveDaysAgo = new Date(today);
    fiveDaysAgo.setDate(today.getDate() - 5);

    const sampleCheckins = [
        // Today's check-ins (10 total: 4 attended, 3 waiting, 3 cancelled)
        {
            patientId: 1,
            checkinTime: new Date(today.setHours(8, 15, 0, 0)).toISOString(),
            status: 'attended',
            type: 'appointment',
            notes: 'Arrived early for routine checkup',
            createdAt: new Date(today.setHours(8, 15, 0, 0)).toISOString(),
        },
        {
            patientId: 3,
            checkinTime: new Date(today.setHours(9, 30, 0, 0)).toISOString(),
            status: 'attended',
            type: 'walk-in',
            notes: 'Walk-in consultation for flu symptoms',
            createdAt: new Date(today.setHours(9, 30, 0, 0)).toISOString(),
        },
        {
            patientId: 5,
            checkinTime: new Date(today.setHours(10, 45, 0, 0)).toISOString(),
            status: 'waiting',
            type: 'appointment',
            notes: 'On time for scheduled appointment',
            createdAt: new Date(today.setHours(10, 45, 0, 0)).toISOString(),
        },
        {
            patientId: 7,
            checkinTime: new Date(today.setHours(11, 20, 0, 0)).toISOString(),
            status: 'cancelled',
            type: 'appointment',
            notes: 'No-show for scheduled appointment',
            createdAt: new Date(today.setHours(11, 20, 0, 0)).toISOString(),
        },
        {
            patientId: 9,
            checkinTime: new Date(today.setHours(13, 10, 0, 0)).toISOString(),
            status: 'attended',
            type: 'appointment',
            notes: 'Running 10 minutes late but completed visit',
            createdAt: new Date(today.setHours(13, 10, 0, 0)).toISOString(),
        },
        {
            patientId: 11,
            checkinTime: new Date(today.setHours(14, 30, 0, 0)).toISOString(),
            status: 'waiting',
            type: 'walk-in',
            notes: 'Emergency visit - chest pain',
            createdAt: new Date(today.setHours(14, 30, 0, 0)).toISOString(),
        },
        {
            patientId: 13,
            checkinTime: new Date(today.setHours(15, 45, 0, 0)).toISOString(),
            status: 'cancelled',
            type: 'appointment',
            notes: 'Patient called to cancel last minute',
            createdAt: new Date(today.setHours(15, 45, 0, 0)).toISOString(),
        },
        {
            patientId: 15,
            checkinTime: new Date(today.setHours(16, 15, 0, 0)).toISOString(),
            status: 'waiting',
            type: 'appointment',
            notes: 'Arrived on time for follow-up visit',
            createdAt: new Date(today.setHours(16, 15, 0, 0)).toISOString(),
        },
        {
            patientId: 2,
            checkinTime: new Date(today.setHours(12, 0, 0, 0)).toISOString(),
            status: 'attended',
            type: 'walk-in',
            notes: 'Walk-in for prescription refill',
            createdAt: new Date(today.setHours(12, 0, 0, 0)).toISOString(),
        },
        {
            patientId: 4,
            checkinTime: new Date(today.setHours(16, 50, 0, 0)).toISOString(),
            status: 'cancelled',
            type: 'walk-in',
            notes: 'Left before being seen - long wait time',
            createdAt: new Date(today.setHours(16, 50, 0, 0)).toISOString(),
        },

        // Yesterday's check-ins (5 total - all attended)
        {
            patientId: 6,
            checkinTime: new Date(yesterday.setHours(9, 0, 0, 0)).toISOString(),
            status: 'attended',
            type: 'appointment',
            notes: 'Routine physical exam completed',
            createdAt: new Date(yesterday.setHours(9, 0, 0, 0)).toISOString(),
        },
        {
            patientId: 8,
            checkinTime: new Date(yesterday.setHours(11, 30, 0, 0)).toISOString(),
            status: 'attended',
            type: 'walk-in',
            notes: 'Walk-in for minor injury treatment',
            createdAt: new Date(yesterday.setHours(11, 30, 0, 0)).toISOString(),
        },
        {
            patientId: 10,
            checkinTime: new Date(yesterday.setHours(14, 15, 0, 0)).toISOString(),
            status: 'attended',
            type: 'appointment',
            notes: 'Follow-up visit completed successfully',
            createdAt: new Date(yesterday.setHours(14, 15, 0, 0)).toISOString(),
        },
        {
            patientId: 12,
            checkinTime: new Date(yesterday.setHours(15, 45, 0, 0)).toISOString(),
            status: 'attended',
            type: 'appointment',
            notes: 'Vaccination appointment completed',
            createdAt: new Date(yesterday.setHours(15, 45, 0, 0)).toISOString(),
        },
        {
            patientId: 14,
            checkinTime: new Date(yesterday.setHours(16, 30, 0, 0)).toISOString(),
            status: 'attended',
            type: 'walk-in',
            notes: 'Urgent care visit - completed',
            createdAt: new Date(yesterday.setHours(16, 30, 0, 0)).toISOString(),
        },

        // Earlier this week check-ins (5 total - all attended)
        {
            patientId: 1,
            checkinTime: new Date(dayBeforeYesterday.setHours(10, 0, 0, 0)).toISOString(),
            status: 'attended',
            type: 'appointment',
            notes: 'Scheduled consultation completed',
            createdAt: new Date(dayBeforeYesterday.setHours(10, 0, 0, 0)).toISOString(),
        },
        {
            patientId: 3,
            checkinTime: new Date(threeDaysAgo.setHours(13, 20, 0, 0)).toISOString(),
            status: 'attended',
            type: 'appointment',
            notes: 'Blood work follow-up completed',
            createdAt: new Date(threeDaysAgo.setHours(13, 20, 0, 0)).toISOString(),
        },
        {
            patientId: 7,
            checkinTime: new Date(fourDaysAgo.setHours(11, 45, 0, 0)).toISOString(),
            status: 'attended',
            type: 'walk-in',
            notes: 'Walk-in for medication consultation',
            createdAt: new Date(fourDaysAgo.setHours(11, 45, 0, 0)).toISOString(),
        },
        {
            patientId: 9,
            checkinTime: new Date(fiveDaysAgo.setHours(14, 30, 0, 0)).toISOString(),
            status: 'attended',
            type: 'appointment',
            notes: 'Preventive care visit completed',
            createdAt: new Date(fiveDaysAgo.setHours(14, 30, 0, 0)).toISOString(),
        },
        {
            patientId: 11,
            checkinTime: new Date(fiveDaysAgo.setHours(16, 0, 0, 0)).toISOString(),
            status: 'attended',
            type: 'appointment',
            notes: 'Specialist referral visit completed',
            createdAt: new Date(fiveDaysAgo.setHours(16, 0, 0, 0)).toISOString(),
        }
    ];

    await db.insert(checkins).values(sampleCheckins);
    
    console.log('✅ Checkins seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});