import type { Goal, TrainingSetup } from "@/lib/exercises";
import { createClient } from "./client";

export type BodySex = "male" | "female";

export type OnboardingProfile = {
  displayName: string;
  goal: Goal;
  experience: string;
  bodyMetrics: {
    sex: BodySex;
    heightCm: number;
    weightKg: number;
    bmi: number;
  } | null;
  daysPerWeek: number;
  setup: TrainingSetup;
  planMode: "generated" | "custom";
};

type RoutinePayload = Array<{ id: string; name: string; exercises: Array<{ id: string; name: string }> }>;
type RoutineSchedulePayload = { startDate: string; weekdays: string[]; durationWeeks: number | null };
export type WorkoutExerciseLogPayload = {
  exerciseId: string;
  exerciseName: string;
  followedPlan: boolean;
  rpe: number | null;
  notes: string;
  sets: Array<{ weightKg: number | null; reps: number | null; completed: boolean }>;
};

export async function saveOnboarding(profile: OnboardingProfile) {
  if (typeof window !== "undefined") localStorage.setItem("flexform-profile", JSON.stringify(profile));
  const supabase = createClient();
  if (!supabase) return "device" as const;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "device" as const;
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: profile.displayName,
    goal: profile.goal,
    experience: profile.experience,
    sex: profile.bodyMetrics?.sex ?? null,
    height_cm: profile.bodyMetrics?.heightCm ?? null,
    weight_kg: profile.bodyMetrics?.weightKg ?? null,
    bmi: profile.bodyMetrics?.bmi ?? null,
    days_per_week: profile.daysPerWeek,
    equipment_setup: profile.setup,
    plan_mode: profile.planMode,
    onboarding_complete: true,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  return "supabase" as const;
}

export async function saveRoutine(days: RoutinePayload, source: "generated" | "custom", schedule?: RoutineSchedulePayload | null) {
  const supabase = createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: routine, error } = await supabase.from("routines").insert({
    user_id: user.id,
    name: days.length === 1 ? days[0].name : `${days.length}-day routine`,
    source,
    start_date: schedule?.startDate || null,
    weekdays: schedule?.weekdays ?? [],
    duration_weeks: schedule?.durationWeeks ?? null,
  }).select("id").single();
  if (error || !routine) throw error ?? new Error("Routine was not created");
  const rows = days.flatMap((day, dayIndex) => day.exercises.map((exercise, exerciseIndex) => ({
    routine_id: routine.id,
    user_id: user.id,
    day_index: dayIndex,
    day_name: day.name,
    exercise_key: exercise.id,
    position: exerciseIndex,
  })));
  if (rows.length) {
    const { error: itemError } = await supabase.from("routine_exercises").insert(rows);
    if (itemError) throw itemError;
  }
  return routine.id as string;
}

export async function deleteRoutine(routineId?: string) {
  const supabase = createClient();
  if (!supabase || !routineId) return "device" as const;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "device" as const;
  const { error } = await supabase.from("routines").delete().eq("user_id", user.id).eq("id", routineId);
  if (error) throw error;
  return "supabase" as const;
}

export async function saveWorkoutSummary(workoutKey: string, workoutName: string, completedExerciseIds: string[], calories: number, exerciseLogs: WorkoutExerciseLogPayload[] = []) {
  const completedAt = new Date().toISOString();
  if (typeof window !== "undefined") {
    const history = JSON.parse(localStorage.getItem("flexform-history") ?? "[]") as unknown[];
    localStorage.setItem("flexform-history", JSON.stringify([{ workoutKey, workoutName, completedExerciseIds, calories, completedAt, exerciseLogs }, ...history].slice(0, 100)));
  }
  const supabase = createClient();
  if (!supabase) return "device" as const;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "device" as const;
  const { data: session, error } = await supabase.from("workout_sessions").insert({
    user_id: user.id,
    workout_key: workoutKey,
    workout_name: workoutName,
    calories_burned: calories,
    completed_exercises: completedExerciseIds.length,
  }).select("id").single();
  if (error || !session) throw error ?? new Error("Workout session was not created");
  const exerciseRows = exerciseLogs.filter((log) => completedExerciseIds.includes(log.exerciseId)).map((log) => {
    const completedSets = log.sets.filter((set) => set.completed);
    const lastLoadedSet = [...completedSets].reverse().find((set) => set.weightKg !== null || set.reps !== null);
    return {
      session_id: session.id,
      user_id: user.id,
      exercise_key: log.exerciseId,
      exercise_name: log.exerciseName,
      completed_sets: completedSets.length,
      weight_kg: lastLoadedSet?.weightKg ?? null,
      reps: lastLoadedSet?.reps ?? null,
      followed_plan: log.followedPlan,
      rpe: log.rpe,
      notes: log.notes || null,
      set_data: log.sets,
    };
  });
  if (exerciseRows.length) {
    const { error: exerciseError } = await supabase.from("exercise_logs").insert(exerciseRows);
    if (exerciseError) throw exerciseError;
  }
  return "supabase" as const;
}
