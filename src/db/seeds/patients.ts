import { db } from '@/db';
import { patients } from '@/db/schema';

async function main() {
    const samplePatients = [
        {
            email: 'sarah.johnson@gmail.com',
            name: 'Sarah Johnson',
            phone: '(555) 234-5678',
            dateOfBirth: '1985-03-15',
            address: '1234 Maple Street, Portland, OR 97201',
            emergencyContact: 'Michael Johnson (Spouse) - (555) 234-5679',
            createdAt: new Date('2024-07-15').toISOString(),
            updatedAt: new Date('2024-07-15').toISOString(),
        },
        {
            email: 'robert.chen@yahoo.com',
            name: 'Robert Chen',
            phone: '(555) 456-7890',
            dateOfBirth: '1972-09-22',
            address: '567 Oak Avenue, Austin, TX 78701',
            emergencyContact: 'Lisa Chen (Wife) - (555) 456-7891',
            createdAt: new Date('2024-08-03').toISOString(),
            updatedAt: new Date('2024-08-03').toISOString(),
        },
        {
            email: 'maria.rodriguez@outlook.com',
            name: 'Maria Rodriguez',
            phone: '(555) 678-9012',
            dateOfBirth: '1990-12-08',
            address: '890 Pine Road, Miami, FL 33101',
            emergencyContact: 'Carlos Rodriguez (Father) - (555) 678-9013',
            createdAt: new Date('2024-09-10').toISOString(),
            updatedAt: new Date('2024-09-10').toISOString(),
        },
        {
            email: 'david.williams@gmail.com',
            name: 'David Williams',
            phone: '(555) 789-0123',
            dateOfBirth: '1960-05-30',
            address: '345 Cedar Lane, Denver, CO 80202',
            emergencyContact: 'Jennifer Williams (Daughter) - (555) 789-0124',
            createdAt: new Date('2024-10-01').toISOString(),
            updatedAt: new Date('2024-10-01').toISOString(),
        },
        {
            email: 'emily.thompson@yahoo.com',
            name: 'Emily Thompson',
            phone: '(555) 890-1234',
            dateOfBirth: '1995-08-14',
            address: '678 Birch Boulevard, Seattle, WA 98101',
            emergencyContact: 'James Thompson (Brother) - (555) 890-1235',
            createdAt: new Date('2024-10-18').toISOString(),
            updatedAt: new Date('2024-10-18').toISOString(),
        },
        {
            email: 'anthony.davis@outlook.com',
            name: 'Anthony Davis',
            phone: '(555) 901-2345',
            dateOfBirth: '1978-02-11',
            address: '912 Elm Street, Chicago, IL 60601',
            emergencyContact: 'Patricia Davis (Mother) - (555) 901-2346',
            createdAt: new Date('2024-11-05').toISOString(),
            updatedAt: new Date('2024-11-05').toISOString(),
        },
        {
            email: 'jessica.martinez@gmail.com',
            name: 'Jessica Martinez',
            phone: '(555) 012-3456',
            dateOfBirth: '1988-07-25',
            address: '234 Willow Way, Phoenix, AZ 85001',
            emergencyContact: 'Ricardo Martinez (Husband) - (555) 012-3457',
            createdAt: new Date('2024-11-20').toISOString(),
            updatedAt: new Date('2024-11-20').toISOString(),
        },
        {
            email: 'william.brown@yahoo.com',
            name: 'William Brown',
            phone: '(555) 123-4567',
            dateOfBirth: '1949-11-03',
            address: '456 Spruce Circle, Boston, MA 02101',
            emergencyContact: 'Margaret Brown (Wife) - (555) 123-4568',
            createdAt: new Date('2024-12-08').toISOString(),
            updatedAt: new Date('2024-12-08').toISOString(),
        }
    ];

    await db.insert(patients).values(samplePatients);
    
    console.log('✅ Patients seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});