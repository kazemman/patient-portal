import { db } from '@/db';
import { departments } from '@/db/schema';

async function main() {
    const sampleDepartments = [
        {
            name: 'General Medicine',
            description: 'Primary care services including routine check-ups, preventive care, management of chronic conditions, and comprehensive health assessments for adults.',
            headStaffId: null,
            isActive: true,
            createdAt: new Date('2024-01-01').toISOString(),
            updatedAt: new Date('2024-01-01').toISOString(),
        },
        {
            name: 'Cardiology',
            description: 'Specialized heart and cardiovascular care including diagnostic testing, treatment of heart conditions, cardiac monitoring, and cardiovascular risk assessment.',
            headStaffId: null,
            isActive: true,
            createdAt: new Date('2024-01-02').toISOString(),
            updatedAt: new Date('2024-01-02').toISOString(),
        },
        {
            name: 'Pediatrics',
            description: 'Comprehensive healthcare for infants, children, and adolescents including routine check-ups, immunizations, developmental assessments, and pediatric illness treatment.',
            headStaffId: null,
            isActive: true,
            createdAt: new Date('2024-01-03').toISOString(),
            updatedAt: new Date('2024-01-03').toISOString(),
        },
        {
            name: 'Orthopedics',
            description: 'Musculoskeletal care specializing in bones, joints, muscles, ligaments, and tendons. Services include injury treatment, fracture care, and mobility rehabilitation.',
            headStaffId: null,
            isActive: true,
            createdAt: new Date('2024-01-04').toISOString(),
            updatedAt: new Date('2024-01-04').toISOString(),
        },
        {
            name: 'Dermatology',
            description: 'Comprehensive skin care services including skin cancer screening, acne treatment, dermatitis management, cosmetic procedures, and skin condition diagnosis.',
            headStaffId: null,
            isActive: true,
            createdAt: new Date('2024-01-05').toISOString(),
            updatedAt: new Date('2024-01-05').toISOString(),
        },
        {
            name: 'Neurology',
            description: 'Specialized care for brain, spinal cord, and nervous system disorders including migraine treatment, seizure management, and neurological condition diagnosis.',
            headStaffId: null,
            isActive: true,
            createdAt: new Date('2024-01-06').toISOString(),
            updatedAt: new Date('2024-01-06').toISOString(),
        },
        {
            name: 'Emergency',
            description: 'Urgent and emergency medical care available 24/7 for acute injuries, sudden illnesses, trauma care, and life-threatening conditions requiring immediate attention.',
            headStaffId: null,
            isActive: true,
            createdAt: new Date('2024-01-07').toISOString(),
            updatedAt: new Date('2024-01-07').toISOString(),
        },
        {
            name: 'Radiology',
            description: 'Medical imaging services including X-rays, CT scans, MRI, ultrasound, and mammography for diagnostic imaging and image-guided procedures.',
            headStaffId: null,
            isActive: true,
            createdAt: new Date('2024-01-08').toISOString(),
            updatedAt: new Date('2024-01-08').toISOString(),
        },
        {
            name: 'Laboratory',
            description: 'Clinical laboratory services providing blood tests, urine analysis, cultures, pathology services, and diagnostic testing to support patient care and treatment decisions.',
            headStaffId: null,
            isActive: true,
            createdAt: new Date('2024-01-09').toISOString(),
            updatedAt: new Date('2024-01-09').toISOString(),
        },
        {
            name: 'Mental Health',
            description: 'Comprehensive mental health services including psychological evaluation, therapy, counseling, psychiatric care, and treatment for anxiety, depression, and behavioral disorders.',
            headStaffId: null,
            isActive: true,
            createdAt: new Date('2024-01-10').toISOString(),
            updatedAt: new Date('2024-01-10').toISOString(),
        }
    ];

    await db.insert(departments).values(sampleDepartments);
    
    console.log('✅ Departments seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});