import { db } from '@/db';
import { queue } from '@/db/schema';

async function main() {
    const queueEntries = [];
    let currentId = 1;

    // Helper function to generate random time within a day
    const getRandomTime = (date: Date, startHour: number = 8, endHour: number = 17) => {
        const randomHour = Math.floor(Math.random() * (endHour - startHour)) + startHour;
        const randomMinute = Math.floor(Math.random() * 60);
        const newDate = new Date(date);
        newDate.setHours(randomHour, randomMinute, 0, 0);
        return newDate;
    };

    // Helper function to add minutes to a date
    const addMinutes = (date: Date, minutes: number) => {
        const newDate = new Date(date);
        newDate.setMinutes(newDate.getMinutes() + minutes);
        return newDate;
    };

    // Historical queue data (past 6 days) - 90 completed entries
    for (let dayOffset = 6; dayOffset >= 1; dayOffset--) {
        const date = new Date();
        date.setDate(date.getDate() - dayOffset);
        
        // 15 entries per historical day
        const entriesPerDay = 15;
        let queueNumberForDay = 1;
        
        for (let i = 0; i < entriesPerDay; i++) {
            // Priority distribution: 10% high, 80% normal, 10% low
            let priority = 'normal';
            const priorityRoll = Math.random();
            if (priorityRoll < 0.1) priority = 'high';
            else if (priorityRoll > 0.9) priority = 'low';
            
            // High priority gets lower queue numbers
            if (priority === 'high') {
                queueNumberForDay = Math.min(queueNumberForDay, 3);
            }
            
            const checkinTime = getRandomTime(date);
            const waitTime = Math.floor(Math.random() * 50) + 10; // 10-60 minutes
            const calledTime = addMinutes(checkinTime, waitTime);
            const serviceTime = Math.floor(Math.random() * 30) + 15; // 15-45 minutes
            const completedTime = addMinutes(calledTime, serviceTime);
            
            // 95% completed, 5% cancelled
            const status = Math.random() < 0.95 ? 'completed' : 'cancelled';
            
            queueEntries.push({
                patientId: Math.floor(Math.random() * 80) + 1,
                appointmentId: Math.random() < 0.7 ? Math.floor(Math.random() * 50) + 1 : null, // 70% have appointments
                checkinId: currentId,
                queueNumber: queueNumberForDay++,
                status,
                checkinTime: checkinTime.toISOString(),
                calledTime: calledTime.toISOString(),
                completedTime: status === 'completed' ? completedTime.toISOString() : null,
                priority,
                staffId: Math.floor(Math.random() * 10) + 1,
                estimatedWaitTime: waitTime,
                createdAt: checkinTime.toISOString(),
                updatedAt: (status === 'completed' ? completedTime : calledTime).toISOString(),
            });
            currentId++;
        }
    }

    // Current day queue entries
    const today = new Date();
    let todayQueueNumber = 1;
    
    // 8 completed entries from earlier today
    for (let i = 0; i < 8; i++) {
        let priority = 'normal';
        const priorityRoll = Math.random();
        if (priorityRoll < 0.1) priority = 'high';
        else if (priorityRoll > 0.9) priority = 'low';
        
        const checkinTime = getRandomTime(today, 8, 12); // Morning entries
        const waitTime = Math.floor(Math.random() * 40) + 15;
        const calledTime = addMinutes(checkinTime, waitTime);
        const serviceTime = Math.floor(Math.random() * 25) + 20;
        const completedTime = addMinutes(calledTime, serviceTime);
        
        queueEntries.push({
            patientId: Math.floor(Math.random() * 80) + 1,
            appointmentId: Math.random() < 0.8 ? Math.floor(Math.random() * 50) + 1 : null,
            checkinId: currentId,
            queueNumber: todayQueueNumber++,
            status: 'completed',
            checkinTime: checkinTime.toISOString(),
            calledTime: calledTime.toISOString(),
            completedTime: completedTime.toISOString(),
            priority,
            staffId: Math.floor(Math.random() * 10) + 1,
            estimatedWaitTime: waitTime,
            createdAt: checkinTime.toISOString(),
            updatedAt: completedTime.toISOString(),
        });
        currentId++;
    }
    
    // 3 currently called patients
    for (let i = 0; i < 3; i++) {
        let priority = 'normal';
        const priorityRoll = Math.random();
        if (priorityRoll < 0.1) priority = 'high';
        else if (priorityRoll > 0.9) priority = 'low';
        
        const checkinTime = getRandomTime(today, 9, 14);
        const waitTime = Math.floor(Math.random() * 35) + 10;
        const calledTime = addMinutes(checkinTime, waitTime);
        
        queueEntries.push({
            patientId: Math.floor(Math.random() * 80) + 1,
            appointmentId: Math.random() < 0.7 ? Math.floor(Math.random() * 50) + 1 : null,
            checkinId: currentId,
            queueNumber: todayQueueNumber++,
            status: 'called',
            checkinTime: checkinTime.toISOString(),
            calledTime: calledTime.toISOString(),
            completedTime: null,
            priority,
            staffId: Math.floor(Math.random() * 10) + 1,
            estimatedWaitTime: waitTime,
            createdAt: checkinTime.toISOString(),
            updatedAt: calledTime.toISOString(),
        });
        currentId++;
    }
    
    // 11 waiting patients
    for (let i = 0; i < 11; i++) {
        let priority = 'normal';
        const priorityRoll = Math.random();
        if (priorityRoll < 0.1) priority = 'high';
        else if (priorityRoll > 0.9) priority = 'low';
        
        // High priority patients get lower queue numbers
        let queueNum = todayQueueNumber++;
        if (priority === 'high' && queueNum > 3) {
            queueNum = Math.min(queueNum, todayQueueNumber - 8); // Insert earlier in queue
        }
        
        const checkinTime = getRandomTime(today, 10, 16);
        const currentTime = new Date();
        const waitedSoFar = Math.max(0, Math.floor((currentTime.getTime() - checkinTime.getTime()) / (1000 * 60)));
        
        // Estimate remaining wait time based on position and priority
        let estimatedWait = (queueNum - 12) * 25; // Base estimate
        if (priority === 'high') estimatedWait = Math.max(5, estimatedWait - 20);
        if (priority === 'low') estimatedWait += 15;
        estimatedWait = Math.max(5, Math.min(60, estimatedWait));
        
        queueEntries.push({
            patientId: Math.floor(Math.random() * 80) + 1,
            appointmentId: Math.random() < 0.6 ? Math.floor(Math.random() * 50) + 1 : null, // More walk-ins in current queue
            checkinId: currentId,
            queueNumber: queueNum,
            status: 'waiting',
            checkinTime: checkinTime.toISOString(),
            calledTime: null,
            completedTime: null,
            priority,
            staffId: null,
            estimatedWaitTime: estimatedWait,
            createdAt: checkinTime.toISOString(),
            updatedAt: checkinTime.toISOString(),
        });
        currentId++;
    }

    await db.insert(queue).values(queueEntries);
    
    console.log('✅ Queue seeder completed successfully');
    console.log(`   📊 Generated ${queueEntries.length} queue entries`);
    console.log('   📅 Historical: 90 completed entries (past 6 days)');
    console.log('   📅 Today: 8 completed, 3 called, 11 waiting');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});