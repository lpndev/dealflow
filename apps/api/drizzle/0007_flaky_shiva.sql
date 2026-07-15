CREATE INDEX `delivery_workspace_status_due_idx` ON `delivery` (`workspace_id`,`status`,`due_at`);--> statement-breakpoint
CREATE INDEX `delivery_status_due_idx` ON `delivery` (`status`,`due_at`);