CREATE TABLE `appointments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer,
	`appointment_date` text NOT NULL,
	`duration_minutes` integer DEFAULT 30,
	`reason` text,
	`notes` text,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `patient_audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer,
	`field_changed` text NOT NULL,
	`old_value` text,
	`new_value` text,
	`changed_by` text NOT NULL,
	`reason` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`phone` text,
	`email` text,
	`id_type` text,
	`sa_id_number` text,
	`passport_number` text,
	`passport_country` text,
	`medical_aid` text,
	`medical_aid_number` text,
	`telegram_user_id` text,
	`id_image_url` text,
	`active` integer DEFAULT true,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
