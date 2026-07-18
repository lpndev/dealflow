CREATE TABLE `account_plan` (
	`user_id` text PRIMARY KEY NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`updated_at` integer NOT NULL
);
