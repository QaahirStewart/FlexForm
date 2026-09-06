"use client";

import Image from "next/image";
import {
  Activity,
  Apple,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ChevronRight,
  Clock3,
  Coffee,
  Droplet,
  Dumbbell,
  Eye,
  EyeOff,
  Flame,
  Footprints,
  Home,
  LockKeyhole,
  LogOut,
  Mail,
  Mic,
  Minus,
  Play,
  Plus,
  RotateCcw,
  ScanLine,
  Search,
  Sparkles,
  Target,
  TimerReset,
  Trash2,
  Trophy,
  UserRound,
  Utensils,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  bodyAreas,
  buildRoutine,
  difficultyOptions,
  equipmentOptions,
  exercises,
  muscleGroups,
  type ExerciseGuide,
  type Goal,
  type TrainingSetup,
} from "@/lib/exercises";
import { signInWithEmail, signOut, signUpWithEmail } from "@/lib/supabase/auth";
import { saveGuideCompletion, syncFavoriteExercise } from "@/lib/supabase/guides";
import { deleteRoutine, saveOnboarding, saveRoutine, saveWorkoutSummary, type OnboardingProfile } from "@/lib/supabase/product";
import { DotMatrixChart, DotMeter, DotProgress } from "@/components/dot-matrix";
import { DateStrip, buildDateTicks, formatLongDate } from "@/components/date-strip";
import { AccentPicker, ThemeControls } from "@/components/theme-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AppStage = "auth" | "onboarding" | "app";
type View = "Home" | "Workout" | "Library" | "Meal" | "Profile";
type RoutineDay = ReturnType<typeof buildRoutine>[number];
type RoutineBuilderStep = "exercises" | "split" | "schedule";
type RoutineSchedule = { startDate: string; weekdays: string[]; durationWeeks: number | null };
type CustomRoutineDraft = { days: RoutineDay[]; schedule: RoutineSchedule };
type RoutinePlan = { id: string; cloudId?: string; name: string; days: RoutineDay[]; schedule: RoutineSchedule | null };
type MealKind = "Breakfast" | "Lunch" | "Dinner" | "Snack";
type MealEntry = { id: string; type: MealKind; time: string; title: string; calories: number; protein: number };
type MealDraft = Omit<MealEntry, "id">;
type MeasurementSystem = "metric" | "imperial";

const splitNameTemplates: Record<number, string[]> = {
  1: ["Workout"],
  2: ["Upper body", "Lower body"],
  3: ["Push", "Pull", "Legs"],
  4: ["Upper A", "Lower A", "Upper B", "Lower B"],
  5: ["Push", "Pull", "Legs", "Upper", "Lower"],
  6: ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"],
};
const splitNamesFor = (count: number) => splitNameTemplates[count] ?? Array.from({ length: count }, (_, index) => `Workout ${index + 1}`);

const scheduleWeekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const weekdayNumber: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildScheduledDates(schedule: RoutineSchedule | null, count: number) {
  if (!schedule?.startDate || !schedule.weekdays.length) return [];
  const cursor = new Date(`${schedule.startDate}T12:00:00`);
  const dates: Date[] = [];
  for (let offset = 0; offset < 28 && dates.length < count; offset += 1) {
    const candidate = new Date(cursor);
    candidate.setDate(cursor.getDate() + offset);
    if (schedule.weekdays.some((day) => weekdayNumber[day] === candidate.getDay())) dates.push(candidate);
  }
  return dates;
}

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return "Below healthy range";
  if (bmi < 25) return "Healthy range";
  if (bmi < 30) return "Above healthy range";
  return "High range";
}

function calculateBodyMetrics(system: MeasurementSystem, values: { heightCm: string; weightKg: string; heightFeet: string; heightInches: string; weightLb: string }): OnboardingProfile["bodyMetrics"] | null {
  let heightCm: number;
  let weightKg: number;

  if (system === "metric") {
    if (!values.heightCm.trim() || !values.weightKg.trim()) return null;
    heightCm = Number(values.heightCm);
    weightKg = Number(values.weightKg);
  } else {
    if (!values.heightFeet.trim() || !values.weightLb.trim()) return null;
    const totalInches = (Number(values.heightFeet) * 12) + (Number(values.heightInches) || 0);
    heightCm = totalInches * 2.54;
    weightKg = Number(values.weightLb) * 0.45359237;
  }

  if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg) || heightCm < 100 || heightCm > 250 || weightKg < 30 || weightKg > 300) return null;
  const bmi = weightKg / ((heightCm / 100) ** 2);
  if (bmi < 10 || bmi > 80) return null;
  return { heightCm: Math.round(heightCm * 10) / 10, weightKg: Math.round(weightKg * 10) / 10, bmi: Math.round(bmi * 10) / 10 };
}

const mealIcons = { Breakfast: Coffee, Lunch: Utensils, Dinner: Utensils, Snack: Apple };
const initialMeals: MealEntry[] = [
  { id: "breakfast-1", type: "Breakfast", time: "08:32 am", title: "Greek yogurt · Berries · Granola", calories: 420, protein: 24 },
  { id: "lunch-1", type: "Lunch", time: "12:48 pm", title: "Chicken bowl · Rice · Greens", calories: 640, protein: 48 },
  { id: "snack-1", type: "Snack", time: "04:10 pm", title: "Apple · Almonds", calories: 210, protein: 6 },
];

const navItems = [
  { label: "Home" as const, icon: Home },
  { label: "Workout" as const, icon: Dumbbell },
  { label: "Meal" as const, icon: Apple },
];

const goals: Array<{ value: Goal; copy: string }> = [
  { value: "Build muscle", copy: "Hypertrophy, balanced volume, steady progression" },
  { value: "Lose fat", copy: "Higher output with strength kept in the plan" },
  { value: "Get stronger", copy: "Heavy compounds and measurable progression" },
  { value: "Move better", copy: "Control, range, stability, and resilience" },
];

const accentLabel = { blue: "Push", green: "Lower", purple: "Pull", orange: "Hinge" };

type BodySide = "front" | "back";
type BodyModelVariant = "male" | "female";
type BodyRegionName = "Chest" | "Shoulders" | "Arms" | "Core" | "Back" | "Glutes" | "Legs" | "Hamstrings" | "Calves";

const bodyRegions: Record<BodySide, Array<{ name: BodyRegionName; paths: string[] }>> = {
  front: [
    { name: "Shoulders", paths: [
      "M38 29C33 27 27 29 23 34C21 38 22 43 26 46C30 44 31 38 33 35C35 32 37 31 38 29Z",
      "M62 29C67 27 73 29 77 34C79 38 78 43 74 46C70 44 69 38 67 35C65 32 63 31 62 29Z",
    ] },
    { name: "Chest", paths: [
      "M39 33C42 31 47 31 49 34L49 48C45 48 40 45 36 41C36 37 37 35 39 33Z",
      "M61 33C58 31 53 31 51 34L51 48C55 48 60 45 64 41C64 37 63 35 61 33Z",
    ] },
    { name: "Arms", paths: [
      "M25 42C21 47 20 55 22 62C24 66 25 70 27 73C30 69 30 63 28 58C31 52 31 46 29 42Z",
      "M22 61C18 67 15 76 17 82C18 86 21 87 23 83L27 72C25 69 24 65 22 61Z",
      "M75 42C79 47 80 55 78 62C76 66 75 70 73 73C70 69 70 63 72 58C69 52 69 46 71 42Z",
      "M78 61C82 67 85 76 83 82C82 86 79 87 77 83L73 72C75 69 76 65 78 61Z",
    ] },
    { name: "Core", paths: [
      "M40 47C43 49 47 49 49 48L49 78C45 78 42 74 40 69C38 61 37 53 40 47Z",
      "M60 47C57 49 53 49 51 48L51 78C55 78 58 74 60 69C62 61 63 53 60 47Z",
    ] },
    { name: "Legs", paths: [
      "M39 77C34 82 32 93 33 104C34 111 38 114 43 110C46 102 47 91 47 80C44 79 42 78 39 77Z",
      "M61 77C66 82 68 93 67 104C66 111 62 114 57 110C54 102 53 91 53 80C56 79 58 78 61 77Z",
    ] },
    { name: "Calves", paths: [
      "M36 108C32 114 32 126 35 136C37 141 41 138 42 132L43 113C41 109 39 108 36 108Z",
      "M64 108C68 114 68 126 65 136C63 141 59 138 58 132L57 113C59 109 61 108 64 108Z",
    ] },
  ],
  back: [
    { name: "Shoulders", paths: [
      "M38 29C33 27 27 29 23 34C21 38 22 43 26 46C30 44 31 38 33 35C35 32 37 31 38 29Z",
      "M62 29C67 27 73 29 77 34C79 38 78 43 74 46C70 44 69 38 67 35C65 32 63 31 62 29Z",
    ] },
    { name: "Back", paths: [
      "M49 29C44 31 40 34 36 39C38 45 40 48 40 55C37 60 36 66 38 72C42 69 46 65 49 60Z",
      "M51 29C56 31 60 34 64 39C62 45 60 48 60 55C63 60 64 66 62 72C58 69 54 65 51 60Z",
    ] },
    { name: "Arms", paths: [
      "M25 42C21 47 20 55 22 62C24 66 25 70 27 73C30 69 30 63 28 58C31 52 31 46 29 42Z",
      "M22 61C18 67 15 76 17 82C18 86 21 87 23 83L27 72C25 69 24 65 22 61Z",
      "M75 42C79 47 80 55 78 62C76 66 75 70 73 73C70 69 70 63 72 58C69 52 69 46 71 42Z",
      "M78 61C82 67 85 76 83 82C82 86 79 87 77 83L73 72C75 69 76 65 78 61Z",
    ] },
    { name: "Glutes", paths: [
      "M39 72C34 74 33 82 36 88C40 92 45 90 49 85L49 74C46 72 42 71 39 72Z",
      "M61 72C66 74 67 82 64 88C60 92 55 90 51 85L51 74C54 72 58 71 61 72Z",
    ] },
    { name: "Hamstrings", paths: [
      "M38 88C34 94 34 106 37 113C40 117 44 113 46 108L48 89C45 91 42 91 38 88Z",
      "M62 88C66 94 66 106 63 113C60 117 56 113 54 108L52 89C55 91 58 91 62 88Z",
    ] },
    { name: "Calves", paths: [
      "M36 111C32 118 33 130 36 138C38 142 41 138 42 132L43 116C41 112 39 111 36 111Z",
      "M64 111C68 118 67 130 64 138C62 142 59 138 58 132L57 116C59 112 61 111 64 111Z",
    ] },
  ],
};

const bodyRegionTerms: Record<BodyRegionName, string[]> = {
  Chest: ["chest", "pectoral"],
  Shoulders: ["shoulder", "deltoid"],
  Arms: ["arms", "triceps", "biceps", "brachialis", "brachioradialis", "forearm", "elbow"],
  Core: ["core", "rectus abdominis", "oblique", "anti-extension", "spinal flexion"],
  Back: ["back", "latissimus", "rhomboid", "trapezius", "vertical pull", "horizontal pull"],
  Glutes: ["glute", "hip extension"],
  Legs: ["legs", "quadriceps", "adductor", "squat", "lunge", "step"],
  Hamstrings: ["hamstring", "knee flexion", "hip hinge"],
  Calves: ["calf", "calves", "gastrocnemius", "soleus", "plantar flexion"],
};

