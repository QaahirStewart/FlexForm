"use client";

import Image from "next/image";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Bookmark,
  CalendarDays,
  Check,
  ChevronRight,
  CircleUserRound,
  Dumbbell,
  Flame,
  Home,
  LockKeyhole,
  LogOut,
  Mail,
  Minus,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Target,
  TimerReset,
  Trophy,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
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

type AppStage = "auth" | "onboarding" | "app";
type View = "Home" | "Plan" | "Library" | "Progress" | "Profile";
type RoutineDay = ReturnType<typeof buildRoutine>[number];

const navItems = [
  { label: "Home" as const, icon: Home },
  { label: "Plan" as const, icon: CalendarDays },
  { label: "Library" as const, icon: BookOpen },
  { label: "Progress" as const, icon: BarChart3 },
  { label: "Profile" as const, icon: CircleUserRound },
];

const goals: Array<{ value: Goal; copy: string }> = [
  { value: "Build muscle", copy: "Hypertrophy, balanced volume, steady progression" },
  { value: "Lose fat", copy: "Higher output with strength kept in the plan" },
  { value: "Get stronger", copy: "Heavy compounds and measurable progression" },
  { value: "Move better", copy: "Control, range, stability, and resilience" },
];

const accentLabel = { blue: "Push", green: "Lower", purple: "Pull", orange: "Hinge" };

function Brand({ inverse = false }: { inverse?: boolean }) {
  return <div className={`brand ${inverse ? "inverse" : ""}`}><span>F</span><strong>FLEXFORM<em>.</em></strong></div>;
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
        <div className="auth-art"><Image src="/exercises/generated/bench-press.png" alt="Barbell bench press visual guide" fill priority sizes="(max-width: 760px) 100vw, 54vw" /></div>
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
        <div className="exercise-art"><Image src={exercise.image} alt={`${exercise.name} visual demonstration`} fill sizes={feature ? "(max-width: 700px) 94vw, 620px" : "(max-width: 700px) 48vw, 300px"} /><span>{accentLabel[exercise.accent]}</span></div>
        <div className="exercise-copy"><small>{exercise.primary}</small><h3>{exercise.name}</h3><p>{exercise.equipment} · {exercise.level}</p><strong>{exercise.sets} × {exercise.reps}</strong></div>
      </button>
      <button className={`bookmark-button ${saved ? "saved" : ""}`} onClick={onSave} aria-label="Save exercise"><Bookmark size={16} fill={saved ? "currentColor" : "none"} /></button>
      {onAdd && <button className={`add-button ${selected ? "added" : ""}`} onClick={onAdd}>{selected ? <Check size={16} /> : <Plus size={16} />}</button>}
    </article>
  );
}

