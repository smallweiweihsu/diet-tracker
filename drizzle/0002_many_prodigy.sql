ALTER TABLE `food_logs` ADD `sugarG` float DEFAULT 0;--> statement-breakpoint
ALTER TABLE `food_logs` ADD `saturatedFatG` float DEFAULT 0;--> statement-breakpoint
ALTER TABLE `food_logs` ADD `fiberG` float DEFAULT 0;--> statement-breakpoint
ALTER TABLE `food_logs` ADD `sodiumMg` float DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user_goals` ADD `sex` enum('male','female');--> statement-breakpoint
ALTER TABLE `user_goals` ADD `age` int;--> statement-breakpoint
ALTER TABLE `user_goals` ADD `heightCm` float;--> statement-breakpoint
ALTER TABLE `user_goals` ADD `weeklyExerciseDays` int;--> statement-breakpoint
ALTER TABLE `user_goals` ADD `goalType` enum('lose','maintain','gain') DEFAULT 'maintain';