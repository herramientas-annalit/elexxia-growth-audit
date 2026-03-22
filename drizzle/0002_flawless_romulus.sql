CREATE TABLE `lead_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`auditId` int NOT NULL,
	`authorName` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`noteType` enum('call','email','whatsapp','meeting','internal') DEFAULT 'internal',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lead_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `audits` ADD `pipelineStage` enum('new','contacted','proposal_sent','negotiation','closed_won','closed_lost') DEFAULT 'new';--> statement-breakpoint
ALTER TABLE `audits` ADD `nextFollowUpAt` timestamp;--> statement-breakpoint
ALTER TABLE `audits` ADD `assignedTo` varchar(255);--> statement-breakpoint
ALTER TABLE `audits` ADD `dealValue` float;--> statement-breakpoint
ALTER TABLE `audits` ADD `clientIp` varchar(64);--> statement-breakpoint
ALTER TABLE `audits` ADD `llmTokensUsed` int;--> statement-breakpoint
ALTER TABLE `audits` ADD `llmEstimatedCostEur` float;--> statement-breakpoint
ALTER TABLE `audits` ADD `llmGenerationMs` int;--> statement-breakpoint
ALTER TABLE `audits` ADD `generationError` text;