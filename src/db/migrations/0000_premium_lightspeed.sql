CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`tweet_id` text NOT NULL,
	`mention_id` text NOT NULL,
	`mention_tweet_url` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`error_message` text,
	`result_image_urls` text,
	`response_post_id` text,
	`prompt` text,
	`reply_text` text,
	`request_image_urls` text,
	`user_info` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_mention_id_unique` ON `tasks` (`mention_id`);--> statement-breakpoint
CREATE INDEX `tweet_id_idx` ON `tasks` (`tweet_id`);