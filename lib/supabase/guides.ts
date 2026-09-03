import { createClient } from "./client";

export async function syncFavoriteExercise(exerciseId: string, saved: boolean) {
  if (typeof window !== "undefined") {
    const favorites = JSON.parse(localStorage.getItem("flexform-favorites") ?? "[]") as string[];
    const next = saved ? [...new Set([...favorites, exerciseId])] : favorites.filter((id) => id !== exerciseId);
    localStorage.setItem("flexform-favorites", JSON.stringify(next));
  }

  const supabase = createClient();
  if (!supabase) return "device" as const;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "device" as const;

  if (saved) {
    const { error } = await supabase.from("favorite_exercises").upsert(
      { user_id: user.id, exercise_key: exerciseId },
      { onConflict: "user_id,exercise_key" },
    );
    if (error) throw error;
  } else {
    const { error } = await supabase.from("favorite_exercises").delete().eq("user_id", user.id).eq("exercise_key", exerciseId);
    if (error) throw error;
  }

  return "supabase" as const;
}

export async function saveGuideCompletion(exerciseId: string) {
  const completedAt = new Date().toISOString();
  if (typeof window !== "undefined") {
    const existing = JSON.parse(localStorage.getItem("flexform-guides") ?? "[]") as Array<{ exerciseId: string; completedAt: string }>;
    localStorage.setItem("flexform-guides", JSON.stringify([{ exerciseId, completedAt }, ...existing].slice(0, 100)));
  }

  const supabase = createClient();
  if (!supabase) return "device" as const;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "device" as const;

  const { error } = await supabase.from("guide_completions").insert({ user_id: user.id, exercise_key: exerciseId, completed_at: completedAt });
  if (error) throw error;
  return "supabase" as const;
}
