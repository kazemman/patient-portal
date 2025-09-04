import { db } from '@/db';
import { clinicAppointments } from '@/db/schema';

async function main() {
    const now = new Date();
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const oneMonthFromNow = new Date(now.getFullYear(), now.getMonth() + 1, 30);
    
    const appointmentReasons = [
        'Annual physical examination',
        'Follow-up for hypertension',
        'Chest pain evaluation',
        'Routine pediatric checkup',
        'Skin rash consultation',
        'Back pain assessment',
        'Medication review',
        'Lab result discussion',
        'Preventive care visit',
        'Diabetes management',
        'Blood pressure monitoring',
        'Allergy consultation',
        'Joint pain evaluation',
        'Respiratory infection',
        'Wound care follow-up',
        'Mental health consultation',
        'Vaccination appointment',
        'Weight management consultation',
        'Headache evaluation',
        'Eye examination',
        'Ear infection treatment',
        'Pregnancy checkup',
        'Thyroid evaluation',
        'Heart palpitation assessment',
        'Digestive issues consultation'
    ];

    const appointmentTypes = [
        { duration: 30, type: 'Routine checkup' },
        { duration: 15, type: 'Follow-up visit' },
        { duration: 30, type: 'Follow-up visit' },
        { duration: 45, type: 'Consultation' },
        { duration: 60, type: 'Consultation' },
        { duration: 60, type: 'Procedure' },
        { duration: 90, type: 'Procedure' },
        { duration: 30, type: 'Emergency visit' },
        { duration: 45, type: 'Emergency visit' }
    ];

    const timeSlots = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00', '17:30'
    ];

    const priorities = ['low', 'normal', 'high'];
    const statuses = ['scheduled', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show'];

    const sampleAppointments = [];
    
    // Track appointments by date and time to avoid conflicts
    const scheduledSlots = new Map();
    
    for (let i = 0; i < 175; i++) {
        // Generate random date within 3-month range
        const randomTime = twoMonthsAgo.getTime() + Math.random() * (oneMonthFromNow.getTime() - twoMonthsAgo.getTime());
        const appointmentDate = new Date(randomTime);
        
        // Skip weekends
        if (appointmentDate.getDay() === 0 || appointmentDate.getDay() === 6) {
            i--;
            continue;
        }
        
        const dateStr = appointmentDate.toISOString().split('T')[0];
        const timeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
        const appointmentType = appointmentTypes[Math.floor(Math.random() * appointmentTypes.length)];
        const reason = appointmentReasons[Math.floor(Math.random() * appointmentReasons.length)];
        
        // Check for scheduling conflicts
        const slotKey = `${dateStr}-${timeSlot}-${Math.floor(Math.random() * 20) + 1}`; // Random staff ID 1-20
        if (scheduledSlots.has(slotKey)) {
            i--;
            continue;
        }
        scheduledSlots.set(slotKey, true);
        
        // Determine status based on date and distribution
        let status;
        const isPast = appointmentDate < now;
        const isToday = dateStr === now.toISOString().split('T')[0];
        const isFuture = appointmentDate > now;
        
        if (isPast) {
            const rand = Math.random();
            if (rand < 0.70) status = 'completed';
            else if (rand < 0.85) status = 'cancelled';
            else status = 'no-show';
        } else if (isToday) {
            const rand = Math.random();
            if (rand < 0.30) status = 'completed';
            else if (rand < 0.45) status = 'in-progress';
            else if (rand < 0.60) status = 'checked-in';
            else status = 'scheduled';
        } else {
            status = 'scheduled';
        }
        
        // Generate notes for completed appointments
        let notes = null;
        if (status === 'completed') {
            const noteOptions = [
                'Patient responded well to treatment. Continue current medication.',
                'Vital signs normal. Recommended follow-up in 3 months.',
                'Lab results reviewed. All values within normal range.',
                'Patient reported improvement in symptoms. Adjusting dosage.',
                'Routine examination completed. No concerns noted.',
                'Patient educated on lifestyle modifications.',
                'Treatment plan updated based on current condition.',
                'Patient compliant with prescribed medication regimen.',
                'Referred to specialist for further evaluation.',
                'Preventive care measures discussed with patient.'
            ];
            notes = noteOptions[Math.floor(Math.random() * noteOptions.length)];
        } else if (status === 'cancelled') {
            const cancelReasons = [
                'Patient cancelled due to scheduling conflict',
                'Cancelled due to patient illness',
                'Rescheduled at patient request',
                'Emergency cancellation',
                'Weather-related cancellation'
            ];
            notes = cancelReasons[Math.floor(Math.random() * cancelReasons.length)];
        }
        
        // Priority distribution
        const priorityRand = Math.random();
        let priority;
        if (priorityRand < 0.10) priority = 'low';
        else if (priorityRand < 0.80) priority = 'normal';
        else priority = 'high';
        
        // CreatedAt should be before appointment date
        const createdDate = new Date(appointmentDate.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        const updatedDate = status === 'scheduled' ? createdDate : new Date(appointmentDate.getTime() + Math.random() * 24 * 60 * 60 * 1000);
        
        sampleAppointments.push({
            patientId: Math.floor(Math.random() * 80) + 1,
            staffId: Math.floor(Math.random() * 20) + 1,
            appointmentDate: dateStr,
            appointmentTime: timeSlot,
            duration: appointmentType.duration,
            status: status,
            reason: reason,
            notes: notes,
            departmentId: Math.floor(Math.random() * 10) + 1,
            priority: priority,
            createdAt: createdDate.toISOString(),
            updatedAt: updatedDate.toISOString(),
        });
    }
    
    // Sort by appointment date for realistic data flow
    sampleAppointments.sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());
    
    await db.insert(clinicAppointments).values(sampleAppointments);
    
    console.log('✅ Clinic appointments seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});