const bodyModelArtwork: Record<BodyModelVariant, Record<BodySide, string>> = {
  male: { front: "/anatomy/body-front.png", back: "/anatomy/body-back.png" },
  female: { front: "/anatomy/body-female-front.png", back: "/anatomy/body-female-back.png" },
};

const bodyRegionArtwork: Record<BodyModelVariant, Record<BodySide, Partial<Record<BodyRegionName, string>>>> = {
  male: {
    front: { Shoulders: "/anatomy/body-front-shoulders.png", Chest: "/anatomy/body-front-chest.png", Arms: "/anatomy/body-front-arms.png", Core: "/anatomy/body-front-core.png", Legs: "/anatomy/body-front-legs.png", Calves: "/anatomy/body-front-calves.png" },
    back: { Shoulders: "/anatomy/body-back-shoulders.png", Back: "/anatomy/body-back-back.png", Arms: "/anatomy/body-back-arms.png", Glutes: "/anatomy/body-back-glutes.png", Hamstrings: "/anatomy/body-back-hamstrings.png", Calves: "/anatomy/body-back-calves.png" },
  },
  female: {
    front: { Shoulders: "/anatomy/body-female-front-shoulders.png", Chest: "/anatomy/body-female-front-chest.png", Arms: "/anatomy/body-female-front-arms.png", Core: "/anatomy/body-female-front-core.png", Legs: "/anatomy/body-female-front-legs.png", Calves: "/anatomy/body-female-front-calves.png" },
    back: { Shoulders: "/anatomy/body-female-back-shoulders.png", Back: "/anatomy/body-female-back-back.png", Arms: "/anatomy/body-female-back-arms.png", Glutes: "/anatomy/body-female-back-glutes.png", Hamstrings: "/anatomy/body-female-back-hamstrings.png", Calves: "/anatomy/body-female-back-calves.png" },
  },
};

function selectedBodyArtworks(model: BodyModelVariant, side: BodySide, parts: BodyRegionName[]) {
  const highlighted = parts.flatMap((part) => {
    const artwork = bodyRegionArtwork[model][side][part];
    return artwork ? [artwork] : [];
  });
  return highlighted.length ? highlighted : [bodyModelArtwork[model][side]];
}

function selectedBodyRegionLabel(parts: BodyRegionName[]) {
  if (!parts.length) return "Tap muscles";
  if (parts.length <= 2) return parts.join(" + ");
  return `${parts.length} muscles selected`;
}

function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className={`brand ${inverse ? "inverse" : ""}`} aria-label="FX FORCE">
      <strong aria-hidden="true"><span>FX</span><small>FORCE</small></strong>
    </div>
  );
}

function AuthScreen({ onReady }: { onReady: (name: string) => void }) {
  const [mode, setMode] = useState<"create" | "signin">("create");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ kind: "progress" | "success" | "error"; message: string } | null>(null);

  const changeMode = (nextMode: "create" | "signin") => {
    setMode(nextMode);
    setStatus(null);
    setShowPassword(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setStatus({ kind: "progress", message: mode === "create" ? "Creating your account…" : "Signing you in…" });
    try {
      const cleanName = name.trim() || "Athlete";
      const cleanEmail = email.trim().toLowerCase();
      if (mode === "create") {
        const result = await signUpWithEmail(cleanName, cleanEmail, password);
        if (result.mode === "supabase" && result.requiresEmailConfirmation) {
          setStatus({ kind: "success", message: "Check your email to confirm your account, then sign in." });
          return;
        }
      } else await signInWithEmail(cleanEmail, password);
      onReady(mode === "create" ? cleanName : cleanEmail.split("@")[0] || "Athlete");
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Could not continue. Try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="auth-panel-inner">
          <header className="auth-brand"><Brand /></header>
          <div className="auth-intro">
            <span className="eyebrow">Train with intent</span>
            <h1 id="auth-title">{mode === "create" ? "Start your training." : "Welcome back."}</h1>
            <p>{mode === "create" ? "A focused plan, built around you." : "Your plan is ready when you are."}</p>
          </div>
          <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button type="button" role="tab" aria-selected={mode === "create"} className={mode === "create" ? "active" : ""} onClick={() => changeMode("create")}>Create account</button>
            <button type="button" role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "active" : ""} onClick={() => changeMode("signin")}>Sign in</button>
          </div>
          <form onSubmit={submit} aria-labelledby="auth-title">
            {mode === "create" && <div className="auth-field"><label htmlFor="auth-name">Name</label><div className="auth-control"><UserRound size={17} /><input id="auth-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required /></div></div>}
            <div className="auth-field"><label htmlFor="auth-email">Email</label><div className="auth-control"><Mail size={17} /><input id="auth-email" autoComplete="email" autoCapitalize="none" spellCheck={false} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></div></div>
            <div className="auth-field"><label htmlFor="auth-password">Password</label><div className="auth-control"><LockKeyhole size={17} /><input id="auth-password" autoComplete={mode === "create" ? "new-password" : "current-password"} type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8 characters minimum" minLength={8} required /><button className="password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
            <div className={`form-status ${status?.kind ?? ""}`} aria-live="polite" aria-atomic="true">{status?.message ?? ""}</div>
            <button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? "Please wait" : mode === "create" ? "Get started" : "Continue"}{!isSubmitting && <ArrowRight size={18} />}</button>
          </form>
          <div className="auth-divider"><span>or</span></div>
          <button className="demo-button" type="button" onClick={() => onReady("Alex")}>Continue without an account</button>
          <small className="auth-note">Your training plan. Nothing extra.</small>
        </div>
      </section>
    </main>
  );
}

function Onboarding({ displayName, onComplete }: { displayName: string; onComplete: (profile: OnboardingProfile) => void }) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal>("Build muscle");
  const [experience, setExperience] = useState("Returning");
  const [measurementSystem, setMeasurementSystem] = useState<MeasurementSystem>("metric");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [weightLb, setWeightLb] = useState("");
  const [days, setDays] = useState(4);
  const [setup, setSetup] = useState<TrainingSetup>("Full gym");
  const [planMode, setPlanMode] = useState<"generated" | "custom">("generated");
  const metricValues = { heightCm, weightKg, heightFeet, heightInches, weightLb };
  const bodyMetrics = calculateBodyMetrics(measurementSystem, metricValues);
  const hasStartedMetrics = measurementSystem === "metric" ? Boolean(heightCm || weightKg) : Boolean(heightFeet || heightInches || weightLb);

  const changeMeasurementSystem = (nextSystem: MeasurementSystem) => {
    if (nextSystem === measurementSystem) return;
    if (nextSystem === "imperial" && Number(heightCm) > 0) {
      const totalInches = Number(heightCm) / 2.54;
      const feet = Math.floor(totalInches / 12);
      setHeightFeet(String(feet));
      setHeightInches(String(Math.round((totalInches - feet * 12) * 10) / 10));
      if (Number(weightKg) > 0) setWeightLb(String(Math.round(Number(weightKg) * 2.20462262 * 10) / 10));
    }
    if (nextSystem === "metric" && Number(heightFeet) > 0) {
      setHeightCm(String(Math.round(((Number(heightFeet) * 12) + (Number(heightInches) || 0)) * 2.54 * 10) / 10));
      if (Number(weightLb) > 0) setWeightKg(String(Math.round(Number(weightLb) * 0.45359237 * 10) / 10));
    }
    setMeasurementSystem(nextSystem);
  };

  const screens = [
    { kicker: "Your outcome", title: "What are we training for?", copy: "Your goal changes exercise priority, weekly volume, and session structure.", body: <div className="choice-grid">{goals.map((item) => <button key={item.value} className={goal === item.value ? "selected" : ""} onClick={() => setGoal(item.value)}><Target size={20} /><strong>{item.value}</strong><small>{item.copy}</small><i>{goal === item.value && <Check size={13} />}</i></button>)}</div> },
    { kicker: "Training history", title: "Where are you starting?", copy: "This keeps the routine challenging without making it reckless.", body: <div className="stacked-choices">{[["New", "I’m learning gym movements"], ["Returning", "I’ve trained before and I’m rebuilding"], ["Experienced", "I train consistently with solid technique"]].map(([value, label]) => <button key={value} className={experience === value ? "selected" : ""} onClick={() => setExperience(value)}><span>{value}</span><small>{label}</small><i>{experience === value && <Check size={14} />}</i></button>)}</div> },
    { kicker: "Body metrics", title: "Find your baseline.", copy: "Add your height and weight for a quick BMI estimate.", body: <div className="bmi-calculator">
      <div className="bmi-units" role="group" aria-label="Measurement system"><button type="button" className={measurementSystem === "metric" ? "active" : ""} onClick={() => changeMeasurementSystem("metric")}>Metric</button><button type="button" className={measurementSystem === "imperial" ? "active" : ""} onClick={() => changeMeasurementSystem("imperial")}>Imperial</button></div>
      {measurementSystem === "metric" ? <div className="bmi-fields"><label><span>Height</span><div><input type="number" inputMode="decimal" min="100" max="250" step="0.1" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} placeholder="175" aria-label="Height in centimetres" /><small>cm</small></div></label><label><span>Weight</span><div><input type="number" inputMode="decimal" min="30" max="300" step="0.1" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} placeholder="75" aria-label="Weight in kilograms" /><small>kg</small></div></label></div> : <div className="bmi-fields imperial"><label><span>Height</span><div><input type="number" inputMode="numeric" min="3" max="8" step="1" value={heightFeet} onChange={(event) => setHeightFeet(event.target.value)} placeholder="5" aria-label="Height in feet" /><small>ft</small></div></label><label><span>Height</span><div><input type="number" inputMode="decimal" min="0" max="11.9" step="0.1" value={heightInches} onChange={(event) => setHeightInches(event.target.value)} placeholder="9" aria-label="Additional height in inches" /><small>in</small></div></label><label><span>Weight</span><div><input type="number" inputMode="decimal" min="66" max="660" step="0.1" value={weightLb} onChange={(event) => setWeightLb(event.target.value)} placeholder="165" aria-label="Weight in pounds" /><small>lb</small></div></label></div>}
      <div className={`bmi-result ${bodyMetrics ? "ready" : ""}`} aria-live="polite">{bodyMetrics ? <><div><span>Your BMI</span><strong className="dot-num">{bodyMetrics.bmi.toFixed(1)}</strong><small>{bmiCategory(bodyMetrics.bmi)}</small></div><div className="bmi-axis" aria-hidden="true"><div className="bmi-scale"><i style={{ left: `${Math.min(100, Math.max(0, ((bodyMetrics.bmi - 18.5) / 11.5) * 100))}%` }} /><span /><span /><span /><span /></div></div><div className="bmi-legend" aria-label="BMI scale legend"><span><b>Under</b><small>&lt;18.5</small></span><span><b>Healthy</b><small>18.5–24.9</small></span><span><b>Above</b><small>25–29.9</small></span><span><b>High</b><small>30+</small></span></div></> : <div className="bmi-placeholder"><Activity size={21} /><span>{hasStartedMetrics ? "Check that your measurements are within the supported range." : "Enter your measurements to see your result."}</span></div>}</div>
      <p className="bmi-note">BMI is a general screening estimate, not a medical diagnosis.</p>
    </div> },
    { kicker: "Weekly rhythm", title: "How many days can you own?", copy: "Choose the schedule you can repeat even during a busy week.", body: <div className="day-picker"><button onClick={() => setDays(Math.max(2, days - 1))}><Minus /></button><strong>{days}<span>days / week</span></strong><button onClick={() => setDays(Math.min(6, days + 1))}><Plus /></button></div> },
    { kicker: "Your setup", title: "What can you train with?", copy: "Every generated exercise will fit the equipment you actually have.", body: <div className="stacked-choices">{[["Full gym", "Barbells, cables, machines, dumbbells"], ["Dumbbells", "Dumbbells, bench, and bodyweight"], ["Bodyweight", "No equipment required"]].map(([value, label]) => <button key={value} className={setup === value ? "selected" : ""} onClick={() => setSetup(value as TrainingSetup)}><span>{value}</span><small>{label}</small><i>{setup === value && <Check size={14} />}</i></button>)}</div> },
    { kicker: "Make it yours", title: "How should we build your routine?", copy: "Start with a smart recommendation or choose every movement yourself.", body: <div className="plan-mode-grid"><button className={planMode === "generated" ? "selected" : ""} onClick={() => setPlanMode("generated")}><Sparkles /><strong>Build it for me</strong><small>FXFORCE selects a balanced routine from your answers.</small></button><button className={planMode === "custom" ? "selected" : ""} onClick={() => setPlanMode("custom")}><Dumbbell /><strong>I’ll build my own</strong><small>Open the full library and handpick your exercises.</small></button></div> },
  ];
  const current = screens[step];
  const finalStep = screens.length - 1;
  const metricsStep = 2;
  const continueDisabled = step === metricsStep && !bodyMetrics;

  const continueOnboarding = () => {
    if (continueDisabled) return;
    if (step < finalStep) {
      setStep((value) => value + 1);
      return;
    }
    onComplete({ displayName, goal, experience, bodyMetrics, daysPerWeek: days, setup, planMode });
  };

  return (
    <main className="onboarding-shell">
      <header><Brand /><span>{String(step + 1).padStart(2, "0")} / {String(screens.length).padStart(2, "0")}</span></header>
      <div className="step-track"><i style={{ width: `${((step + 1) / screens.length) * 100}%` }} /></div>
      <section className="onboarding-card">
        <div className="onboarding-copy"><span className="eyebrow">{current.kicker}</span><h1>{current.title}</h1><p>{current.copy}</p></div>
        {current.body}
      </section>
      <footer>
        <button className="back-button" disabled={step === 0} onClick={() => setStep((value) => value - 1)}><ArrowLeft size={18} /> Back</button>
        <div className="onboarding-actions">{step === metricsStep && !bodyMetrics && <button className="skip-button" onClick={() => setStep((value) => value + 1)}>Skip</button>}<button className="primary-button" disabled={continueDisabled} onClick={continueOnboarding}>{step === finalStep ? planMode === "generated" ? "Build my routine" : "Open exercise library" : "Continue"}<ArrowRight size={18} /></button></div>
      </footer>
    </main>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="exercise-search"><Search size={19} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search exercise or muscle" />{value && <button onClick={() => onChange("")} aria-label="Clear search"><X size={16} /></button>}</div>;
}

