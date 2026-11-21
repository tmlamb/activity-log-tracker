import ExerciseInsightsScreen from "~/components/ExerciseInsightsScreen";

/**
 * An alternative exercise's insights, pushed from its activity's. It has its
 * own route because routes are singular: pushing the activity's insights route
 * again would reuse the open screen instead of drilling down.
 */
export default ExerciseInsightsScreen;