function HomeView({ name, routine, saved, onOpen, onSave, onNavigate, onStart }: { name: string; routine: RoutineDay[]; saved: string[]; onOpen: (exercise: ExerciseGuide) => void; onSave: (id: string) => void; onNavigate: (view: View) => void; onStart: (day: RoutineDay) => void }) {
  const today = routine[0];
  return <>
    <section className="home-greeting"><div><span>Good evening, {name}</span><h1>Ready to put<br />the work in?</h1></div><button><Bell size={19} /><i /></button></section>
    <section className="today-card">
      <div className="today-top"><span><Zap size={13} /> Today’s training</span><b>{today?.exercises.length ?? 0} exercises · ~52 min</b></div>
      <div className="today-main"><div><small>{today?.name ?? "Build your routine"}</small><h2>{today ? today.exercises.slice(0, 3).map((item) => item.primary.split(" ")[0]).join(" · ") : "Your plan starts here"}</h2><p>{today ? "A focused session built from your goal, schedule, and equipment." : "Choose movements from the library to begin."}</p></div>{today && <button onClick={() => onStart(today)}><span>Start workout</span><ArrowRight /></button>}</div>
      {today && <div className="today-movements">{today.exercises.slice(0, 4).map((exercise, index) => <button key={exercise.id} onClick={() => onOpen(exercise)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{exercise.name}</strong><small>{exercise.sets} × {exercise.reps}</small><ChevronRight size={15} /></button>)}</div>}
    </section>
    <div className="metric-strip"><article><Flame /><span>Active calories<strong>486 <small>kcal</small></strong></span></article><article><Activity /><span>Daily steps<strong>7,842</strong></span></article><article><Trophy /><span>Weekly goal<strong>3 / {routine.length || 4}</strong></span></article></div>
    <section><SectionTitle kicker="Technique first" title="Featured guide" action={<button className="text-button" onClick={() => onNavigate("Library")}>See all <ArrowRight size={14} /></button>} /><ExerciseCard feature exercise={exercises[0]} saved={saved.includes(exercises[0].id)} onOpen={() => onOpen(exercises[0])} onSave={() => onSave(exercises[0].id)} /></section>
  </>;
}

function PlanView({ routine, onOpen, onStart, onCustomize }: { routine: RoutineDay[]; onOpen: (exercise: ExerciseGuide) => void; onStart: (day: RoutineDay) => void; onCustomize: () => void }) {
  return <section><div className="view-heading"><span className="eyebrow">Your training architecture</span><h1>My routine.</h1><p>A repeatable week built around your goal. Tap any exercise to study its complete visual guide.</p></div><div className="plan-summary"><div><Sparkles /><span>Personalized split<strong>{routine.length} training days</strong></span></div><button onClick={onCustomize}><Settings2 size={16} /> Customize</button></div>{routine.length ? <div className="routine-days">{routine.map((day, dayIndex) => <article key={day.id}><header><span>{String(dayIndex + 1).padStart(2, "0")}</span><div><small>Training day</small><h2>{day.name}</h2></div><button onClick={() => onStart(day)}>Start <ArrowRight size={15} /></button></header><div>{day.exercises.map((exercise, index) => <button key={`${day.id}-${exercise.id}`} onClick={() => onOpen(exercise)}><span>{index + 1}</span><div><strong>{exercise.name}</strong><small>{exercise.primary} · {exercise.sets} × {exercise.reps}</small></div><ChevronRight size={16} /></button>)}</div></article>)}</div> : <div className="empty-state"><Dumbbell /><h2>Your routine is empty</h2><p>Choose exercises from the visual library, then save your first training day.</p><button className="primary-button" onClick={onCustomize}>Build my routine <ArrowRight size={17} /></button></div>}</section>;
}

function LibraryView({ saved, builderMode, customSelection, onOpen, onSave, onToggleSelection, onSaveRoutine }: { saved: string[]; builderMode: boolean; customSelection: string[]; onOpen: (exercise: ExerciseGuide) => void; onSave: (id: string) => void; onToggleSelection: (id: string) => void; onSaveRoutine: () => void }) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState<(typeof bodyAreas)[number]>("All");
  const [muscle, setMuscle] = useState<(typeof muscleGroups)[number]>("All muscles");
  const [equipment, setEquipment] = useState<(typeof equipmentOptions)[number]>("All");
  const [difficulty, setDifficulty] = useState<(typeof difficultyOptions)[number]>("All");
  const filtered = useMemo(() => exercises.filter((exercise) => {
    const haystack = `${exercise.name} ${exercise.primary} ${exercise.secondary.join(" ")} ${exercise.movement}`.toLowerCase();
    const normalizedMuscle = muscle.toLowerCase().replace("deltoids", "deltoid").replace("calves", "gastrocnemius");
    return (!query || haystack.includes(query.toLowerCase())) && (area === "All" || exercise.bodyArea === area) && (muscle === "All muscles" || haystack.includes(normalizedMuscle)) && (equipment === "All" || exercise.equipment === equipment) && (difficulty === "All" || exercise.level === difficulty);
  }), [area, difficulty, equipment, muscle, query]);
  const clear = () => { setArea("All"); setMuscle("All muscles"); setEquipment("All"); setDifficulty("All"); setQuery(""); };

  return <section><div className="view-heading"><span className="eyebrow">35 original visual guides</span><h1>{builderMode ? "Build your routine." : "Exercise library."}</h1><p>Filter from broad body areas down to exact muscles, equipment, and training level.</p></div>{builderMode && <div className="builder-banner"><div><Sparkles /><span>Routine builder<strong>{customSelection.length} exercise{customSelection.length === 1 ? "" : "s"} selected</strong></span></div><button disabled={!customSelection.length} onClick={onSaveRoutine}>Save routine</button></div>}<SearchField value={query} onChange={setQuery} /><div className="filter-panel"><div><span>Body area</span><div className="filter-pills">{bodyAreas.map((item) => <button className={area === item ? "active" : ""} key={item} onClick={() => setArea(item)}>{item}</button>)}</div></div><div className="select-filters"><label><span>Muscle</span><select value={muscle} onChange={(event) => setMuscle(event.target.value as typeof muscle)}>{muscleGroups.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Equipment</span><select value={equipment} onChange={(event) => setEquipment(event.target.value as typeof equipment)}>{equipmentOptions.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Difficulty</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value as typeof difficulty)}>{difficultyOptions.map((item) => <option key={item}>{item}</option>)}</select></label></div></div><SectionTitle kicker={`${filtered.length} movement${filtered.length === 1 ? "" : "s"}`} title="Explore the index" action={<button className="text-button" onClick={clear}>Reset filters</button>} />{filtered.length ? <div className="exercise-grid">{filtered.map((exercise) => <ExerciseCard key={exercise.id} exercise={exercise} saved={saved.includes(exercise.id)} selected={customSelection.includes(exercise.id)} onOpen={() => onOpen(exercise)} onSave={() => onSave(exercise.id)} onAdd={builderMode ? () => onToggleSelection(exercise.id) : undefined} />)}</div> : <div className="empty-state"><Search /><h2>No exact match</h2><p>Reset the filters or broaden the body area.</p><button className="primary-button" onClick={clear}>Reset filters</button></div>}</section>;
}