function SectionTitle({ kicker, title, action }: { kicker?: string; title: string; action?: React.ReactNode }) {
  return <div className="section-title"><div>{kicker && <span>{kicker}</span>}<h2>{title}</h2></div>{action}</div>;
}

function ExerciseCard({ exercise, saved, selected, onOpen, onSave, onAdd, feature = false }: { exercise: ExerciseGuide; saved: boolean; selected?: boolean; onOpen: () => void; onSave: () => void; onAdd?: () => void; feature?: boolean }) {
  return (
    <article className={`exercise-card accent-${exercise.accent} ${feature ? "feature" : ""}`}>
      <button className="exercise-open" onClick={onOpen}>
        <div className={`exercise-art ${exercise.heroFromSheet ? "hero-sheet-start" : ""}`}><Image src={exercise.heroImage} alt={`${exercise.name} starting position`} fill sizes={feature ? "(max-width: 700px) 94vw, 620px" : "(max-width: 700px) 48vw, 300px"} /></div>
        <div className="exercise-copy">
          <div className="exercise-card-heading"><span>{accentLabel[exercise.accent]}</span><small>{exercise.primary}</small></div>
          <h3>{exercise.name}</h3>
          <div className="exercise-card-tags"><span>{exercise.equipment}</span><span>{exercise.level}</span></div>
          <div className="exercise-card-dose"><span><b>{exercise.sets}</b> sets</span><span><b>{exercise.reps}</b> reps</span><ChevronRight size={16} /></div>
        </div>
      </button>
      <button className={`bookmark-button ${saved ? "saved" : ""}`} onClick={onSave} aria-label="Save exercise"><Bookmark size={16} fill={saved ? "currentColor" : "none"} /></button>
      {onAdd && <button className={`add-button ${selected ? "added" : ""}`} onClick={onAdd}>{selected ? <Check size={16} /> : <Plus size={16} />}</button>}
    </article>
  );
}

const ACTIVITY_DAYS = 120;

/** Deterministic training-load series so server and client render the same grid. */
const activitySeries = Array.from({ length: ACTIVITY_DAYS }, (_, index) => {
  const noise = ((Math.sin(index * 12.9898) * 43758.5453) % 1 + 1) % 1;
  const season = Math.sin(index / 13) * 12 + Math.sin(index / 4.3) * 7;
  if (noise < 0.2) return Math.max(6, Math.round(10 + season / 3));
  return Math.max(8, Math.round(28 + season + (noise > 0.85 ? noise * 48 : noise * 18)));
});

