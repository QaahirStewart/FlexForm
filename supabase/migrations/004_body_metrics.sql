alter table public.profiles
  add column if not exists height_cm numeric(5,2) check (height_cm between 100 and 250),
  add column if not exists weight_kg numeric(5,2) check (weight_kg between 30 and 300),
  add column if not exists bmi numeric(4,1) check (bmi between 10 and 80);
