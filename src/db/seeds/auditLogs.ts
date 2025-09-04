import { db } from '@/db';
import { auditLogs } from '@/db/schema';

async function main() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];

    const ipAddresses = [
        '192.168.1.10', '192.168.1.15', '192.168.1.20', '192.168.1.25', '192.168.1.30',
        '10.0.0.5', '10.0.0.8', '10.0.0.12', '10.0.0.18', '10.0.0.22',
        '172.16.0.5', '172.16.0.10', '172.16.0.15'
    ];

    const sampleAuditLogs = [
        // Login events
        {
            userId: null,
            staffId: 1,
            action: 'login',
            tableName: 'session',
            recordId: '1',
            oldValues: null,
            newValues: { loginTime: '2024-01-05T08:00:00Z', staffId: 1 },
            ipAddress: '192.168.1.10',
            userAgent: userAgents[0],
            timestamp: new Date('2024-01-05T08:00:00Z').toISOString(),
            description: 'Dr. Smith logged into the system'
        },
        {
            userId: null,
            staffId: 2,
            action: 'login',
            tableName: 'session',
            recordId: '2',
            oldValues: null,
            newValues: { loginTime: '2024-01-05T07:30:00Z', staffId: 2 },
            ipAddress: '192.168.1.15',
            userAgent: userAgents[1],
            timestamp: new Date('2024-01-05T07:30:00Z').toISOString(),
            description: 'Nurse Johnson logged into the system'
        },
        {
            userId: null,
            staffId: 3,
            action: 'login',
            tableName: 'session',
            recordId: '3',
            oldValues: null,
            newValues: { loginTime: '2024-01-05T08:15:00Z', staffId: 3 },
            ipAddress: '192.168.1.20',
            userAgent: userAgents[2],
            timestamp: new Date('2024-01-05T08:15:00Z').toISOString(),
            description: 'Receptionist Williams logged into the system'
        },

        // Patient record views
        {
            userId: null,
            staffId: 1,
            action: 'view',
            tableName: 'clinic_patients',
            recordId: '1',
            oldValues: null,
            newValues: null,
            ipAddress: '192.168.1.10',
            userAgent: userAgents[0],
            timestamp: new Date('2024-01-05T08:30:00Z').toISOString(),
            description: 'Patient record accessed before appointment'
        },
        {
            userId: null,
            staffId: 2,
            action: 'view',
            tableName: 'clinic_patients',
            recordId: '2',
            oldValues: null,
            newValues: null,
            ipAddress: '192.168.1.15',
            userAgent: userAgents[1],
            timestamp: new Date('2024-01-05T09:00:00Z').toISOString(),
            description: 'Patient medical history reviewed'
        },
        {
            userId: null,
            staffId: 3,
            action: 'view',
            tableName: 'clinic_patients',
            recordId: '3',
            oldValues: null,
            newValues: null,
            ipAddress: '192.168.1.20',
            userAgent: userAgents[2],
            timestamp: new Date('2024-01-05T09:15:00Z').toISOString(),
            description: 'Patient information verified at check-in'
        },

        // New patient creation
        {
            userId: null,
            staffId: 3,
            action: 'create',
            tableName: 'clinic_patients',
            recordId: '15',
            oldValues: null,
            newValues: {
                firstName: 'Maria',
                lastName: 'Rodriguez',
                email: 'maria.rodriguez@email.com',
                phone: '555-0123',
                status: 'active'
            },
            ipAddress: '192.168.1.20',
            userAgent: userAgents[2],
            timestamp: new Date('2024-01-05T10:00:00Z').toISOString(),
            description: 'New patient registration completed'
        },
        {
            userId: null,
            staffId: 4,
            action: 'create',
            tableName: 'clinic_patients',
            recordId: '16',
            oldValues: null,
            newValues: {
                firstName: 'Robert',
                lastName: 'Chen',
                email: 'robert.chen@email.com',
                phone: '555-0456',
                status: 'active'
            },
            ipAddress: '10.0.0.5',
            userAgent: userAgents[3],
            timestamp: new Date('2024-01-05T11:30:00Z').toISOString(),
            description: 'Walk-in patient registered'
        },

        // Appointment creation
        {
            userId: null,
            staffId: 3,
            action: 'create',
            tableName: 'clinic_appointments',
            recordId: '25',
            oldValues: null,
            newValues: {
                patientId: 5,
                staffId: 1,
                appointmentDate: '2024-01-06',
                appointmentTime: '14:00',
                status: 'scheduled',
                reason: 'Follow-up consultation'
            },
            ipAddress: '192.168.1.20',
            userAgent: userAgents[2],
            timestamp: new Date('2024-01-05T12:00:00Z').toISOString(),
            description: 'Follow-up appointment scheduled'
        },
        {
            userId: null,
            staffId: 5,
            action: 'create',
            tableName: 'clinic_appointments',
            recordId: '26',
            oldValues: null,
            newValues: {
                patientId: 8,
                staffId: 2,
                appointmentDate: '2024-01-07',
                appointmentTime: '09:30',
                status: 'scheduled',
                reason: 'Annual physical exam'
            },
            ipAddress: '10.0.0.8',
            userAgent: userAgents[4],
            timestamp: new Date('2024-01-05T13:15:00Z').toISOString(),
            description: 'Annual physical exam appointment created'
        },

        // Patient check-ins
        {
            userId: null,
            staffId: 3,
            action: 'check-in',
            tableName: 'checkins',
            recordId: '12',
            oldValues: null,
            newValues: {
                patientId: 1,
                appointmentId: 5,
                checkinTime: '2024-01-06T08:45:00Z',
                status: 'waiting',
                type: 'appointment'
            },
            ipAddress: '192.168.1.20',
            userAgent: userAgents[2],
            timestamp: new Date('2024-01-06T08:45:00Z').toISOString(),
            description: 'Patient checked in for scheduled appointment'
        },
        {
            userId: null,
            staffId: 4,
            action: 'check-in',
            tableName: 'checkins',
            recordId: '13',
            oldValues: null,
            newValues: {
                patientId: 3,
                checkinTime: '2024-01-06T10:15:00Z',
                status: 'waiting',
                type: 'walk-in'
            },
            ipAddress: '10.0.0.5',
            userAgent: userAgents[3],
            timestamp: new Date('2024-01-06T10:15:00Z').toISOString(),
            description: 'Walk-in patient checked in'
        },

        // Queue management
        {
            userId: null,
            staffId: 2,
            action: 'call-patient',
            tableName: 'queue',
            recordId: '8',
            oldValues: { status: 'waiting', calledTime: null },
            newValues: { status: 'called', calledTime: '2024-01-06T09:00:00Z' },
            ipAddress: '192.168.1.15',
            userAgent: userAgents[1],
            timestamp: new Date('2024-01-06T09:00:00Z').toISOString(),
            description: 'Patient called from waiting queue'
        },
        {
            userId: null,
            staffId: 1,
            action: 'update',
            tableName: 'queue',
            recordId: '8',
            oldValues: { status: 'called' },
            newValues: { status: 'in-progress' },
            ipAddress: '192.168.1.10',
            userAgent: userAgents[0],
            timestamp: new Date('2024-01-06T09:05:00Z').toISOString(),
            description: 'Patient consultation started'
        },

        // Appointment updates
        {
            userId: null,
            staffId: 1,
            action: 'update',
            tableName: 'clinic_appointments',
            recordId: '5',
            oldValues: { status: 'scheduled' },
            newValues: { status: 'in-progress', notes: 'Patient consultation ongoing' },
            ipAddress: '192.168.1.10',
            userAgent: userAgents[0],
            timestamp: new Date('2024-01-06T09:05:00Z').toISOString(),
            description: 'Appointment status updated to in-progress'
        },
        {
            userId: null,
            staffId: 1,
            action: 'update',
            tableName: 'clinic_appointments',
            recordId: '5',
            oldValues: { status: 'in-progress' },
            newValues: { status: 'completed', notes: 'Consultation completed successfully' },
            ipAddress: '192.168.1.10',
            userAgent: userAgents[0],
            timestamp: new Date('2024-01-06T09:30:00Z').toISOString(),
            description: 'Appointment status updated to completed'
        },

        // Medical record creation
        {
            userId: null,
            staffId: 1,
            action: 'create',
            tableName: 'clinic_medical_records',
            recordId: '18',
            oldValues: null,
            newValues: {
                patientId: 1,
                staffId: 1,
                appointmentId: 5,
                visitDate: '2024-01-06',
                diagnosis: 'Hypertension follow-up',
                treatment: 'Continue current medication',
                recordType: 'visit_note'
            },
            ipAddress: '192.168.1.10',
            userAgent: userAgents[0],
            timestamp: new Date('2024-01-06T09:35:00Z').toISOString(),
            description: 'Medical record created for patient visit'
        },
        {
            userId: null,
            staffId: 2,
            action: 'create',
            tableName: 'clinic_medical_records',
            recordId: '19',
            oldValues: null,
            newValues: {
                patientId: 7,
                staffId: 2,
                visitDate: '2024-01-06',
                diagnosis: 'Annual wellness check',
                treatment: 'Preventive care recommendations',
                recordType: 'visit_note'
            },
            ipAddress: '192.168.1.15',
            userAgent: userAgents[1],
            timestamp: new Date('2024-01-06T11:20:00Z').toISOString(),
            description: 'Annual wellness check documentation completed'
        },

        // Patient information updates
        {
            userId: null,
            staffId: 3,
            action: 'update',
            tableName: 'clinic_patients',
            recordId: '4',
            oldValues: { phone: '555-0789', address: '123 Oak St' },
            newValues: { phone: '555-0890', address: '456 Pine Ave' },
            ipAddress: '192.168.1.20',
            userAgent: userAgents[2],
            timestamp: new Date('2024-01-06T14:15:00Z').toISOString(),
            description: 'Patient contact information updated'
        },
        {
            userId: null,
            staffId: 4,
            action: 'update',
            tableName: 'clinic_patients',
            recordId: '9',
            oldValues: { emergencyContact: 'John Doe - 555-1234' },
            newValues: { emergencyContact: 'Jane Doe - 555-5678' },
            ipAddress: '10.0.0.5',
            userAgent: userAgents[3],
            timestamp: new Date('2024-01-06T15:30:00Z').toISOString(),
            description: 'Emergency contact information updated'
        },

        // Prescription creation
        {
            userId: null,
            staffId: 1,
            action: 'create',
            tableName: 'prescriptions',
            recordId: '12',
            oldValues: null,
            newValues: {
                patientId: 1,
                medicationName: 'Lisinopril 10mg',
                dosage: '10mg',
                frequency: 'Once daily',
                startDate: '2024-01-06',
                status: 'active'
            },
            ipAddress: '192.168.1.10',
            userAgent: userAgents[0],
            timestamp: new Date('2024-01-06T09:40:00Z').toISOString(),
            description: 'Prescription created for hypertension treatment'
        },
        {
            userId: null,
            staffId: 2,
            action: 'create',
            tableName: 'prescriptions',
            recordId: '13',
            oldValues: null,
            newValues: {
                patientId: 6,
                medicationName: 'Amoxicillin 500mg',
                dosage: '500mg',
                frequency: 'Three times daily',
                startDate: '2024-01-07',
                status: 'active'
            },
            ipAddress: '192.168.1.15',
            userAgent: userAgents[1],
            timestamp: new Date('2024-01-07T10:15:00Z').toISOString(),
            description: 'Antibiotic prescription for bacterial infection'
        },

        // Visit completion
        {
            userId: null,
            staffId: 1,
            action: 'complete-visit',
            tableName: 'queue',
            recordId: '8',
            oldValues: { status: 'in-progress', completedTime: null },
            newValues: { status: 'completed', completedTime: '2024-01-06T09:45:00Z' },
            ipAddress: '192.168.1.10',
            userAgent: userAgents[0],
            timestamp: new Date('2024-01-06T09:45:00Z').toISOString(),
            description: 'Patient visit completed successfully'
        },
        {
            userId: null,
            staffId: 2,
            action: 'complete-visit',
            tableName: 'queue',
            recordId: '9',
            oldValues: { status: 'in-progress', completedTime: null },
            newValues: { status: 'completed', completedTime: '2024-01-06T11:30:00Z' },
            ipAddress: '192.168.1.15',
            userAgent: userAgents[1],
            timestamp: new Date('2024-01-06T11:30:00Z').toISOString(),
            description: 'Annual wellness check completed'
        },

        // System maintenance activities
        {
            userId: null,
            staffId: 10,
            action: 'update',
            tableName: 'staff',
            recordId: '15',
            oldValues: { status: 'active' },
            newValues: { status: 'inactive' },
            ipAddress: '172.16.0.5',
            userAgent: userAgents[4],
            timestamp: new Date('2024-01-06T18:00:00Z').toISOString(),
            description: 'Staff member status updated during system maintenance'
        },
        {
            userId: null,
            staffId: 11,
            action: 'view',
            tableName: 'audit_logs',
            recordId: null,
            oldValues: null,
            newValues: null,
            ipAddress: '172.16.0.10',
            userAgent: userAgents[0],
            timestamp: new Date('2024-01-06T19:15:00Z').toISOString(),
            description: 'System administrator reviewed audit logs'
        },

        // Appointment cancellations
        {
            userId: null,
            staffId: 3,
            action: 'update',
            tableName: 'clinic_appointments',
            recordId: '12',
            oldValues: { status: 'scheduled' },
            newValues: { status: 'cancelled', notes: 'Patient requested cancellation' },
            ipAddress: '192.168.1.20',
            userAgent: userAgents[2],
            timestamp: new Date('2024-01-07T08:30:00Z').toISOString(),
            description: 'Appointment cancelled per patient request'
        },
        {
            userId: null,
            staffId: 4,
            action: 'delete',
            tableName: 'checkins',
            recordId: '15',
            oldValues: { patientId: 12, status: 'waiting', type: 'appointment' },
            newValues: null,
            ipAddress: '10.0.0.5',
            userAgent: userAgents[3],
            timestamp: new Date('2024-01-07T09:00:00Z').toISOString(),
            description: 'Check-in record removed due to appointment cancellation'
        },

        // More view activities
        {
            userId: null,
            staffId: 5,
            action: 'view',
            tableName: 'clinic_medical_records',
            recordId: '10',
            oldValues: null,
            newValues: null,
            ipAddress: '10.0.0.8',
            userAgent: userAgents[4],
            timestamp: new Date('2024-01-07T10:45:00Z').toISOString(),
            description: 'Medical history reviewed before patient consultation'
        },
        {
            userId: null,
            staffId: 6,
            action: 'view',
            tableName: 'prescriptions',
            recordId: '8',
            oldValues: null,
            newValues: null,
            ipAddress: '10.0.0.12',
            userAgent: userAgents[1],
            timestamp: new Date('2024-01-07T11:20:00Z').toISOString(),
            description: 'Current prescriptions reviewed for drug interaction check'
        },

        // Logout events
        {
            userId: null,
            staffId: 1,
            action: 'logout',
            tableName: 'session',
            recordId: '1',
            oldValues: { loginTime: '2024-01-05T08:00:00Z' },
            newValues: { logoutTime: '2024-01-05T17:30:00Z' },
            ipAddress: '192.168.1.10',
            userAgent: userAgents[0],
            timestamp: new Date('2024-01-05T17:30:00Z').toISOString(),
            description: 'Dr. Smith logged out of the system'
        },
        {
            userId: null,
            staffId: 2,
            action: 'logout',
            tableName: 'session',
            recordId: '2',
            oldValues: { loginTime: '2024-01-05T07:30:00Z' },
            newValues: { logoutTime: '2024-01-05T16:45:00Z' },
            ipAddress: '192.168.1.15',
            userAgent: userAgents[1],
            timestamp: new Date('2024-01-05T16:45:00Z').toISOString(),
            description: 'Nurse Johnson logged out of the system'
        },

        // Additional diverse activities for the remaining entries...
        // More patient record views
        {
            userId: null,
            staffId: 7,
            action: 'view',
            tableName: 'clinic_patients',
            recordId: '20',
            oldValues: null,
            newValues: null,
            ipAddress: '10.0.0.18',
            userAgent: userAgents[2],
            timestamp: new Date('2024-01-08T08:15:00Z').toISOString(),
            description: 'Patient demographics verified during registration'
        },
        {
            userId: null,
            staffId: 8,
            action: 'view',
            tableName: 'clinic_appointments',
            recordId: '18',
            oldValues: null,
            newValues: null,
            ipAddress: '10.0.0.22',
            userAgent: userAgents[3],
            timestamp: new Date('2024-01-08T09:30:00Z').toISOString(),
            description: 'Appointment details reviewed before patient call'
        },

        // More appointment updates
        {
            userId: null,
            staffId: 9,
            action: 'update',
            tableName: 'clinic_appointments',
            recordId: '20',
            oldValues: { appointmentTime: '14:00', notes: null },
            newValues: { appointmentTime: '14:30', notes: 'Rescheduled per patient request' },
            ipAddress: '172.16.0.15',
            userAgent: userAgents[4],
            timestamp: new Date('2024-01-08T11:45:00Z').toISOString(),
            description: 'Appointment time adjusted for patient convenience'
        },

        // More check-in activities
        {
            userId: null,
            staffId: 3,
            action: 'check-in',
            tableName: 'checkins',
            recordId: '20',
            oldValues: null,
            newValues: {
                patientId: 25,
                appointmentId: 22,
                checkinTime: '2024-01-08T13:15:00Z',
                status: 'waiting',
                type: 'appointment'
            },
            ipAddress: '192.168.1.20',
            userAgent: userAgents[2],
            timestamp: new Date('2024-01-08T13:15:00Z').toISOString(),
            description: 'Patient arrived early for afternoon appointment'
        },

        // More queue management
        {
            userId: null,
            staffId: 1,
            action: 'call-patient',
            tableName: 'queue',
            recordId: '15',
            oldValues: { status: 'waiting', calledTime: null },
            newValues: { status: 'called', calledTime: '2024-01-08T14:30:00Z' },
            ipAddress: '192.168.1.10',
            userAgent: userAgents[0],
            timestamp: new Date('2024-01-08T14:30:00Z').toISOString(),
            description: 'Next patient called for consultation'
        },

        // More medical record activities
        {
            userId: null,
            staffId: 2,
            action: 'update',
            tableName: 'clinic_medical_records',
            recordId: '12',
            oldValues: { notes: 'Initial assessment completed' },
            newValues: { notes: 'Follow-up assessment shows improvement' },
            ipAddress: '192.168.1.15',
            userAgent: userAgents[1],
            timestamp: new Date('2024-01-08T15:45:00Z').toISOString(),
            description: 'Medical record updated with follow-up findings'
        },

        // More system activities for comprehensive coverage
        {
            userId: null,
            staffId: 12,
            action: 'create',
            tableName: 'departments',
            recordId: '6',
            oldValues: null,
            newValues: {
                name: 'Cardiology',
                description: 'Heart and cardiovascular care',
                isActive: true
            },
            ipAddress: '172.16.0.5',
            userAgent: userAgents[0],
            timestamp: new Date('2024-01-09T10:00:00Z').toISOString(),
            description: 'New cardiology department added to system'
        }
    ];

    // Generate additional audit logs to reach 200+ entries
    const additionalLogs = [];
    const actions = ['view', 'view', 'view', 'view', 'update', 'update', 'create', 'delete', 'login', 'logout'];
    const tables = ['clinic_patients', 'clinic_appointments', 'checkins', 'queue', 'clinic_medical_records', 'prescriptions'];
    
    for (let i = 0; i < 170; i++) {
        const randomDate = new Date(thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime()));
        const action = actions[Math.floor(Math.random() * actions.length)];
        const table = tables[Math.floor(Math.random() * tables.length)];
        const staffId = Math.floor(Math.random() * 20) + 1;
        const recordId = Math.floor(Math.random() * 50) + 1;
        
        let description = '';
        let oldValues = null;
        let newValues = null;
        
        switch (action) {
            case 'view':
                description = `${table.replace('clinic_', '').replace('_', ' ')} record accessed for review`;
                break;
            case 'update':
                description = `${table.replace('clinic_', '').replace('_', ' ')} information updated`;
                oldValues = { status: 'previous_value' };
                newValues = { status: 'updated_value' };
                break;
            case 'create':
                description = `New ${table.replace('clinic_', '').replace('_', ' ')} record created`;
                newValues = { id: recordId, createdAt: randomDate.toISOString() };
                break;
            case 'delete':
                description = `${table.replace('clinic_', '').replace('_', ' ')} record removed from system`;
                oldValues = { id: recordId, status: 'active' };
                break;
            case 'login':
                description = `Staff member logged into the system`;
                table = 'session';
                newValues = { loginTime: randomDate.toISOString() };
                break;
            case 'logout':
                description = `Staff member logged out of the system`;
                table = 'session';
                oldValues = { loginTime: new Date(randomDate.getTime() - 8 * 60 * 60 * 1000).toISOString() };
                newValues = { logoutTime: randomDate.toISOString() };
                break;
        }
        
        additionalLogs.push({
            userId: null,
            staffId: staffId,
            action: action,
            tableName: table,
            recordId: recordId.toString(),
            oldValues: oldValues,
            newValues: newValues,
            ipAddress: ipAddresses[Math.floor(Math.random() * ipAddresses.length)],
            userAgent: userAgents[Math.floor(Math.random() * userAgents.length)],
            timestamp: randomDate.toISOString(),
            description: description
        });
    }

    const allLogs = [...sampleAuditLogs, ...additionalLogs];
    
    // Sort by timestamp to maintain chronological order
    allLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    await db.insert(auditLogs).values(allLogs);
    
    console.log(`✅ Audit logs seeder completed successfully - ${allLogs.length} entries created`);
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});