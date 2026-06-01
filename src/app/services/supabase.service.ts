import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Student {
  id: string;
  full_name: string;
  email: string;
  father_name?: string;
  phone?: string;
  class?: string;
  course?: string;
  profile_complete?: boolean;
  created_at: string;
}

export const ADMIN_EMAILS = [
  'admin@futureinstitute.edu',
  'principal@futureinstitute.edu'
];

const SESSION_KEY = 'fic_student_session';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  // Expose supabase client for advanced queries (admin use)
  get client(): SupabaseClient {
    return this.supabase;
  }

  // In-memory reactive student state
  private currentStudent = new BehaviorSubject<Student | null>(this.loadSessionFromStorage());

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

    // Listen to Supabase Auth state changes reactively
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 [Supabase] Auth state change event:', event, session);
      if (session?.user) {
        // Fetch or load profile from students table
        const profile = await this.fetchStudentProfile(session.user.id);
        if (profile) {
          this.saveSession(profile);
        } else {
          // Fallback placeholder profile during registration or when database record is pending
          const placeholder: Student = {
            id: session.user.id,
            full_name: session.user.user_metadata?.['full_name'] || 'Student',
            email: session.user.email || '',
            profile_complete: false,
            created_at: new Date().toISOString()
          };
          this.saveSession(placeholder);
        }
      } else {
        this.clearSession();
      }
    });
  }

  /** Helper: fetch student profile from students table */
  async fetchStudentProfile(id: string): Promise<Student | null> {
    try {
      const { data, error } = await this.supabase
        .from('students')
        .select('id, full_name, email, father_name, phone, class, course, profile_complete, created_at')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Student | null;
    } catch (e: any) {
      console.warn('⚠️ fetchStudentProfile failed:', e.message);
      return null;
    }
  }

  // ─── Observables ──────────────────────────────────────────────
  get student$(): Observable<Student | null> {
    return this.currentStudent.asObservable();
  }

  get student(): Student | null {
    return this.currentStudent.value;
  }

  get isLoggedIn(): boolean {
    return !!this.currentStudent.value;
  }

  // ─── Session Helpers ──────────────────────────────────────────
  private loadSessionFromStorage(): Student | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private saveSession(student: Student): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(student));
    this.currentStudent.next(student);
  }

  private clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
    this.currentStudent.next(null);
  }

  // ─── Auth Methods ─────────────────────────────────────────────

  /** Register a new student — registers via Supabase Auth and inserts their profile details */
  async signUp(fullName: string, email: string, password: string): Promise<Student> {
    // 1. Sign up via Supabase Auth
    const { data: authData, error: authError } = await this.supabase.auth.signUp({
      email: email.toLowerCase(),
      password: password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error('Signup failed. Please try again.');

    // 2. Insert into the public.students profile table (links primary key to auth.users.id)
    const { data, error } = await this.supabase
      .from('students')
      .insert([{
        id: authData.user.id,
        full_name: fullName,
        email: email.toLowerCase(),
        profile_complete: false
      }])
      .select()
      .single();

    if (error) {
      console.error('Error inserting student profile:', error);
      throw new Error('User created but profile setup failed: ' + error.message);
    }

    const studentProfile = data as Student;
    this.saveSession(studentProfile);
    return studentProfile;
  }

  /** Admin-specific student creation: inserts a new student with complete details using a secure PostgreSQL RPC function */
  async createStudentByAdmin(
    fullName: string, 
    email: string, 
    password: string, 
    fatherName: string, 
    phone: string, 
    studentClass: string, 
    course: string
  ): Promise<any> {
    const { data, error } = await this.supabase.rpc('create_student_user', {
      student_email: email.toLowerCase(),
      student_password: password,
      full_name: fullName,
      father_name: fatherName,
      phone: phone,
      student_class: studentClass,
      course: course
    });

    if (error) throw new Error(error.message);
    return data;
  }

  /** Login — signs in via Supabase Auth */
  async signIn(email: string, password: string): Promise<Student> {
    const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password: password
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error('Sign in failed. No user found.');

    // Fetch the profile associated with this user id
    const profile = await this.fetchStudentProfile(authData.user.id);
    if (!profile) {
      // Recreate a placeholder session if profile not found
      const placeholder: Student = {
        id: authData.user.id,
        full_name: authData.user.user_metadata?.['full_name'] || 'Student',
        email: authData.user.email || '',
        profile_complete: false,
        created_at: new Date().toISOString()
      };
      this.saveSession(placeholder);
      return placeholder;
    }

    this.saveSession(profile);
    return profile;
  }

  /** Logout — clear session in auth and state */
  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
    this.clearSession();
  }

  /** Update student profile after registration */
  async updateStudentProfile(
    id: string,
    profile: { father_name: string; phone: string; class: string; course: string }
  ): Promise<void> {
    const { data, error } = await this.supabase
      .from('students')
      .update({ ...profile, profile_complete: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Refresh the localStorage session with updated data
    if (data) this.saveSession(data as Student);
  }

  // ─── Contact Form ─────────────────────────────────────────────
  async insertContact(name: string, fname: string, email: string, phone: string, subject: string, message: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('data')
        .insert([{ name, fname, email, phone, subject, message }]);
      if (error) throw error;
      return data;
    } catch (e: any) {
      console.warn('⚠️ Supabase insertContact failed, falling back to local storage:', e.message);
      const localContacts = JSON.parse(localStorage.getItem('contact_submissions') || '[]');
      localContacts.push({ name, fname, email, phone, subject, message, date: new Date().toISOString() });
      localStorage.setItem('contact_submissions', JSON.stringify(localContacts));
      return { success: true, mocked: true };
    }
  }

  // ─── Payments ─────────────────────────────────────────────────
  async insertPayment(studentName: string, studentClass: string, fatherName: string, course: string, amount: number): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('payments')
        .insert([{
          student_name: studentName,
          class: studentClass,
          father_name: fatherName,
          course: course,
          amount: amount
        }]);
      if (error) throw error;
      return data;
    } catch (e: any) {
      console.warn('⚠️ Supabase insertPayment failed, falling back to local storage:', e.message);
      const localPayments = JSON.parse(localStorage.getItem('payments') || '[]');
      const newPayment = {
        student_name: studentName,
        class: studentClass,
        father_name: fatherName,
        course: course,
        amount: amount,
        created_at: new Date().toISOString()
      };
      localPayments.push(newPayment);
      localStorage.setItem('payments', JSON.stringify(localPayments));
      return { success: true, mocked: true };
    }
  }

  async getPaymentsForStudent(studentName: string): Promise<any[]> {
    let dbPayments: any[] = [];
    try {
      const { data, error } = await this.supabase
        .from('payments')
        .select('*')
        .ilike('student_name', studentName)
        .order('created_at', { ascending: false });

      if (error) throw error;
      dbPayments = data || [];
    } catch (e) {
      console.warn('⚠️ Could not load payments from Supabase, relying on local storage fallback.');
    }

    // Load and merge local storage mock payments
    const localPayments = JSON.parse(localStorage.getItem('payments') || '[]');
    const filteredLocal = localPayments.filter((p: any) => p.student_name?.toLowerCase() === studentName.toLowerCase());

    return [...filteredLocal, ...dbPayments].sort((a: any, b: any) => 
      new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime()
    );
  }
}
