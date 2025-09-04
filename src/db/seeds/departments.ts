import { db } from '@/db';
import { departments } from '@/db/schema';

async function main() {
    const sampleDepartments = [
        {
            name: 'General Medicine',
            description: 'Primary care and routine checkups, preventive medicine, health screenings, chronic disease management, and general wellness services for adults of all ages.',
            headStaffId: null,
            isActive: true,
            createdAt: new Date('2023-08-15').toISOString(),
            updatedAt: new Date('2023-08-15').toISOString(),
        },
        {
            name: 'Cardiology',
            description: 'Comprehensive heart and cardiovascular care including electrocardiograms, echocardiography, stress testing, cardiac catheterization, and treatment of heart conditions.',
            headStaffId: null,
            isActive: true,
            createdAt: new Date('2023-09-01').toISOString(),
            updatedAt: new Date('2023-09-01').toISOString(),
        },
        {
            name: 'Pediatrics',
            description: 'Complete healthcare services for infants, children, and adolescents including immunizations, growth monitoring, developmental assessments, and treatment of childhood illnesses.',
            headStaffId: null,
            isActive: true,
            createdAt: new Date('2023-09-10').toISOString(),
            updatedAt: new Date('2023-09-10').toISOString(),
        },
        {
            name: 'Orthopedics',
            description: 'Specialized care for bone, joint, muscle, and ligament conditions including fracture treatment, joint replacement, sports medicine, and rehabilitation services.',
            headStaffId: null,
            isActive: true,
            createdAt: new Date('2023-10-02').toISOString(),
            updatedAt: new Date('2023-10-02').toISOString(),
        },
        {
            name: 'Dermatology',
            description: 'Expert skin care and treatment services including dermatological examinations, acne treatment, skin cancer screening, cosmetic procedures, and dermatological surgery.',
            headStaffId: null,
            isActive: true,
            createdAt: new Date('2023-10-15').toISOString(),
            updatedAt: new Date('2023-10-15').toISOString(),
        },
        {
            name: 'Neurology',
            description: 'Comprehensive brain and nervous system care including diagnosis and treatment of neurological disorders, seizure management, headache treatment, and neurological testing.',
            headStaffId: null,
            isActive: true,
            createdAt: new Date('2023-11-01').toISOString(),
            updatedAt: new Date('2023-11-01').toISOString(),
        },
        {
            name: 'Emergency',
            description: '24/7 emergency and urgent care services for acute injuries, sudden illnesses, trauma care, and life-threatening conditions requiring immediate medical attention.',
            headStaffId: null,
            isActive: true,
            createdAt: new Date('2023-11-15').toISOString(),
            updatedAt: new Date('2023-11-15').toISOString(),
        },
        {
            name: 'Radiology',
            description: 'Advanced medical imaging and diagnostic services including X-rays, CT scans, MRI, ultrasound, mammography, and interventional radiology procedures.',
            headStaffId: null,
            isActive: true,
            createdAt: new Date('2023-12-01').toISOString(),
            updatedAt: new Date('2023-12-01').toISOString(),
        },
        {
            name: 'Laboratory',
            description: 'Comprehensive laboratory testing services including blood work, urinalysis, microbiology, pathology, genetic testing, and specialized diagnostic laboratory services.',
            headStaffId: null,
            isActive: true,
            createdAt: new Date('2024-01-10').toISOString(),
            updatedAt: new Date('2024-01-10').toISOString(),
        },
        {
            name: 'Mental Health',
            description: 'Comprehensive mental health services including psychology, psychiatry, counseling, therapy sessions, psychiatric evaluations, and mental wellness programs.',
            headStaffId: null,
            isActive: true,
            createdAt: new Date('2024-02-01').toISOString(),
            updatedAt: new Date('2024-02-01').toISOString(),
        }
    ];

    await db.insert(departments).values(sampleDepartments);
    
    console.log('✅ Departments seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});