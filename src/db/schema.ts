import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const patients = sqliteTable('patients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  active: integer('active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
});

export const appointments = sqliteTable('appointments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').references(() => patients.id).notNull(),
  appointmentDate: text('appointment_date').notNull(),
  status: text('status').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

export const checkins = sqliteTable('checkins', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').references(() => patients.id).notNull(),
  checkinTime: text('checkin_time').notNull(),
  status: text('status').notNull(),
  type: text('type').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});