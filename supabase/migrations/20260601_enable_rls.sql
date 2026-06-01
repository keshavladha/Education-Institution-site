-- -----------------------------------------------------------------------------
-- Supabase Migration: Enable Row Level Security & Database Policies
-- Date: 2026-06-01
-- File: supabase/migrations/20260601_enable_rls.sql
-- -----------------------------------------------------------------------------

-- 1. Enable extensions if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create helper function to check if the current user is an administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN (auth.jwt() ->> 'email') IN (
    'admin@futureinstitute.edu', 
    'principal@futureinstitute.edu'
  );
END;
$$ LANGUAGE plpgsql;

-- 3. Update students profile table to link with auth.users
-- Migrate existing student records to auth.users so that foreign key constraints do not fail
DO $$
DECLARE
  student_row record;
  has_password_col boolean;
  existing_auth_id uuid;
  profile_exists_for_auth_id boolean;
BEGIN
  -- Dynamically check if 'password' column exists in students table
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='students' AND column_name='password'
  ) INTO has_password_col;

  FOR student_row IN 
    SELECT s.id, s.email, s.full_name, s.created_at 
    FROM public.students s
    LEFT JOIN auth.users u ON s.id = u.id
    WHERE u.id IS NULL
  LOOP
    -- Check if this email is already registered in auth.users under a different ID
    SELECT id INTO existing_auth_id 
    FROM auth.users 
    WHERE email = student_row.email 
    LIMIT 1;

    IF existing_auth_id IS NOT NULL THEN
      -- Email already exists in auth.users. Resolve conflict by re-linking the profile and grades to the correct ID.
      SELECT EXISTS (
        SELECT 1 FROM public.students WHERE id = existing_auth_id
      ) INTO profile_exists_for_auth_id;

      -- Update any associated grade records to point to the correct user ID
      UPDATE public.test_marks SET student_id = existing_auth_id WHERE student_id = student_row.id;

      IF profile_exists_for_auth_id THEN
        -- A profile already exists for the correct ID. Delete the duplicate profile.
        DELETE FROM public.students WHERE id = student_row.id;
      ELSE
        -- Update the profile's primary key to point to the correct auth user ID
        UPDATE public.students SET id = existing_auth_id WHERE id = student_row.id;
      END IF;

    ELSE
      -- Email does not exist in auth.users. Proceed to register.
      DECLARE
        raw_pass text := 'defaultpassword123';
      BEGIN
        IF has_password_col THEN
          -- Retrieve the password dynamically to prevent syntax errors if the column is absent
          EXECUTE 'SELECT password FROM public.students WHERE id = $1' 
          INTO raw_pass 
          USING student_row.id;
        END IF;

        INSERT INTO auth.users (
          instance_id,
          id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          raw_app_meta_data,
          raw_user_meta_data,
          created_at,
          updated_at,
          confirmation_token,
          email_change,
          email_change_token_new,
          recovery_token
        )
        VALUES (
          '00000000-0000-0000-0000-000000000000',
          student_row.id,
          'authenticated',
          'authenticated',
          student_row.email,
          crypt(COALESCE(raw_pass, 'defaultpassword123'), gen_salt('bf')),
          COALESCE(student_row.created_at, now()),
          '{"provider":"email","providers":["email"]}',
          json_build_object('full_name', student_row.full_name),
          COALESCE(student_row.created_at, now()),
          now(),
          '',
          '',
          '',
          ''
        );
      END;
    END IF;
  END LOOP;
END $$;

-- Check and modify public.students to reference auth.users(id)
ALTER TABLE public.students 
  DROP CONSTRAINT IF EXISTS fk_students_users,
  ADD CONSTRAINT fk_students_users FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Enable Row Level Security on all tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 5. Row Level Security Policies
-- -----------------------------------------------------------------------------

-- DROP any existing policies to prevent conflicts
DROP POLICY IF EXISTS "students_policy" ON public.students;
DROP POLICY IF EXISTS "students_select" ON public.students;
DROP POLICY IF EXISTS "students_insert" ON public.students;
DROP POLICY IF EXISTS "students_update" ON public.students;
DROP POLICY IF EXISTS "students_delete" ON public.students;

DROP POLICY IF EXISTS "payments_select" ON public.payments;
DROP POLICY IF EXISTS "payments_insert" ON public.payments;
DROP POLICY IF EXISTS "payments_admin_all" ON public.payments;

DROP POLICY IF EXISTS "test_marks_select" ON public.test_marks;
DROP POLICY IF EXISTS "test_marks_admin_all" ON public.test_marks;

DROP POLICY IF EXISTS "data_insert" ON public.data;
DROP POLICY IF EXISTS "data_admin_all" ON public.data;


-- === A. Students Table Policies ===

CREATE POLICY "students_select" ON public.students
  FOR SELECT TO authenticated 
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "students_insert" ON public.students
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "students_update" ON public.students
  FOR UPDATE TO authenticated 
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "students_delete" ON public.students
  FOR DELETE TO authenticated 
  USING (public.is_admin());


-- === B. Payments Table Policies ===

-- Allow both guest checkouts and logged-in students to insert payments
CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT 
  WITH CHECK (true);

-- Allow students to read only their own payments, and admins to read all
CREATE POLICY "payments_select" ON public.payments
  FOR SELECT TO authenticated 
  USING (
    (auth.uid() = (SELECT id FROM public.students WHERE full_name = payments.student_name)) 
    OR public.is_admin()
  );

-- Full control for admins
CREATE POLICY "payments_admin_all" ON public.payments
  FOR ALL TO authenticated 
  USING (public.is_admin());


-- === C. Test Marks Table Policies ===

-- Allow students to read only their own test scores, and admins to read all
CREATE POLICY "test_marks_select" ON public.test_marks
  FOR SELECT TO authenticated 
  USING (auth.uid() = student_id OR public.is_admin());

-- Full control for admins (inserting grades, deleting grades)
CREATE POLICY "test_marks_admin_all" ON public.test_marks
  FOR ALL TO authenticated 
  USING (public.is_admin());


-- === D. Contact Form Data (data Table) Policies ===

-- Allow anyone (public/unauthenticated) to insert contact requests
CREATE POLICY "data_insert" ON public.data
  FOR INSERT 
  WITH CHECK (true);

-- Allow admins to read and manage contact request listings
CREATE POLICY "data_admin_all" ON public.data
  FOR ALL TO authenticated 
  USING (public.is_admin());


-- -----------------------------------------------------------------------------
-- 6. RPC Function for Admin-mediated student creation
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_student_user(
  student_email text,
  student_password text,
  full_name text,
  father_name text,
  phone text,
  student_class text,
  course text
) RETURNS uuid SECURITY DEFINER AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Enforce admin privilege check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only system administrators can register new student accounts.';
  END IF;

  -- 1. Insert into auth.users (Supabase Auth table)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    student_email,
    crypt(student_password, gen_salt('bf')), -- securely hash password
    now(), -- automatically confirm email
    '{"provider":"email","providers":["email"]}',
    json_build_object('full_name', full_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- 2. Insert into public.students profile table
  INSERT INTO public.students (id, full_name, email, father_name, phone, class, course, profile_complete, created_at)
  VALUES (
    new_user_id,
    full_name,
    student_email,
    father_name,
    phone,
    student_class,
    course,
    true,
    now()
  );

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;

-- Restrict function execution to authenticated users only
REVOKE EXECUTE ON FUNCTION public.create_student_user FROM public;
GRANT EXECUTE ON FUNCTION public.create_student_user TO authenticated;
