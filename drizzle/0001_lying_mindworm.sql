CREATE TABLE `exercise_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`exerciseType` varchar(100) NOT NULL,
	`durationMin` int NOT NULL DEFAULT 0,
	`caloriesBurned` float DEFAULT 0,
	`note` text,
	`loggedAt` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exercise_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `food_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mealType` enum('breakfast','lunch','dinner','snack') NOT NULL,
	`foodName` varchar(255) NOT NULL,
	`quantity` float NOT NULL DEFAULT 1,
	`unit` varchar(32) DEFAULT '份',
	`calories` float NOT NULL DEFAULT 0,
	`proteinG` float DEFAULT 0,
	`carbsG` float DEFAULT 0,
	`fatG` float DEFAULT 0,
	`imageUrl` text,
	`loggedAt` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `food_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`targetWeightKg` float,
	`dailyCalories` int DEFAULT 1800,
	`proteinG` int DEFAULT 120,
	`carbsG` int DEFAULT 200,
	`fatG` int DEFAULT 60,
	`reminderTime` varchar(5) DEFAULT '07:00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_goals_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_goals_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `weight_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weightKg` float NOT NULL,
	`loggedAt` bigint NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weight_logs_id` PRIMARY KEY(`id`)
);
