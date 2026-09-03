import { createClient } from "./client";

export async function signUpWithEmail(name: string, email: string, password: string) {
  const supabase = createClient();
  if (!supabase) return { mode: "demo" as const };
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: name } },
  });
  if (error) throw error;
  return { mode: "supabase" as const };
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient();
  if (!supabase) return { mode: "demo" as const };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { mode: "supabase" as const };
}

export async function signOut() {
  const supabase = createClient();
  if (supabase) await supabase.auth.signOut();
}
