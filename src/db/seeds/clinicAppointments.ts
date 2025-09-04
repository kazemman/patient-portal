import { db } from '@/db';
import { clinicAppointments } from '@/db/schema';

async function main() {
    const now = new Date();
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const oneMonthFromNow = new Date(now);
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    const reasons = [
        'Annual Physical Exam',
        'Follow-up Consultation',
        'Blood Work and Lab Tests',
        'Vaccination',
        'Routine Check-up',
        'Diabetes Management',
        'Blood Pressure Check',
        'Cold and Flu Symptoms',
        'Skin Condition Evaluation',
        'Headache Consultation',
        'Joint Pain Assessment',
        'Preventive Care',
        'Medication Review',
        'Heart Health Check',
        'Mental Health Consultation',
        'Allergy Testing',
        'Eye Examination',
        'Physical Therapy Evaluation',
        'Chronic Pain Management',
        'Wellness Consultation'
    ];

    const completedNotes = [
        'Patient responded well to treatment plan. Follow-up in 3 months.',
        'Vital signs normal. Prescribed medication as discussed.',
        'Blood work results reviewed. All levels within normal range.',
        'Patient education provided on lifestyle modifications.',
        'Symptoms improving with current treatment. Continue medications.',
        'Referred to specialist for further evaluation.',
        'Vaccination administered successfully. No adverse reactions.',
        'Routine screening completed. Results pending.',
        'Discussed diet and exercise recommendations.',
        'Patient compliance good. Adjust medication dosage.',
        'Physical examination normal. Continue current care plan.',
        'Lab results discussed. Minor adjustments to treatment.',
        'Chronic condition stable. Next visit in 6 months.',
        'Preventive measures discussed. Schedule annual follow-up.',
        'Symptoms resolved. Return if condition worsens.'
    ];

    const cancellationReasons = [
        'Patient illness - rescheduled',
        'Emergency came up',
        'Transportation issues',
        'Work conflict',
        'Family emergency',
        'Weather conditions',
        'No longer needed',
        'Doctor unavailable'
    ];

    const timeSlots = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00', '17:30'
    ];

    const durations = [15, 30, 45, 60, 90];

    // Generate business days only (skip weekends)
    function getBusinessDays(startDate: Date, endDate: Date): Date[] {
        const businessDays: Date[] = [];
        const current = new Date(startDate);
        
        while (current <= endDate) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip Sunday (0) and Saturday (6)
                businessDays.push(new Date(current));
            }
            current.setDate(current.getDate() + 1);
        }
        
        return businessDays;
    }

    const businessDays = getBusinessDays(twoMonthsAgo, oneMonthFromNow);
    const todayStr = now.toISOString().split('T')[0];
    
    // Track appointments to avoid conflicts
    const scheduledSlots = new Set<string>();

    function generateAppointment(targetDate: Date, statusOptions: string[], isPast: boolean, isToday: boolean) {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            const patientId = Math.floor(Math.random() * 80) + 1;
            const staffId = Math.floor(Math.random() * 20) + 1;
            const appointmentTime = timeSlots[Math.floor(Math.random() * timeSlots.length)];
            const dateStr = targetDate.toISOString().split('T')[0];
            
            const slotKey = `${staffId}-${dateStr}-${appointmentTime}`;
            
            if (!scheduledSlots.has(slotKey)) {
                scheduledSlots.add(slotKey);
                
                const reason = reasons[Math.floor(Math.random() * reasons.length)];
                const duration = durations[Math.floor(Math.random() * durations.length)];
                const departmentId = Math.floor(Math.random() * 10) + 1;
                
                let priority = 'normal';
                const priorityRand = Math.random();
                if (priorityRand < 0.05) priority = 'low';
                else if (priorityRand < 0.20) priority = 'high';
                
                let status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
                let notes = null;
                
                if (status === 'completed') {
                    notes = completedNotes[Math.floor(Math.random() * completedNotes.length)];
                } else if (status === 'cancelled') {
                    notes = cancellationReasons[Math.floor(Math.random() * cancellationReasons.length)];
                } else if (status === 'no-show') {
                    notes = 'Patient did not show up for scheduled appointment';
                }
                
                const createdAt = isPast ? 
                    new Date(targetDate.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() :
                    new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
                
                return {
                    patientId,
                    staffId,
                    appointmentDate: dateStr,
                    appointmentTime,
                    duration,
                    status,
                    reason,
                    notes,
                    departmentId,
                    priority,
                    createdAt,
                    updatedAt: createdAt,
                };
            }
            attempts++;
        }
        return null;
    }

    const sampleAppointments: any[] = [];
    
    // Past appointments (60% of 175 = 105)
    const pastBusinessDays = businessDays.filter(date => date < now);
    const pastStatusOptions = ['completed', 'cancelled', 'no-show'];
    const pastWeights = [0.70, 0.15, 0.15]; // 70% completed, 15% cancelled, 15% no-show
    
    for (let i = 0; i < 105; i++) {
        const randomDay = pastBusinessDays[Math.floor(Math.random() * pastBusinessDays.length)];
        const rand = Math.random();
        let status = 'completed';
        if (rand < pastWeights[2]) status = 'no-show';
        else if (rand < pastWeights[1] + pastWeights[2]) status = 'cancelled';
        
        const appointment = generateAppointment(randomDay, [status], true, false);
        if (appointment) {
            sampleAppointments.push(appointment);
        }
    }
    
    // Today's appointments (15% of 175 = 26)
    const todayStatusOptions = ['scheduled', 'checked-in', 'in-progress', 'completed'];
    for (let i = 0; i < 26; i++) {
        const appointment = generateAppointment(now, todayStatusOptions, false, true);
        if (appointment) {
            sampleAppointments.push(appointment);
        }
    }
    
    // Future appointments (25% of 175 = 44)
    const futureBusinessDays = businessDays.filter(date => date > now);
    for (let i = 0; i < 44; i++) {
        const randomDay = futureBusinessDays[Math.floor(Math.random() * futureBusinessDays.length)];
        const appointment = generateAppointment(randomDay, ['scheduled'], false, false);
        if (appointment) {
            sampleAppointments.push(appointment);
        }
    }

    await db.insert(clinicAppointments).values(sampleAppointments);
    
    console.log('✅ Clinic appointments seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});