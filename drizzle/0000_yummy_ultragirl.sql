CREATE TABLE `budget_item_tags` (
	`budget_item_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`budget_item_id`, `tag_id`),
	FOREIGN KEY (`budget_item_id`) REFERENCES `budget_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `budget_items` (
	`id` text PRIMARY KEY NOT NULL,
	`member_budget_id` text NOT NULL,
	`name` text NOT NULL,
	`amount` integer NOT NULL,
	`type` text NOT NULL,
	`is_recurring` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`member_budget_id`) REFERENCES `member_budgets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `families` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`equalization_mode` text DEFAULT 'equal' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `family_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`invited_by` text NOT NULL,
	`email` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `family_invites_token_unique` ON `family_invites` (`token`);--> statement-breakpoint
CREATE TABLE `member_budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`monthly_budget_id` text NOT NULL,
	`user_id` text NOT NULL,
	`approved` integer DEFAULT false NOT NULL,
	`approved_at` integer,
	FOREIGN KEY (`monthly_budget_id`) REFERENCES `monthly_budgets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_budgets_monthly_user` ON `member_budgets` (`monthly_budget_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `monthly_budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `monthly_budgets_family_year_month` ON `monthly_budgets` (`family_id`,`year`,`month`);--> statement-breakpoint
CREATE TABLE `recurring_template_tags` (
	`recurring_template_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`recurring_template_id`, `tag_id`),
	FOREIGN KEY (`recurring_template_id`) REFERENCES `recurring_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recurring_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`family_id` text NOT NULL,
	`name` text NOT NULL,
	`amount` integer NOT NULL,
	`type` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reminder_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`family_id` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`sent_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reminder_logs_user_year_month` ON `reminder_logs` (`user_id`,`year`,`month`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_family_name` ON `tags` (`family_id`,`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`language` text DEFAULT 'sv' NOT NULL,
	`theme` text DEFAULT 'light' NOT NULL,
	`accent_color` text DEFAULT 'blue' NOT NULL,
	`family_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);