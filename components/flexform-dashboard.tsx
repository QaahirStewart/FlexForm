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
import { saveOnboarding, saveRoutine, saveWorkoutSummary, type OnboardingProfile } from "@/lib/supabase/product";
import { DotMatrixChart, DotMeter, DotProgress } from "@/components/dot-matrix";
import { DateStrip, buildDateTicks, formatLongDate } from "@/components/date-strip";
import { AccentPicker, ThemeControls } from "@/components/theme-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AppStage = "auth" | "onboarding" | "app";
type View = "Home" | "Workout" | "Library" | "Meal" | "Profile";
type RoutineDay = ReturnType<typeof buildRoutine>[number];
type MealKind = "Breakfast" | "Lunch" | "Dinner" | "Snack";
type MealEntry = { id: string; type: MealKind; time: string; title: string; calories: number; protein: number };
type MealDraft = Omit<MealEntry, "id">;

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

const bodyRegionArtwork: Record<BodySide, Partial<Record<BodyRegionName, string>>> = {
  front: {
    Shoulders: "/anatomy/body-front-shoulders.png",
    Chest: "/anatomy/body-front-chest.png",
    Arms: "/anatomy/body-front-arms.png",
    Core: "/anatomy/body-front-core.png",
    Legs: "/anatomy/body-front-legs.png",
    Calves: "/anatomy/body-front-calves.png",
  },
  back: {
    Shoulders: "/anatomy/body-back-shoulders.png",
    Back: "/anatomy/body-back-back.png",
    Arms: "/anatomy/body-back-arms.png",
    Glutes: "/anatomy/body-back-glutes.png",
    Hamstrings: "/anatomy/body-back-hamstrings.png",
    Calves: "/anatomy/body-back-calves.png",
  },
};

function Brand({ inverse = false }: { inverse?: boolean }) {
  return <div className={`brand ${inverse ? "inverse" : ""}`}><span>F</span><strong>FlexForm</strong></div>;
}

function AuthScreen({ onReady }: { onReady: (name: string) => void }) {
  const [mode, setMode] = useState<"create" | "signin">("create");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("Working…");
    try {
      if (mode === "create") await signUpWithEmail(name || "Athlete", email, password);
      else await signInWithEmail(email, password);
      onReady(name || email.split("@")[0] || "Athlete");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not continue. Try again.");
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-visual">
        <Brand inverse />
        <div className="auth-art"><Image src="/exercises/generated/bench-press-anatomical.png" alt="Anatomical barbell bench press visual guide" fill priority sizes="(max-width: 760px) 100vw, 54vw" /></div>
        <div className="auth-statement"><span><Sparkles size={14} /> Your training system</span><h1>Build a body<br />that performs.</h1><p>35 visual exercise guides. A routine shaped around you. Every session recorded.</p></div>
        <div className="auth-proof"><strong>35</strong><span>original movement guides</span><strong>1</strong><span>plan built for you</span></div>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-inner">
          <span className="eyebrow">Welcome to FlexForm</span>
          <h2>{mode === "create" ? "Create your account." : "Welcome back."}</h2>
          <p>{mode === "create" ? "Tell us where you’re going. We’ll build the path." : "Your plan and training history are waiting."}</p>
          <div className="auth-tabs"><button className={mode === "create" ? "active" : ""} onClick={() => setMode("create")}>Create account</button><button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button></div>
          <form onSubmit={submit}>
            {mode === "create" && <label><span>Name</span><div><UserRound size={17} /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required /></div></label>}
            <label><span>Email</span><div><Mail size={17} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></div></label>
            <label><span>Password</span><div><LockKeyhole size={17} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8 characters or more" minLength={8} required /></div></label>
            {status && <small className="form-status">{status}</small>}
            <button className="primary-button" type="submit">{mode === "create" ? "Create my profile" : "Open my plan"}<ArrowRight size={18} /></button>
          </form>
          <button className="demo-button" onClick={() => onReady("Alex")}>Explore the interactive demo</button>
          <small className="auth-note">Supabase authentication activates when environment keys are connected.</small>
        </div>
      </section>
    </main>
  );
}

