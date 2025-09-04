import { db } from '@/db';
import { checkins } from '@/db/schema';

async function main() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    const paymentMethods = ['medical_aid', 'cash', 'both'];
    const statuses = ['waiting', 'attended', 'cancelled'];
    const notes = [
        'Regular checkup',
        'Follow-up appointment',
        'Walk-in patient',
        'Emergency consultation',
        'Routine examination',
        'Blood pressure check',
        'Diabetes consultation',
        'Prescription renewal',
        'Health screening',
        'Chronic medication review',
        'Annual physical',
        'Lab results discussion',
        'Specialist referral',
        'Vaccination appointment',
        'Injury assessment'
    ];

    function getRandomDate(startDate: Date, endDate: Date, isWeekday: boolean = true): Date {
        const start = startDate.getTime();
        const end = endDate.getTime();
        let randomTime = start + Math.random() * (end - start);
        let date = new Date(randomTime);
        
        // Bias towards weekdays (Monday-Friday)
        if (isWeekday && Math.random() < 0.8) {
            while (date.getDay() === 0 || date.getDay() === 6) {
                randomTime = start + Math.random() * (end - start);
                date = new Date(randomTime);
            }
        }
        
        // Set business hours (8AM-8PM with peak times)
        let hour: number;
        const rand = Math.random();
        if (rand < 0.3) {
            // Peak hours 9-11AM
            hour = 9 + Math.floor(Math.random() * 2);
        } else if (rand < 0.6) {
            // Peak hours 2-4PM
            hour = 14 + Math.floor(Math.random() * 2);
        } else if (rand < 0.85) {
            // Regular business hours
            const businessHours = [8, 12, 13, 16, 17];
            hour = businessHours[Math.floor(Math.random() * businessHours.length)];
        } else {
            // Evening appointments 6-8PM
            hour = 18 + Math.floor(Math.random() * 2);
        }
        
        const minute = Math.floor(Math.random() * 60);
        date.setHours(hour, minute, 0, 0);
        
        return date;
    }

    function getPaymentMethod(): string {
        const rand = Math.random();
        if (rand < 0.45) return 'medical_aid';
        if (rand < 0.80) return 'cash';
        return 'both';
    }

    function getStatus(isRecent: boolean): string {
        if (isRecent) {
            const rand = Math.random();
            if (rand < 0.25) return 'waiting';
            if (rand < 0.85) return 'attended';
            return 'cancelled';
        } else {
            const rand = Math.random();
            if (rand < 0.05) return 'waiting';
            if (rand < 0.85) return 'attended';
            return 'cancelled';
        }
    }

    function getWaitingTime(): number {
        // Generate realistic waiting times (15-120 minutes, average around 45)
        const base = 15 + Math.random() * 105;
        // Bias towards 30-60 minute range
        if (Math.random() < 0.6) {
            return Math.floor(30 + Math.random() * 30);
        }
        return Math.floor(base);
    }

    // New function to generate amounts based on payment method
    function getAmount(paymentMethod: string): number | null {
        if (paymentMethod === 'medical_aid') {
            // Medical aid only - no direct payment amount
            return null;
        } else if (paymentMethod === 'cash') {
            // Cash payments: R150 - R800 (consultation fees)
            const baseAmount = 150 + Math.random() * 650;
            // Round to nearest R10
            return Math.round(baseAmount / 10) * 10;
        } else if (paymentMethod === 'both') {
            // Both payment: R50 - R300 (co-payment portion)
            const baseAmount = 50 + Math.random() * 250;
            // Round to nearest R10
            return Math.round(baseAmount / 10) * 10;
        }
        return null;
    }

    const sampleCheckins = [];

    // Generate recent check-ins (last 30 days) - 60 records
    for (let i = 0; i < 60; i++) {
        const checkinDate = getRandomDate(thirtyDaysAgo, now);
        const isVeryRecent = checkinDate.getTime() > (now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const status = getStatus(isVeryRecent);
        const paymentMethod = getPaymentMethod();
        const patientId = Math.floor(Math.random() * 60) + 1;
        const note = notes[Math.floor(Math.random() * notes.length)];
        
        let waitingTimeMinutes = null;
        let attendedAt = null;
        
        if (status === 'attended') {
            waitingTimeMinutes = getWaitingTime();
            const attendedDate = new Date(checkinDate.getTime() + waitingTimeMinutes * 60 * 1000);
            attendedAt = attendedDate.toISOString();
        }

        // Get amount based on payment method
        const amount = getAmount(paymentMethod);

        sampleCheckins.push({
            patientId,
            checkinTime: checkinDate.toISOString(),
            paymentMethod,
            status,
            waitingTimeMinutes,
            attendedAt,
            notes: note,
            amount,
            createdAt: checkinDate.toISOString(),
            updatedAt: attendedAt || checkinDate.toISOString(),
        });
    }

    // Generate check-ins from 1-3 months ago - 25 records
    for (let i = 0; i < 25; i++) {
        const checkinDate = getRandomDate(threeMonthsAgo, thirtyDaysAgo);
        const status = getStatus(false);
        const paymentMethod = getPaymentMethod();
        const patientId = Math.floor(Math.random() * 60) + 1;
        const note = notes[Math.floor(Math.random() * notes.length)];
        
        let waitingTimeMinutes = null;
        let attendedAt = null;
        
        if (status === 'attended') {
            waitingTimeMinutes = getWaitingTime();
            const attendedDate = new Date(checkinDate.getTime() + waitingTimeMinutes * 60 * 1000);
            attendedAt = attendedDate.toISOString();
        }

        const amount = getAmount(paymentMethod);

        sampleCheckins.push({
            patientId,
            checkinTime: checkinDate.toISOString(),
            paymentMethod,
            status,
            waitingTimeMinutes,
            attendedAt,
            notes: note,
            amount,
            createdAt: checkinDate.toISOString(),
            updatedAt: attendedAt || checkinDate.toISOString(),
        });
    }

    // Generate check-ins from 3-6 months ago - 15 records
    for (let i = 0; i < 15; i++) {
        const checkinDate = getRandomDate(sixMonthsAgo, threeMonthsAgo);
        const status = getStatus(false);
        const paymentMethod = getPaymentMethod();
        const patientId = Math.floor(Math.random() * 60) + 1;
        const note = notes[Math.floor(Math.random() * notes.length)];
        
        let waitingTimeMinutes = null;
        let attendedAt = null;
        
        if (status === 'attended') {
            waitingTimeMinutes = getWaitingTime();
            const attendedDate = new Date(checkinDate.getTime() + waitingTimeMinutes * 60 * 1000);
            attendedAt = attendedDate.toISOString();
        }

        const amount = getAmount(paymentMethod);

        sampleCheckins.push({
            patientId,
            checkinTime: checkinDate.toISOString(),
            paymentMethod,
            status,
            waitingTimeMinutes,
            attendedAt,
            notes: note,
            amount,
            createdAt: checkinDate.toISOString(),
            updatedAt: attendedAt || checkinDate.toISOString(),
        });
    }

    // Add some check-ins for today for active queue testing
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Replace some recent check-ins with today's check-ins
    const todayCheckins = [];
    for (let i = 0; i < 8; i++) {
        const checkinDate = getRandomDate(today, endOfDay);
        const status = Math.random() < 0.4 ? 'waiting' : (Math.random() < 0.9 ? 'attended' : 'cancelled');
        const paymentMethod = getPaymentMethod();
        const patientId = Math.floor(Math.random() * 60) + 1;
        const note = notes[Math.floor(Math.random() * notes.length)];
        
        let waitingTimeMinutes = null;
        let attendedAt = null;
        
        if (status === 'attended') {
            waitingTimeMinutes = getWaitingTime();
            const attendedDate = new Date(checkinDate.getTime() + waitingTimeMinutes * 60 * 1000);
            attendedAt = attendedDate.toISOString();
        }

        const amount = getAmount(paymentMethod);

        todayCheckins.push({
            patientId,
            checkinTime: checkinDate.toISOString(),
            paymentMethod,
            status,
            waitingTimeMinutes,
            attendedAt,
            notes: note,
            amount,
            createdAt: checkinDate.toISOString(),
            updatedAt: attendedAt || checkinDate.toISOString(),
        });
    }

    // Replace last 8 entries with today's check-ins
    sampleCheckins.splice(-8, 8, ...todayCheckins);

    await db.insert(checkins).values(sampleCheckins);
    
    console.log('✅ Check-ins seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});