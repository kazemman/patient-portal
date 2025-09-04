import { db } from '@/db';
import { patients } from '@/db/schema';

async function main() {
    const samplePatients = [
        {
            name: 'Dr. Sarah Johnson',
            email: 'sarah.johnson@gmail.com',
            phone: '(555) 234-5678',
            active: true,
            createdAt: new Date('2024-01-15').toISOString(),
        },
        {
            name: 'Michael Chen',
            email: 'michael.chen@yahoo.com',
            phone: '(555) 345-6789',
            active: true,
            createdAt: new Date('2024-01-22').toISOString(),
        },
        {
            name: 'Jennifer Williams',
            email: 'jennifer.williams@hotmail.com',
            phone: '(555) 456-7890',
            active: true,
            createdAt: new Date('2024-01-28').toISOString(),
        },
        {
            name: 'Robert Martinez',
            email: 'robert.martinez@gmail.com',
            phone: '(555) 567-8901',
            active: false,
            createdAt: new Date('2024-02-05').toISOString(),
        },
        {
            name: 'Emily Thompson',
            email: 'emily.thompson@outlook.com',
            phone: '(555) 678-9012',
            active: true,
            createdAt: new Date('2024-02-12').toISOString(),
        },
        {
            name: 'David Kim',
            email: 'david.kim@gmail.com',
            phone: '(555) 789-0123',
            active: true,
            createdAt: new Date('2024-02-18').toISOString(),
        },
        {
            name: 'Lisa Anderson',
            email: 'lisa.anderson@yahoo.com',
            phone: '(555) 890-1234',
            active: true,
            createdAt: new Date('2024-02-25').toISOString(),
        },
        {
            name: 'James Wilson',
            email: 'james.wilson@hotmail.com',
            phone: '(555) 901-2345',
            active: true,
            createdAt: new Date('2024-03-03').toISOString(),
        },
        {
            name: 'Maria Rodriguez',
            email: 'maria.rodriguez@gmail.com',
            phone: '(555) 012-3456',
            active: false,
            createdAt: new Date('2024-03-08').toISOString(),
        },
        {
            name: 'Christopher Davis',
            email: 'christopher.davis@outlook.com',
            phone: '(555) 123-4567',
            active: true,
            createdAt: new Date('2024-03-15').toISOString(),
        },
        {
            name: 'Amanda Taylor',
            email: 'amanda.taylor@yahoo.com',
            phone: '(555) 234-5679',
            active: true,
            createdAt: new Date('2024-03-20').toISOString(),
        },
        {
            name: 'Daniel Brown',
            email: 'daniel.brown@gmail.com',
            phone: '(555) 345-6780',
            active: true,
            createdAt: new Date('2024-03-25').toISOString(),
        },
        {
            name: 'Rachel Garcia',
            email: 'rachel.garcia@hotmail.com',
            phone: '(555) 456-7891',
            active: true,
            createdAt: new Date('2024-04-01').toISOString(),
        },
        {
            name: 'Kevin Lee',
            email: 'kevin.lee@outlook.com',
            phone: '(555) 567-8902',
            active: false,
            createdAt: new Date('2024-04-08').toISOString(),
        },
        {
            name: 'Nicole Miller',
            email: 'nicole.miller@gmail.com',
            phone: '(555) 678-9013',
            active: true,
            createdAt: new Date('2024-04-12').toISOString(),
        }
    ];

    await db.insert(patients).values(samplePatients);
    
    console.log('✅ Patients seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});