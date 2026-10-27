CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`event` text NOT NULL,
	`payload` text NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	`next_attempt_at` text NOT NULL,
	`last_error` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