function ProgressView({ calories, workouts }: { calories: number; workouts: number }) {
  const chart = [42, 68, 35, 82, 64, 91, 74];
  return <section><div className="view-heading"><span className="eyebrow">Consistency compounds</span><h1>Your progress.</h1><p>Training, activity, and energy in one honest view.</p></div><div className="progress-hero"><div><span>Weekly adherence</span><strong>{Math.min(100, 75 + workouts * 5)}%</strong><p>{workouts ? "Workout logged. Keep the streak moving." : "Three of four planned sessions complete."}</p></div><div className="progress-ring"><b>{3 + workouts}<small>/ 4</small></b></div></div><div className="metric-grid"><article><Flame /><span>Active calories</span><strong>{486 + calories}</strong><small>Today · kcal</small></article><article><Activity /><span>Daily movement</span><strong>7,842</strong><small>Steps</small></article><article><TimerReset /><span>Training time</span><strong>{164 + workouts * 48}</strong><small>Minutes this week</small></article><article><Trophy /><span>Workouts</span><strong>{12 + workouts}</strong><small>This month</small></article></div><SectionTitle kicker="Last seven days" title="Activity output" /><div className="activity-chart">{chart.map((value, index) => <div key={index}><i style={{ height: `${value}%` }} className={index === 5 ? "peak" : ""} /><span>{["M", "T", "W", "T", "F", "S", "S"][index]}</span></div>)}</div><div className="nutrition-card"><div><span>Daily nutrition</span><h2>2,140 <small>/ 2,500 kcal</small></h2><p>Protein 148g · Carbs 212g · Fat 68g</p></div><div className="nutrition-ring">86%</div></div></section>;
}

function ProfileView({ profile, savedCount, onRestart }: { profile: OnboardingProfile; savedCount: number; onRestart: () => void }) {
  return <section><div className="profile-hero"><div className="profile-avatar">{profile.displayName.slice(0, 2).toUpperCase()}</div><span>FlexForm athlete</span><h1>{profile.displayName}</h1><p>{profile.goal} · {profile.experience}</p></div><div className="profile-stats"><div><strong>{profile.daysPerWeek}</strong><span>Days / week</span></div><div><strong>{savedCount}</strong><span>Saved moves</span></div><div><strong>12</strong><span>Sessions</span></div></div><div className="settings-list"><button><Dumbbell /><span>Training setup<small>{profile.setup}</small></span><ChevronRight /></button><button><Target /><span>Primary goal<small>{profile.goal}</small></span><ChevronRight /></button><button><Flame /><span>Calorie target<small>2,500 kcal / day</small></span><ChevronRight /></button><button onClick={onRestart}><LogOut /><span>Sign out<small>Return to welcome</small></span><ChevronRight /></button></div></section>;
}

