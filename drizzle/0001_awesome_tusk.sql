CREATE TABLE `emergency_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(50) NOT NULL,
	`relationship` varchar(100),
	`isPrimary` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emergency_contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fasting_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`startedAt` bigint NOT NULL,
	`endedAt` bigint,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fasting_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `glucose_readings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`value` int NOT NULL,
	`context` enum('fasting','pre_meal','post_meal','bedtime','random') DEFAULT 'random',
	`trendArrow` enum('rising_fast','rising','stable','falling','falling_fast') DEFAULT 'stable',
	`notes` text,
	`recordedAt` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `glucose_readings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `insulin_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`insulinType` enum('rapid','long','mixed','other') DEFAULT 'rapid',
	`units` float NOT NULL,
	`notes` text,
	`recordedAt` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `insulin_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mealType` enum('breakfast','lunch','dinner','snack') DEFAULT 'snack',
	`description` text,
	`carbsEstimate` int,
	`isSafeMeal` boolean DEFAULT false,
	`notes` text,
	`recordedAt` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meal_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medication_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`medicationName` varchar(255) NOT NULL,
	`dosage` varchar(100),
	`notes` text,
	`recordedAt` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `medication_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `safe_meals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`carbsEstimate` int,
	`glycemicImpact` enum('low','medium','high') DEFAULT 'low',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `safe_meals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`diabetesType` enum('type1','type2','gestational','prediabetes','other'),
	`deviceType` enum('cgm','glucometer','both','none'),
	`targetMin` int DEFAULT 70,
	`targetMax` int DEFAULT 180,
	`onboardingCompleted` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`)
);
