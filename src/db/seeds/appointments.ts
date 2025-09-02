import { db } from '@/db';
import { appointments } from '@/db/schema';

async function main() {
    const appointmentReasons = [
        'General checkup',
        'Follow-up consultation', 
        'Blood pressure check',
        'Diabetes monitoring',
        'Vaccination',
        'Physical therapy',
        'Dermatology consultation',
        'Cardiology review',
        'Dental cleaning',
        'Eye examination',
        'Annual physical',
        'Medication review',
        'Lab results discussion',
        'Chronic pain management',
        'Preventive screening'
    ];

    const sampleNotes = [
        'Patient reported improvement in symptoms',
        'Needs follow-up in 2 weeks',
        'Blood pressure slightly elevated',
        'Prescription updated',
        'Patient cancelled due to travel',
        'No-show - reschedule needed',
        'Completed routine examination',
        'Discussed treatment options',
        'Patient satisfied with progress',
        'Requires additional testing',
        'Normal vital signs recorded',
        'Patient education provided',
        'Treatment plan reviewed',
        'Symptoms have improved significantly',
        'Referred to specialist'
    ];

    const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    
    const getRandomDate = (startDate: Date, endDate: Date): Date => {
        const start = startDate.getTime();
        const end = endDate.getTime();
        return new Date(start + Math.random() * (end - start));
    };

    const getBusinessHour = (): string => {
        const hours = [8, 9, 10, 11, 13, 14, 15, 16, 17];
        const minutes = [0, 15, 30, 45];
        const hour = getRandomElement(hours);
        const minute = getRandomElement(minutes);
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    };

    const getEveningHour = (): string => {
        const hours = [18, 19, 20];
        const minutes = [0, 30];
        const hour = getRandomElement(hours);
        const minute = getRandomElement(minutes);
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    };

    const getDuration = (): number => {
        const rand = Math.random();
        if (rand < 0.8) return 30; // 80% standard
        if (rand < 0.95) return Math.random() < 0.5 ? 45 : 60; // 15% longer
        return 15; // 5% short
    };

    const sampleAppointments = [];
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    const threeMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());

    // Track patient appointment counts for realistic distribution
    const patientAppointmentCounts = new Array(60).fill(0);

    for (let i = 0; i < 250; i++) {
        // Select patient ID (1-60) with weighted distribution for repeat patients
        let patientId;
        if (Math.random() < 0.3) {
            // 30% chance to give appointment to patient who already has one
            const patientsWithAppointments = patientAppointmentCounts
                .map((count, index) => count > 0 ? index + 1 : null)
                .filter(id => id !== null);
            
            if (patientsWithAppointments.length > 0) {
                patientId = getRandomElement(patientsWithAppointments);
            } else {
                patientId = Math.floor(Math.random() * 60) + 1;
            }
        } else {
            // 70% chance for any patient
            patientId = Math.floor(Math.random() * 60) + 1;
        }
        
        patientAppointmentCounts[patientId - 1]++;

        // Determine if past or future appointment (60% past, 40% future)
        const isPast = Math.random() < 0.6;
        
        let appointmentDate: Date;
        let status: string;
        
        if (isPast) {
            appointmentDate = getRandomDate(sixMonthsAgo, now);
            // Past appointments: 60% completed, 20% cancelled, 15% no_show, 5% scheduled (missed)
            const statusRand = Math.random();
            if (statusRand < 0.6) status = 'completed';
            else if (statusRand < 0.8) status = 'cancelled';
            else if (statusRand < 0.95) status = 'no_show';
            else status = 'scheduled';
        } else {
            appointmentDate = getRandomDate(now, threeMonthsFromNow);
            // Future appointments: 90% scheduled, 10% cancelled
            status = Math.random() < 0.9 ? 'scheduled' : 'cancelled';
        }

        // Set appointment time (mostly business hours, some evening)
        const timeSlot = Math.random() < 0.85 ? getBusinessHour() : getEveningHour();
        
        // Occasionally add weekend appointments
        if (Math.random() < 0.1) {
            const day = appointmentDate.getDay();
            if (day !== 0 && day !== 6) { // If not already weekend
                appointmentDate.setDate(appointmentDate.getDate() + (6 - day)); // Move to Saturday
            }
        }

        // Set full datetime
        const [hours, minutes] = timeSlot.split(':').map(Number);
        appointmentDate.setHours(hours, minutes, 0, 0);

        // Generate appropriate notes based on status
        let notes = '';
        if (status === 'completed') {
            notes = getRandomElement([
                'Patient reported improvement in symptoms',
                'Completed routine examination',
                'Discussed treatment options',
                'Patient satisfied with progress',
                'Normal vital signs recorded',
                'Patient education provided',
                'Treatment plan reviewed',
                'Symptoms have improved significantly'
            ]);
        } else if (status === 'cancelled') {
            notes = getRandomElement([
                'Patient cancelled due to travel',
                'Rescheduled due to emergency',
                'Patient requested cancellation',
                'Cancelled due to illness'
            ]);
        } else if (status === 'no_show') {
            notes = getRandomElement([
                'No-show - reschedule needed',
                'Patient did not attend',
                'Failed to show up for appointment'
            ]);
        } else if (status === 'scheduled') {
            notes = isPast ? 'Missed appointment - needs follow-up' : 'Appointment confirmed';
        }

        const createdAt = new Date(appointmentDate.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
        const updatedAt = status === 'scheduled' ? createdAt : 
            new Date(appointmentDate.getTime() + Math.random() * 24 * 60 * 60 * 1000);

        sampleAppointments.push({
            patientId,
            appointmentDate: appointmentDate.toISOString(),
            durationMinutes: getDuration(),
            reason: getRandomElement(appointmentReasons),
            notes,
            status,
            createdAt: createdAt.toISOString(),
            updatedAt: updatedAt.toISOString(),
        });
    }

    // Sort appointments by date for better data organization
    sampleAppointments.sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());

    await db.insert(appointments).values(sampleAppointments);
    
    console.log('✅ Appointments seeder completed successfully - 250 appointments created');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});