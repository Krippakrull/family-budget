CREATE TABLE `approval_summary_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`sent_at` integer NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `approval_summary_logs_family_year_month` ON `approval_summary_logs` (`family_id`,`year`,`month`);--> statement-breakpoint
ALTER TABLE `families` ADD `reminder_day` integer DEFAULT 27 NOT NULL;--> statement-breakpoint
ALTER TABLE `families` ADD `send_approval_summary` integer DEFAULT false NOT NULL;