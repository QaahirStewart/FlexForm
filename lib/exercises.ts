export type ExerciseCategory = "Chest" | "Back" | "Shoulders" | "Legs" | "Arms" | "Core";
export type BodyArea = "Upper body" | "Lower body" | "Core" | "Full body";
export type Equipment = "Barbell" | "Dumbbells" | "Cable" | "Machine" | "Bodyweight";
export type Difficulty = "Beginner" | "Intermediate" | "Advanced";
export type ExerciseAccent = "blue" | "green" | "purple" | "orange";

export type ExerciseGuide = {
  id: string;
  name: string;
  category: ExerciseCategory;
  bodyArea: BodyArea;
  collection: string;
  movement: string;
  equipment: Equipment;
  accent: ExerciseAccent;
  image: string;
  primary: string;
  secondary: string[];
  sets: string;
  reps: string;
  rest: string;
  rir: string;
  alternative: string;
  level: Difficulty;
  caloriesPerMinute: [number, number];
  steps: [{ label: string; cue: string }, { label: string; cue: string }, { label: string; cue: string }];
};

type Draft = Omit<ExerciseGuide, "image" | "rir" | "caloriesPerMinute"> & {
  caloriesPerMinute?: [number, number];
};

const guide = (draft: Draft): ExerciseGuide => ({
  ...draft,
  image: `/exercises/generated/${draft.id}.png`,
  rir: "1–2",
  caloriesPerMinute: draft.caloriesPerMinute ?? [5, 8],
});

const three = (a: string, b: string, c: string): ExerciseGuide["steps"] => [
  { label: "Set", cue: a },
  { label: "Move", cue: b },
  { label: "Finish", cue: c },
];