function buildMockActivitySeries(endIso: string, count: number) {
  const millisecondsPerDay = 86_400_000;
  const endDay = Math.floor(Date.parse(`${endIso}T00:00:00Z`) / millisecondsPerDay);
  return Array.from({ length: count }, (_, index) => {
    const day = endDay - count + 1 + index;
    const noise = ((Math.sin(day * 12.9898) * 43758.5453) % 1 + 1) % 1;
    const season = Math.sin(day / 13) * 12 + Math.sin(day / 4.3) * 7;
    if (noise < 0.2) return Math.max(6, Math.round(10 + season / 3));
    return Math.min(100, Math.max(8, Math.round(28 + season + (noise > 0.85 ? noise * 48 : noise * 18))));
  });
}

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function HomeView({ routine, saved, onOpen, onSave, onNavigate, onStart }: { routine: RoutineDay[]; saved: string[]; onOpen: (exercise: ExerciseGuide) => void; onSave: (id: string) => void; onNavigate: (view: View) => void; onStart: (day: RoutineDay) => void }) {
  const today = routine[0];
  const [ticks, setTicks] = useState<string[]>([]);
  useEffect(() => {
    setTicks(buildDateTicks(ACTIVITY_DAYS));
  }, []);
  return <>
    <section className="home-greeting">
      <div>
        <h1>Ready to put<br />the work in?</h1>
      </div>
    </section>
    <section className="today-card">
      <div className="today-top"><span><Zap size={13} /> Today’s workout</span><b>{today?.exercises.length ?? 0} exercises · ~52 min</b></div>
      <div className="today-main">
        <div>
          <small>{today?.name ?? "Build your routine"}</small>
          <h2>{today ? today.name : "Your plan starts here"}</h2>
          <p>{today ? "A focused session built from your goal, schedule, and equipment." : "Choose movements from the library to begin."}</p>
          <div className="stat-pills">
            <Badge variant="secondary" className="h-auto rounded-full px-3 py-1.5">~52 min</Badge>
            <Badge variant="secondary" className="h-auto rounded-full px-3 py-1.5">{today?.exercises.length ?? 0} exercises</Badge>
            <Badge variant="secondary" className="h-auto rounded-full px-3 py-1.5">354 kcal</Badge>
          </div>
        </div>
        {today && <button className="play-button" onClick={() => onStart(today)} aria-label="Start workout"><Play size={22} fill="currentColor" /></button>}
      </div>
      {today && <div className="today-movements">{today.exercises.slice(0, 4).map((exercise, index) => <button key={exercise.id} onClick={() => onOpen(exercise)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{exercise.name}</strong><small>{exercise.sets} × {exercise.reps}</small><ChevronRight size={15} /></button>)}</div>}
    </section>
    <Card className="matrix-panel mt-3 gap-3 rounded-[28px] py-4 ring-foreground/5">
      <CardContent className="space-y-3">
        <header><span>Weekly output</span><strong>Activity</strong></header>
        <DotMatrixChart values={activitySeries} ticks={ticks} />
        <DateStrip days={29} />
      </CardContent>
    </Card>
    <div className="stats-board">
      <article className="stat-card">
        <Clock3 size={18} />
        <span>Active minutes</span>
        <strong>75 <small>/ 120</small></strong>
        <DotProgress value={75} max={120} dots={22} />
      </article>
      <div className="stats-stack">
        <article className="stat-card compact"><Flame size={16} /><span>Calories burned</span><strong>1258</strong></article>
        <article className="stat-card compact"><Droplet size={16} /><span>Water intake</span><strong>1.8 L</strong></article>
      </div>
      <article className="stat-card wide">
        <Activity size={18} />
        <span>Steps today</span>
        <strong>7251 <small>/ 10k</small></strong>
        <DotProgress value={7251} />
      </article>
    </div>
    <section><SectionTitle kicker="Technique first" title="Featured guide" action={<button className="text-button" onClick={() => onNavigate("Library")}>See all <ArrowRight size={14} /></button>} /><ExerciseCard feature exercise={exercises[0]} saved={saved.includes(exercises[0].id)} onOpen={() => onOpen(exercises[0])} onSave={() => onSave(exercises[0].id)} /></section>
  </>;
}

function WorkoutView({ plans, calories, workouts, onOpen, onStart, onCustomize, onDelete }: { plans: RoutinePlan[]; calories: number; workouts: number; onOpen: (exercise: ExerciseGuide) => void; onStart: (day: RoutineDay) => void; onCustomize: () => void; onDelete: (routineId: string) => void }) {
  const [range, setRange] = useState("week");
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [selectedActivityDate, setSelectedActivityDate] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const routine = plans.flatMap((plan) => plan.days);
  const activityDays = range === "today" ? 7 : ACTIVITY_DAYS;
  const displayedActivity = useMemo(() => selectedActivityDate ? buildMockActivitySeries(selectedActivityDate, activityDays) : activitySeries.slice(-activityDays), [activityDays, selectedActivityDate]);
  const activityTicks = useMemo(() => buildDateTicks(activityDays, 6, selectedActivityDate || undefined), [activityDays, selectedActivityDate]);
  const activeMinutes = Math.max(0, 80 + Math.max(0, routine.length - 1) * 60);
  const completedWorkouts = Math.max(0, routine.length - 1);
  const scheduleOrder = [1, 3, 4, 6, 2, 5, 0];
  const completedDays = new Set(scheduleOrder.slice(0, completedWorkouts));
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const plannedDays = new Set(plans.flatMap((plan) => plan.schedule ? plan.schedule.weekdays.map((day) => weekDays.indexOf(day)).filter((index) => index >= 0) : scheduleOrder.slice(0, plan.days.length)));
  const deleteTarget = plans.find((plan) => plan.id === deleteConfirmId);
  const selectActivityDate = (nextDate: string) => {
    if (nextDate === selectedActivityDate) return;
    setSelectedActivityDate(nextDate);
  };
  return (
    <section className="plan-view">
      <div className="view-heading workout-view-heading">
        <h1>Workout.</h1>
        <p>Your plan, progress, and sessions in one simple view.</p>
      </div>
      <Tabs value={range} onValueChange={(value) => setRange(String(value ?? "week"))} className="plan-range-tabs">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This week</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="progress-hero workout-progress-hero">
        <div>
          <span>{range === "today" ? "Today's training" : "Weekly adherence"}</span>
          <strong>{range === "today" ? (routine.length ? "1" : "0") : `${Math.min(100, 75 + workouts * 5)}%`}</strong>
          <p>{range === "today" ? (routine.length ? "One focused session is ready to go." : "Build a routine to start training.") : workouts ? "Workout logged. Keep the streak moving." : "Three of four planned sessions complete."}</p>
        </div>
        <div className="progress-ring"><b>{range === "today" ? (routine.length ? 1 : 0) : 3 + workouts}<small>/ {range === "today" ? 1 : 4}</small></b></div>
      </div>

      <div className="metric-grid workout-metric-grid" aria-label={`${range === "today" ? "Today's" : "This week's"} workout totals`}>
        <article><Flame /><span>Active calories</span><strong>{range === "today" ? 486 + calories : 2160 + calories}</strong><small>{range === "today" ? "Today · kcal" : "This week · kcal"}</small></article>
        <article><Activity /><span>Daily movement</span><strong>{range === "today" ? "7842" : "38.4k"}</strong><small>Steps</small></article>
        <article><TimerReset /><span>Training time</span><strong>{range === "today" ? 45 : activeMinutes + workouts * 48}</strong><small>Minutes</small></article>
        <article><Trophy /><span>Workouts</span><strong>{range === "today" ? (routine.length ? 1 : 0) : 12 + workouts}</strong><small>{range === "today" ? "Planned today" : "This month"}</small></article>
      </div>

      <section className="checkin-section" aria-labelledby="checkin-title">
        <h2 id="checkin-title">Workout check-ins</h2>
        <div className="checkin-days">
          {weekDays.map((label, index) => {
            const complete = completedDays.has(index);
            const planned = plannedDays.has(index);
            return (
              <div className={`${complete ? "complete" : ""} ${planned && !complete ? "planned" : ""}`} key={label}>
                <span>{complete ? <Check size={13} /> : planned ? <Dumbbell size={12} /> : <i />}</span>
                <small>{label}</small>
              </div>
            );
          })}
        </div>
      </section>

      <Card className="matrix-panel workout-activity-panel gap-0 rounded-[28px] py-0 ring-foreground/5">
        <CardContent>
          <header className="activity-history-header">
            <span>Training load</span>
            <div><strong>{range === "today" ? "Recent output" : "Activity history"}</strong><small>Active minutes per day · 0–100 min · {selectedActivityDate ? `ending ${formatLongDate(selectedActivityDate)}` : `latest ${activityDays} days`}</small></div>
          </header>
          <div className="activity-chart-layout">
            <div className="activity-scale" aria-hidden><span>100</span><span>50</span><span>0</span></div>
            <div className="activity-chart-motion">
              <DotMatrixChart values={displayedActivity} maxValue={100} ticks={activityTicks} />
            </div>
          </div>
          {range === "week" && <DateStrip className="activity-date-strip" days={121} mode="past" value={selectedActivityDate || undefined} onChange={(day) => selectActivityDate(day.iso)} />}
        </CardContent>
      </Card>

      <section className="workout-schedule" aria-labelledby="workouts-title">
        <header>
          <div>
            <h2 id="workouts-title">Workouts</h2>
            <p>{plans.length ? `${plans.length} active routine${plans.length === 1 ? "" : "s"}` : "Build your first routine"}</p>
          </div>
          <button onClick={onCustomize} aria-label="Customize workout plan"><Plus size={27} /></button>
        </header>

        {plans.length ? (
          <div className="routine-plan-list">{plans.map((plan, planIndex) => {
            const scheduledDates = buildScheduledDates(plan.schedule, plan.days.length);
            return <section className="routine-plan-group" key={plan.id}>
              <div className="plan-workout-list">{plan.days.map((day, dayIndex) => {
                const expandedKey = `${plan.id}:${day.id}`;
                const expanded = expandedDay === expandedKey;
                const calories = day.exercises.reduce((total, exercise) => total + Math.round((exercise.caloriesPerMinute[0] + exercise.caloriesPerMinute[1]) * 3), 0);
                return <article className={expanded ? "expanded" : ""} key={`${plan.id}-${day.id}`}>
                  <button className="plan-workout-summary" onClick={() => setExpandedDay(expanded ? null : expandedKey)} aria-expanded={expanded}>
                    <div><span className="workout-timing">{scheduledDates[dayIndex] ? scheduledDates[dayIndex].toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : planIndex === 0 && dayIndex === 0 ? "Today" : "Upcoming"}</span><strong>{day.name}</strong><span className="workout-meta"><small><Clock3 size={13} /> {42 + dayIndex * 3} mins</small><small><Footprints size={13} /> {day.exercises.length} exercises</small><small><Flame size={13} /> {calories} kcal</small></span></div>
                  </button>
                  <button type="button" className="delete-expanded-routine" onClick={() => setDeleteConfirmId(plan.id)} aria-label={`Delete ${plan.name}`}><Trash2 size={15} /></button>
                  <div className="plan-workout-collapse" aria-hidden={!expanded} inert={!expanded}><div><div className="plan-workout-details">{day.exercises.map((exercise, index) => <button key={`${plan.id}-${day.id}-${exercise.id}`} onClick={() => onOpen(exercise)}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{exercise.name}</strong><small>{exercise.sets} sets · {exercise.reps} reps</small></div><ChevronRight size={15} /></button>)}<button className="start-plan-workout" onClick={() => onStart(day)}>Start workout <ArrowRight size={16} /></button></div></div></div>
                </article>;
              })}</div>
            </section>;
          })}</div>
        ) : (
          <div className="empty-state"><Dumbbell /><h2>Your routine is empty</h2><p>Choose exercises from the visual library, then save your first training day.</p><button className="primary-button" onClick={onCustomize}>Build my routine <ArrowRight size={17} /></button></div>
        )}
      </section>
      {deleteTarget && <div className="modal-backdrop delete-routine-backdrop" role="presentation" onClick={() => setDeleteConfirmId(null)}><section className="delete-routine-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-routine-title" aria-describedby="delete-routine-copy" onClick={(event) => event.stopPropagation()}><span><Trash2 size={20} /></span><h2 id="delete-routine-title">Delete {deleteTarget.name}?</h2><p id="delete-routine-copy">Only this routine and its schedule will be removed.</p><div><button type="button" onClick={() => setDeleteConfirmId(null)}>Keep routine</button><button type="button" onClick={() => { const id = deleteTarget.id; setDeleteConfirmId(null); onDelete(id); }}>Delete routine</button></div></section></div>}
    </section>
  );
}

function LibraryView({ saved, onOpen, onSave }: { saved: string[]; onOpen: (exercise: ExerciseGuide) => void; onSave: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [bodySide, setBodySide] = useState<BodySide>("front");
  const [bodyModel, setBodyModel] = useState<BodyModelVariant>("male");
  const [bodyParts, setBodyParts] = useState<BodyRegionName[]>([]);
  const [area, setArea] = useState<(typeof bodyAreas)[number]>("All");
  const [muscle, setMuscle] = useState<(typeof muscleGroups)[number]>("All muscles");
  const [equipment, setEquipment] = useState<(typeof equipmentOptions)[number]>("All");
  const [difficulty, setDifficulty] = useState<(typeof difficultyOptions)[number]>("All");
  const filtered = useMemo(() => exercises.filter((exercise) => {
    const haystack = `${exercise.name} ${exercise.primary} ${exercise.secondary.join(" ")} ${exercise.movement}`.toLowerCase();
    const normalizedMuscle = muscle.toLowerCase().replace("deltoids", "deltoid").replace("calves", "gastrocnemius");
    const bodyPartMatch = !bodyParts.length || bodyParts.some((part) => bodyRegionTerms[part].some((term) => haystack.includes(term)));
    return bodyPartMatch && (!query || haystack.includes(query.toLowerCase())) && (area === "All" || exercise.bodyArea === area) && (muscle === "All muscles" || haystack.includes(normalizedMuscle)) && (equipment === "All" || exercise.equipment === equipment) && (difficulty === "All" || exercise.level === difficulty);
  }), [area, bodyParts, difficulty, equipment, muscle, query]);
  const clear = () => { setBodyParts([]); setArea("All"); setMuscle("All muscles"); setEquipment("All"); setDifficulty("All"); setQuery(""); };
  const selectBodyPart = (part: BodyRegionName) => {
    setBodyParts((current) => current.includes(part) ? current.filter((item) => item !== part) : [...current, part]);
    setArea("All");
    setMuscle("All muscles");
    setEquipment("All");
    setDifficulty("All");
    setQuery("");
  };
  const showBodySide = (side: BodySide) => {
    setBodySide(side);
  };

  return <section><div className="view-heading"><span className="eyebrow">{exercises.length} anatomical movement guides</span><h1>Exercise library.</h1><p>Tap one or more muscles to explore every related exercise, or use the detailed filters below.</p></div>
    <section className="body-explorer" aria-labelledby="body-explorer-title">
      <header><div><span className="eyebrow">Interactive muscle map</span><h2 id="body-explorer-title">Where do you want to train?</h2></div><div className="body-view-controls"><div className="body-side-toggle" role="group" aria-label="Choose anatomy model"><button className={bodyModel === "male" ? "active" : ""} aria-pressed={bodyModel === "male"} onClick={() => setBodyModel("male")}>Male</button><button className={bodyModel === "female" ? "active" : ""} aria-pressed={bodyModel === "female"} onClick={() => setBodyModel("female")}>Female</button></div><div className="body-side-toggle" role="group" aria-label="Choose body view"><button className={bodySide === "front" ? "active" : ""} aria-pressed={bodySide === "front"} onClick={() => showBodySide("front")}>Front</button><button className={bodySide === "back" ? "active" : ""} aria-pressed={bodySide === "back"} onClick={() => showBodySide("back")}>Back</button></div></div></header>
      <div className="body-explorer-layout">
        <div className="body-model-stage">
          <div className={`body-model ${bodySide === "back" ? "show-back" : ""}`}>
            {(["front", "back"] as BodySide[]).map((side) => {
              const artwork = selectedBodyArtworks(bodyModel, side, bodyParts);
              return <div className={`body-face body-${side}`} key={side} aria-hidden={bodySide !== side}>{artwork.map((src, index) => <Image className={index ? "body-art-layer" : undefined} src={src} alt={index ? "" : `${bodyModel} ${side} anatomical muscle map${bodyParts.length ? ` highlighting ${bodyParts.join(", ").toLowerCase()}` : ""}`} fill sizes="(max-width: 620px) 74vw, 300px" priority={side === "front" && index === 0} key={src} />)}<svg className="muscle-map" viewBox="0 0 100 150" role="group" aria-label={`${side} muscle groups`}>{bodyRegions[side].map((region) => { const isSelected = bodyParts.includes(region.name); return <g className={`muscle-region ${isSelected ? "selected" : ""}`} key={`${side}-${region.name}`} role="button" tabIndex={bodySide === side ? 0 : -1} aria-pressed={isSelected} aria-label={`${isSelected ? "Remove" : "Add"} ${region.name.toLowerCase()} filter`} onClick={() => selectBodyPart(region.name)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectBodyPart(region.name); } }}><title>{region.name}</title>{region.paths.map((path, index) => <path d={path} key={`${region.name}-${index}`} />)}</g>; })}</svg></div>;
            })}
          </div>
          <button className="rotate-body" onClick={() => showBodySide(bodySide === "front" ? "back" : "front")}><RotateCcw size={16} /> Rotate to {bodySide === "front" ? "back" : "front"}</button>
        </div>
        <div className="body-selection-copy"><span>Selected area{bodyParts.length === 1 ? "" : "s"}</span><h3>{selectedBodyRegionLabel(bodyParts)}</h3><p>{bodyParts.length ? `${filtered.length} related exercise${filtered.length === 1 ? "" : "s"} shown below.` : "Choose any highlighted region on the front or back of the body."}</p>{bodyParts.length > 0 && <button onClick={() => setBodyParts([])}>Clear selection <X size={14} /></button>}</div>
      </div>
    </section>
    <SearchField value={query} onChange={setQuery} /><div className="filter-panel"><div><span>Body area</span><div className="filter-pills">{bodyAreas.map((item) => <button className={area === item ? "active" : ""} key={item} onClick={() => { setArea(item); setBodyParts([]); }}>{item}</button>)}</div></div><div className="select-filters"><label><span>Muscle</span><select value={muscle} onChange={(event) => { setMuscle(event.target.value as typeof muscle); setBodyParts([]); }}>{muscleGroups.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Equipment</span><select value={equipment} onChange={(event) => setEquipment(event.target.value as typeof equipment)}>{equipmentOptions.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Difficulty</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value as typeof difficulty)}>{difficultyOptions.map((item) => <option key={item}>{item}</option>)}</select></label></div></div><SectionTitle kicker={`${filtered.length} movement${filtered.length === 1 ? "" : "s"}`} title={bodyParts.length ? "Train selected muscles" : "Explore the index"} action={<button className="text-button" onClick={clear}>Reset filters</button>} />{filtered.length ? <div className="exercise-grid">{filtered.map((exercise) => <ExerciseCard key={exercise.id} exercise={exercise} saved={saved.includes(exercise.id)} onOpen={() => onOpen(exercise)} onSave={() => onSave(exercise.id)} />)}</div> : <div className="empty-state"><Search /><h2>No exact match</h2><p>Reset the filters or broaden the body area.</p><button className="primary-button" onClick={clear}>Reset filters</button></div>}</section>;
}

