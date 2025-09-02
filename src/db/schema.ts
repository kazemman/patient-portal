import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

// Patients table
export const patients = sqliteTable('patients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  phone: text('phone'),
  email: text('email'),
  idType: text('id_type'), // 'sa_id', 'passport'
  saIdNumber: text('sa_id_number'),
  passportNumber: text('passport_number'),
  passportCountry: text('passport_country'),
  medicalAid: text('medical_aid'),
  medicalAidNumber: text('medical_aid_number'),
  telegramUserId: text('telegram_user_id'),
  idImageUrl: text('id_image_url'),
  active: integer('active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Appointments table
export const appointments = sqliteTable('appointments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').references(() => patients.id),
  appointmentDate: text('appointment_date').notNull(), // ISO datetime string
  durationMinutes: integer('duration_minutes').default(30),
  reason: text('reason'),
  notes: text('notes'),
  status: text('status').notNull().default('scheduled'), // scheduled, completed, cancelled, no_show
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Patient audit log table
export const patientAuditLog = sqliteTable('patient_audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').references(() => patients.id),
  fieldChanged: text('field_changed').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  changedBy: text('changed_by').notNull(),
  reason: text('reason'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Add new checkins table
export const checkins = sqliteTable('checkins', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').references(() => patients.id).notNull(),
  checkinTime: text('checkin_time').notNull(),
  paymentMethod: text('payment_method').notNull(), // 'medical_aid', 'cash', 'both'
  status: text('status').notNull().default('waiting'), // 'waiting', 'attended', 'cancelled'
  waitingTimeMinutes: integer('waiting_time_minutes'),
  attendedAt: text('attended_at'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Add staff users table
export const staffUsers = sqliteTable('staff_users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('staff'), // 'admin' or 'staff'
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});