export const exercises: ExerciseGuide[] = [
  guide({ id: "bench-press", name: "Barbell bench press", category: "Chest", bodyArea: "Upper body", collection: "Push strength", movement: "Horizontal push", equipment: "Barbell", accent: "blue", primary: "Pectoralis major", secondary: ["Anterior deltoids", "Triceps"], sets: "3–4", reps: "6–10", rest: "90 sec", alternative: "Dumbbell bench press", level: "Intermediate", steps: three("Shoulders back · feet planted", "Lower toward mid-chest", "Press up under control") }),
  guide({ id: "incline-dumbbell-press", name: "Incline dumbbell press", category: "Chest", bodyArea: "Upper body", collection: "Push strength", movement: "Incline push", equipment: "Dumbbells", accent: "blue", primary: "Upper pectorals", secondary: ["Anterior deltoids", "Triceps"], sets: "3", reps: "8–12", rest: "90 sec", alternative: "Incline barbell press", level: "Intermediate", steps: three("Low incline · wrists stacked", "Lower below shoulders", "Meet over upper chest") }),
  guide({ id: "cable-chest-fly", name: "Cable chest fly", category: "Chest", bodyArea: "Upper body", collection: "Chest isolation", movement: "Horizontal adduction", equipment: "Cable", accent: "blue", primary: "Pectoralis major", secondary: ["Anterior deltoids"], sets: "3", reps: "12–15", rest: "60 sec", alternative: "Pec deck fly", level: "Beginner", steps: three("Split stance · soft elbows", "Sweep hands inward", "Pause at peak tension") }),
  guide({ id: "push-up", name: "Push-up", category: "Chest", bodyArea: "Upper body", collection: "Bodyweight basics", movement: "Horizontal push", equipment: "Bodyweight", accent: "blue", primary: "Pectoralis major", secondary: ["Triceps", "Anterior deltoids"], sets: "3", reps: "8–20", rest: "60 sec", alternative: "Incline push-up", level: "Beginner", caloriesPerMinute: [6, 9], steps: three("Hands below shoulders", "Lower as one unit", "Push the floor away") }),
  guide({ id: "parallel-bar-dip", name: "Parallel bar dip", category: "Chest", bodyArea: "Upper body", collection: "Bodyweight strength", movement: "Vertical push", equipment: "Bodyweight", accent: "blue", primary: "Lower pectorals", secondary: ["Triceps", "Anterior deltoids"], sets: "3", reps: "6–12", rest: "90 sec", alternative: "Assisted dip", level: "Advanced", steps: three("Support tall · shoulders down", "Lower to 90 degrees", "Drive bars down") }),

  guide({ id: "seated-overhead-press", name: "Seated overhead press", category: "Shoulders", bodyArea: "Upper body", collection: "Push strength", movement: "Vertical push", equipment: "Dumbbells", accent: "blue", primary: "Anterior deltoids", secondary: ["Lateral deltoids", "Triceps"], sets: "3", reps: "8–12", rest: "90 sec", alternative: "Arnold press", level: "Intermediate", steps: three("Ribs down · back supported", "Press straight overhead", "Biceps beside ears") }),
  guide({ id: "lateral-raise", name: "Lateral raise", category: "Shoulders", bodyArea: "Upper body", collection: "Shoulder detail", movement: "Shoulder abduction", equipment: "Dumbbells", accent: "blue", primary: "Lateral deltoids", secondary: ["Upper trapezius"], sets: "3", reps: "12–15", rest: "60 sec", alternative: "Cable lateral raise", level: "Beginner", steps: three("Stand tall · soft elbows", "Lead with the elbows", "Lower under control") }),
  guide({ id: "face-pull", name: "Face pull", category: "Shoulders", bodyArea: "Upper body", collection: "Shoulder health", movement: "External rotation", equipment: "Cable", accent: "purple", primary: "Posterior deltoids", secondary: ["Rotator cuff", "Middle trapezius"], sets: "3", reps: "12–15", rest: "60 sec", alternative: "Rear-delt cable fly", level: "Beginner", steps: three("Cable at eye height", "Pull rope toward face", "Rotate thumbs behind") }),
  guide({ id: "rear-delt-fly", name: "Rear delt fly", category: "Shoulders", bodyArea: "Upper body", collection: "Shoulder detail", movement: "Horizontal abduction", equipment: "Dumbbells", accent: "purple", primary: "Posterior deltoids", secondary: ["Rhomboids", "Middle trapezius"], sets: "3", reps: "12–15", rest: "60 sec", alternative: "Reverse pec deck", level: "Intermediate", steps: three("Hinge with a flat back", "Sweep arms wide", "Own the lowering phase") }),

  guide({ id: "lat-pulldown", name: "Lat pulldown", category: "Back", bodyArea: "Upper body", collection: "Back width", movement: "Vertical pull", equipment: "Cable", accent: "purple", primary: "Latissimus dorsi", secondary: ["Biceps", "Lower trapezius"], sets: "4", reps: "6–10", rest: "90 sec", alternative: "Assisted pull-up", level: "Beginner", steps: three("Reach long · chest tall", "Elbows toward pockets", "Return to full stretch") }),
  guide({ id: "pull-up", name: "Strict pull-up", category: "Back", bodyArea: "Upper body", collection: "Bodyweight strength", movement: "Vertical pull", equipment: "Bodyweight", accent: "purple", primary: "Latissimus dorsi", secondary: ["Biceps", "Rhomboids"], sets: "3–4", reps: "5–10", rest: "90 sec", alternative: "Lat pulldown", level: "Advanced", caloriesPerMinute: [7, 10], steps: three("Active hang · legs still", "Drive elbows down", "Chest approaches bar") }),
  guide({ id: "barbell-row", name: "Barbell row", category: "Back", bodyArea: "Upper body", collection: "Back density", movement: "Horizontal pull", equipment: "Barbell", accent: "purple", primary: "Rhomboids", secondary: ["Latissimus dorsi", "Biceps"], sets: "3", reps: "6–10", rest: "90 sec", alternative: "Chest-supported row", level: "Advanced", steps: three("Hinge · torso fixed", "Pull toward low ribs", "Reach without rounding") }),
  guide({ id: "seated-cable-row", name: "Seated cable row", category: "Back", bodyArea: "Upper body", collection: "Back density", movement: "Horizontal pull", equipment: "Cable", accent: "purple", primary: "Middle back", secondary: ["Latissimus dorsi", "Biceps"], sets: "3", reps: "8–12", rest: "90 sec", alternative: "Machine row", level: "Beginner", steps: three("Arms long · spine neutral", "Elbows behind body", "Squeeze · return slowly") }),
  guide({ id: "chest-supported-row", name: "Chest-supported row", category: "Back", bodyArea: "Upper body", collection: "Back density", movement: "Horizontal pull", equipment: "Dumbbells", accent: "purple", primary: "Latissimus dorsi", secondary: ["Rhomboids", "Biceps"], sets: "3", reps: "8–12", rest: "75 sec", alternative: "Seated cable row", level: "Intermediate", steps: three("Chest stays on pad", "Row toward lower ribs", "Lower to a full reach") }),

  guide({ id: "rope-pushdown", name: "Rope pushdown", category: "Arms", bodyArea: "Upper body", collection: "Arm isolation", movement: "Elbow extension", equipment: "Cable", accent: "blue", primary: "Triceps", secondary: ["Forearms"], sets: "3", reps: "10–15", rest: "60 sec", alternative: "Straight-bar pushdown", level: "Beginner", steps: three("Elbows pinned to ribs", "Drive rope down", "Separate at lockout") }),
  guide({ id: "overhead-triceps-extension", name: "Overhead triceps extension", category: "Arms", bodyArea: "Upper body", collection: "Arm isolation", movement: "Elbow extension", equipment: "Dumbbells", accent: "blue", primary: "Triceps long head", secondary: ["Core"], sets: "2–3", reps: "10–15", rest: "60 sec", alternative: "Skull crusher", level: "Intermediate", steps: three("Elbows narrow · ribs down", "Lower behind the head", "Reach tall without flaring") }),
  guide({ id: "incline-dumbbell-curl", name: "Incline dumbbell curl", category: "Arms", bodyArea: "Upper body", collection: "Arm isolation", movement: "Elbow flexion", equipment: "Dumbbells", accent: "purple", primary: "Biceps brachii", secondary: ["Brachialis", "Forearms"], sets: "3", reps: "10–15", rest: "60 sec", alternative: "Preacher curl", level: "Intermediate", steps: three("Arms hang · palms forward", "Curl without drifting", "Reach full extension") }),
  guide({ id: "hammer-curl", name: "Hammer curl", category: "Arms", bodyArea: "Upper body", collection: "Arm isolation", movement: "Elbow flexion", equipment: "Dumbbells", accent: "purple", primary: "Brachialis", secondary: ["Brachioradialis", "Biceps"], sets: "3", reps: "10–15", rest: "60 sec", alternative: "Rope hammer curl", level: "Beginner", steps: three("Neutral grip · tall posture", "Thumbs travel upward", "Lower to full length") }),
  guide({ id: "preacher-curl", name: "EZ-bar preacher curl", category: "Arms", bodyArea: "Upper body", collection: "Arm isolation", movement: "Elbow flexion", equipment: "Barbell", accent: "purple", primary: "Biceps brachii", secondary: ["Brachialis", "Forearms"], sets: "3", reps: "8–12", rest: "60 sec", alternative: "Incline dumbbell curl", level: "Intermediate", steps: three("Upper arms fixed on pad", "Curl without lifting elbows", "Lower short of lockout") }),

  guide({ id: "back-squat", name: "Back squat", category: "Legs", bodyArea: "Lower body", collection: "Squat strength", movement: "Squat", equipment: "Barbell", accent: "green", primary: "Quadriceps", secondary: ["Gluteus maximus", "Core"], sets: "4", reps: "6–10", rest: "120 sec", alternative: "Front squat", level: "Advanced", caloriesPerMinute: [7, 11], steps: three("Bar secure · brace hard", "Hips between heels", "Drive through mid-foot") }),
  guide({ id: "goblet-squat", name: "Goblet squat", category: "Legs", bodyArea: "Lower body", collection: "Squat basics", movement: "Squat", equipment: "Dumbbells", accent: "green", primary: "Quadriceps", secondary: ["Gluteus maximus", "Adductors"], sets: "3", reps: "8–15", rest: "75 sec", alternative: "Bodyweight squat", level: "Beginner", caloriesPerMinute: [7, 10], steps: three("Weight tight to chest", "Sit between the hips", "Stand tall through feet") }),
  guide({ id: "leg-press", name: "Leg press", category: "Legs", bodyArea: "Lower body", collection: "Squat strength", movement: "Squat", equipment: "Machine", accent: "green", primary: "Quadriceps", secondary: ["Gluteus maximus", "Hamstrings"], sets: "3", reps: "10–12", rest: "90 sec", alternative: "Hack squat", level: "Beginner", steps: three("Back flat · feet centered", "Lower with control", "Extend without locking") }),
  guide({ id: "leg-extension", name: "Leg extension", category: "Legs", bodyArea: "Lower body", collection: "Leg isolation", movement: "Knee extension", equipment: "Machine", accent: "green", primary: "Quadriceps", secondary: [], sets: "3", reps: "12–15", rest: "60 sec", alternative: "Sissy squat", level: "Beginner", steps: three("Knees aligned with pivot", "Straighten both legs", "Pause · lower slowly") }),
  guide({ id: "walking-lunge", name: "Walking lunge", category: "Legs", bodyArea: "Lower body", collection: "Unilateral legs", movement: "Lunge", equipment: "Bodyweight", accent: "green", primary: "Quadriceps", secondary: ["Gluteus maximus", "Adductors"], sets: "3", reps: "12 / leg", rest: "60 sec", alternative: "Reverse lunge", level: "Intermediate", caloriesPerMinute: [7, 10], steps: three("Stride and plant", "Back knee toward floor", "Drive through front foot") }),
  guide({ id: "dumbbell-step-up", name: "Dumbbell step-up", category: "Legs", bodyArea: "Lower body", collection: "Unilateral legs", movement: "Step", equipment: "Dumbbells", accent: "green", primary: "Gluteus maximus", secondary: ["Quadriceps", "Calves"], sets: "3", reps: "8–12 / leg", rest: "75 sec", alternative: "Walking lunge", level: "Intermediate", caloriesPerMinute: [7, 10], steps: three("Whole foot on box", "Drive through top leg", "Stand tall without pushing off") }),
  guide({ id: "bulgarian-split-squat", name: "Bulgarian split squat", category: "Legs", bodyArea: "Lower body", collection: "Unilateral legs", movement: "Lunge", equipment: "Dumbbells", accent: "orange", primary: "Gluteus maximus", secondary: ["Quadriceps", "Adductors"], sets: "3", reps: "8–10 / leg", rest: "90 sec", alternative: "Split squat", level: "Advanced", caloriesPerMinute: [7, 11], steps: three("Rear foot supported", "Drop back knee down", "Stand through front heel") }),
  guide({ id: "standing-calf-raise", name: "Standing calf raise", category: "Legs", bodyArea: "Lower body", collection: "Leg isolation", movement: "Plantar flexion", equipment: "Machine", accent: "green", primary: "Gastrocnemius", secondary: ["Soleus"], sets: "4", reps: "12–20", rest: "60 sec", alternative: "Seated calf raise", level: "Beginner", steps: three("Heels below platform", "Push through big toes", "Pause tall · lower slowly") }),

  guide({ id: "conventional-deadlift", name: "Conventional deadlift", category: "Legs", bodyArea: "Full body", collection: "Hinge strength", movement: "Hip hinge", equipment: "Barbell", accent: "orange", primary: "Gluteus maximus", secondary: ["Hamstrings", "Spinal erectors", "Quadriceps"], sets: "3–4", reps: "3–6", rest: "150 sec", alternative: "Trap-bar deadlift", level: "Advanced", caloriesPerMinute: [8, 12], steps: three("Bar over mid-foot", "Push floor away", "Stand tall without leaning") }),
  guide({ id: "romanian-deadlift", name: "Romanian deadlift", category: "Legs", bodyArea: "Lower body", collection: "Hinge strength", movement: "Hip hinge", equipment: "Barbell", accent: "orange", primary: "Hamstrings", secondary: ["Gluteus maximus", "Spinal erectors"], sets: "4", reps: "6–10", rest: "120 sec", alternative: "Dumbbell RDL", level: "Advanced", caloriesPerMinute: [7, 10], steps: three("Bar at thighs · brace", "Hips back · bar close", "Drive hips through") }),
  guide({ id: "hip-thrust", name: "Barbell hip thrust", category: "Legs", bodyArea: "Lower body", collection: "Glute strength", movement: "Hip extension", equipment: "Barbell", accent: "orange", primary: "Gluteus maximus", secondary: ["Hamstrings", "Adductors"], sets: "3", reps: "8–12", rest: "90 sec", alternative: "Glute bridge", level: "Intermediate", steps: three("Upper back on bench", "Drive hips upward", "Tuck pelvis · squeeze") }),
  guide({ id: "seated-leg-curl", name: "Seated leg curl", category: "Legs", bodyArea: "Lower body", collection: "Leg isolation", movement: "Knee flexion", equipment: "Machine", accent: "orange", primary: "Hamstrings", secondary: ["Gastrocnemius"], sets: "3", reps: "10–15", rest: "60 sec", alternative: "Lying leg curl", level: "Beginner", steps: three("Knees aligned · hips pinned", "Curl heels beneath", "Return to full extension") }),

  guide({ id: "hanging-leg-raise", name: "Hanging leg raise", category: "Core", bodyArea: "Core", collection: "Core control", movement: "Spinal flexion", equipment: "Bodyweight", accent: "green", primary: "Rectus abdominis", secondary: ["Hip flexors", "Forearms"], sets: "3", reps: "10–15", rest: "60 sec", alternative: "Captain's chair raise", level: "Intermediate", caloriesPerMinute: [6, 9], steps: three("Active hang · legs long", "Tilt pelvis and lift", "Return without swinging") }),
  guide({ id: "plank", name: "Forearm plank", category: "Core", bodyArea: "Core", collection: "Core control", movement: "Anti-extension", equipment: "Bodyweight", accent: "green", primary: "Rectus abdominis", secondary: ["Obliques", "Gluteus maximus"], sets: "3", reps: "30–60 sec", rest: "30 sec", alternative: "Dead bug", level: "Beginner", caloriesPerMinute: [3, 5], steps: three("Elbows under shoulders", "Ribs down · glutes tight", "Hold a straight line") }),
  guide({ id: "cable-crunch", name: "Kneeling cable crunch", category: "Core", bodyArea: "Core", collection: "Core strength", movement: "Spinal flexion", equipment: "Cable", accent: "green", primary: "Rectus abdominis", secondary: ["Obliques"], sets: "3", reps: "10–15", rest: "60 sec", alternative: "Decline crunch", level: "Intermediate", steps: three("Hips fixed · rope by head", "Ribs toward pelvis", "Return without hip drive") }),
  guide({ id: "ab-wheel-rollout", name: "Ab wheel rollout", category: "Core", bodyArea: "Core", collection: "Core strength", movement: "Anti-extension", equipment: "Bodyweight", accent: "green", primary: "Rectus abdominis", secondary: ["Obliques", "Latissimus dorsi"], sets: "3", reps: "6–12", rest: "75 sec", alternative: "Stability-ball rollout", level: "Advanced", caloriesPerMinute: [5, 8], steps: three("Brace over the wheel", "Reach forward with control", "Pull back without sagging") }),
];

