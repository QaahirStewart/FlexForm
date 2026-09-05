import type { Goal, TrainingSetup } from "@/lib/exercises";
import { createClient } from "./client";

export type OnboardingProfile = {
  displayName: string;
  goal: Goal;
  experience: string;
  bodyMetrics: {
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

export async function saveWorkoutSummary(workoutKey: string, workoutName: string, completedExerciseIds: string[], calories: number) {
  const completedAt = new Date().toISOString();
  if (typeof window !== "undefined") {
    const history = JSON.parse(localStorage.getItem("flexform-history") ?? "[]") as unknown[];
    localStorage.setItem("flexform-history", JSON.stringify([{ workoutKey, workoutName, completedExerciseIds, calories, completedAt }, ...history].slice(0, 100)));
  }
  const supabase = createClient();
  if (!supabase) return "device" as const;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "device" as const;
  const { error } = await supabase.from("workout_sessions").insert({
    user_id: user.id,
    workout_key: workoutKey,
    workout_name: workoutName,
    calories_burned: calories,
    completed_exercises: completedExerciseIds.length,
  });
  if (error) throw error;
  return "supabase" as const;
}
