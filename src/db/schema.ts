import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

export const patients = sqliteTable('patients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  dateOfBirth: text('date_of_birth').notNull(),
  address: text('address').notNull(),
  emergencyContact: text('emergency_contact').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const appointments = sqliteTable('appointments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').references(() => patients.id).notNull(),
  doctorName: text('doctor_name').notNull(),
  appointmentDate: text('appointment_date').notNull(),
  appointmentTime: text('appointment_time').notNull(),
  status: text('status').notNull(),
  reason: text('reason').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

export const medicalRecords = sqliteTable('medical_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').references(() => patients.id).notNull(),
  recordDate: text('record_date').notNull(),
  recordType: text('record_type').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  doctorName: text('doctor_name').notNull(),
  createdAt: text('created_at').notNull(),
});

export const prescriptions = sqliteTable('prescriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').references(() => patients.id).notNull(),
  medicationName: text('medication_name').notNull(),
  dosage: text('dosage').notNull(),
  frequency: text('frequency').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  doctorName: text('doctor_name').notNull(),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
});

export const bills = sqliteTable('bills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').references(() => patients.id).notNull(),
  billDate: text('bill_date').notNull(),
  amount: real('amount').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull(),
  dueDate: text('due_date').notNull(),
  createdAt: text('created_at').notNull(),
});

// Auth tables for better-auth
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export const staff = sqliteTable('staff', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull(),
  role: text('role').notNull(), // admin, doctor, nurse, receptionist, manager
  department: text('department').notNull(),
  hireDate: text('hire_date').notNull(),
  status: text('status').notNull().default('active'), // active, inactive, terminated
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  userId: text('user_id').references(() => user.id), // Link to better-auth user
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const checkins = sqliteTable('checkins', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').references(() => patients.id).notNull(),
  appointmentId: integer('appointment_id').references(() => appointments.id),
  checkinTime: text('checkin_time').notNull(),
  status: text('status').notNull(), // waiting, called, attended, cancelled, no-show
  queueNumber: integer('queue_number'),
  waitingTime: integer('waiting_time'), // minutes
  staffId: integer('staff_id').references(() => staff.id),
  type: text('type').notNull(), // appointment, walk-in
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

export const queue = sqliteTable('queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').references(() => patients.id).notNull(),
  appointmentId: integer('appointment_id').references(() => appointments.id),
  checkinId: integer('checkin_id').references(() => checkins.id),
  queueNumber: integer('queue_number').notNull(),
  status: text('status').notNull(), // waiting, called, in-progress, completed, cancelled
  checkinTime: text('checkin_time').notNull(),
  calledTime: text('called_time'),
  completedTime: text('completed_time'),
  priority: text('priority').notNull().default('normal'), // high, normal, low
  staffId: integer('staff_id').references(() => staff.id),
  estimatedWaitTime: integer('estimated_wait_time'), // minutes
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').references(() => user.id),
  staffId: integer('staff_id').references(() => staff.id),
  action: text('action').notNull(), // create, update, delete, view, login, logout
  tableName: text('table_name').notNull(),
  recordId: text('record_id'),
  oldValues: text('old_values', { mode: 'json' }),
  newValues: text('new_values', { mode: 'json' }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  timestamp: text('timestamp').notNull(),
  description: text('description'),
});

export const departments = sqliteTable('departments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  headStaffId: integer('head_staff_id').references(() => staff.id),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Update existing patients table with additional fields
export const clinicPatients = sqliteTable('clinic_patients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull(),
  dateOfBirth: text('date_of_birth').notNull(),
  address: text('address').notNull(),
  emergencyContact: text('emergency_contact').notNull(),
  insuranceInfo: text('insurance_info', { mode: 'json' }),
  registrationDate: text('registration_date').notNull(),
  status: text('status').notNull().default('active'), // active, inactive, archived
  active: integer('active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Update existing appointments table with additional fields  
export const clinicAppointments = sqliteTable('clinic_appointments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').references(() => clinicPatients.id).notNull(),
  staffId: integer('staff_id').references(() => staff.id).notNull(),
  appointmentDate: text('appointment_date').notNull(),
  appointmentTime: text('appointment_time').notNull(),
  duration: integer('duration').default(30), // minutes
  status: text('status').notNull(), // scheduled, checked-in, in-progress, completed, cancelled, no-show
  reason: text('reason').notNull(),
  notes: text('notes'),
  departmentId: integer('department_id').references(() => departments.id),
  priority: text('priority').default('normal'), // high, normal, low
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Update existing medical records with additional fields
export const clinicMedicalRecords = sqliteTable('clinic_medical_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').references(() => clinicPatients.id).notNull(),
  staffId: integer('staff_id').references(() => staff.id).notNull(),
  appointmentId: integer('appointment_id').references(() => clinicAppointments.id),
  visitDate: text('visit_date').notNull(),
  diagnosis: text('diagnosis').notNull(),
  treatment: text('treatment').notNull(),
  notes: text('notes'),
  recordType: text('record_type').notNull().default('visit_note'), // visit_note, lab_result, prescription, imaging
  title: text('title').notNull(),
  description: text('description').notNull(),
  doctorName: text('doctor_name').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});