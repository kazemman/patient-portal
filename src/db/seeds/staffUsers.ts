import { db } from '@/db';
import { staffUsers } from '@/db/schema';
import bcrypt from 'bcrypt';

async function main() {
    const saltRounds = 12;

    // Hash all passwords
    const adminPasswordHash = await bcrypt.hash('AdminPass123!', saltRounds);
    const drJohnsonPasswordHash = await bcrypt.hash('StaffPass456#', saltRounds);
    const nurseWilsonPasswordHash = await bcrypt.hash('NurseSecure789$', saltRounds);
    const adminSmithPasswordHash = await bcrypt.hash('AdminSecure321%', saltRounds);
    const drBrownPasswordHash = await bcrypt.hash('DoctorPass654&', saltRounds);
    const adminDavisPasswordHash = await bcrypt.hash('AdminPass987*', saltRounds);

    const sampleStaffUsers = [
        {
            fullName: 'System Administrator',
            email: 'admin@invotech.health',
            passwordHash: adminPasswordHash,
            role: 'admin',
            isActive: true,
            createdAt: new Date('2024-07-01').toISOString(),
            updatedAt: new Date('2024-07-01').toISOString(),
        },
        {
            fullName: 'Dr. Sarah Johnson',
            email: 'sarah.johnson@invotech.health',
            passwordHash: drJohnsonPasswordHash,
            role: 'staff',
            isActive: true,
            createdAt: new Date('2024-08-15').toISOString(),
            updatedAt: new Date('2024-08-15').toISOString(),
        },
        {
            fullName: 'Nurse Mary Wilson',
            email: 'mary.wilson@invotech.health',
            passwordHash: nurseWilsonPasswordHash,
            role: 'staff',
            isActive: true,
            createdAt: new Date('2024-09-10').toISOString(),
            updatedAt: new Date('2024-09-10').toISOString(),
        },
        {
            fullName: 'Admin John Smith',
            email: 'john.smith@invotech.health',
            passwordHash: adminSmithPasswordHash,
            role: 'admin',
            isActive: true,
            createdAt: new Date('2024-10-05').toISOString(),
            updatedAt: new Date('2024-10-05').toISOString(),
        },
        {
            fullName: 'Dr. Michael Brown',
            email: 'michael.brown@invotech.health',
            passwordHash: drBrownPasswordHash,
            role: 'staff',
            isActive: true,
            createdAt: new Date('2024-11-20').toISOString(),
            updatedAt: new Date('2024-11-20').toISOString(),
        },
        {
            fullName: 'Admin Lisa Davis',
            email: 'lisa.davis@invotech.health',
            passwordHash: adminDavisPasswordHash,
            role: 'admin',
            isActive: true,
            createdAt: new Date('2024-12-01').toISOString(),
            updatedAt: new Date('2024-12-01').toISOString(),
        },
    ];

    await db.insert(staffUsers).values(sampleStaffUsers);
    
    console.log('✅ Staff users seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});