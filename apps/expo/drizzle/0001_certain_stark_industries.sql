CREATE INDEX `sessions_lineage_completed_chrono` ON `sessions` (`program_id`, `lineage_id`, COALESCE(`start_ms`, `end_ms`, 0) DESC, `position` DESC) WHERE `status` = 'Done';