export const bodyAreas = ["All", "Upper body", "Lower body", "Core", "Full body"] as const;
export const categories = ["All", "Chest", "Back", "Shoulders", "Legs", "Arms", "Core"] as const;
export const equipmentOptions = ["All", "Barbell", "Dumbbells", "Cable", "Machine", "Bodyweight"] as const;
export const difficultyOptions = ["All", "Beginner", "Intermediate", "Advanced"] as const;

export const muscleGroups = [
  "All muscles", "Pectoralis major", "Latissimus dorsi", "Deltoids", "Triceps", "Biceps", "Quadriceps", "Hamstrings", "Gluteus maximus", "Calves", "Rectus abdominis", "Obliques",
] as const;

export const collections = [
  { name: "Push mechanics", accent: "blue" as const, copy: "Chest · shoulders · triceps", filter: "Chest" as ExerciseCategory },
  { name: "Back architecture", accent: "purple" as const, copy: "Lats · rhomboids · rear delts", filter: "Back" as ExerciseCategory },
  { name: "Lower-body strength", accent: "green" as const, copy: "Quads · glutes · calves", filter: "Legs" as ExerciseCategory },
  { name: "Core control", accent: "orange" as const, copy: "Flexion · bracing · anti-extension", filter: "Core" as ExerciseCategory },
];

