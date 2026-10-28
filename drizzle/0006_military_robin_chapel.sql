ALTER TABLE `notifications` ADD `channel` text DEFAULT 'telegram' NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` ADD `whatsapp_message_id` text;--> statement-breakpoint
ALTER TABLE `notifications` ADD `whatsapp_chat_id` text;