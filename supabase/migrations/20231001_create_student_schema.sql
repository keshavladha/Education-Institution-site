-- -------------------------------------------------
-- 1️⃣  Create the `students` table (profile info)
-- -------------------------------------------------
create table if not exists public.students (
  id          uuid primary key default uuid_generate_v4(),
  full_name   text    not null,
  email       text    not null unique,
  created_at  timestamptz default now()
);

-- Enable Row‑Level Security on the table
alter table public.students enable row level security;

-- -------------------------------------------------
-- 2️⃣  RLS policies for the `students` table
-- -------------------------------------------------
-- Allow a logged‑in user to read only their own row
create policy "students_self_read"
  on public.students
  for select
  using (auth.uid() = id);

-- Allow a logged‑in user to update only their own row
create policy "students_self_update"
  on public.students
  for update
  using (auth.uid() = id);

-- (Optional) Allow a logged‑in user to insert a new profile row
create policy "students_self_insert"
  on public.students
  for insert
  with check (auth.uid() = id);


-- -------------------------------------------------
-- 3️⃣  Create the `payments` table (used by the dashboard)
-- -------------------------------------------------
create table if not exists public.payments (
  id            uuid primary key default uuid_generate_v4(),
  student_name  text    not null,
  class         text    not null,
  father_name   text    not null,
  course        text    not null,
  amount        numeric not null,
  created_at    timestamptz default now()
);

alter table public.payments enable row level security;

-- -------------------------------------------------
-- 4️⃣  RLS policy for the `payments` table
-- -------------------------------------------------
-- A student can read only payments that belong to them
create policy "payments_self_read"
  on public.payments
  for select
  using (
    auth.uid() = (
      select id
      from public.students
      where full_name = payments.student_name
    )
  );

-- (Optional) Allow a student to insert their own payment record
create policy "payments_self_insert"
  on public.payments
  for insert
  with check (
    auth.uid() = (
      select id
      from public.students
      where full_name = payments.student_name
    )
  );


-- -------------------------------------------------
-- 5️⃣  Helper: make the `uuid-ossp` extension available
-- -------------------------------------------------
create extension if not exists "uuid-ossp";
