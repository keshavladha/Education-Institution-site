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

  /** Register a new student — inserts directly into the students table and saves session (used for student self-signup) */
  async signUp(fullName: string, email: string, password: string): Promise<Student> {
    // Check if email already exists
    const { data: existing } = await this.supabase
      .from('students')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing) {
      throw new Error('This email is already registered. Please login instead.');
    }

    const { data, error } = await this.supabase
      .from('students')
      .insert([{
        full_name: fullName,
        email: email.toLowerCase(),
        password: password
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);

    this.saveSession(data as Student);
    return data as Student;
  }

  /** Admin-specific student creation: inserts a new student with complete details WITHOUT modifying the logged-in Admin session */
  async createStudentByAdmin(
    fullName: string, 
    email: string, 
    password: string, 
    fatherName: string, 
    phone: string, 
    studentClass: string, 
    course: string
  ): Promise<any> {
    // Check if email already exists
    const { data: existing } = await this.supabase
      .from('students')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing) {
      throw new Error('This email is already registered.');
    }

    const { data, error } = await this.supabase
      .from('students')
      .insert([{
        full_name: fullName,
        email: email.toLowerCase(),
        password: password,
        father_name: fatherName,
        phone: phone,
        class: studentClass,
        course: course,
        profile_complete: true // Set to true since admin provided all details
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /** Login — looks up student by email + password */
  async signIn(email: string, password: string): Promise<Student> {
    const { data, error } = await this.supabase
      .from('students')
      .select('id, full_name, email, father_name, phone, class, course, profile_complete, created_at')
      .eq('email', email.toLowerCase())
      .eq('password', password)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Invalid email or password. Please try again.');

    this.saveSession(data as Student);
    return data as Student;
  }

  /** Logout — clear local session */
  signOut(): void {
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
