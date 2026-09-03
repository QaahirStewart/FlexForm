export type Exercise = {
  id: string;
  name: string;
  muscle: string;
  sets: number;
  reps: string;
  rest: string;
  cue: string;
};

export type TrainingDay = {
  id: string;
  order: string;
  name: string;
  shortName: string;
  focus: string;
  summary: string;
  duration: number;
  calories: number;
  accent: string;
  exercises: Exercise[];
};

export const trainingDays: TrainingDay[] = [
  {
    id: "upper-a",
    order: "01",
    name: "Upper A",
    shortName: "Push",
    focus: "Chest · Shoulders · Triceps",
    summary: "Controlled pressing volume with a shoulder-safe finish.",
    duration: 54,
    calories: 420,
    accent: "lime",
    exercises: [
      { id: "bench-press", name: "Barbell bench press", muscle: "Chest", sets: 3, reps: "6–10", rest: "90 sec", cue: "Drive feet down. Keep two reps in reserve." },
      { id: "incline-db", name: "Incline dumbbell press", muscle: "Upper chest", sets: 3, reps: "8–12", rest: "90 sec", cue: "Low incline. Stack wrists over elbows." },
      { id: "overhead-press", name: "Seated overhead press", muscle: "Shoulders", sets: 3, reps: "8–12", rest: "90 sec", cue: "Ribs down. Finish with biceps by ears." },
      { id: "cable-fly", name: "Cable chest fly", muscle: "Chest", sets: 3, reps: "12–15", rest: "60 sec", cue: "Sweep inward and pause at peak tension." },
      { id: "lateral-raise", name: "Lateral raise", muscle: "Side delts", sets: 3, reps: "12–15", rest: "60 sec", cue: "Lead with elbows. Stop at shoulder height." },
      { id: "pushdown", name: "Rope pushdown", muscle: "Triceps", sets: 3, reps: "10–15", rest: "60 sec", cue: "Pin elbows. Separate the rope at lockout." },
    ],
  },
  {
    id: "lower-a",
    order: "02",
    name: "Lower A",
    shortName: "Quads",
    focus: "Quads · Glutes · Calves",
    summary: "Quad-dominant strength with stable, deliberate reps.",
    duration: 62,
    calories: 510,
    accent: "amber",
    exercises: [
      { id: "back-squat", name: "Back squat", muscle: "Quads", sets: 4, reps: "6–10", rest: "120 sec", cue: "Brace before descent. Drive through mid-foot." },
      { id: "leg-press", name: "Leg press", muscle: "Quads", sets: 3, reps: "10–12", rest: "90 sec", cue: "Control depth without lifting the hips." },
      { id: "leg-extension", name: "Leg extension", muscle: "Quads", sets: 3, reps: "12–15", rest: "60 sec", cue: "Pause hard at full extension." },
      { id: "walking-lunge", name: "Walking lunge", muscle: "Glutes", sets: 3, reps: "12 / leg", rest: "60 sec", cue: "Long stride. Keep the front foot planted." },
      { id: "calf-raise", name: "Standing calf raise", muscle: "Calves", sets: 4, reps: "12–20", rest: "60 sec", cue: "Full stretch, full rise, no bouncing." },
      { id: "hanging-raise", name: "Hanging leg raise", muscle: "Core", sets: 3, reps: "10–15", rest: "60 sec", cue: "Curl the pelvis. Avoid swinging." },
    ],
  },
  {
    id: "upper-b",
    order: "03",
    name: "Upper B",
    shortName: "Pull",
    focus: "Back · Rear delts · Biceps",
    summary: "Build width and density with clean pulling mechanics.",
    duration: 58,
    calories: 455,
    accent: "violet",
    exercises: [
      { id: "pullup", name: "Pull-up / lat pulldown", muscle: "Lats", sets: 4, reps: "6–10", rest: "90 sec", cue: "Pull elbows toward your back pockets." },
      { id: "barbell-row", name: "Barbell row", muscle: "Mid back", sets: 3, reps: "6–10", rest: "90 sec", cue: "Lock the torso. Pull toward low ribs." },
      { id: "cable-row", name: "Seated cable row", muscle: "Back", sets: 3, reps: "8–12", rest: "90 sec", cue: "Reach long, then drive elbows behind you." },
      { id: "face-pull", name: "Face pull", muscle: "Rear delts", sets: 3, reps: "12–15", rest: "60 sec", cue: "Pull high and rotate thumbs behind you." },
      { id: "incline-curl", name: "Incline dumbbell curl", muscle: "Biceps", sets: 3, reps: "10–15", rest: "60 sec", cue: "Let arms hang. Keep shoulders still." },
      { id: "hammer-curl", name: "Hammer curl", muscle: "Biceps", sets: 3, reps: "10–15", rest: "60 sec", cue: "Neutral wrists. Control the lowering phase." },
    ],
  },
  {
    id: "lower-b",
    order: "04",
    name: "Lower B",
    shortName: "Posterior",
    focus: "Hamstrings · Glutes · Core",
    summary: "Posterior-chain strength without sacrificing position.",
    duration: 61,
    calories: 495,
    accent: "orange",
    exercises: [
      { id: "rdl", name: "Romanian deadlift", muscle: "Hamstrings", sets: 4, reps: "6–10", rest: "120 sec", cue: "Push hips back. Keep the bar close." },
      { id: "hip-thrust", name: "Hip thrust", muscle: "Glutes", sets: 3, reps: "8–12", rest: "90 sec", cue: "Tuck the pelvis and pause at the top." },
      { id: "leg-curl", name: "Seated leg curl", muscle: "Hamstrings", sets: 3, reps: "10–15", rest: "60 sec", cue: "Stay pinned down. Squeeze the finish." },
      { id: "split-squat", name: "Bulgarian split squat", muscle: "Glutes", sets: 3, reps: "8–10 / leg", rest: "90 sec", cue: "Drop straight down with a slight torso lean." },
      { id: "calf-raise-b", name: "Standing calf raise", muscle: "Calves", sets: 4, reps: "12–20", rest: "60 sec", cue: "Own the stretch. Pause at the top." },
      { id: "plank", name: "RKC plank", muscle: "Core", sets: 3, reps: "30–60 sec", rest: "30 sec", cue: "Pull elbows to toes and squeeze everything." },
    ],
  },
];

export const weeklyLoad = [
  { day: "Mon", value: 68 },
  { day: "Tue", value: 43 },
  { day: "Wed", value: 76 },
  { day: "Thu", value: 52 },
  { day: "Fri", value: 91 },
  { day: "Sat", value: 64 },
  { day: "Sun", value: 82 },
];
