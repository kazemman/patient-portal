import { db } from '@/db';
import { checkins } from '@/db/schema';

async function main() {
    const now = new Date();
    const sampleCheckins = [];

    // Helper function to get a date N days ago
    const getDaysAgo = (days: number) => {
        const date = new Date(now);
        date.setDate(date.getDate() - days);
        return date;
    };

    // Helper function to generate random time within business hours (8:00-17:00)
    const getRandomBusinessTime = (baseDate: Date) => {
        const hour = Math.floor(Math.random() * 9) + 8; // 8-16 hours
        const minute = Math.floor(Math.random() * 60);
        const date = new Date(baseDate);
        date.setHours(hour, minute, 0, 0);
        return date.toISOString();
    };

    // Helper function to get random patient ID (1-80)
    const getRandomPatientId = () => Math.floor(Math.random() * 80) + 1;

    // Helper function to get random staff ID (1-20)
    const getRandomStaffId = () => Math.floor(Math.random() * 20) + 1;

    // Helper function to get random appointment ID or null (70% appointment, 30% null for walk-ins)
    const getRandomAppointmentId = () => Math.random() < 0.7 ? Math.floor(Math.random() * 100) + 1 : null;

    // Helper function to get realistic waiting time based on status
    const getWaitingTime = (status: string) => {
        if (status === 'attended') return Math.floor(Math.random() * 40) + 5; // 5-45 minutes
        if (status === 'cancelled' || status === 'no-show') return Math.floor(Math.random() * 15) + 5; // 5-20 minutes
        return null; // waiting or called don't have waiting time yet
    };

    // Helper function to generate contextual notes
    const generateNotes = (status: string, type: string) => {
        const appointmentNotes = [
            'Regular checkup appointment',
            'Follow-up visit as scheduled',
            'Annual physical examination',
            'Routine consultation',
            'Scheduled medical review'
        ];
        
        const walkinNotes = [
            'Walk-in patient - minor complaint',
            'Urgent care - no appointment',
            'Emergency visit - immediate attention',
            'Walk-in for prescription refill',
            'Unscheduled visit - acute symptoms'
        ];

        const statusNotes = {
            'waiting': 'Patient checked in, waiting to be called',
            'called': 'Patient has been called, proceeding to examination',
            'attended': 'Visit completed successfully',
            'cancelled': 'Appointment cancelled by patient',
            'no-show': 'Patient did not arrive for scheduled appointment'
        };

        const baseNote = type === 'appointment' ? 
            appointmentNotes[Math.floor(Math.random() * appointmentNotes.length)] :
            walkinNotes[Math.floor(Math.random() * walkinNotes.length)];

        return `${baseNote}. ${statusNotes[status]}`;
    };

    let totalCheckins = 0;

    // Day 7 (oldest): 15 check-ins, all completed/cancelled
    const day7 = getDaysAgo(6);
    for (let i = 1; i <= 15; i++) {
        const status = Math.random() < 0.8 ? 'attended' : Math.random() < 0.5 ? 'cancelled' : 'no-show';
        const type = Math.random() < 0.7 ? 'appointment' : 'walk-in';
        const appointmentId = type === 'appointment' ? getRandomAppointmentId() : null;
        
        sampleCheckins.push({
            patientId: getRandomPatientId(),
            appointmentId,
            checkinTime: getRandomBusinessTime(day7),
            status,
            queueNumber: i,
            waitingTime: getWaitingTime(status),
            staffId: status !== 'no-show' ? getRandomStaffId() : null,
            type,
            notes: generateNotes(status, type),
            createdAt: getRandomBusinessTime(day7)
        });
    }
    totalCheckins += 15;

    // Day 6: 18 check-ins, mostly completed
    const day6 = getDaysAgo(5);
    for (let i = 1; i <= 18; i++) {
        const status = Math.random() < 0.85 ? 'attended' : Math.random() < 0.6 ? 'cancelled' : 'no-show';
        const type = Math.random() < 0.7 ? 'appointment' : 'walk-in';
        const appointmentId = type === 'appointment' ? getRandomAppointmentId() : null;
        
        sampleCheckins.push({
            patientId: getRandomPatientId(),
            appointmentId,
            checkinTime: getRandomBusinessTime(day6),
            status,
            queueNumber: i,
            waitingTime: getWaitingTime(status),
            staffId: status !== 'no-show' ? getRandomStaffId() : null,
            type,
            notes: generateNotes(status, type),
            createdAt: getRandomBusinessTime(day6)
        });
    }
    totalCheckins += 18;

    // Day 5: 16 check-ins, all completed/cancelled
    const day5 = getDaysAgo(4);
    for (let i = 1; i <= 16; i++) {
        const status = Math.random() < 0.8 ? 'attended' : Math.random() < 0.5 ? 'cancelled' : 'no-show';
        const type = Math.random() < 0.7 ? 'appointment' : 'walk-in';
        const appointmentId = type === 'appointment' ? getRandomAppointmentId() : null;
        
        sampleCheckins.push({
            patientId: getRandomPatientId(),
            appointmentId,
            checkinTime: getRandomBusinessTime(day5),
            status,
            queueNumber: i,
            waitingTime: getWaitingTime(status),
            staffId: status !== 'no-show' ? getRandomStaffId() : null,
            type,
            notes: generateNotes(status, type),
            createdAt: getRandomBusinessTime(day5)
        });
    }
    totalCheckins += 16;

    // Day 4: 14 check-ins, all completed/cancelled
    const day4 = getDaysAgo(3);
    for (let i = 1; i <= 14; i++) {
        const status = Math.random() < 0.8 ? 'attended' : Math.random() < 0.5 ? 'cancelled' : 'no-show';
        const type = Math.random() < 0.7 ? 'appointment' : 'walk-in';
        const appointmentId = type === 'appointment' ? getRandomAppointmentId() : null;
        
        sampleCheckins.push({
            patientId: getRandomPatientId(),
            appointmentId,
            checkinTime: getRandomBusinessTime(day4),
            status,
            queueNumber: i,
            waitingTime: getWaitingTime(status),
            staffId: status !== 'no-show' ? getRandomStaffId() : null,
            type,
            notes: generateNotes(status, type),
            createdAt: getRandomBusinessTime(day4)
        });
    }
    totalCheckins += 14;

    // Day 3: 17 check-ins, all completed/cancelled
    const day3 = getDaysAgo(2);
    for (let i = 1; i <= 17; i++) {
        const status = Math.random() < 0.8 ? 'attended' : Math.random() < 0.5 ? 'cancelled' : 'no-show';
        const type = Math.random() < 0.7 ? 'appointment' : 'walk-in';
        const appointmentId = type === 'appointment' ? getRandomAppointmentId() : null;
        
        sampleCheckins.push({
            patientId: getRandomPatientId(),
            appointmentId,
            checkinTime: getRandomBusinessTime(day3),
            status,
            queueNumber: i,
            waitingTime: getWaitingTime(status),
            staffId: status !== 'no-show' ? getRandomStaffId() : null,
            type,
            notes: generateNotes(status, type),
            createdAt: getRandomBusinessTime(day3)
        });
    }
    totalCheckins += 17;

    // Day 2: 19 check-ins, all completed/cancelled
    const day2 = getDaysAgo(1);
    for (let i = 1; i <= 19; i++) {
        const status = Math.random() < 0.8 ? 'attended' : Math.random() < 0.5 ? 'cancelled' : 'no-show';
        const type = Math.random() < 0.7 ? 'appointment' : 'walk-in';
        const appointmentId = type === 'appointment' ? getRandomAppointmentId() : null;
        
        sampleCheckins.push({
            patientId: getRandomPatientId(),
            appointmentId,
            checkinTime: getRandomBusinessTime(day2),
            status,
            queueNumber: i,
            waitingTime: getWaitingTime(status),
            staffId: status !== 'no-show' ? getRandomStaffId() : null,
            type,
            notes: generateNotes(status, type),
            createdAt: getRandomBusinessTime(day2)
        });
    }
    totalCheckins += 19;

    // Today: 15 check-ins with mixed statuses (5 completed, 3 called, 7 waiting)
    const today = new Date();
    
    // 5 completed check-ins
    for (let i = 1; i <= 5; i++) {
        const type = Math.random() < 0.7 ? 'appointment' : 'walk-in';
        const appointmentId = type === 'appointment' ? getRandomAppointmentId() : null;
        
        sampleCheckins.push({
            patientId: getRandomPatientId(),
            appointmentId,
            checkinTime: getRandomBusinessTime(today),
            status: 'attended',
            queueNumber: i,
            waitingTime: getWaitingTime('attended'),
            staffId: getRandomStaffId(),
            type,
            notes: generateNotes('attended', type),
            createdAt: getRandomBusinessTime(today)
        });
    }

    // 3 called check-ins
    for (let i = 6; i <= 8; i++) {
        const type = Math.random() < 0.7 ? 'appointment' : 'walk-in';
        const appointmentId = type === 'appointment' ? getRandomAppointmentId() : null;
        
        sampleCheckins.push({
            patientId: getRandomPatientId(),
            appointmentId,
            checkinTime: getRandomBusinessTime(today),
            status: 'called',
            queueNumber: i,
            waitingTime: null,
            staffId: getRandomStaffId(),
            type,
            notes: generateNotes('called', type),
            createdAt: getRandomBusinessTime(today)
        });
    }

    // 7 waiting check-ins
    for (let i = 9; i <= 15; i++) {
        const type = Math.random() < 0.7 ? 'appointment' : 'walk-in';
        const appointmentId = type === 'appointment' ? getRandomAppointmentId() : null;
        
        sampleCheckins.push({
            patientId: getRandomPatientId(),
            appointmentId,
            checkinTime: getRandomBusinessTime(today),
            status: 'waiting',
            queueNumber: i,
            waitingTime: null,
            staffId: null,
            type,
            notes: generateNotes('waiting', type),
            createdAt: getRandomBusinessTime(today)
        });
    }
    totalCheckins += 15;

    await db.insert(checkins).values(sampleCheckins);
    
    console.log(`✅ Check-ins seeder completed successfully. Generated ${totalCheckins} check-in records spanning 7 days.`);
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});