export type Goal = "Build muscle" | "Lose fat" | "Get stronger" | "Move better";
export type TrainingSetup = "Full gym" | "Dumbbells" | "Bodyweight";

export function buildRoutine(goal: Goal, days: number, setup: TrainingSetup) {
  const allowed = exercises.filter((exercise) => {
    if (setup === "Full gym") return true;
    if (setup === "Dumbbells") return exercise.equipment === "Dumbbells" || exercise.equipment === "Bodyweight";
    return exercise.equipment === "Bodyweight";
  });
  const priority: Record<Goal, string[]> = {
    "Build muscle": ["Horizontal push", "Horizontal pull", "Squat", "Hip hinge", "Vertical push", "Vertical pull", "Elbow flexion", "Elbow extension"],
    "Lose fat": ["Squat", "Lunge", "Step", "Horizontal push", "Vertical pull", "Hip hinge", "Anti-extension"],
    "Get stronger": ["Squat", "Hip hinge", "Horizontal push", "Vertical pull", "Horizontal pull", "Vertical push"],
    "Move better": ["Squat", "Lunge", "Horizontal pull", "External rotation", "Hip extension", "Anti-extension"],
  };
  const sorted = [...allowed].sort((a, b) => priority[goal].indexOf(a.movement) - priority[goal].indexOf(b.movement));
  const used = new Set<string>();
  return Array.from({ length: days }, (_, dayIndex) => {
    const targetArea = days <= 3 ? "Full body" : dayIndex % 2 === 0 ? "Upper body" : "Lower body";
    const pool = sorted.filter((exercise) => targetArea === "Full body" || exercise.bodyArea === targetArea || exercise.bodyArea === "Core" || exercise.bodyArea === "Full body");
    const selected = [...pool.filter((exercise) => !used.has(exercise.id)), ...pool].slice(0, 5);
    selected.forEach((exercise) => used.add(exercise.id));
    return { id: `day-${dayIndex + 1}`, name: days <= 3 ? `Full body ${dayIndex + 1}` : `${targetArea} ${Math.floor(dayIndex / 2) + 1}`, exercises: selected };
  });
}
