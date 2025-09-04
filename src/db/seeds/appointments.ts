import { db } from '@/db';
import { appointments } from '@/db/schema';

async function main() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const appointmentNotes = [
        'Regular checkup',
        'Follow-up visit',
        'Blood pressure monitoring',
        'Vaccination',
        'Consultation',
        'Physical examination',
        'Lab results review',
        'Medication adjustment',
        'Preventive care visit',
        'Symptom evaluation',
        'Chronic condition management',
        'Wellness check',
        'Treatment follow-up',
        'Health screening',
        'Annual physical'
    ];

    const clinicTimes = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
        '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
        '17:00', '17:30'
    ];

    const sampleAppointments = [
        // Today's appointments - 8 total (3 completed, 2 scheduled, 3 cancelled)
        {
            patientId: 1,
            appointmentDate: `${today.toISOString().split('T')[0]}T08:00:00.000Z`,
            status: 'completed',
            notes: 'Regular checkup',
            createdAt: new Date('2024-01-10').toISOString(),
        },
        {
            patientId: 3,
            appointmentDate: `${today.toISOString().split('T')[0]}T09:30:00.000Z`,
            status: 'completed',
            notes: 'Blood pressure monitoring',
            createdAt: new Date('2024-01-11').toISOString(),
        },
        {
            patientId: 5,
            appointmentDate: `${today.toISOString().split('T')[0]}T11:00:00.000Z`,
            status: 'completed',
            notes: 'Follow-up visit',
            createdAt: new Date('2024-01-12').toISOString(),
        },
        {
            patientId: 7,
            appointmentDate: `${today.toISOString().split('T')[0]}T13:00:00.000Z`,
            status: 'scheduled',
            notes: 'Vaccination',
            createdAt: new Date('2024-01-13').toISOString(),
        },
        {
            patientId: 9,
            appointmentDate: `${today.toISOString().split('T')[0]}T14:30:00.000Z`,
            status: 'scheduled',
            notes: 'Consultation',
            createdAt: new Date('2024-01-14').toISOString(),
        },
        {
            patientId: 11,
            appointmentDate: `${today.toISOString().split('T')[0]}T10:00:00.000Z`,
            status: 'cancelled',
            notes: 'Physical examination',
            createdAt: new Date('2024-01-15').toISOString(),
        },
        {
            patientId: 13,
            appointmentDate: `${today.toISOString().split('T')[0]}T15:30:00.000Z`,
            status: 'cancelled',
            notes: 'Lab results review',
            createdAt: new Date('2024-01-16').toISOString(),
        },
        {
            patientId: 15,
            appointmentDate: `${today.toISOString().split('T')[0]}T17:00:00.000Z`,
            status: 'cancelled',
            notes: 'Medication adjustment',
            createdAt: new Date('2024-01-17').toISOString(),
        },

        // Yesterday's appointments - 5 total (all completed)
        {
            patientId: 2,
            appointmentDate: `${yesterday.toISOString().split('T')[0]}T09:00:00.000Z`,
            status: 'completed',
            notes: 'Annual physical',
            createdAt: new Date('2024-01-08').toISOString(),
        },
        {
            patientId: 4,
            appointmentDate: `${yesterday.toISOString().split('T')[0]}T11:30:00.000Z`,
            status: 'completed',
            notes: 'Chronic condition management',
            createdAt: new Date('2024-01-09').toISOString(),
        },
        {
            patientId: 6,
            appointmentDate: `${yesterday.toISOString().split('T')[0]}T14:00:00.000Z`,
            status: 'completed',
            notes: 'Symptom evaluation',
            createdAt: new Date('2024-01-10').toISOString(),
        },
        {
            patientId: 8,
            appointmentDate: `${yesterday.toISOString().split('T')[0]}T15:30:00.000Z`,
            status: 'completed',
            notes: 'Wellness check',
            createdAt: new Date('2024-01-11').toISOString(),
        },
        {
            patientId: 10,
            appointmentDate: `${yesterday.toISOString().split('T')[0]}T16:30:00.000Z`,
            status: 'completed',
            notes: 'Treatment follow-up',
            createdAt: new Date('2024-01-12').toISOString(),
        },

        // Tomorrow's appointments - 7 total (all scheduled)
        {
            patientId: 1,
            appointmentDate: `${tomorrow.toISOString().split('T')[0]}T08:30:00.000Z`,
            status: 'scheduled',
            notes: 'Health screening',
            createdAt: new Date('2024-01-18').toISOString(),
        },
        {
            patientId: 12,
            appointmentDate: `${tomorrow.toISOString().split('T')[0]}T10:30:00.000Z`,
            status: 'scheduled',
            notes: 'Regular checkup',
            createdAt: new Date('2024-01-19').toISOString(),
        },
        {
            patientId: 14,
            appointmentDate: `${tomorrow.toISOString().split('T')[0]}T12:00:00.000Z`,
            status: 'scheduled',
            notes: 'Preventive care visit',
            createdAt: new Date('2024-01-20').toISOString(),
        },
        {
            patientId: 3,
            appointmentDate: `${tomorrow.toISOString().split('T')[0]}T13:30:00.000Z`,
            status: 'scheduled',
            notes: 'Follow-up visit',
            createdAt: new Date('2024-01-21').toISOString(),
        },
        {
            patientId: 5,
            appointmentDate: `${tomorrow.toISOString().split('T')[0]}T15:00:00.000Z`,
            status: 'scheduled',
            notes: 'Blood pressure monitoring',
            createdAt: new Date('2024-01-22').toISOString(),
        },
        {
            patientId: 7,
            appointmentDate: `${tomorrow.toISOString().split('T')[0]}T16:00:00.000Z`,
            status: 'scheduled',
            notes: 'Consultation',
            createdAt: new Date('2024-01-23').toISOString(),
        },
        {
            patientId: 9,
            appointmentDate: `${tomorrow.toISOString().split('T')[0]}T17:30:00.000Z`,
            status: 'scheduled',
            notes: 'Vaccination',
            createdAt: new Date('2024-01-24').toISOString(),
        },

        // Next week's appointments - 5 total (all scheduled)
        {
            patientId: 11,
            appointmentDate: `${nextWeek.toISOString().split('T')[0]}T09:00:00.000Z`,
            status: 'scheduled',
            notes: 'Physical examination',
            createdAt: new Date('2024-01-25').toISOString(),
        },
        {
            patientId: 13,
            appointmentDate: `${nextWeek.toISOString().split('T')[0]}T11:00:00.000Z`,
            status: 'scheduled',
            notes: 'Lab results review',
            createdAt: new Date('2024-01-26').toISOString(),
        },
        {
            patientId: 15,
            appointmentDate: `${nextWeek.toISOString().split('T')[0]}T14:00:00.000Z`,
            status: 'scheduled',
            notes: 'Medication adjustment',
            createdAt: new Date('2024-01-27').toISOString(),
        },
        {
            patientId: 2,
            appointmentDate: `${nextWeek.toISOString().split('T')[0]}T15:30:00.000Z`,
            status: 'scheduled',
            notes: 'Chronic condition management',
            createdAt: new Date('2024-01-28').toISOString(),
        },
        {
            patientId: 4,
            appointmentDate: `${nextWeek.toISOString().split('T')[0]}T16:30:00.000Z`,
            status: 'scheduled',
            notes: 'Wellness check',
            createdAt: new Date('2024-01-29').toISOString(),
        }
    ];

    await db.insert(appointments).values(sampleAppointments);
    
    console.log('✅ Appointments seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});