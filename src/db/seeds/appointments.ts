import { db } from '@/db';
import { appointments } from '@/db/schema';

async function main() {
    const doctors = [
        'Dr. Sarah Johnson',
        'Dr. Michael Chen',
        'Dr. Emily Rodriguez',
        'Dr. David Thompson',
        'Dr. Lisa Park',
        'Dr. James Wilson',
        'Dr. Maria Garcia',
        'Dr. Robert Kim'
    ];

    const appointmentTypes = [
        'Annual Physical',
        'Follow-up Visit',
        'Blood Work',
        'Vaccination',
        'Consultation',
        'Specialist Referral',
        'Preventive Care',
        'Symptom Evaluation'
    ];

    const businessHours = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
        '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
        '17:00', '17:30'
    ];

    const reasonsAndNotes = {
        'Annual Physical': {
            reason: 'Annual physical examination and health screening',
            notes: 'Complete physical exam including vital signs, blood pressure check, and general health assessment'
        },
        'Follow-up Visit': {
            reason: 'Follow-up appointment to review treatment progress',
            notes: 'Patient showing good improvement. Continue current treatment plan and monitor symptoms'
        },
        'Blood Work': {
            reason: 'Laboratory blood work and testing',
            notes: 'Routine blood panel including CBC, lipid profile, and glucose levels'
        },
        'Vaccination': {
            reason: 'Scheduled vaccination appointment',
            notes: 'Annual flu shot administered. Patient advised about potential mild side effects'
        },
        'Consultation': {
            reason: 'Medical consultation for health concerns',
            notes: 'Discussed symptoms and medical history. Recommended further evaluation if symptoms persist'
        },
        'Specialist Referral': {
            reason: 'Referral to specialist for specialized care',
            notes: 'Patient referred to cardiology for further evaluation of irregular heartbeat'
        },
        'Preventive Care': {
            reason: 'Preventive care and health maintenance',
            notes: 'Discussed lifestyle modifications, diet, and exercise recommendations'
        },
        'Symptom Evaluation': {
            reason: 'Evaluation of reported symptoms',
            notes: 'Patient reported mild chest discomfort. EKG normal, advised to monitor and return if worsens'
        }
    };

    const getRandomDate = (startDate: Date, endDate: Date) => {
        const start = startDate.getTime();
        const end = endDate.getTime();
        const randomTime = start + Math.random() * (end - start);
        return new Date(randomTime);
    };

    const getRandomElement = (array: any[]) => {
        return array[Math.floor(Math.random() * array.length)];
    };

    const today = new Date();
    const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const twoMonthsFromNow = new Date(today.getFullYear(), today.getMonth() + 2, 28);

    const sampleAppointments = [];

    // Generate 35 appointments for 8 patients (patientId 1-8)
    for (let i = 0; i < 35; i++) {
        const patientId = (i % 8) + 1; // Cycle through patients 1-8
        const appointmentType = getRandomElement(appointmentTypes);
        const doctor = getRandomElement(doctors);
        const time = getRandomElement(businessHours);
        
        let status: string;
        let appointmentDate: Date;
        
        // Determine status and date based on distribution
        const statusRand = Math.random();
        if (statusRand < 0.60) {
            // 60% completed (past appointments)
            status = 'completed';
            appointmentDate = getRandomDate(twoMonthsAgo, today);
        } else if (statusRand < 0.85) {
            // 25% scheduled (future appointments)
            status = 'scheduled';
            appointmentDate = getRandomDate(new Date(today.getTime() + 24 * 60 * 60 * 1000), twoMonthsFromNow);
        } else {
            // 15% cancelled
            status = 'cancelled';
            appointmentDate = getRandomDate(twoMonthsAgo, twoMonthsFromNow);
        }

        const reasonData = reasonsAndNotes[appointmentType as keyof typeof reasonsAndNotes];
        
        sampleAppointments.push({
            patientId,
            doctorName: doctor,
            appointmentDate: appointmentDate.toISOString().split('T')[0],
            appointmentTime: time,
            status,
            reason: reasonData.reason,
            notes: status === 'cancelled' ? 'Appointment cancelled by patient' : reasonData.notes,
            createdAt: new Date(appointmentDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
        });
    }

    // Sort appointments by date to make data more realistic
    sampleAppointments.sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());

    await db.insert(appointments).values(sampleAppointments);
    
    console.log('✅ Appointments seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});