function RoutineBuilderDrawer({ initialSelection, initialDayCount, saved, onClose, onSaveExercise, onSave }: { initialSelection: string[]; initialDayCount: number; saved: string[]; onClose: () => void; onSaveExercise: (id: string) => void; onSave: (draft: CustomRoutineDraft) => void }) {
  const startingDayCount = Math.min(6, Math.max(1, initialDayCount || 3));
  const [step, setStep] = useState<RoutineBuilderStep>("exercises");
  const [query, setQuery] = useState("");
  const [area, setArea] = useState<(typeof bodyAreas)[number]>("All");
  const [bodySide, setBodySide] = useState<BodySide>("front");
  const [bodyModel, setBodyModel] = useState<BodyModelVariant>("male");
  const [bodyParts, setBodyParts] = useState<BodyRegionName[]>([]);
  const [selection, setSelection] = useState(() => Array.from(new Set(initialSelection)));
  const [dayCount, setDayCount] = useState(startingDayCount);
  const [dayNames, setDayNames] = useState(() => splitNamesFor(startingDayCount));
  const [assignments, setAssignments] = useState<Record<string, number>>(() => Object.fromEntries(Array.from(new Set(initialSelection)).map((id, index) => [id, index % startingDayCount])));
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [weekdays, setWeekdays] = useState(() => scheduleWeekdays.filter((_, index) => index % 2 === 0).slice(0, startingDayCount));
  const [durationWeeks, setDurationWeeks] = useState<number | null>(8);
  const [movementsOpen, setMovementsOpen] = useState(false);
  const [preview, setPreview] = useState<ExerciseGuide | null>(null);
  const datePickerDays = useMemo(() => {
    const parsedDate = new Date(`${startDate}T12:00:00`);
    const anchor = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    const weekStart = new Date(anchor);
    weekStart.setDate(anchor.getDate() - anchor.getDay());
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return { iso: toDateInputValue(date), day: date.toLocaleDateString("en-US", { weekday: "short" }), date: date.getDate() };
    });
  }, [startDate]);
  const filtered = useMemo(() => exercises.filter((exercise) => {
    const haystack = `${exercise.name} ${exercise.primary} ${exercise.secondary.join(" ")} ${exercise.equipment}`.toLowerCase();
    const bodyPartMatch = !bodyParts.length || bodyParts.some((part) => bodyRegionTerms[part].some((term) => haystack.includes(term)));
    return bodyPartMatch && (!query || haystack.includes(query.trim().toLowerCase())) && (area === "All" || exercise.bodyArea === area);
  }), [area, bodyParts, query]);
  const selectedExercises = selection.map((id) => exercises.find((exercise) => exercise.id === id)).filter((exercise): exercise is ExerciseGuide => Boolean(exercise));
  const splitReady = dayNames.every((_, dayIndex) => selectedExercises.some((exercise) => (assignments[exercise.id] ?? 0) === dayIndex));
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || preview) return;
      if (movementsOpen) setMovementsOpen(false);
      else if (step !== "exercises") setStep(step === "schedule" ? "split" : "exercises");
      else onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [movementsOpen, onClose, preview, step]);

  const toggleExercise = (id: string) => setSelection((items) => {
    if (items.includes(id)) {
      setAssignments((current) => { const next = { ...current }; delete next[id]; return next; });
      return items.filter((item) => item !== id);
    }
    setAssignments((current) => ({ ...current, [id]: items.length % dayCount }));
    return [...items, id];
  });
  const selectBodyPart = (part: BodyRegionName) => {
    setBodyParts((current) => current.includes(part) ? current.filter((item) => item !== part) : [...current, part]);
    setArea("All");
    setQuery("");
  };
  const showBodySide = (side: BodySide) => {
    setBodySide(side);
  };
  const changeDayCount = (count: number) => {
    setDayCount(count);
    setDayNames(splitNamesFor(count));
    setWeekdays((items) => items.slice(0, count));
    setAssignments(Object.fromEntries(selection.map((id, index) => [id, index % count])));
  };
  const prepareSplit = () => {
    const count = Math.min(dayCount, selection.length);
    if (count !== dayCount) changeDayCount(count);
    else setAssignments(Object.fromEntries(selection.map((id, index) => [id, index % count])));
    setStep("split");
  };
  const toggleWeekday = (day: string) => setWeekdays((items) => items.includes(day) ? items.filter((item) => item !== day) : items.length < dayCount ? [...items, day] : items);
  const saveBuilder = () => {
    const days = dayNames.map((name, dayIndex) => ({ id: `custom-${dayIndex + 1}`, name: name.trim() || `Workout ${dayIndex + 1}`, exercises: selectedExercises.filter((exercise) => (assignments[exercise.id] ?? 0) === dayIndex) }));
    const scheduledWeekdays = dayCount === 1 && startDate ? [new Date(`${startDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" })] : weekdays;
    onSave({ days, schedule: { startDate, weekdays: scheduledWeekdays, durationWeeks } });
  };

  return <>
    <div className="modal-backdrop routine-builder-backdrop" role="presentation" onClick={onClose}>
      <section className="routine-builder-drawer" role="dialog" aria-modal="true" aria-labelledby="routine-builder-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <div><span>Step {step === "exercises" ? 1 : step === "split" ? 2 : 3} of 3</span><h2 id="routine-builder-title">{step === "exercises" ? "Choose exercises" : step === "split" ? dayCount === 1 ? "Set up your workout" : "Build your split" : dayCount === 1 ? "Choose a training day" : "Set your schedule"}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close routine builder"><X size={18} /></button>
        </header>

        {step === "exercises" && <section className="builder-anatomy" aria-labelledby="builder-anatomy-title">
          <div className="builder-anatomy-copy">
            <span>Muscle filter</span>
            <h3 id="builder-anatomy-title">{selectedBodyRegionLabel(bodyParts)}</h3>
            <p>{bodyParts.length ? `${filtered.length} exercise${filtered.length === 1 ? "" : "s"} match any selection` : "Tap one or more muscles to filter"}</p>
            <div className="body-view-controls"><div className="body-side-toggle" role="group" aria-label="Choose anatomy model"><button type="button" className={bodyModel === "male" ? "active" : ""} aria-pressed={bodyModel === "male"} onClick={() => setBodyModel("male")}>Male</button><button type="button" className={bodyModel === "female" ? "active" : ""} aria-pressed={bodyModel === "female"} onClick={() => setBodyModel("female")}>Female</button></div><div className="body-side-toggle" role="group" aria-label="Choose body view"><button type="button" className={bodySide === "front" ? "active" : ""} aria-pressed={bodySide === "front"} onClick={() => showBodySide("front")}>Front</button><button type="button" className={bodySide === "back" ? "active" : ""} aria-pressed={bodySide === "back"} onClick={() => showBodySide("back")}>Back</button></div></div>
            {bodyParts.length > 0 && <button type="button" className="builder-clear-focus" onClick={() => setBodyParts([])}>Clear focus <X size={13} /></button>}
            <button type="button" className="builder-open-movements" onClick={() => setMovementsOpen(true)} aria-expanded={movementsOpen}>{bodyParts.length ? `Browse ${filtered.length} exercises` : "Browse all exercises"} <ArrowRight size={15} /></button>
          </div>
          <div className="builder-anatomy-stage">
            <div className={`body-model ${bodySide === "back" ? "show-back" : ""}`}>
              {(["front", "back"] as BodySide[]).map((side) => {
                const artwork = selectedBodyArtworks(bodyModel, side, bodyParts);
                return <div className={`body-face body-${side}`} key={`builder-${side}`} aria-hidden={bodySide !== side}>{artwork.map((src, index) => <Image className={index ? "body-art-layer" : undefined} src={src} alt={index ? "" : `${bodyModel} ${side} anatomical muscle map${bodyParts.length ? ` highlighting ${bodyParts.join(", ").toLowerCase()}` : ""}`} fill sizes="140px" key={`builder-${src}`} />)}<svg className="muscle-map" viewBox="0 0 100 150" role="group" aria-label={`${side} muscle groups`}>{bodyRegions[side].map((region) => { const isSelected = bodyParts.includes(region.name); return <g className={`muscle-region ${isSelected ? "selected" : ""}`} key={`builder-${side}-${region.name}`} role="button" tabIndex={bodySide === side ? 0 : -1} aria-pressed={isSelected} aria-label={`${isSelected ? "Remove" : "Add"} ${region.name.toLowerCase()} filter`} onClick={() => selectBodyPart(region.name)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectBodyPart(region.name); } }}><title>{region.name}</title>{region.paths.map((path, index) => <path d={path} key={`builder-${region.name}-${index}`} />)}</g>; })}</svg></div>;
              })}
            </div>
          </div>
        </section>}

        {step === "split" && <section className="builder-step-panel">
          <div className="builder-step-intro"><span>Training days</span><h3>{dayCount === 1 ? "Build one workout" : "Choose days per week"}</h3><p>{dayCount === 1 ? "Your exercises are ready. Name the workout or continue." : "Your exercises are already assigned. Change anything only if you want to."}</p></div>
          <div className="builder-split-status"><Check size={16} /><div><strong>{splitReady ? dayCount === 1 ? "Your workout is ready" : "Your split is ready" : "Choose fewer training days"}</strong><span>{splitReady ? dayCount === 1 ? "Continue to choose its date." : "Continue to set your workout dates." : "Each training day needs at least one exercise."}</span></div></div>
          <div className="builder-day-count"><span>Training days</span><div>{[1, 2, 3, 4, 5, 6].map((count) => <button type="button" className={dayCount === count ? "active" : ""} disabled={count > selection.length} key={count} onClick={() => changeDayCount(count)}>{count}</button>)}</div></div>
          <div className="builder-split-days">{dayNames.map((name, dayIndex) => <label key={`split-day-${dayIndex}`}><span>Day {dayIndex + 1}</span><input value={name} onChange={(event) => setDayNames((items) => items.map((item, index) => index === dayIndex ? event.target.value : item))} aria-label={`Name for workout day ${dayIndex + 1}`} /><small>{selectedExercises.filter((exercise) => (assignments[exercise.id] ?? 0) === dayIndex).length} exercises</small></label>)}</div>
          <div className="builder-assignments"><div><span>Optional: adjust exercises</span><small>{selectedExercises.length} total</small></div>{selectedExercises.map((exercise) => <article key={`assignment-${exercise.id}`}><div><strong>{exercise.name}</strong><small>{exercise.primary}</small></div><select value={assignments[exercise.id] ?? 0} onChange={(event) => setAssignments((items) => ({ ...items, [exercise.id]: Number(event.target.value) }))} aria-label={`Assign ${exercise.name} to a workout`}>{dayNames.map((name, dayIndex) => <option value={dayIndex} key={`${exercise.id}-day-${dayIndex}`}>{name || `Day ${dayIndex + 1}`}</option>)}</select></article>)}</div>
        </section>}

        {step === "schedule" && <section className="builder-step-panel builder-schedule-panel">
          <div className="builder-step-intro"><span>Workout dates</span><h3>{dayCount === 1 ? "Choose your weekly day" : "Set your schedule"}</h3><p>{dayCount === 1 ? "This workout repeats every week on the day you select." : "Choose when this split starts and which days you train."}</p></div>
          <label className="builder-date-field"><span>{dayCount === 1 ? "First workout" : "Start date"}</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          {dayCount === 1 && <div className="builder-day-picker" role="group" aria-label="Choose a workout day">{datePickerDays.map((item) => <button type="button" className={startDate === item.iso ? "active" : ""} aria-pressed={startDate === item.iso} key={item.iso} onClick={() => setStartDate(item.iso)}><i /><strong className="dot-num">{item.date}</strong><small>{item.day}</small></button>)}</div>}
          {dayCount > 1 && <div className="builder-weekdays"><div><span>Training days</span><small>Select {dayCount}</small></div><div>{scheduleWeekdays.map((day) => <button type="button" className={weekdays.includes(day) ? "active" : ""} key={day} onClick={() => toggleWeekday(day)}>{day}</button>)}</div>{weekdays.length !== dayCount && <p>Select exactly {dayCount} training days.</p>}</div>}
          <div className="builder-duration"><span>Repeat for</span><div>{[[4, "4 weeks"], [8, "8 weeks"], [12, "12 weeks"], [0, "Ongoing"]].map(([value, label]) => <button type="button" className={(durationWeeks ?? 0) === value ? "active" : ""} key={value} onClick={() => setDurationWeeks(value === 0 ? null : Number(value))}>{label}</button>)}</div></div>
          <div className="builder-schedule-summary"><span>Your plan</span><strong>{dayCount === 1 ? startDate ? `Every ${new Date(`${startDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" })}` : "One workout each week" : `${dayCount} workouts each week`}</strong><p>{dayCount === 1 ? startDate ? `Starts ${new Date(`${startDate}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" })} · ${durationWeeks ? `${durationWeeks} weeks` : "Ongoing"}` : "Choose a start date" : `${weekdays.length ? weekdays.join(" · ") : "Choose training days"} · ${durationWeeks ? `${durationWeeks} weeks` : "Ongoing"}`}</p></div>
        </section>}

        {step === "exercises" && <footer><div><strong className="dot-num">{String(selection.length).padStart(2, "0")}</strong><span>exercise{selection.length === 1 ? "" : "s"}<small>{selection.length ? "Ready to continue" : "Select at least 1"}</small></span></div><button type="button" disabled={!selection.length} onClick={prepareSplit}>Next <ArrowRight size={17} /></button></footer>}
        {step === "split" && <footer><div className="builder-step-back-wrap"><button type="button" className="builder-step-back" onClick={() => setStep("exercises")}><ArrowLeft size={16} /> Back</button></div><button type="button" disabled={!splitReady} onClick={() => setStep("schedule")}>Continue <ArrowRight size={17} /></button></footer>}
        {step === "schedule" && <footer><div className="builder-step-back-wrap"><button type="button" className="builder-step-back" onClick={() => setStep("split")}><ArrowLeft size={16} /> Back</button></div><button type="button" disabled={!startDate || (dayCount > 1 && weekdays.length !== dayCount)} onClick={saveBuilder}>Save routine <Check size={17} /></button></footer>}
      </section>
    </div>
    {movementsOpen && <div className="modal-backdrop builder-movements-backdrop" role="presentation" onClick={() => setMovementsOpen(false)}>
      <section className="builder-movements-modal" role="dialog" aria-modal="true" aria-labelledby="builder-movements-title" onClick={(event) => event.stopPropagation()}>
        <header><div><span>{bodyParts.length ? selectedBodyRegionLabel(bodyParts) : "All exercises"}</span><h2 id="builder-movements-title">Browse exercises</h2></div><button type="button" onClick={() => setMovementsOpen(false)} aria-label="Close exercises"><X size={18} /></button></header>
        <div className="builder-tools">
          <div className="builder-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search exercises" aria-label="Search exercises" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={15} /></button>}</div>
          <div className="builder-filters" aria-label="Filter by body area">{bodyAreas.map((item) => <button type="button" key={item} className={area === item ? "active" : ""} onClick={() => { setArea(item); setBodyParts([]); }}>{item}</button>)}</div>
        </div>
        <div className="builder-results">
          <div className="builder-results-heading"><span>{filtered.length} exercises</span><small>{selection.length ? `${selection.length} selected` : "Select exercises"}</small></div>
          {filtered.length ? <div className="builder-exercise-list">{filtered.map((exercise) => {
            const selected = selection.includes(exercise.id);
            return <article className={selected ? "selected" : ""} key={exercise.id}><button type="button" className="builder-exercise-preview" onClick={() => setPreview(exercise)}><span className={`builder-exercise-image ${exercise.heroFromSheet ? "hero-sheet-start" : ""}`}><Image src={exercise.heroImage} alt="" fill sizes="68px" /></span><span><strong>{exercise.name}</strong><small>{exercise.primary} · {exercise.equipment}</small><em>{exercise.sets} sets · {exercise.reps} reps</em></span><ChevronRight size={16} /></button><button type="button" className="builder-exercise-toggle" onClick={() => toggleExercise(exercise.id)} aria-label={selected ? `Remove ${exercise.name}` : `Add ${exercise.name}`}>{selected ? <Check size={17} /> : <Plus size={17} />}</button></article>;
          })}</div> : <div className="builder-empty"><Search size={22} /><strong>No exercises found</strong><span>Try another search or body area.</span></div>}
        </div>
        <footer><span><strong>{String(selection.length).padStart(2, "0")}</strong> selected</span><button type="button" onClick={() => setMovementsOpen(false)}>Done <Check size={16} /></button></footer>
      </section>
    </div>}
    {preview && <ExerciseDetail exercise={preview} saved={saved.includes(preview.id)} onSave={() => onSaveExercise(preview.id)} onClose={() => setPreview(null)} onComplete={() => undefined} routineAction={{ selected: selection.includes(preview.id), onToggle: () => { toggleExercise(preview.id); setPreview(null); } }} />}
  </>;
}

function MealLoggerDrawer({ onClose, onAdd }: { onClose: () => void; onAdd: (meal: MealDraft) => void }) {
  const [type, setType] = useState<MealKind>("Breakfast");
  const [mealName, setMealName] = useState("");
  const [items, setItems] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [captureMode, setCaptureMode] = useState<"upload" | "scan" | "voice" | null>(null);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 260;
    closeTimerRef.current = window.setTimeout(onClose, delay);
  }, [onClose]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") requestClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, [requestClose]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mealName.trim() || !calories || !protein) return;
    const itemList = items.trim().replace(/\s*[,\n]+\s*/g, " · ");
    const [hours, minutes] = time.split(":").map(Number);
    const displayTime = new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase();
    onAdd({ type, time: displayTime, title: `${mealName.trim()}${itemList ? ` · ${itemList}` : ""}`, calories: Number(calories), protein: Number(protein) });
    requestClose();
  };

  const captureHint = captureMode === "scan" ? "List the items you scanned…" : captureMode === "voice" ? "Type or dictate the ingredients…" : captureMode === "upload" ? "List the items in your photo…" : "e.g. Rice, greens, avocado…";
  const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack"] as MealKind[];

  return (
    <div className={`modal-backdrop meal-logger-backdrop ${closing ? "closing" : ""}`} role="presentation" onClick={requestClose}>
      <section className="meal-logger-drawer" role="dialog" aria-modal="true" aria-labelledby="meal-logger-title" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-handle" aria-hidden><i /></div>
        <header>
          <div>
            <h2 id="meal-logger-title">Log a meal</h2>
            <p>Record what you ate and when</p>
          </div>
          <button type="button" onClick={requestClose} aria-label="Close meal logger"><X size={18} /></button>
        </header>
        <form onSubmit={submit}>
          <fieldset>
            <legend>When did you eat?</legend>
            <div className="meal-type-grid">
              {mealTypes.map((item) => (
                <button type="button" className={type === item ? "active" : ""} aria-pressed={type === item} key={item} onClick={() => setType(item)}>
                  {item}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="meal-name-field">
            <span>Meal name</span>
            <input value={mealName} onChange={(event) => setMealName(event.target.value)} placeholder="e.g. Chicken bowl" autoFocus required />
          </label>
          <label className="meal-description-field">
            <span>Items or ingredients</span>
            <textarea value={items} onChange={(event) => setItems(event.target.value)} placeholder={captureHint} rows={3} />
          </label>
          <div className="meal-number-fields">
            <label className="meal-time-row">
              <span>Time</span>
              <div>
                <input className="dot-num meal-time-input" type="time" value={time} onChange={(event) => setTime(event.target.value)} required />
              </div>
            </label>
            <label>
              <span>Calories</span>
              <div>
                <input className="dot-num" type="number" inputMode="numeric" min="0" value={calories} onChange={(event) => setCalories(event.target.value)} placeholder="0" required />
                <small>kcal</small>
              </div>
            </label>
            <label>
              <span>Protein</span>
              <div>
                <input className="dot-num" type="number" inputMode="numeric" min="0" value={protein} onChange={(event) => setProtein(event.target.value)} placeholder="0" required />
                <small>grams</small>
              </div>
            </label>
          </div>
          <div className="meal-capture-row" aria-label="Meal input options">
            <button type="button" className={captureMode === "upload" ? "active" : ""} aria-pressed={captureMode === "upload"} onClick={() => setCaptureMode((current) => current === "upload" ? null : "upload")}>
              <Upload size={16} />
              <span className="sr-only">Photo</span>
            </button>
            <button type="button" className={captureMode === "scan" ? "active" : ""} aria-pressed={captureMode === "scan"} onClick={() => setCaptureMode((current) => current === "scan" ? null : "scan")}>
              <ScanLine size={16} />
              <span className="sr-only">Scan</span>
            </button>
            <button type="button" className={captureMode === "voice" ? "active" : ""} aria-pressed={captureMode === "voice"} onClick={() => setCaptureMode((current) => current === "voice" ? null : "voice")}>
              <Mic size={16} />
              <span className="sr-only">Voice</span>
            </button>
            <button type="submit" className="meal-add-action" disabled={!mealName.trim() || !calories || !protein} aria-label="Add meal">
              <Plus size={20} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function MealView({ meals, onOpenLogger }: { meals: MealEntry[]; onOpenLogger: () => void }) {
  const [range, setRange] = useState("today");
  const dailyCalories = meals.reduce((total, meal) => total + meal.calories, 0);
  const dailyProtein = meals.reduce((total, meal) => total + meal.protein, 0);
  const dailyPercent = Math.min(100, Math.round((dailyCalories / 2500) * 100));
  const nutrients = range === "today" ? [Math.min(100, Math.round((dailyProtein / 170) * 100)), 71, 63, 74, 68, 82] : [91, 78, 68, 81, 75, 88];
  const nutrientLabels = ["Protein", "Carbs", "Fat", "Fibre", "Water", "Micros"];

  return (
    <section>
      <div className="view-heading meal-view-heading">
        <h1>Nutrition.</h1>
        <p>Daily nutrition and meals in one simple view.</p>
      </div>
      <Tabs value={range} onValueChange={(value) => setRange(String(value ?? "week"))} className="plan-range-tabs">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This week</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="nutrition-card meal-nutrition-card">
        <div>
          <span>{range === "today" ? "Daily nutrition" : "Weekly nutrition"}</span>
          <h2>{range === "today" ? dailyCalories.toLocaleString("en-US") : "14,580"} <small>/ {range === "today" ? "2,500" : "17,500"} kcal</small></h2>
          <p>{range === "today" ? `Protein ${dailyProtein}g · ${meals.length} meals logged` : "Average 2,083 kcal · 144g protein / day"}</p>
        </div>
        <div className="nutrition-ring">{range === "today" ? `${dailyPercent}%` : "83%"}</div>
      </div>
      <Card className="matrix-panel meal-balance-card gap-0 rounded-[28px] py-0 ring-foreground/5">
        <CardContent>
          <header className="meal-balance-header">
            <span>Nutrient targets</span>
            <div><strong>{range === "today" ? "Today’s balance" : "Weekly average"}</strong><small>% of daily target</small></div>
          </header>
          <DotMatrixChart fit="block" rows={10} values={nutrients} maxValue={100} ticks={nutrientLabels} tickValues={nutrients.map((value) => `${value}%`)} />
        </CardContent>
      </Card>
      <header className="meal-log-heading">
        <div><h2>Meal log</h2><p>{range === "today" ? "Meals logged today" : "Your recent meals"}</p></div>
        <button className="meal-log-trigger" onClick={onOpenLogger} aria-label="Log meal"><Plus size={27} /></button>
      </header>
      <div className="meal-list">
        {meals.map((meal) => {
          const MealIcon = mealIcons[meal.type];
          return <article className="meal-card" key={meal.id}>
            <header>
              <span><MealIcon size={16} /> {meal.type}</span>
              <time>{meal.time}</time>
            </header>
            <strong>{meal.title}</strong>
            <p>{meal.calories} kcal · {meal.protein}g protein</p>
          </article>;
        })}
      </div>
    </section>
  );
}

function ProfileView({ profile, savedCount, onRestart }: { profile: OnboardingProfile; savedCount: number; onRestart: () => void }) {
  return (
    <section>
      <div className="profile-hero">
        <div className="profile-avatar">{profile.displayName.slice(0, 2).toUpperCase()}</div>
        <span>FXFORCE athlete</span>
        <h1>{profile.displayName}</h1>
        <p>{profile.goal} · {profile.experience}</p>
      </div>
      <div className="profile-stats">
        <div><strong>{profile.daysPerWeek}</strong><span>Days / week</span></div>
        <div><strong>{savedCount}</strong><span>Saved moves</span></div>
        <div><strong>{profile.bodyMetrics ? profile.bodyMetrics.bmi.toFixed(1) : "—"}</strong><span>BMI</span></div>
      </div>
      <div className="appearance-card">
        <h3>Appearance</h3>
        <p>Choose how FXFORCE looks on this device.</p>
        <div className="appearance-setting"><span>Theme</span><ThemeControls /></div>
        <div className="appearance-setting"><span>Accent color</span><AccentPicker /></div>
      </div>
      <Card className="mb-4 gap-3 rounded-[28px] py-4 ring-foreground/5">
        <CardContent className="space-y-4">
          <h3 className="m-0 text-base font-semibold">Training style</h3>
          <DotMeter value={68} left="Intuitive" right="Data-driven" />
          <DotMeter value={74} left="Flexible" right="Disciplined" />
        </CardContent>
      </Card>
      <div className="settings-list">
        <button type="button"><Dumbbell /><span>Training setup<small>{profile.setup}</small></span><ChevronRight /></button>
        <button type="button"><Target /><span>Primary goal<small>{profile.goal}</small></span><ChevronRight /></button>
        <button type="button"><Flame /><span>Calorie target<small>2,500 kcal / day</small></span><ChevronRight /></button>
        <button type="button" onClick={onRestart}><LogOut /><span>Sign out<small>Return to welcome</small></span><ChevronRight /></button>
      </div>
    </section>
  );
}

function ExerciseDetail({ exercise, saved, onSave, onClose, onComplete, routineAction }: { exercise: ExerciseGuide; saved: boolean; onSave: () => void; onClose: () => void; onComplete: () => void; routineAction?: { selected: boolean; onToggle: () => void } }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="modal-backdrop exercise-drawer-backdrop" role="presentation" onClick={onClose}>
      <article className={`exercise-detail accent-${exercise.accent}`} role="dialog" aria-modal="true" aria-labelledby="exercise-detail-title" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-handle" aria-hidden><i /></div>
        <header>
          <div><span>Exercise guide</span><strong>{exercise.collection}</strong></div>
          <div className="drawer-actions"><button className={saved ? "saved" : ""} onClick={onSave} aria-label={saved ? "Remove from saved exercises" : "Save exercise"}><Bookmark fill={saved ? "currentColor" : "none"} /></button><button onClick={onClose} aria-label="Close exercise guide"><X /></button></div>
        </header>
        <div className="detail-layout">
          <aside className="detail-visual">
            <div className="detail-art"><Image src={exercise.image} alt={`${exercise.name} visual guide`} fill sizes="(max-width: 919px) 100vw, 590px" priority /></div>
            <div className="detail-visual-caption">
              <span>Movement demonstration</span>
              <strong>{exercise.movement}</strong>
              <small>Start to finish · highlighted working muscles</small>
            </div>
          </aside>
          <div className="detail-info">
            <div className="detail-body">
              <div className="detail-intro">
                <span className="eyebrow">{exercise.primary} · {exercise.level}</span>
                <h1 id="exercise-detail-title">{exercise.name}</h1>
                <p>{exercise.equipment} movement with a focus on controlled, repeatable reps.</p>
              </div>

              <section className="detail-section">
                <div className="detail-section-heading"><span>Muscles involved</span><h2>Training focus</h2></div>
                <div className="muscle-summary"><div><small>Primary muscle</small><strong>{exercise.primary}</strong></div><div><small>Secondary muscles</small><strong>{exercise.secondary.join(" · ") || "Isolation focus"}</strong></div></div>
              </section>

              <section className="detail-section">
                <div className="detail-section-heading"><span>Prescription</span><h2>Working sets</h2></div>
                <div className="dose-grid"><div><span>Sets</span><strong>{exercise.sets}</strong></div><div><span>Reps</span><strong>{exercise.reps}</strong></div><div><span>Rest</span><strong>{exercise.rest}</strong></div><div><span>RIR</span><strong>{exercise.rir}</strong></div></div>
              </section>

              <section className="detail-section cue-section">
                <div className="detail-section-heading"><span>Three clear cues</span><h2>Own the movement</h2></div>
                <div>{exercise.steps.map((step, index) => <article key={step.label}><span>{index + 1}</span><div><strong>{step.label}</strong><p>{step.cue}</p></div></article>)}</div>
              </section>

              <section className="detail-section">
                <div className="detail-section-heading"><span>Guide details</span><h2>At a glance</h2></div>
                <div className="detail-meta"><span>Movement<strong>{exercise.movement}</strong></span><span>Equipment<strong>{exercise.equipment}</strong></span><span>Est. energy<strong>{exercise.caloriesPerMinute[0]}–{exercise.caloriesPerMinute[1]} kcal/min</strong></span></div>
              </section>
            </div>
            <footer><button onClick={routineAction ? routineAction.onToggle : onComplete}>{routineAction ? routineAction.selected ? <><X /> Remove from routine</> : <><Plus /> Add to routine</> : <><Check /> Mark guide complete</>}</button></footer>
          </div>
        </div>
      </article>
    </div>
  );
}

function WorkoutSession({ day, onClose, onFinish }: { day: RoutineDay; onClose: () => void; onFinish: (completed: string[], calories: number) => void }) {
  const [completed, setCompleted] = useState<string[]>([]);
  const calories = completed.reduce((total, id) => { const item = day.exercises.find((exercise) => exercise.id === id); return total + (item ? Math.round(((item.caloriesPerMinute[0] + item.caloriesPerMinute[1]) / 2) * 6) : 0); }, 0);
  return <div className="modal-backdrop workout-backdrop"><article className="workout-session"><header><button onClick={onClose}><X /></button><div><span>Workout in progress</span><strong>{day.name}</strong></div><b>{completed.length}/{day.exercises.length}</b></header><div className="workout-pulse" aria-hidden><i /></div><div className="workout-overview"><div><TimerReset /><span>Estimated time<strong>48 min</strong></span></div><div><Flame /><span>Active energy<strong>{calories} kcal</strong></span></div></div><div className="workout-list">{day.exercises.map((exercise, index) => { const done = completed.includes(exercise.id); return <article key={exercise.id}><div className={`workout-thumb ${exercise.heroFromSheet ? "hero-sheet-start" : ""}`}><Image src={exercise.heroImage} alt={`${exercise.name} starting position`} fill sizes="82px" /></div><div><span>Exercise {String(index + 1).padStart(2, "0")}</span><strong>{exercise.name}</strong><small>{exercise.sets} sets · {exercise.reps} reps · {exercise.rest} rest</small></div><button className={done ? "done" : ""} onClick={() => setCompleted((items) => done ? items.filter((id) => id !== exercise.id) : [...items, exercise.id])}>{done ? <Check /> : <Plus />}</button></article>; })}</div><footer><div><span>Session progress</span><strong>{Math.round((completed.length / day.exercises.length) * 100) || 0}%</strong></div><i><b style={{ width: `${(completed.length / day.exercises.length) * 100}%` }} /></i><button disabled={!completed.length} onClick={() => onFinish(completed, calories)}>Finish workout <Check /></button></footer></article></div>;
}

export default function FlexFormDashboard() {
  const [stage, setStage] = useState<AppStage>("auth");
  const [displayName, setDisplayName] = useState("Alex");
  const [profile, setProfile] = useState<OnboardingProfile>({ displayName: "Alex", goal: "Build muscle", experience: "Returning", bodyMetrics: { heightCm: 175, weightKg: 75, bmi: 24.5 }, daysPerWeek: 4, setup: "Full gym", planMode: "generated" });
  const [view, setView] = useState<View>("Home");
  const [routinePlans, setRoutinePlans] = useState<RoutinePlan[]>(() => [{ id: "starter-routine", name: "Starter routine", days: buildRoutine("Build muscle", 4, "Full gym"), schedule: null }]);
  const routine = routinePlans.flatMap((plan) => plan.days);
  const [saved, setSaved] = useState<string[]>(["bench-press", "back-squat"]);
  const [routineBuilderOpen, setRoutineBuilderOpen] = useState(false);
  const [selected, setSelected] = useState<ExerciseGuide | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<RoutineDay | null>(null);
  const [mealLoggerOpen, setMealLoggerOpen] = useState(false);
  const [meals, setMeals] = useState<MealEntry[]>(initialMeals);
  const [toast, setToast] = useState("");
  const [calories, setCalories] = useState(0);
  const [workouts, setWorkouts] = useState(0);
  const [headerGreeting, setHeaderGreeting] = useState("Hello");
  const [headerDate, setHeaderDate] = useState("");

  useEffect(() => {
    setHeaderGreeting(greetingForNow());
    setHeaderDate(new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }));
    const storedRoutines = window.localStorage.getItem("flexform-routines");
    if (storedRoutines) {
      try {
        const parsed = JSON.parse(storedRoutines) as RoutinePlan[];
        if (Array.isArray(parsed)) setRoutinePlans(parsed);
      } catch { /* Ignore invalid legacy data. */ }
    } else {
      const legacyRoutine = window.localStorage.getItem("flexform-routine");
      if (legacyRoutine) {
        try {
          const days = JSON.parse(legacyRoutine) as RoutineDay[];
          const storedSchedule = window.localStorage.getItem("flexform-routine-schedule");
          const schedule = storedSchedule ? JSON.parse(storedSchedule) as RoutineSchedule : null;
          if (Array.isArray(days) && days.length) {
            const migrated: RoutinePlan[] = [{ id: `routine-migrated-${Date.now()}`, name: days.length === 1 ? days[0].name : `${days.length}-day routine`, days, schedule }];
            setRoutinePlans(migrated);
            window.localStorage.setItem("flexform-routines", JSON.stringify(migrated));
            window.localStorage.removeItem("flexform-routine");
            window.localStorage.removeItem("flexform-routine-schedule");
          }
        } catch { /* Ignore invalid legacy data. */ }
      }
    }
  }, []);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const overlayOpen = Boolean(selected || activeWorkout || mealLoggerOpen || routineBuilderOpen);
  useEffect(() => {
    if (!overlayOpen) return;
    const body = document.body;
    const root = document.documentElement;
    const scrollTop = window.scrollY;
    const previous = {
      overflow: body.style.overflow,
      overscrollBehavior: body.style.overscrollBehavior,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
    };
    const scrollbarWidth = window.innerWidth - root.clientWidth;

    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.position = "fixed";
    body.style.top = `-${scrollTop}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.overflow = previous.overflow;
      body.style.overscrollBehavior = previous.overscrollBehavior;
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      body.style.paddingRight = previous.paddingRight;

      const previousScrollBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.scrollTo(0, scrollTop);
      root.style.scrollBehavior = previousScrollBehavior;
    };
  }, [overlayOpen]);
  const toggleSaved = (id: string) => setSaved((items) => { const next = items.includes(id) ? items.filter((item) => item !== id) : [...items, id]; void syncFavoriteExercise(id, next.includes(id)).catch(() => undefined); return next; });
  const navigate = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const finishOnboarding = (nextProfile: OnboardingProfile) => {
    setProfile(nextProfile);
    const nextRoutine = nextProfile.planMode === "generated" ? buildRoutine(nextProfile.goal, nextProfile.daysPerWeek, nextProfile.setup) : [];
    const planId = `routine-${Date.now()}`;
    const nextPlans: RoutinePlan[] = nextRoutine.length ? [{ id: planId, name: "My routine", days: nextRoutine, schedule: null }] : [];
    setRoutinePlans(nextPlans);
    window.localStorage.setItem("flexform-routines", JSON.stringify(nextPlans));
    setView("Workout");
    setStage("app");
    setRoutineBuilderOpen(nextProfile.planMode === "custom");
    void saveOnboarding(nextProfile).catch(() => undefined);
    if (nextRoutine.length) void saveRoutine(nextRoutine, "generated").then((cloudId) => {
      if (!cloudId) return;
      setRoutinePlans((items) => {
        const updated = items.map((plan) => plan.id === planId ? { ...plan, cloudId } : plan);
        window.localStorage.setItem("flexform-routines", JSON.stringify(updated));
        return updated;
      });
    }).catch(() => undefined);
  };
  const saveCustomRoutine = ({ days, schedule }: CustomRoutineDraft) => {
    const planId = `routine-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const name = days.length === 1 ? days[0].name : `${days.length}-day routine`;
    const plan: RoutinePlan = { id: planId, name, days, schedule };
    setRoutinePlans((items) => {
      const updated = [...items, plan];
      window.localStorage.setItem("flexform-routines", JSON.stringify(updated));
      return updated;
    });
    setRoutineBuilderOpen(false); navigate("Workout"); notify("Routine added.");
    void saveRoutine(days, "custom", schedule).then((cloudId) => {
      if (!cloudId) return;
      setRoutinePlans((items) => {
        const updated = items.map((item) => item.id === planId ? { ...item, cloudId } : item);
        window.localStorage.setItem("flexform-routines", JSON.stringify(updated));
        return updated;
      });
    }).catch(() => undefined);
  };
  const removeRoutine = (routineId: string) => {
    const target = routinePlans.find((plan) => plan.id === routineId);
    const updated = routinePlans.filter((plan) => plan.id !== routineId);
    setRoutinePlans(updated);
    window.localStorage.setItem("flexform-routines", JSON.stringify(updated));
    notify("Routine deleted.");
    void deleteRoutine(target?.cloudId).catch(() => notify("Routine removed from this device. Cloud deletion failed."));
  };
  const addMeal = (meal: MealDraft) => {
    setMeals((items) => [...items, { ...meal, id: `meal-${Date.now()}` }]);
    notify(`${meal.type} added to your meal log.`);
  };
  const closeMealLogger = useCallback(() => setMealLoggerOpen(false), []);
  const closeRoutineBuilder = useCallback(() => setRoutineBuilderOpen(false), []);

  if (stage === "auth") return <AuthScreen onReady={(name) => { setDisplayName(name); setStage("onboarding"); }} />;
  if (stage === "onboarding") return <Onboarding displayName={displayName} onComplete={finishOnboarding} />;

  const workoutArea = view === "Workout";

  return (
    <div className="app-shell">
      <header className={`app-header ${workoutArea ? "plan-app-header" : ""}`}>
        <div className="app-header-greeting"><div className="app-header-logo"><Brand /></div><div className="app-header-copy"><strong>{headerGreeting}, {profile.displayName}</strong><span>{headerDate}</span></div></div>
        <div className="app-header-actions"><button className="header-profile" onClick={() => navigate("Profile")} aria-label="Open profile"><UserRound size={21} /></button></div>
      </header>
      <main className={`app-content ${workoutArea ? "plan-content" : ""}`}>
        {view === "Home" && <HomeView routine={routine} saved={saved} onOpen={setSelected} onSave={toggleSaved} onNavigate={navigate} onStart={setActiveWorkout} />}
        {view === "Workout" && <WorkoutView plans={routinePlans} calories={calories} workouts={workouts} onOpen={setSelected} onStart={setActiveWorkout} onCustomize={() => setRoutineBuilderOpen(true)} onDelete={removeRoutine} />}
        {view === "Library" && <LibraryView saved={saved} onOpen={setSelected} onSave={toggleSaved} />}
        {view === "Meal" && <MealView meals={meals} onOpenLogger={() => setMealLoggerOpen(true)} />}
        {view === "Profile" && <ProfileView profile={profile} savedCount={saved.length} onRestart={() => { void signOut(); setStage("auth"); }} />}
      </main>
      <nav className="floating-nav">{navItems.map(({ label, icon: Icon }) => <button key={label} className={view === label || (view === "Library" && label === "Workout") ? "active" : ""} onClick={() => navigate(label)}><Icon size={19} /><span>{label}</span></button>)}</nav>
      {routineBuilderOpen && <RoutineBuilderDrawer initialSelection={[]} initialDayCount={1} saved={saved} onClose={closeRoutineBuilder} onSaveExercise={toggleSaved} onSave={saveCustomRoutine} />}
      {selected && <ExerciseDetail exercise={selected} saved={saved.includes(selected.id)} onSave={() => toggleSaved(selected.id)} onClose={() => setSelected(null)} onComplete={() => { void saveGuideCompletion(selected.id).catch(() => undefined); setSelected(null); notify("Guide complete. Clean reps win."); }} />}
      {activeWorkout && <WorkoutSession day={activeWorkout} onClose={() => setActiveWorkout(null)} onFinish={(completed, burned) => { void saveWorkoutSummary(activeWorkout.id, activeWorkout.name, completed, burned).catch(() => undefined); setCalories((value) => value + burned); setWorkouts((value) => value + 1); setActiveWorkout(null); notify(`${completed.length} exercises logged · ${burned} kcal estimated`); }} />}
      {mealLoggerOpen && <MealLoggerDrawer onClose={closeMealLogger} onAdd={addMeal} />}
      {toast && <div className="toast"><Check size={15} />{toast}</div>}
    </div>
  );
}
