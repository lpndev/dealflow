CREATE TABLE `affiliate_link` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`product_id` text NOT NULL,
	`url` text NOT NULL,
	`status` text DEFAULT 'valid' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `deal_snapshot` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`signal_id` text,
	`product_id` text NOT NULL,
	`original_price` real,
	`current_price` real,
	`coupon` text,
	`observed_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`provider` text NOT NULL,
	`external_id` text,
	`canonical_url` text,
	`title` text,
	`image_url` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_workspace_id_provider_external_id_unique` ON `product` (`workspace_id`,`provider`,`external_id`);--> statement-breakpoint
CREATE TABLE `publication` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`deal_id` text NOT NULL,
	`affiliate_link_id` text NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`deal_id`) REFERENCES `deal_snapshot`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`affiliate_link_id`) REFERENCES `affiliate_link`(`id`) ON UPDATE no action ON DELETE no action
);