function ExerciseDetail({ exercise, saved, onSave, onClose, onComplete }: { exercise: ExerciseGuide; saved: boolean; onSave: () => void; onClose: () => void; onComplete: () => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><article className={`exercise-detail accent-${exercise.accent}`}><header><button onClick={onClose}><ArrowLeft /> Back</button><Brand /><button className={saved ? "saved" : ""} onClick={onSave}><Bookmark fill={saved ? "currentColor" : "none"} /></button></header><div className="detail-scroll"><div className="detail-art"><Image src={exercise.image} alt={`${exercise.name} visual guide`} fill sizes="(max-width: 760px) 100vw, 760px" priority /></div><div className="detail-body"><span className="eyebrow">{exercise.collection} · {exercise.level}</span><h1>{exercise.name}</h1><div className="muscle-summary"><div><small>Primary</small><strong>{exercise.primary}</strong></div><div><small>Secondary</small><strong>{exercise.secondary.join(" · ") || "Isolation focus"}</strong></div></div><div className="dose-grid"><div><span>Sets</span><strong>{exercise.sets}</strong></div><div><span>Reps</span><strong>{exercise.reps}</strong></div><div><span>Rest</span><strong>{exercise.rest}</strong></div><div><span>RIR</span><strong>{exercise.rir}</strong></div></div><section className="cue-section"><SectionTitle kicker="Three clear cues" title="Own the movement" /><div>{exercise.steps.map((step, index) => <article key={step.label}><span>{index + 1}</span><div><strong>{step.label}</strong><p>{step.cue}</p></div></article>)}</div></section><div className="detail-meta"><span>Movement<strong>{exercise.movement}</strong></span><span>Equipment<strong>{exercise.equipment}</strong></span><span>Est. energy<strong>{exercise.caloriesPerMinute[0]}–{exercise.caloriesPerMinute[1]} kcal/min</strong></span></div></div></div><footer><button onClick={onComplete}><Check /> Mark guide complete</button></footer></article></div>;
}

function WorkoutSession({ day, onClose, onFinish }: { day: RoutineDay; onClose: () => void; onFinish: (completed: string[], calories: number) => void }) {
  const [completed, setCompleted] = useState<string[]>([]);
  const calories = completed.reduce((total, id) => { const item = day.exercises.find((exercise) => exercise.id === id); return total + (item ? Math.round(((item.caloriesPerMinute[0] + item.caloriesPerMinute[1]) / 2) * 6) : 0); }, 0);
  return <div className="modal-backdrop workout-backdrop"><article className="workout-session"><header><button onClick={onClose}><X /></button><div><span>Workout in progress</span><strong>{day.name}</strong></div><b>{completed.length}/{day.exercises.length}</b></header><div className="workout-overview"><div><TimerReset /><span>Estimated time<strong>48 min</strong></span></div><div><Flame /><span>Active energy<strong>{calories} kcal</strong></span></div></div><div className="workout-list">{day.exercises.map((exercise, index) => { const done = completed.includes(exercise.id); return <article key={exercise.id}><div className="workout-thumb"><Image src={exercise.image} alt="" fill sizes="82px" /></div><div><span>Exercise {String(index + 1).padStart(2, "0")}</span><strong>{exercise.name}</strong><small>{exercise.sets} sets · {exercise.reps} reps · {exercise.rest} rest</small></div><button className={done ? "done" : ""} onClick={() => setCompleted((items) => done ? items.filter((id) => id !== exercise.id) : [...items, exercise.id])}>{done ? <Check /> : <Plus />}</button></article>; })}</div><footer><div><span>Session progress</span><strong>{Math.round((completed.length / day.exercises.length) * 100) || 0}%</strong></div><i><b style={{ width: `${(completed.length / day.exercises.length) * 100}%` }} /></i><button disabled={!completed.length} onClick={() => onFinish(completed, calories)}>Finish workout <Check /></button></footer></article></div>;
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
  const [toast, setToast] = useState("");
  const [calories, setCalories] = useState(0);
  const [workouts, setWorkouts] = useState(0);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const toggleSaved = (id: string) => setSaved((items) => { const next = items.includes(id) ? items.filter((item) => item !== id) : [...items, id]; void syncFavoriteExercise(id, next.includes(id)).catch(() => undefined); return next; });
  const navigate = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const finishOnboarding = (nextProfile: OnboardingProfile) => {
    setProfile(nextProfile);
    const nextRoutine = nextProfile.planMode === "generated" ? buildRoutine(nextProfile.goal, nextProfile.daysPerWeek, nextProfile.setup) : [];
    setRoutine(nextRoutine);
    setBuilderMode(nextProfile.planMode === "custom");
    setView(nextProfile.planMode === "custom" ? "Library" : "Plan");
    setStage("app");
    void saveOnboarding(nextProfile).catch(() => undefined);
    if (nextRoutine.length) void saveRoutine(nextRoutine, "generated").catch(() => undefined);
  };
  const saveCustomRoutine = () => {
    const selectedExercises = customSelection.map((id) => exercises.find((exercise) => exercise.id === id)).filter((item): item is ExerciseGuide => Boolean(item));
    const next = [{ id: "custom-1", name: "Custom full body", exercises: selectedExercises }];
    setRoutine(next); setBuilderMode(false); navigate("Plan"); notify("Custom routine saved.");
    void saveRoutine(next, "custom").catch(() => undefined);
  };

  if (stage === "auth") return <AuthScreen onReady={(name) => { setDisplayName(name); setStage("onboarding"); }} />;
  if (stage === "onboarding") return <Onboarding displayName={displayName} onComplete={finishOnboarding} />;

  return <div className="app-shell"><header className="app-header"><Brand /><div><span>{profile.goal}</span><button onClick={() => navigate("Profile")}>{profile.displayName.slice(0, 2).toUpperCase()}</button></div></header><main className="app-content">{view === "Home" && <HomeView name={profile.displayName} routine={routine} saved={saved} onOpen={setSelected} onSave={toggleSaved} onNavigate={navigate} onStart={setActiveWorkout} />}{view === "Plan" && <PlanView routine={routine} onOpen={setSelected} onStart={setActiveWorkout} onCustomize={() => { setBuilderMode(true); setCustomSelection(routine.flatMap((day) => day.exercises.map((exercise) => exercise.id))); navigate("Library"); }} />}{view === "Library" && <LibraryView saved={saved} builderMode={builderMode} customSelection={customSelection} onOpen={setSelected} onSave={toggleSaved} onToggleSelection={(id) => setCustomSelection((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])} onSaveRoutine={saveCustomRoutine} />}{view === "Progress" && <ProgressView calories={calories} workouts={workouts} />}{view === "Profile" && <ProfileView profile={profile} savedCount={saved.length} onRestart={() => { void signOut(); setStage("auth"); }} />}</main><nav className="floating-nav">{navItems.map(({ label, icon: Icon }) => <button key={label} className={view === label ? "active" : ""} onClick={() => navigate(label)}><Icon size={19} /><span>{label}</span></button>)}</nav>{selected && <ExerciseDetail exercise={selected} saved={saved.includes(selected.id)} onSave={() => toggleSaved(selected.id)} onClose={() => setSelected(null)} onComplete={() => { void saveGuideCompletion(selected.id).catch(() => undefined); setSelected(null); notify("Guide complete. Clean reps win."); }} />}{activeWorkout && <WorkoutSession day={activeWorkout} onClose={() => setActiveWorkout(null)} onFinish={(completed, burned) => { void saveWorkoutSummary(activeWorkout.id, activeWorkout.name, completed, burned).catch(() => undefined); setCalories((value) => value + burned); setWorkouts((value) => value + 1); setActiveWorkout(null); notify(`${completed.length} exercises logged · ${burned} kcal estimated`); }} />}{toast && <div className="toast"><Check size={15} />{toast}</div>}</div>;
}
