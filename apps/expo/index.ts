import "expo-sqlite/localStorage/install";
// Recover interrupted restores before Zustand reads either persisted store.
import "./src/utils/recover-pending-activity-log-restore";
import "expo-router/entry";