function Onboarding({ displayName, onComplete }: { displayName: string; onComplete: (profile: OnboardingProfile) => void }) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal>("Build muscle");
  const [experience, setExperience] = useState("Returning");
  const [days, setDays] = useState(4);
  const [setup, setSetup] = useState<TrainingSetup>("Full gym");
  const [planMode, setPlanMode] = useState<"generated" | "custom">("generated");

  const screens = [
    { kicker: "Your outcome", title: "What are we training for?", copy: "Your goal changes exercise priority, weekly volume, and session structure.", body: <div className="choice-grid">{goals.map((item) => <button key={item.value} className={goal === item.value ? "selected" : ""} onClick={() => setGoal(item.value)}><Target size={20} /><strong>{item.value}</strong><small>{item.copy}</small><i>{goal === item.value && <Check size={13} />}</i></button>)}</div> },
    { kicker: "Training history", title: "Where are you starting?", copy: "This keeps the routine challenging without making it reckless.", body: <div className="stacked-choices">{[["New", "I’m learning gym movements"], ["Returning", "I’ve trained before and I’m rebuilding"], ["Experienced", "I train consistently with solid technique"]].map(([value, label]) => <button key={value} className={experience === value ? "selected" : ""} onClick={() => setExperience(value)}><span>{value}</span><small>{label}</small><i>{experience === value && <Check size={14} />}</i></button>)}</div> },
    { kicker: "Weekly rhythm", title: "How many days can you own?", copy: "Choose the schedule you can repeat even during a busy week.", body: <div className="day-picker"><button onClick={() => setDays(Math.max(2, days - 1))}><Minus /></button><strong>{days}<span>days / week</span></strong><button onClick={() => setDays(Math.min(6, days + 1))}><Plus /></button></div> },
    { kicker: "Your setup", title: "What can you train with?", copy: "Every generated exercise will fit the equipment you actually have.", body: <div className="stacked-choices">{[["Full gym", "Barbells, cables, machines, dumbbells"], ["Dumbbells", "Dumbbells, bench, and bodyweight"], ["Bodyweight", "No equipment required"]].map(([value, label]) => <button key={value} className={setup === value ? "selected" : ""} onClick={() => setSetup(value as TrainingSetup)}><span>{value}</span><small>{label}</small><i>{setup === value && <Check size={14} />}</i></button>)}</div> },
    { kicker: "Make it yours", title: "How should we build your routine?", copy: "Start with a smart recommendation or choose every movement yourself.", body: <div className="plan-mode-grid"><button className={planMode === "generated" ? "selected" : ""} onClick={() => setPlanMode("generated")}><Sparkles /><strong>Build it for me</strong><small>FlexForm selects a balanced routine from your answers.</small></button><button className={planMode === "custom" ? "selected" : ""} onClick={() => setPlanMode("custom")}><Dumbbell /><strong>I’ll build my own</strong><small>Open the full library and handpick your exercises.</small></button></div> },
  ];
  const current = screens[step];

  return (
    <main className="onboarding-shell">
      <header><Brand /><span>{String(step + 1).padStart(2, "0")} / 05</span></header>
      <div className="step-track"><i style={{ width: `${((step + 1) / 5) * 100}%` }} /></div>
      <section className="onboarding-card">
        <div className="onboarding-copy"><span className="eyebrow">{current.kicker}</span><h1>{current.title}</h1><p>{current.copy}</p></div>
        {current.body}
      </section>
      <footer>
        <button className="back-button" disabled={step === 0} onClick={() => setStep((value) => value - 1)}><ArrowLeft size={18} /> Back</button>
        <button className="primary-button" onClick={() => step < 4 ? setStep((value) => value + 1) : onComplete({ displayName, goal, experience, daysPerWeek: days, setup, planMode })}>{step === 4 ? planMode === "generated" ? "Build my routine" : "Open exercise library" : "Continue"}<ArrowRight size={18} /></button>
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
        <div className="exercise-art"><Image src={exercise.heroImage} alt={`${exercise.name} starting position`} fill sizes={feature ? "(max-width: 700px) 94vw, 620px" : "(max-width: 700px) 48vw, 300px"} /></div>
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

function WorkoutView({ routine, calories, workouts, onOpen, onStart, onCustomize }: { routine: RoutineDay[]; calories: number; workouts: number; onOpen: (exercise: ExerciseGuide) => void; onStart: (day: RoutineDay) => void; onCustomize: () => void }) {
  const [range, setRange] = useState("week");
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [selectedActivityDate, setSelectedActivityDate] = useState("");
  const activityDays = range === "today" ? 7 : ACTIVITY_DAYS;
  const displayedActivity = useMemo(() => selectedActivityDate ? buildMockActivitySeries(selectedActivityDate, activityDays) : activitySeries.slice(-activityDays), [activityDays, selectedActivityDate]);
  const activityTicks = useMemo(() => buildDateTicks(activityDays, 6, selectedActivityDate || undefined), [activityDays, selectedActivityDate]);
  const activeMinutes = Math.max(0, 80 + Math.max(0, routine.length - 1) * 60);
  const completedWorkouts = Math.max(0, routine.length - 1);
  const scheduleOrder = [1, 3, 4, 6, 2, 5, 0];
  const completedDays = new Set(scheduleOrder.slice(0, completedWorkouts));
  const plannedDays = new Set(scheduleOrder.slice(0, routine.length));
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
            <p>Weekly workouts as planned</p>
          </div>
          <button onClick={onCustomize} aria-label="Customize workout plan"><Plus size={27} /></button>
        </header>

        {routine.length ? (
          <div className="plan-workout-list">
            {routine.map((day, dayIndex) => {
              const expanded = expandedDay === day.id;
              const calories = day.exercises.reduce((total, exercise) => total + Math.round((exercise.caloriesPerMinute[0] + exercise.caloriesPerMinute[1]) * 3), 0);
              return (
                <article className={expanded ? "expanded" : ""} key={day.id}>
                  <button className="plan-workout-summary" onClick={() => setExpandedDay(expanded ? null : day.id)} aria-expanded={expanded}>
                    <div>
                      <span className="workout-timing">
                        {dayIndex === 0 ? "Today" : dayIndex === 1 ? "Tomorrow" : "Later this week"}
                        {dayIndex === 1 && <b>Upcoming</b>}
                      </span>
                      <strong>{day.name}</strong>
                      <span className="workout-meta">
                        <small><Clock3 size={13} /> {42 + dayIndex * 3} mins</small>
                        <small><Footprints size={13} /> {day.exercises.length} exercises</small>
                        <small><Flame size={13} /> {calories} kcal</small>
                      </span>
                    </div>
                    <i><ChevronRight size={18} /></i>
                  </button>
                  <div className="plan-workout-collapse" aria-hidden={!expanded} inert={!expanded}>
                    <div>
                      <div className="plan-workout-details">
                        {day.exercises.map((exercise, index) => (
                          <button key={`${day.id}-${exercise.id}`} onClick={() => onOpen(exercise)}>
                            <span>{String(index + 1).padStart(2, "0")}</span>
                            <div><strong>{exercise.name}</strong><small>{exercise.sets} sets · {exercise.reps} reps</small></div>
                            <ChevronRight size={15} />
                          </button>
                        ))}
                        <button className="start-plan-workout" onClick={() => onStart(day)}>Start workout <ArrowRight size={16} /></button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state"><Dumbbell /><h2>Your routine is empty</h2><p>Choose exercises from the visual library, then save your first training day.</p><button className="primary-button" onClick={onCustomize}>Build my routine <ArrowRight size={17} /></button></div>
        )}
      </section>
    </section>
  );
}

function LibraryView({ saved, builderMode, customSelection, onOpen, onSave, onToggleSelection, onSaveRoutine }: { saved: string[]; builderMode: boolean; customSelection: string[]; onOpen: (exercise: ExerciseGuide) => void; onSave: (id: string) => void; onToggleSelection: (id: string) => void; onSaveRoutine: () => void }) {
  const [query, setQuery] = useState("");
  const [bodySide, setBodySide] = useState<BodySide>("front");
  const [bodyPart, setBodyPart] = useState<BodyRegionName | null>(null);
  const [area, setArea] = useState<(typeof bodyAreas)[number]>("All");
  const [muscle, setMuscle] = useState<(typeof muscleGroups)[number]>("All muscles");
  const [equipment, setEquipment] = useState<(typeof equipmentOptions)[number]>("All");
  const [difficulty, setDifficulty] = useState<(typeof difficultyOptions)[number]>("All");
  const filtered = useMemo(() => exercises.filter((exercise) => {
    const haystack = `${exercise.name} ${exercise.primary} ${exercise.secondary.join(" ")} ${exercise.movement}`.toLowerCase();
    const normalizedMuscle = muscle.toLowerCase().replace("deltoids", "deltoid").replace("calves", "gastrocnemius");
    const bodyPartMatch = !bodyPart || bodyRegionTerms[bodyPart].some((term) => haystack.includes(term));
    return bodyPartMatch && (!query || haystack.includes(query.toLowerCase())) && (area === "All" || exercise.bodyArea === area) && (muscle === "All muscles" || haystack.includes(normalizedMuscle)) && (equipment === "All" || exercise.equipment === equipment) && (difficulty === "All" || exercise.level === difficulty);
  }), [area, bodyPart, difficulty, equipment, muscle, query]);
  const clear = () => { setBodyPart(null); setArea("All"); setMuscle("All muscles"); setEquipment("All"); setDifficulty("All"); setQuery(""); };
  const selectBodyPart = (part: BodyRegionName) => {
    setBodyPart((current) => current === part ? null : part);
    setArea("All");
    setMuscle("All muscles");
    setEquipment("All");
    setDifficulty("All");
    setQuery("");
  };
  const showBodySide = (side: BodySide) => {
    setBodySide(side);
    setBodyPart(null);
  };

  return <section><div className="view-heading"><span className="eyebrow">35 anatomical movement guides</span><h1>{builderMode ? "Build your routine." : "Exercise library."}</h1><p>Tap a muscle on the body to instantly explore every related exercise, or use the detailed filters below.</p></div>{builderMode && <div className="builder-banner"><div><Sparkles /><span>Routine builder<strong>{customSelection.length} exercise{customSelection.length === 1 ? "" : "s"} selected</strong></span></div><button disabled={!customSelection.length} onClick={onSaveRoutine}>Save routine</button></div>}
    <section className="body-explorer" aria-labelledby="body-explorer-title">
      <header><div><span className="eyebrow">Interactive muscle map</span><h2 id="body-explorer-title">Where do you want to train?</h2></div><div className="body-side-toggle"><button className={bodySide === "front" ? "active" : ""} onClick={() => showBodySide("front")}>Front</button><button className={bodySide === "back" ? "active" : ""} onClick={() => showBodySide("back")}>Back</button></div></header>
      <div className="body-explorer-layout">
        <div className="body-model-stage">
          <div className={`body-model ${bodySide === "back" ? "show-back" : ""}`}>
            {(["front", "back"] as BodySide[]).map((side) => {
              const selectedArtwork = bodyPart ? bodyRegionArtwork[side][bodyPart] : undefined;
              return <div className={`body-face body-${side}`} key={side} aria-hidden={bodySide !== side}><Image src={selectedArtwork ?? `/anatomy/body-${side}.png`} alt={`${side} anatomical muscle map${selectedArtwork ? ` highlighting ${bodyPart?.toLowerCase()}` : ""}`} fill sizes="(max-width: 620px) 74vw, 300px" priority={side === "front"} /><svg className="muscle-map" viewBox="0 0 100 150" role="group" aria-label={`${side} muscle groups`}>{bodyRegions[side].map((region) => <g className={`muscle-region ${bodyPart === region.name ? "selected" : ""}`} key={`${side}-${region.name}`} role="button" tabIndex={bodySide === side ? 0 : -1} aria-label={`Show ${region.name.toLowerCase()} exercises`} onClick={() => selectBodyPart(region.name)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectBodyPart(region.name); } }}><title>{region.name}</title>{region.paths.map((path, index) => <path d={path} key={`${region.name}-${index}`} />)}</g>)}</svg></div>;
            })}
          </div>
          <button className="rotate-body" onClick={() => showBodySide(bodySide === "front" ? "back" : "front")}><RotateCcw size={16} /> Rotate to {bodySide === "front" ? "back" : "front"}</button>
        </div>
        <div className="body-selection-copy"><span>Selected area</span><h3>{bodyPart ?? "Tap a muscle"}</h3><p>{bodyPart ? `${filtered.length} related exercise${filtered.length === 1 ? "" : "s"} shown below.` : "Choose any highlighted region on the front or back of the body."}</p>{bodyPart && <button onClick={() => setBodyPart(null)}>Clear selection <X size={14} /></button>}</div>
      </div>
    </section>
    <SearchField value={query} onChange={setQuery} /><div className="filter-panel"><div><span>Body area</span><div className="filter-pills">{bodyAreas.map((item) => <button className={area === item ? "active" : ""} key={item} onClick={() => { setArea(item); setBodyPart(null); }}>{item}</button>)}</div></div><div className="select-filters"><label><span>Muscle</span><select value={muscle} onChange={(event) => { setMuscle(event.target.value as typeof muscle); setBodyPart(null); }}>{muscleGroups.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Equipment</span><select value={equipment} onChange={(event) => setEquipment(event.target.value as typeof equipment)}>{equipmentOptions.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Difficulty</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value as typeof difficulty)}>{difficultyOptions.map((item) => <option key={item}>{item}</option>)}</select></label></div></div><SectionTitle kicker={bodyPart ? `${filtered.length} ${bodyPart.toLowerCase()} movement${filtered.length === 1 ? "" : "s"}` : `${filtered.length} movement${filtered.length === 1 ? "" : "s"}`} title={bodyPart ? `Train your ${bodyPart.toLowerCase()}` : "Explore the index"} action={<button className="text-button" onClick={clear}>Reset filters</button>} />{filtered.length ? <div className="exercise-grid">{filtered.map((exercise) => <ExerciseCard key={exercise.id} exercise={exercise} saved={saved.includes(exercise.id)} selected={customSelection.includes(exercise.id)} onOpen={() => onOpen(exercise)} onSave={() => onSave(exercise.id)} onAdd={builderMode ? () => onToggleSelection(exercise.id) : undefined} />)}</div> : <div className="empty-state"><Search /><h2>No exact match</h2><p>Reset the filters or broaden the body area.</p><button className="primary-button" onClick={clear}>Reset filters</button></div>}</section>;
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
        <span>FlexForm athlete</span>
        <h1>{profile.displayName}</h1>
        <p>{profile.goal} · {profile.experience}</p>
      </div>
      <div className="profile-stats">
        <div><strong>{profile.daysPerWeek}</strong><span>Days / week</span></div>
        <div><strong>{savedCount}</strong><span>Saved moves</span></div>
        <div><strong>12</strong><span>Sessions</span></div>
      </div>
      <div className="appearance-card">
        <h3>Appearance</h3>
        <p>Light or dark canvas, plus an accent that stays on charts, buttons, and checkmarks.</p>
        <ThemeControls />
        <AccentPicker />
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

function ExerciseDetail({ exercise, saved, onSave, onClose, onComplete }: { exercise: ExerciseGuide; saved: boolean; onSave: () => void; onClose: () => void; onComplete: () => void }) {
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
            <footer><button onClick={onComplete}><Check /> Mark guide complete</button></footer>
          </div>
        </div>
      </article>
    </div>
  );
}

function WorkoutSession({ day, onClose, onFinish }: { day: RoutineDay; onClose: () => void; onFinish: (completed: string[], calories: number) => void }) {
  const [completed, setCompleted] = useState<string[]>([]);
  const calories = completed.reduce((total, id) => { const item = day.exercises.find((exercise) => exercise.id === id); return total + (item ? Math.round(((item.caloriesPerMinute[0] + item.caloriesPerMinute[1]) / 2) * 6) : 0); }, 0);
  return <div className="modal-backdrop workout-backdrop"><article className="workout-session"><header><button onClick={onClose}><X /></button><div><span>Workout in progress</span><strong>{day.name}</strong></div><b>{completed.length}/{day.exercises.length}</b></header><div className="workout-pulse" aria-hidden><i /></div><div className="workout-overview"><div><TimerReset /><span>Estimated time<strong>48 min</strong></span></div><div><Flame /><span>Active energy<strong>{calories} kcal</strong></span></div></div><div className="workout-list">{day.exercises.map((exercise, index) => { const done = completed.includes(exercise.id); return <article key={exercise.id}><div className="workout-thumb"><Image src={exercise.heroImage} alt={`${exercise.name} starting position`} fill sizes="82px" /></div><div><span>Exercise {String(index + 1).padStart(2, "0")}</span><strong>{exercise.name}</strong><small>{exercise.sets} sets · {exercise.reps} reps · {exercise.rest} rest</small></div><button className={done ? "done" : ""} onClick={() => setCompleted((items) => done ? items.filter((id) => id !== exercise.id) : [...items, exercise.id])}>{done ? <Check /> : <Plus />}</button></article>; })}</div><footer><div><span>Session progress</span><strong>{Math.round((completed.length / day.exercises.length) * 100) || 0}%</strong></div><i><b style={{ width: `${(completed.length / day.exercises.length) * 100}%` }} /></i><button disabled={!completed.length} onClick={() => onFinish(completed, calories)}>Finish workout <Check /></button></footer></article></div>;
}

export default function FlexFormDashboard() {
  const [stage, setStage] = useState<AppStage>("auth");
  const [displayName, setDisplayName] = useState("Alex");
  const [profile, setProfile] = useState<OnboardingProfile>({ displayName: "Alex", goal: "Build muscle", experience: "Returning", daysPerWeek: 4, setup: "Full gym", planMode: "generated" });
  const [view, setView] = useState<View>("Home");
  const [routine, setRoutine] = useState<RoutineDay[]>(buildRoutine("Build muscle", 4, "Full gym"));
  const [saved, setSaved] = useState<string[]>(["bench-press", "back-squat"]);
  const [customSelection, setCustomSelection] = useState<string[]>([]);
  const [builderMode, setBuilderMode] = useState(false);
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
  }, []);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const overlayOpen = Boolean(selected || activeWorkout || mealLoggerOpen);
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
    setRoutine(nextRoutine);
    setBuilderMode(nextProfile.planMode === "custom");
    setView(nextProfile.planMode === "custom" ? "Library" : "Workout");
    setStage("app");
    void saveOnboarding(nextProfile).catch(() => undefined);
    if (nextRoutine.length) void saveRoutine(nextRoutine, "generated").catch(() => undefined);
  };
  const saveCustomRoutine = () => {
    const selectedExercises = customSelection.map((id) => exercises.find((exercise) => exercise.id === id)).filter((item): item is ExerciseGuide => Boolean(item));
    const next = [{ id: "custom-1", name: "Custom full body", exercises: selectedExercises }];
    setRoutine(next); setBuilderMode(false); navigate("Workout"); notify("Custom routine saved.");
    void saveRoutine(next, "custom").catch(() => undefined);
  };
  const addMeal = (meal: MealDraft) => {
    setMeals((items) => [...items, { ...meal, id: `meal-${Date.now()}` }]);
    notify(`${meal.type} added to your meal log.`);
  };
  const closeMealLogger = useCallback(() => setMealLoggerOpen(false), []);

  if (stage === "auth") return <AuthScreen onReady={(name) => { setDisplayName(name); setStage("onboarding"); }} />;
  if (stage === "onboarding") return <Onboarding displayName={displayName} onComplete={finishOnboarding} />;

  const workoutArea = view === "Workout";

  return <div className="app-shell"><header className={`app-header ${workoutArea ? "plan-app-header" : ""}`}><div className="app-header-greeting"><Sparkles className="app-header-mark" size={27} /><div><strong>{headerGreeting}, {profile.displayName}</strong><span>{headerDate}</span></div></div><div className="app-header-actions"><button className="header-profile" onClick={() => navigate("Profile")} aria-label="Open profile"><UserRound size={21} /></button></div></header><main className={`app-content ${workoutArea ? "plan-content" : ""}`}>{view === "Home" && <HomeView routine={routine} saved={saved} onOpen={setSelected} onSave={toggleSaved} onNavigate={navigate} onStart={setActiveWorkout} />}{view === "Workout" && <WorkoutView routine={routine} calories={calories} workouts={workouts} onOpen={setSelected} onStart={setActiveWorkout} onCustomize={() => { setBuilderMode(true); setCustomSelection(routine.flatMap((day) => day.exercises.map((exercise) => exercise.id))); navigate("Library"); }} />}{view === "Library" && <LibraryView saved={saved} builderMode={builderMode} customSelection={customSelection} onOpen={setSelected} onSave={toggleSaved} onToggleSelection={(id) => setCustomSelection((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])} onSaveRoutine={saveCustomRoutine} />}{view === "Meal" && <MealView meals={meals} onOpenLogger={() => setMealLoggerOpen(true)} />}{view === "Profile" && <ProfileView profile={profile} savedCount={saved.length} onRestart={() => { void signOut(); setStage("auth"); }} />}</main><nav className="floating-nav">{navItems.map(({ label, icon: Icon }) => <button key={label} className={view === label || (view === "Library" && label === "Workout") ? "active" : ""} onClick={() => navigate(label)}><Icon size={19} /><span>{label}</span></button>)}</nav>{selected && <ExerciseDetail exercise={selected} saved={saved.includes(selected.id)} onSave={() => toggleSaved(selected.id)} onClose={() => setSelected(null)} onComplete={() => { void saveGuideCompletion(selected.id).catch(() => undefined); setSelected(null); notify("Guide complete. Clean reps win."); }} />}{activeWorkout && <WorkoutSession day={activeWorkout} onClose={() => setActiveWorkout(null)} onFinish={(completed, burned) => { void saveWorkoutSummary(activeWorkout.id, activeWorkout.name, completed, burned).catch(() => undefined); setCalories((value) => value + burned); setWorkouts((value) => value + 1); setActiveWorkout(null); notify(`${completed.length} exercises logged · ${burned} kcal estimated`); }} />}{mealLoggerOpen && <MealLoggerDrawer onClose={closeMealLogger} onAdd={addMeal} />}{toast && <div className="toast"><Check size={15} />{toast}</div>}</div>;
}
