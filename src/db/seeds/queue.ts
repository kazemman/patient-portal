import { db } from '@/db';
import { queue } from '@/db/schema';

async function main() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Generate queue entries for the past 7 days
    const sampleQueue = [];
    
    // Day 7 (oldest) - All completed/cancelled
    const day7 = new Date(today);
    day7.setDate(day7.getDate() - 6);
    for (let i = 1; i <= 15; i++) {
        const checkinTime = new Date(day7);
        checkinTime.setHours(8 + Math.floor(i / 2), (i % 2) * 30, 0, 0);
        const calledTime = new Date(checkinTime);
        calledTime.setMinutes(calledTime.getMinutes() + 10 + Math.floor(Math.random() * 20));
        const completedTime = new Date(calledTime);
        completedTime.setMinutes(completedTime.getMinutes() + 15 + Math.floor(Math.random() * 30));
        
        sampleQueue.push({
            patientId: ((i - 1) % 80) + 1,
            appointmentId: i <= 12 ? i : null,
            checkinId: i,
            queueNumber: i,
            status: Math.random() > 0.9 ? 'cancelled' : 'completed',
            checkinTime: checkinTime.toISOString(),
            calledTime: calledTime.toISOString(),
            completedTime: completedTime.toISOString(),
            priority: Math.random() > 0.7 ? 'high' : Math.random() > 0.5 ? 'normal' : 'low',
            staffId: Math.floor(Math.random() * 10) + 1,
            estimatedWaitTime: 15 + Math.floor(Math.random() * 45),
            createdAt: checkinTime.toISOString(),
            updatedAt: completedTime.toISOString(),
        });
    }

    // Day 6 - Mostly completed
    const day6 = new Date(today);
    day6.setDate(day6.getDate() - 5);
    for (let i = 1; i <= 18; i++) {
        const checkinTime = new Date(day6);
        checkinTime.setHours(8 + Math.floor(i / 2), (i % 2) * 30, 0, 0);
        const calledTime = new Date(checkinTime);
        calledTime.setMinutes(calledTime.getMinutes() + 8 + Math.floor(Math.random() * 25));
        const completedTime = new Date(calledTime);
        completedTime.setMinutes(completedTime.getMinutes() + 12 + Math.floor(Math.random() * 35));
        
        sampleQueue.push({
            patientId: ((i + 14) % 80) + 1,
            appointmentId: i <= 14 ? i + 15 : null,
            checkinId: i + 15,
            queueNumber: i,
            status: Math.random() > 0.85 ? 'cancelled' : 'completed',
            checkinTime: checkinTime.toISOString(),
            calledTime: calledTime.toISOString(),
            completedTime: completedTime.toISOString(),
            priority: Math.random() > 0.7 ? 'high' : Math.random() > 0.5 ? 'normal' : 'low',
            staffId: Math.floor(Math.random() * 10) + 1,
            estimatedWaitTime: 12 + Math.floor(Math.random() * 48),
            createdAt: checkinTime.toISOString(),
            updatedAt: completedTime.toISOString(),
        });
    }

    // Day 5 - All completed/cancelled
    const day5 = new Date(today);
    day5.setDate(day5.getDate() - 4);
    for (let i = 1; i <= 16; i++) {
        const checkinTime = new Date(day5);
        checkinTime.setHours(8 + Math.floor(i / 2), (i % 2) * 30, 0, 0);
        const calledTime = new Date(checkinTime);
        calledTime.setMinutes(calledTime.getMinutes() + 12 + Math.floor(Math.random() * 18));
        const completedTime = new Date(calledTime);
        completedTime.setMinutes(completedTime.getMinutes() + 18 + Math.floor(Math.random() * 28));
        
        sampleQueue.push({
            patientId: ((i + 32) % 80) + 1,
            appointmentId: i <= 13 ? i + 30 : null,
            checkinId: i + 33,
            queueNumber: i,
            status: Math.random() > 0.92 ? 'cancelled' : 'completed',
            checkinTime: checkinTime.toISOString(),
            calledTime: calledTime.toISOString(),
            completedTime: completedTime.toISOString(),
            priority: Math.random() > 0.6 ? 'normal' : Math.random() > 0.7 ? 'high' : 'low',
            staffId: Math.floor(Math.random() * 10) + 1,
            estimatedWaitTime: 20 + Math.floor(Math.random() * 40),
            createdAt: checkinTime.toISOString(),
            updatedAt: completedTime.toISOString(),
        });
    }

    // Day 4 - All completed/cancelled
    const day4 = new Date(today);
    day4.setDate(day4.getDate() - 3);
    for (let i = 1; i <= 14; i++) {
        const checkinTime = new Date(day4);
        checkinTime.setHours(9 + Math.floor(i / 2), (i % 2) * 30, 0, 0);
        const calledTime = new Date(checkinTime);
        calledTime.setMinutes(calledTime.getMinutes() + 15 + Math.floor(Math.random() * 20));
        const completedTime = new Date(calledTime);
        completedTime.setMinutes(completedTime.getMinutes() + 20 + Math.floor(Math.random() * 25));
        
        sampleQueue.push({
            patientId: ((i + 48) % 80) + 1,
            appointmentId: i <= 11 ? i + 45 : null,
            checkinId: i + 49,
            queueNumber: i,
            status: Math.random() > 0.88 ? 'cancelled' : 'completed',
            checkinTime: checkinTime.toISOString(),
            calledTime: calledTime.toISOString(),
            completedTime: completedTime.toISOString(),
            priority: Math.random() > 0.65 ? 'normal' : Math.random() > 0.75 ? 'high' : 'low',
            staffId: Math.floor(Math.random() * 10) + 1,
            estimatedWaitTime: 18 + Math.floor(Math.random() * 42),
            createdAt: checkinTime.toISOString(),
            updatedAt: completedTime.toISOString(),
        });
    }

    // Day 3 - All completed/cancelled
    const day3 = new Date(today);
    day3.setDate(day3.getDate() - 2);
    for (let i = 1; i <= 17; i++) {
        const checkinTime = new Date(day3);
        checkinTime.setHours(8 + Math.floor(i / 2), (i % 2) * 30, 0, 0);
        const calledTime = new Date(checkinTime);
        calledTime.setMinutes(calledTime.getMinutes() + 8 + Math.floor(Math.random() * 22));
        const completedTime = new Date(calledTime);
        completedTime.setMinutes(completedTime.getMinutes() + 16 + Math.floor(Math.random() * 32));
        
        sampleQueue.push({
            patientId: ((i + 62) % 80) + 1,
            appointmentId: i <= 14 ? i + 60 : null,
            checkinId: i + 63,
            queueNumber: i,
            status: Math.random() > 0.9 ? 'cancelled' : 'completed',
            checkinTime: checkinTime.toISOString(),
            calledTime: calledTime.toISOString(),
            completedTime: completedTime.toISOString(),
            priority: Math.random() > 0.7 ? 'normal' : Math.random() > 0.8 ? 'high' : 'low',
            staffId: Math.floor(Math.random() * 10) + 1,
            estimatedWaitTime: 22 + Math.floor(Math.random() * 38),
            createdAt: checkinTime.toISOString(),
            updatedAt: completedTime.toISOString(),
        });
    }

    // Yesterday - All completed/cancelled
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    for (let i = 1; i <= 19; i++) {
        const checkinTime = new Date(yesterday);
        checkinTime.setHours(8 + Math.floor(i / 2.5), (i % 3) * 20, 0, 0);
        const calledTime = new Date(checkinTime);
        calledTime.setMinutes(calledTime.getMinutes() + 5 + Math.floor(Math.random() * 25));
        const completedTime = new Date(calledTime);
        completedTime.setMinutes(completedTime.getMinutes() + 12 + Math.floor(Math.random() * 28));
        
        sampleQueue.push({
            patientId: ((i + 79) % 80) + 1,
            appointmentId: i <= 15 ? i + 75 : null,
            checkinId: i + 80,
            queueNumber: i,
            status: Math.random() > 0.87 ? 'cancelled' : 'completed',
            checkinTime: checkinTime.toISOString(),
            calledTime: calledTime.toISOString(),
            completedTime: completedTime.toISOString(),
            priority: Math.random() > 0.6 ? 'normal' : Math.random() > 0.75 ? 'high' : 'low',
            staffId: Math.floor(Math.random() * 10) + 1,
            estimatedWaitTime: 10 + Math.floor(Math.random() * 50),
            createdAt: checkinTime.toISOString(),
            updatedAt: completedTime.toISOString(),
        });
    }

    // TODAY - Active queue with current state
    let queueNum = 1;
    
    // Completed entries from earlier today
    for (let i = 1; i <= 8; i++) {
        const checkinTime = new Date(today);
        checkinTime.setHours(8 + i, 15, 0, 0);
        const calledTime = new Date(checkinTime);
        calledTime.setMinutes(calledTime.getMinutes() + 8 + Math.floor(Math.random() * 15));
        const completedTime = new Date(calledTime);
        completedTime.setMinutes(completedTime.getMinutes() + 15 + Math.floor(Math.random() * 25));
        
        sampleQueue.push({
            patientId: i,
            appointmentId: i <= 6 ? i + 95 : null,
            checkinId: i + 100,
            queueNumber: queueNum++,
            status: 'completed',
            checkinTime: checkinTime.toISOString(),
            calledTime: calledTime.toISOString(),
            completedTime: completedTime.toISOString(),
            priority: i <= 2 ? 'high' : 'normal',
            staffId: Math.floor(Math.random() * 10) + 1,
            estimatedWaitTime: 15 + Math.floor(Math.random() * 30),
            createdAt: checkinTime.toISOString(),
            updatedAt: completedTime.toISOString(),
        });
    }

    // Current called patients (2-3)
    for (let i = 1; i <= 3; i++) {
        const checkinTime = new Date(today);
        checkinTime.setHours(now.getHours() - 1, now.getMinutes() - 30 + (i * 10), 0, 0);
        const calledTime = new Date();
        calledTime.setMinutes(calledTime.getMinutes() - 10 + (i * 3));
        
        sampleQueue.push({
            patientId: i + 8,
            appointmentId: i + 8 <= 10 ? i + 103 : null,
            checkinId: i + 108,
            queueNumber: queueNum++,
            status: 'called',
            checkinTime: checkinTime.toISOString(),
            calledTime: calledTime.toISOString(),
            completedTime: null,
            priority: i === 1 ? 'high' : 'normal',
            staffId: Math.floor(Math.random() * 10) + 1,
            estimatedWaitTime: 5 + (i * 5),
            createdAt: checkinTime.toISOString(),
            updatedAt: calledTime.toISOString(),
        });
    }

    // Current waiting patients (10-12) - Priority patients first
    const waitingPatients = [
        // High priority patients (get lower queue numbers)
        { patientId: 12, priority: 'high', checkinOffset: 45 },
        { patientId: 15, priority: 'high', checkinOffset: 50 },
        { patientId: 18, priority: 'high', checkinOffset: 55 },
        // Normal priority patients
        { patientId: 21, priority: 'normal', checkinOffset: 35 },
        { patientId: 24, priority: 'normal', checkinOffset: 40 },
        { patientId: 27, priority: 'normal', checkinOffset: 42 },
        { patientId: 30, priority: 'normal', checkinOffset: 47 },
        { patientId: 33, priority: 'normal', checkinOffset: 52 },
        { patientId: 36, priority: 'normal', checkinOffset: 57 },
        // Low priority patients
        { patientId: 39, priority: 'low', checkinOffset: 48 },
        { patientId: 42, priority: 'low', checkinOffset: 53 },
    ];

    waitingPatients.forEach((patient, index) => {
        const checkinTime = new Date();
        checkinTime.setMinutes(checkinTime.getMinutes() - patient.checkinOffset);
        
        const waitTime = patient.priority === 'high' ? 10 + (index * 3) : 
                        patient.priority === 'normal' ? 20 + (index * 5) : 
                        35 + (index * 7);
        
        sampleQueue.push({
            patientId: patient.patientId,
            appointmentId: index < 8 ? 110 + index : null,
            checkinId: 112 + index,
            queueNumber: queueNum++,
            status: 'waiting',
            checkinTime: checkinTime.toISOString(),
            calledTime: null,
            completedTime: null,
            priority: patient.priority,
            staffId: null,
            estimatedWaitTime: waitTime,
            createdAt: checkinTime.toISOString(),
            updatedAt: checkinTime.toISOString(),
        });
    });

    await db.insert(queue).values(sampleQueue);
    
    console.log('✅ Queue seeder completed successfully');
    console.log(`📊 Generated ${sampleQueue.length} queue entries across 7 days`);
    console.log(`🔄 Current active queue: ${waitingPatients.length + 3} patients (${waitingPatients.length} waiting, 3 called)`);
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});