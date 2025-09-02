import { db } from '@/db';
import { patients } from '@/db/schema';

async function main() {
    const firstNames = ['John', 'Sarah', 'Michael', 'Emma', 'David', 'Lisa', 'James', 'Maria', 'Robert', 'Jennifer', 'William', 'Linda', 'Richard', 'Patricia', 'Charles', 'Barbara', 'Joseph', 'Elizabeth', 'Thomas', 'Susan', 'Peter', 'Michelle', 'Andrew', 'Nicole', 'Christopher', 'Amanda', 'Matthew', 'Jessica', 'Daniel', 'Ashley'];
    
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'];

    const medicalAids = ['Discovery', 'Bonitas', 'Momentum', 'Medscheme', 'GEMS', 'Bestmed'];
    const passportCountries = ['USA', 'UK', 'Germany', 'France', 'Australia', 'Canada', 'India', 'Nigeria', 'Kenya'];
    const emailDomains = ['@gmail.com', '@yahoo.com', '@outlook.com', '@icloud.com', '@company.co.za', '@webmail.co.za'];

    const generateSaIdNumber = () => {
        const year = Math.floor(Math.random() * 80) + 20; // 20-99
        const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
        const sequence = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        const citizenship = Math.random() > 0.9 ? '1' : '0';
        const race = '8';
        const checksum = Math.floor(Math.random() * 10);
        return `${year}${month}${day}${sequence}${citizenship}${race}${checksum}`;
    };

    const generatePassportNumber = () => {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        let passport = '';
        for (let i = 0; i < 2; i++) {
            passport += letters.charAt(Math.floor(Math.random() * letters.length));
        }
        for (let i = 0; i < 6; i++) {
            passport += numbers.charAt(Math.floor(Math.random() * numbers.length));
        }
        return passport;
    };

    const generateMedicalAidNumber = () => {
        return String(Math.floor(Math.random() * 99999999) + 10000000);
    };

    const generateTelegramId = () => {
        return Math.random() > 0.6 ? String(Math.floor(Math.random() * 999999999) + 100000000) : null;
    };

    const generateRegistrationDate = () => {
        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        
        // Weight towards more recent dates
        const random = Math.pow(Math.random(), 0.5);
        const timeDiff = now.getTime() - sixMonthsAgo.getTime();
        const randomTime = sixMonthsAgo.getTime() + (timeDiff * random);
        
        return new Date(randomTime).toISOString();
    };

    const samplePatients = [];

    for (let i = 0; i < 60; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const registrationDate = generateRegistrationDate();
        
        // ID type distribution: 50% SA ID, 30% passport, 20% mixed
        let idType, saIdNumber = null, passportNumber = null, passportCountry = null;
        const idRandom = Math.random();
        if (idRandom < 0.5) {
            idType = 'sa_id';
            saIdNumber = generateSaIdNumber();
        } else if (idRandom < 0.8) {
            idType = 'passport';
            passportNumber = generatePassportNumber();
            passportCountry = passportCountries[Math.floor(Math.random() * passportCountries.length)];
        } else {
            // Mixed - has both
            idType = 'sa_id';
            saIdNumber = generateSaIdNumber();
            passportNumber = generatePassportNumber();
            passportCountry = passportCountries[Math.floor(Math.random() * passportCountries.length)];
        }

        // Medical aid: 70% have it, 30% don't
        const hasMedicalAid = Math.random() < 0.7;
        let medicalAid = null, medicalAidNumber = null;
        if (hasMedicalAid) {
            medicalAid = medicalAids[Math.floor(Math.random() * medicalAids.length)];
            medicalAidNumber = generateMedicalAidNumber();
        }

        // Phone number formats
        const phoneFormats = [
            `+27${Math.floor(Math.random() * 9) + 1}${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
            `0${Math.floor(Math.random() * 9) + 1}${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
        ];
        const phone = phoneFormats[Math.floor(Math.random() * phoneFormats.length)];

        // Email generation
        const emailDomain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${emailDomain}`;

        // 95% active, 5% inactive
        const active = Math.random() < 0.95;

        const patient = {
            firstName,
            lastName,
            phone,
            email,
            idType,
            saIdNumber,
            passportNumber,
            passportCountry,
            medicalAid,
            medicalAidNumber,
            telegramUserId: generateTelegramId(),
            idImageUrl: null,
            active,
            createdAt: registrationDate,
            updatedAt: registrationDate,
        };

        samplePatients.push(patient);
    }

    await db.insert(patients).values(samplePatients);
    
    console.log('✅ Patients seeder completed successfully - 60 patient records created');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});