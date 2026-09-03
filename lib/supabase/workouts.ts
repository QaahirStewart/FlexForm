import type { Exercise, TrainingDay } from "@/lib/program";
import { createClient } from "./client";

export type WorkoutPayload = {
  day: TrainingDay;
  completedExercises: Exercise[];
  elapsedSeconds: number;
  completedAt: string;
};

export async function saveWorkout(payload: WorkoutPayload) {
  if (typeof window !== "undefined") {
    const existing = JSON.parse(localStorage.getItem("flexform-workouts") ?? "[]") as WorkoutPayload[];
    localStorage.setItem("flexform-workouts", JSON.stringify([payload, ...existing].slice(0, 20)));
  }

  const supabase = createClient();
  if (!supabase) return { destination: "device" as const };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { destination: "device" as const };

  const { data: session, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      workout_key: payload.day.id,
      workout_name: payload.day.name,
      duration_seconds: payload.elapsedSeconds,
      completed_at: payload.completedAt,
    })
    .select("id")
    .single();

  if (error) throw error;

  if (payload.completedExercises.length) {
    const { error: exerciseError } = await supabase.from("exercise_logs").insert(
      payload.completedExercises.map((exercise) => ({
        session_id: session.id,
        user_id: user.id,
        exercise_key: exercise.id,
        exercise_name: exercise.name,
        completed_sets: exercise.sets,
      })),
    );
    if (exerciseError) throw exerciseError;
  }

  return { destination: "supabase" as const };
}
