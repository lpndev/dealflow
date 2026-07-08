CREATE TABLE `settings` (
	`workspace_id` text PRIMARY KEY NOT NULL,
	`delay_min_seconds` integer DEFAULT 1200 NOT NULL,
	`delay_max_seconds` integer DEFAULT 2400 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `delivery` ADD `due_at` integer;