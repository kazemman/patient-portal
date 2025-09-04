CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` text NOT NULL,
	`patient_id` integer,
	`patient_name` text NOT NULL,
	`changed_by` text NOT NULL,
	`fields_changed` text NOT NULL,
	`old_value` text,
	`new_value` text NOT NULL,
	`reason` text,
	`metadata` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
