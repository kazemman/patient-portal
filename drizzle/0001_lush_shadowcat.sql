CREATE TABLE `checkins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`checkin_time` text NOT NULL,
	`payment_method` text NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`waiting_time_minutes` integer,
	`attended_at` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `patient_audit_log` ADD `updated_at` text NOT NULL;