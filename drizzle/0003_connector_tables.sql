CREATE TABLE `connector_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(50) NOT NULL,
	`enabled` boolean DEFAULT false,
	`baseUrl` varchar(500),
	`apiKey` varchar(255),
	`lastSyncAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `connector_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `glucose_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sgv` int NOT NULL,
	`direction` varchar(20),
	`recordedAt` bigint NOT NULL,
	`device` varchar(100),
	`source` varchar(50) DEFAULT 'nightscout',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `glucose_entries_id` PRIMARY KEY(`id`)
);
