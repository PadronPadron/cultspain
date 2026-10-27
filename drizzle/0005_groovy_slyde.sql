CREATE TABLE `incomes` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`date` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`client_id` text,
	`booking_id` text,
	`amount_cents` integer NOT NULL,
	`payment_method` text NOT NULL,
	`document_number` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`correction_reason` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "income_positive" CHECK("incomes"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE INDEX `income_date` ON `incomes` (`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `income_booking` ON `incomes` (`booking_id`);
--> statement-breakpoint
-- Preserve historical appointment receipts exactly once.
INSERT INTO incomes(id,created_at,updated_at,date,category,description,client_id,booking_id,amount_cents,payment_method,notes)
SELECT 'booking-' || id,created_at,created_at,paid_date,'Servicios','Cobro de cita',client_id,id,paid_cents,'other','Cobro anterior incorporado al registro de ingresos.'
FROM bookings WHERE paid_cents > 0;
