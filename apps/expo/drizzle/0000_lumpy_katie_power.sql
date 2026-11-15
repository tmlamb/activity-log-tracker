CREATE TABLE `activities` (
	`program_id` text NOT NULL,
	`session_id` text NOT NULL,
	`id` text NOT NULL,
	`exercise_id` text,
	`position` integer NOT NULL,
	`reps` real,
	`load_type` text,
	`load_value` real,
	`rest_minutes` real,
	PRIMARY KEY(`program_id`, `session_id`, `id`),
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`program_id`,`session_id`) REFERENCES `sessions`(`program_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "activity_id_nonempty" CHECK(length(trim("activities"."id")) > 0),
	CONSTRAINT "activity_position_nonnegative" CHECK("activities"."position" >= 0),
	CONSTRAINT "activity_load_type_valid" CHECK("activities"."load_type" IN ('PERCENT', 'RPE')),
	CONSTRAINT "activity_load_pair" CHECK(("activities"."load_type" IS NULL) = ("activities"."load_value" IS NULL))
);
--> statement-breakpoint
CREATE INDEX `activities_exercise` ON `activities` (`exercise_id`,`program_id`,`session_id`);--> statement-breakpoint
CREATE INDEX `activities_occurrence` ON `activities` (`program_id`,`session_id`,`exercise_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `activities_program_id_session_id_position_unique` ON `activities` (`program_id`,`session_id`,`position`);--> statement-breakpoint
CREATE TABLE `barbells` (
	`id` text PRIMARY KEY NOT NULL,
	`position` integer NOT NULL,
	`value` real NOT NULL,
	`unit` text NOT NULL,
	CONSTRAINT "barbell_id_nonempty" CHECK(length(trim("barbells"."id")) > 0),
	CONSTRAINT "barbell_position_nonnegative" CHECK("barbells"."position" >= 0),
	CONSTRAINT "barbell_unit_valid" CHECK("barbells"."unit" IN ('lbs', 'kg'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `barbells_position_unique` ON `barbells` (`position`);--> statement-breakpoint
CREATE TABLE `bootstrap_state` (
	`singleton` integer PRIMARY KEY NOT NULL,
	`database_id` text NOT NULL,
	`state` text NOT NULL,
	`generation` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "bootstrap_singleton" CHECK("bootstrap_state"."singleton" = 1),
	CONSTRAINT "bootstrap_state_valid" CHECK("bootstrap_state"."state" IN ('source-captured', 'awaiting-verification', 'ready')),
	CONSTRAINT "bootstrap_generation_nonnegative" CHECK("bootstrap_state"."generation" >= 0)
);
--> statement-breakpoint
CREATE TABLE `conversion_reports` (
	`id` integer PRIMARY KEY NOT NULL,
	`snapshot_id` integer NOT NULL,
	`converter_version` integer NOT NULL,
	`report` text NOT NULL,
	`verified_at` integer,
	FOREIGN KEY (`snapshot_id`) REFERENCES `conversion_snapshots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `conversion_snapshots` (
	`id` integer PRIMARY KEY NOT NULL,
	`workout` text,
	`exercises` text,
	`restore_journal` text,
	`captured_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exercise_muscles` (
	`exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`muscle_id` integer NOT NULL,
	PRIMARY KEY(`exercise_id`, `position`),
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`muscle_id`) REFERENCES `muscle_labels`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "exercise_muscle_position_nonnegative" CHECK("exercise_muscles"."position" >= 0)
);
--> statement-breakpoint
CREATE INDEX `exercise_muscles_label` ON `exercise_muscles` (`muscle_id`,`exercise_id`);--> statement-breakpoint
CREATE TABLE `exercise_presets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`load_kind` text,
	CONSTRAINT "preset_id_nonempty" CHECK(length(trim("exercise_presets"."id")) > 0),
	CONSTRAINT "preset_position_nonnegative" CHECK("exercise_presets"."position" >= 0),
	CONSTRAINT "preset_load_kind_valid" CHECK("exercise_presets"."load_kind" IN ('BARBELL', 'WEIGHT_PAIR', 'SINGLE_WEIGHT'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercise_presets_position_unique` ON `exercise_presets` (`position`);--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`position` integer NOT NULL,
	`load_kind` text,
	`barbell_id` text,
	`one_rep_max_value` real,
	`one_rep_max_unit` text,
	`notes` text,
	`deleted` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`barbell_id`) REFERENCES `barbells`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "exercise_id_nonempty" CHECK(length(trim("exercises"."id")) > 0),
	CONSTRAINT "exercise_position_nonnegative" CHECK("exercises"."position" >= 0),
	CONSTRAINT "exercise_load_kind_valid" CHECK("exercises"."load_kind" IN ('BARBELL', 'WEIGHT_PAIR', 'SINGLE_WEIGHT')),
	CONSTRAINT "exercise_unit_valid" CHECK("exercises"."one_rep_max_unit" IN ('lbs', 'kg')),
	CONSTRAINT "exercise_weight_pair" CHECK(("exercises"."one_rep_max_value" IS NULL) = ("exercises"."one_rep_max_unit" IS NULL)),
	CONSTRAINT "exercise_deleted_valid" CHECK("exercises"."deleted" IN (0, 1)),
	CONSTRAINT "exercise_revision_nonnegative" CHECK("exercises"."revision" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_position_unique` ON `exercises` (`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_active_name` ON `exercises` (`normalized_name`) WHERE "exercises"."deleted" = 0;--> statement-breakpoint
CREATE TABLE `lifecycle_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`state` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `muscle_catalog` (
	`position` integer PRIMARY KEY NOT NULL,
	`muscle_id` integer NOT NULL,
	FOREIGN KEY (`muscle_id`) REFERENCES `muscle_labels`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "muscle_catalog_position_nonnegative" CHECK("muscle_catalog"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE `muscle_labels` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `muscle_labels_name_unique` ON `muscle_labels` (`name`);--> statement-breakpoint
CREATE TABLE `plates` (
	`id` text PRIMARY KEY NOT NULL,
	`position` integer NOT NULL,
	`value` real NOT NULL,
	`unit` text NOT NULL,
	`quantity` real NOT NULL,
	CONSTRAINT "plate_id_nonempty" CHECK(length(trim("plates"."id")) > 0),
	CONSTRAINT "plate_position_nonnegative" CHECK("plates"."position" >= 0),
	CONSTRAINT "plate_unit_valid" CHECK("plates"."unit" IN ('lbs', 'kg'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plates_position_unique` ON `plates` (`position`);--> statement-breakpoint
CREATE TABLE `preset_muscles` (
	`preset_id` text NOT NULL,
	`position` integer NOT NULL,
	`muscle_id` integer NOT NULL,
	PRIMARY KEY(`preset_id`, `position`),
	FOREIGN KEY (`preset_id`) REFERENCES `exercise_presets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`muscle_id`) REFERENCES `muscle_labels`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "preset_muscle_position_nonnegative" CHECK("preset_muscles"."position" >= 0)
);
--> statement-breakpoint
CREATE INDEX `preset_muscles_label` ON `preset_muscles` (`muscle_id`,`preset_id`);--> statement-breakpoint
CREATE TABLE `programs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	CONSTRAINT "program_id_nonempty" CHECK(length(trim("programs"."id")) > 0),
	CONSTRAINT "program_position_nonnegative" CHECK("programs"."position" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `programs_position_unique` ON `programs` (`position`);--> statement-breakpoint
CREATE TABLE `schema_migrations` (
	`version` integer PRIMARY KEY NOT NULL,
	`applied_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session_lineages` (
	`program_id` text NOT NULL,
	`id` text NOT NULL,
	PRIMARY KEY(`program_id`, `id`),
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "lineage_id_nonempty" CHECK(length(trim("session_lineages"."id")) > 0)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`program_id` text NOT NULL,
	`id` text NOT NULL,
	`lineage_id` text,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`status` text NOT NULL,
	`deload` integer NOT NULL,
	`start_ms` integer,
	`end_ms` integer,
	`last_activity_at_ms` integer,
	`revision` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`program_id`, `id`),
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`program_id`,`lineage_id`) REFERENCES `session_lineages`(`program_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "session_id_nonempty" CHECK(length(trim("sessions"."id")) > 0),
	CONSTRAINT "session_position_nonnegative" CHECK("sessions"."position" >= 0),
	CONSTRAINT "session_status_valid" CHECK("sessions"."status" IN ('Planned', 'Ready', 'Done', 'Incomplete')),
	CONSTRAINT "session_deload_valid" CHECK("sessions"."deload" IN (0, 1)),
	CONSTRAINT "session_revision_nonnegative" CHECK("sessions"."revision" >= 0)
);
--> statement-breakpoint
CREATE INDEX `sessions_lineage` ON `sessions` (`program_id`,`lineage_id`,`position`);--> statement-breakpoint
CREATE INDEX `sessions_start` ON `sessions` (`program_id`,`start_ms`,`position`);--> statement-breakpoint
CREATE INDEX `sessions_ready` ON `sessions` (`last_activity_at_ms`) WHERE "sessions"."status" = 'Ready';--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_program_id_position_unique` ON `sessions` (`program_id`,`position`);--> statement-breakpoint
CREATE TABLE `workout_sets` (
	`program_id` text NOT NULL,
	`session_id` text NOT NULL,
	`activity_id` text NOT NULL,
	`id` text NOT NULL,
	`kind` text NOT NULL,
	`position` integer NOT NULL,
	`status` text NOT NULL,
	`feedback` text NOT NULL,
	`actual_reps` real,
	`weight_value` real,
	`weight_unit` text,
	`start_ms` integer,
	`end_ms` integer,
	PRIMARY KEY(`program_id`, `session_id`, `activity_id`, `id`),
	FOREIGN KEY (`program_id`,`session_id`,`activity_id`) REFERENCES `activities`(`program_id`,`session_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "set_id_nonempty" CHECK(length(trim("workout_sets"."id")) > 0),
	CONSTRAINT "set_position_nonnegative" CHECK("workout_sets"."position" >= 0),
	CONSTRAINT "set_kind_valid" CHECK("workout_sets"."kind" IN ('Warmup', 'Main')),
	CONSTRAINT "set_status_valid" CHECK("workout_sets"."status" IN ('Planned', 'Ready', 'Done', 'Incomplete')),
	CONSTRAINT "set_feedback_valid" CHECK("workout_sets"."feedback" IN ('Easy', 'Neutral', 'Hard')),
	CONSTRAINT "set_unit_valid" CHECK("workout_sets"."weight_unit" IN ('lbs', 'kg')),
	CONSTRAINT "set_weight_pair" CHECK(("workout_sets"."weight_value" IS NULL) = ("workout_sets"."weight_unit" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workout_sets_program_id_session_id_activity_id_kind_position_unique` ON `workout_sets` (`program_id`,`session_id`,`activity_id`,`kind`,`position`);