import { db } from '@/db';
import { checkins } from '@/db/schema';

async function main() {
    const now = new Date();
    const sampleCheckins = [];
    
    // Helper function to create realistic check-in times during business hours
    const createCheckinTime = (daysAgo: number, hour: number, minute: number) => {
        const date = new Date(now);
        date.setDate(date.getDate() - daysAgo);
        date.setHours(hour, minute, 0, 0);
        return date.toISOString();
    };

    // Helper function to calculate waiting time based on status
    const getWaitingTime = (status: string) => {
        if (status === 'waiting' || status === 'called') return null;
        if (status === 'no-show') return null;
        return Math.floor(Math.random() * 40) + 5; // 5-45 minutes
    };

    // Day 0 (Today) - Mixed statuses including waiting
    let queueNum = 1;
    const todayCheckins = [
        { patientId: 12, appointmentId: 15, hour: 8, minute: 0, status: 'attended', type: 'appointment', staffId: 1, notes: 'On time arrival, completed check-in process' },
        { patientId: 25, appointmentId: null, hour: 8, minute: 15, status: 'attended', type: 'walk-in', staffId: 2, notes: 'Walk-in patient, minor consultation' },
        { patientId: 33, appointmentId: 18, hour: 8, minute: 30, status: 'waiting', type: 'appointment', staffId: 1, notes: 'Patient checked in, waiting for doctor' },
        { patientId: 41, appointmentId: null, hour: 8, minute: 45, status: 'called', type: 'walk-in', staffId: 3, notes: 'Called to examination room' },
        { patientId: 7, appointmentId: 22, hour: 9, minute: 0, status: 'waiting', type: 'appointment', staffId: 2, notes: 'Regular check-up appointment' },
        { patientId: 56, appointmentId: null, hour: 9, minute: 20, status: 'waiting', type: 'walk-in', staffId: 1, notes: 'Emergency walk-in, prioritized' },
        { patientId: 18, appointmentId: 25, hour: 9, minute: 30, status: 'attended', type: 'appointment', staffId: 3, notes: 'Follow-up appointment completed' },
        { patientId: 62, appointmentId: null, hour: 10, minute: 0, status: 'cancelled', type: 'walk-in', staffId: 2, notes: 'Patient changed mind, left before being seen' },
        { patientId: 29, appointmentId: 28, hour: 10, minute: 15, status: 'waiting', type: 'appointment', staffId: 1, notes: 'Insurance verification in progress' },
        { patientId: 45, appointmentId: null, hour: 10, minute: 30, status: 'attended', type: 'walk-in', staffId: 3, notes: 'Quick consultation, prescription given' },
        { patientId: 38, appointmentId: 31, hour: 12, minute: 0, status: 'waiting', type: 'appointment', staffId: 2, notes: 'Lunch time appointment' },
        { patientId: 51, appointmentId: null, hour: 12, minute: 30, status: 'called', type: 'walk-in', staffId: 1, notes: 'Urgent care needed' },
        { patientId: 14, appointmentId: 35, hour: 14, minute: 0, status: 'waiting', type: 'appointment', staffId: 3, notes: 'Afternoon appointment slot' },
        { patientId: 67, appointmentId: null, hour: 14, minute: 30, status: 'waiting', type: 'walk-in', staffId: 2, notes: 'Walk-in during busy period' },
        { patientId: 23, appointmentId: 38, hour: 15, minute: 0, status: 'called', type: 'appointment', staffId: 1, notes: 'Called for scheduled procedure' }
    ];

    todayCheckins.forEach(checkin => {
        const checkinTime = createCheckinTime(0, checkin.hour, checkin.minute);
        sampleCheckins.push({
            patientId: checkin.patientId,
            appointmentId: checkin.appointmentId,
            checkinTime: checkinTime,
            status: checkin.status,
            queueNumber: queueNum++,
            waitingTime: getWaitingTime(checkin.status),
            staffId: checkin.staffId,
            type: checkin.type,
            notes: checkin.notes,
            createdAt: checkinTime
        });
    });

    // Day 1 (Yesterday) - Mostly completed
    queueNum = 1;
    const yesterdayCheckins = [
        { patientId: 8, appointmentId: 12, hour: 8, minute: 0, status: 'attended', type: 'appointment', staffId: 1, notes: 'Early morning appointment completed' },
        { patientId: 19, appointmentId: null, hour: 8, minute: 20, status: 'attended', type: 'walk-in', staffId: 2, notes: 'Walk-in patient treated successfully' },
        { patientId: 34, appointmentId: 16, hour: 8, minute: 45, status: 'attended', type: 'appointment', staffId: 3, notes: 'Routine check-up completed' },
        { patientId: 47, appointmentId: null, hour: 9, minute: 15, status: 'cancelled', type: 'walk-in', staffId: 1, notes: 'Patient left due to long wait time' },
        { patientId: 26, appointmentId: 21, hour: 9, minute: 30, status: 'attended', type: 'appointment', staffId: 2, notes: 'Blood pressure monitoring visit' },
        { patientId: 53, appointmentId: null, hour: 10, minute: 0, status: 'attended', type: 'walk-in', staffId: 3, notes: 'Minor injury treatment' },
        { patientId: 11, appointmentId: 24, hour: 10, minute: 30, status: 'no-show', type: 'appointment', staffId: 1, notes: 'Patient did not show up for appointment' },
        { patientId: 65, appointmentId: null, hour: 11, minute: 0, status: 'attended', type: 'walk-in', staffId: 2, notes: 'Medication consultation' },
        { patientId: 39, appointmentId: 27, hour: 12, minute: 15, status: 'attended', type: 'appointment', staffId: 3, notes: 'Diabetes follow-up completed' },
        { patientId: 72, appointmentId: null, hour: 12, minute: 45, status: 'cancelled', type: 'walk-in', staffId: 1, notes: 'Emergency came up, patient rescheduled' },
        { patientId: 16, appointmentId: 30, hour: 14, minute: 0, status: 'attended', type: 'appointment', staffId: 2, notes: 'Physical therapy consultation' },
        { patientId: 58, appointmentId: null, hour: 14, minute: 30, status: 'attended', type: 'walk-in', staffId: 3, notes: 'Prescription refill visit' },
        { patientId: 21, appointmentId: 33, hour: 15, minute: 15, status: 'attended', type: 'appointment', staffId: 1, notes: 'Lab results discussion' },
        { patientId: 44, appointmentId: null, hour: 15, minute: 45, status: 'attended', type: 'walk-in', staffId: 2, notes: 'General health inquiry' },
        { patientId: 37, appointmentId: 36, hour: 16, minute: 0, status: 'cancelled', type: 'appointment', staffId: 3, notes: 'Patient called to cancel last minute' }
    ];

    yesterdayCheckins.forEach(checkin => {
        const checkinTime = createCheckinTime(1, checkin.hour, checkin.minute);
        sampleCheckins.push({
            patientId: checkin.patientId,
            appointmentId: checkin.appointmentId,
            checkinTime: checkinTime,
            status: checkin.status,
            queueNumber: queueNum++,
            waitingTime: getWaitingTime(checkin.status),
            staffId: checkin.staffId,
            type: checkin.type,
            notes: checkin.notes,
            createdAt: checkinTime
        });
    });

    // Day 2 - High attendance day
    queueNum = 1;
    const day2Checkins = [
        { patientId: 5, appointmentId: 8, hour: 8, minute: 0, status: 'attended', type: 'appointment', staffId: 1, notes: 'First appointment of the day' },
        { patientId: 42, appointmentId: null, hour: 8, minute: 25, status: 'attended', type: 'walk-in', staffId: 2, notes: 'Urgent care walk-in' },
        { patientId: 28, appointmentId: 11, hour: 8, minute: 45, status: 'attended', type: 'appointment', staffId: 3, notes: 'Pre-surgery consultation' },
        { patientId: 59, appointmentId: null, hour: 9, minute: 10, status: 'attended', type: 'walk-in', staffId: 1, notes: 'Vaccine administration' },
        { patientId: 13, appointmentId: 14, hour: 9, minute: 30, status: 'attended', type: 'appointment', staffId: 2, notes: 'Annual physical examination' },
        { patientId: 68, appointmentId: null, hour: 10, minute: 0, status: 'no-show', type: 'walk-in', staffId: 3, notes: 'Patient registered but never arrived' },
        { patientId: 31, appointmentId: 17, hour: 10, minute: 30, status: 'attended', type: 'appointment', staffId: 1, notes: 'Cardiology follow-up' },
        { patientId: 74, appointmentId: null, hour: 11, minute: 15, status: 'attended', type: 'walk-in', staffId: 2, notes: 'Allergy consultation' },
        { patientId: 46, appointmentId: 20, hour: 12, minute: 0, status: 'attended', type: 'appointment', staffId: 3, notes: 'Lunch hour appointment' },
        { patientId: 9, appointmentId: null, hour: 12, minute: 30, status: 'cancelled', type: 'walk-in', staffId: 1, notes: 'Work emergency, had to leave' },
        { patientId: 52, appointmentId: 23, hour: 14, minute: 15, status: 'attended', type: 'appointment', staffId: 2, notes: 'Orthopedic consultation' },
        { patientId: 66, appointmentId: null, hour: 14, minute: 45, status: 'attended', type: 'walk-in', staffId: 3, notes: 'Skin condition check' },
        { patientId: 27, appointmentId: 26, hour: 15, minute: 0, status: 'attended', type: 'appointment', staffId: 1, notes: 'Mental health check-in' },
        { patientId: 73, appointmentId: null, hour: 15, minute: 30, status: 'attended', type: 'walk-in', staffId: 2, notes: 'Eye examination request' },
        { patientId: 35, appointmentId: 29, hour: 16, minute: 0, status: 'attended', type: 'appointment', staffId: 3, notes: 'End of day appointment' }
    ];

    day2Checkins.forEach(checkin => {
        const checkinTime = createCheckinTime(2, checkin.hour, checkin.minute);
        sampleCheckins.push({
            patientId: checkin.patientId,
            appointmentId: checkin.appointmentId,
            checkinTime: checkinTime,
            status: checkin.status,
            queueNumber: queueNum++,
            waitingTime: getWaitingTime(checkin.status),
            staffId: checkin.staffId,
            type: checkin.type,
            notes: checkin.notes,
            createdAt: checkinTime
        });
    });

    // Day 3 - Mixed activity
    queueNum = 1;
    const day3Checkins = [
        { patientId: 15, appointmentId: 5, hour: 8, minute: 15, status: 'attended', type: 'appointment', staffId: 1, notes: 'Early bird patient' },
        { patientId: 48, appointmentId: null, hour: 8, minute: 40, status: 'attended', type: 'walk-in', staffId: 2, notes: 'Cold symptoms treatment' },
        { patientId: 22, appointmentId: 9, hour: 9, minute: 0, status: 'no-show', type: 'appointment', staffId: 3, notes: 'No call, no show appointment' },
        { patientId: 61, appointmentId: null, hour: 9, minute: 30, status: 'attended', type: 'walk-in', staffId: 1, notes: 'Blood pressure check' },
        { patientId: 36, appointmentId: 13, hour: 10, minute: 0, status: 'attended', type: 'appointment', staffId: 2, notes: 'Prescription review meeting' },
        { patientId: 70, appointmentId: null, hour: 10, minute: 45, status: 'cancelled', type: 'walk-in', staffId: 3, notes: 'Insurance issues, postponed visit' },
        { patientId: 17, appointmentId: 18, hour: 11, minute: 15, status: 'attended', type: 'appointment', staffId: 1, notes: 'Specialist referral discussion' },
        { patientId: 55, appointmentId: null, hour: 12, minute: 0, status: 'attended', type: 'walk-in', staffId: 2, notes: 'Nutrition counseling' },
        { patientId: 24, appointmentId: 22, hour: 14, minute: 30, status: 'attended', type: 'appointment', staffId: 3, notes: 'Post-operative check' },
        { patientId: 63, appointmentId: null, hour: 15, minute: 15, status: 'attended', type: 'walk-in', staffId: 1, notes: 'Travel medicine consultation' },
        { patientId: 40, appointmentId: 25, hour: 15, minute: 45, status: 'cancelled', type: 'appointment', staffId: 2, notes: 'Family emergency cancellation' }
    ];

    day3Checkins.forEach(checkin => {
        const checkinTime = createCheckinTime(3, checkin.hour, checkin.minute);
        sampleCheckins.push({
            patientId: checkin.patientId,
            appointmentId: checkin.appointmentId,
            checkinTime: checkinTime,
            status: checkin.status,
            queueNumber: queueNum++,
            waitingTime: getWaitingTime(checkin.status),
            staffId: checkin.staffId,
            type: checkin.type,
            notes: checkin.notes,
            createdAt: checkinTime
        });
    });

    // Day 4 - Busy Friday
    queueNum = 1;
    const day4Checkins = [
        { patientId: 6, appointmentId: 3, hour: 8, minute: 0, status: 'attended', type: 'appointment', staffId: 1, notes: 'Friday morning rush start' },
        { patientId: 49, appointmentId: null, hour: 8, minute: 20, status: 'attended', type: 'walk-in', staffId: 2, notes: 'Weekend preparation visit' },
        { patientId: 32, appointmentId: 7, hour: 8, minute: 45, status: 'attended', type: 'appointment', staffId: 3, notes: 'Weekly medication review' },
        { patientId: 69, appointmentId: null, hour: 9, minute: 10, status: 'attended', type: 'walk-in', staffId: 1, notes: 'Sports injury assessment' },
        { patientId: 20, appointmentId: 12, hour: 9, minute: 30, status: 'attended', type: 'appointment', staffId: 2, notes: 'Chronic condition management' },
        { patientId: 57, appointmentId: null, hour: 10, minute: 0, status: 'attended', type: 'walk-in', staffId: 3, notes: 'Flu shot administration' },
        { patientId: 43, appointmentId: 15, hour: 10, minute: 30, status: 'no-show', type: 'appointment', staffId: 1, notes: 'Patient overslept, missed appointment' },
        { patientId: 71, appointmentId: null, hour: 11, minute: 0, status: 'attended', type: 'walk-in', staffId: 2, notes: 'Pregnancy test consultation' },
        { patientId: 30, appointmentId: 19, hour: 12, minute: 15, status: 'attended', type: 'appointment', staffId: 3, notes: 'Pre-weekend check-up' },
        { patientId: 64, appointmentId: null, hour: 12, minute: 45, status: 'attended', type: 'walk-in', staffId: 1, notes: 'Emergency contraception consult' },
        { patientId: 18, appointmentId: 23, hour: 14, minute: 0, status: 'attended', type: 'appointment', staffId: 2, notes: 'Physical therapy evaluation' },
        { patientId: 75, appointmentId: null, hour: 14, minute: 30, status: 'cancelled', type: 'walk-in', staffId: 3, notes: 'Traffic delay, could not wait' },
        { patientId: 41, appointmentId: 27, hour: 15, minute: 15, status: 'attended', type: 'appointment', staffId: 1, notes: 'End of week wrap-up visit' }
    ];

    day4Checkins.forEach(checkin => {
        const checkinTime = createCheckinTime(4, checkin.hour, checkin.minute);
        sampleCheckins.push({
            patientId: checkin.patientId,
            appointmentId: checkin.appointmentId,
            checkinTime: checkinTime,
            status: checkin.status,
            queueNumber: queueNum++,
            waitingTime: getWaitingTime(checkin.status),
            staffId: checkin.staffId,
            type: checkin.type,
            notes: checkin.notes,
            createdAt: checkinTime
        });
    });

    // Day 5 - Moderate Monday
    queueNum = 1;
    const day5Checkins = [
        { patientId: 10, appointmentId: 4, hour: 8, minute: 30, status: 'attended', type: 'appointment', staffId: 1, notes: 'Monday morning appointment' },
        { patientId: 54, appointmentId: null, hour: 9, minute: 0, status: 'attended', type: 'walk-in', staffId: 2, notes: 'Weekend injury follow-up' },
        { patientId: 25, appointmentId: 10, hour: 9, minute: 45, status: 'attended', type: 'appointment', staffId: 3, notes: 'Routine blood work review' },
        { patientId: 67, appointmentId: null, hour: 10, minute: 15, status: 'cancelled', type: 'walk-in', staffId: 1, notes: 'Child care issues, rescheduled' },
        { patientId: 38, appointmentId: 16, hour: 11, minute: 0, status: 'attended', type: 'appointment', staffId: 2, notes: 'Hypertension monitoring' },
        { patientId: 76, appointmentId: null, hour: 12, minute: 0, status: 'attended', type: 'walk-in', staffId: 3, notes: 'Workplace injury assessment' },
        { patientId: 14, appointmentId: 21, hour: 14, minute: 30, status: 'attended', type: 'appointment', staffId: 1, notes: 'Afternoon therapy session' },
        { patientId: 58, appointmentId: null, hour: 15, minute: 0, status: 'no-show', type: 'walk-in', staffId: 2, notes: 'Registered online but no arrival' }
    ];

    day5Checkins.forEach(checkin => {
        const checkinTime = createCheckinTime(5, checkin.hour, checkin.minute);
        sampleCheckins.push({
            patientId: checkin.patientId,
            appointmentId: checkin.appointmentId,
            checkinTime: checkinTime,
            status: checkin.status,
            queueNumber: queueNum++,
            waitingTime: getWaitingTime(checkin.status),
            staffId: checkin.staffId,
            type: checkin.type,
            notes: checkin.notes,
            createdAt: checkinTime
        });
    });

    // Day 6 - Light Sunday
    queueNum = 1;
    const day6Checkins = [
        { patientId: 45, appointmentId: null, hour: 10, minute: 0, status: 'attended', type: 'walk-in', staffId: 1, notes: 'Sunday emergency visit' },
        { patientId: 33, appointmentId: 6, hour: 11, minute: 0, status: 'attended', type: 'appointment', staffId: 2, notes: 'Weekend appointment slot' },
        { patientId: 78, appointmentId: null, hour: 12, minute: 30, status: 'attended', type: 'walk-in', staffId: 3, notes: 'Minor cut treatment' },
        { patientId: 19, appointmentId: 14, hour: 14, minute: 0, status: 'cancelled', type: 'appointment', staffId: 1, notes: 'Family plans conflicted' },
        { patientId: 62, appointmentId: null, hour: 15, minute: 30, status: 'attended', type: 'walk-in', staffId: 2, notes: 'Sunday walk-in service' }
    ];

    day6Checkins.forEach(checkin => {
        const checkinTime = createCheckinTime(6, checkin.hour, checkin.minute);
        sampleCheckins.push({
            patientId: checkin.patientId,
            appointmentId: checkin.appointmentId,
            checkinTime: checkinTime,
            status: checkin.status,
            queueNumber: queueNum++,
            waitingTime: getWaitingTime(checkin.status),
            staffId: checkin.staffId,
            type: checkin.type,
            notes: checkin.notes,
            createdAt: checkinTime
        });
    });

    await db.insert(checkins).values(sampleCheckins);
    
    console.log('✅ Clinic check-ins seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});