import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService, Student } from '../../services/supabase.service';
import { RouterLink } from '@angular/router';

export interface TestMark {
  id: string;
  student_id: string;
  subject: string;
  test_name: string;
  max_marks: number;
  obtained_marks: number;
  percentage: number;
  grade: string;
  test_date: string;
}

export interface FeeSummary {
  totalFees: number;
  paid: number;
  due: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {
  private supabase = inject(SupabaseService);

  student: Student | null = null;
  payments: any[] = [];
  isLoading = true;

  // Tab state
  activeTab: 'marks' | 'fees' = 'marks';

  // Test marks
  marks: TestMark[] = [];
  isLoadingMarks = false;

  // Fee summary
  feeSummary: FeeSummary = {
    totalFees: 25000, // Default total fee amount
    paid: 0,
    due: 25000
  };

  async ngOnInit() {
    this.student = this.supabase.student;

    if (this.student?.full_name) {
      try {
        this.payments = await this.supabase.getPaymentsForStudent(this.student.full_name);
        this.calculateFeeSummary();
      } catch (e) {
        console.error('Error fetching payments', e);
      }
    }

    // Load test marks
    await this.loadMarks();

    this.isLoading = false;
  }

  async loadMarks() {
    this.isLoadingMarks = true;
    let dbMarks: any[] = [];
    try {
      const { data, error } = await this.supabase.client
        .from('test_marks')
        .select('*')
        .eq('student_id', this.student?.id)
        .order('test_date', { ascending: false });

      if (error) throw error;
      dbMarks = data || [];
    } catch (e: any) {
      console.warn('⚠️ Could not fetch grades from Supabase, loading from local storage fallback:', e.message);
    }

    // Fetch and merge local storage mock grades
    const localMarks = JSON.parse(localStorage.getItem('local_test_marks') || '[]');
    const filteredLocal = localMarks.filter((m: any) => m.student_id === this.student?.id);

    this.marks = [...filteredLocal, ...dbMarks].sort((a: any, b: any) => 
      new Date(b.test_date).getTime() - new Date(a.test_date).getTime()
    );
    this.isLoadingMarks = false;
  }

  calculateFeeSummary() {
    const totalPaid = this.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    this.feeSummary.paid = totalPaid;
    this.feeSummary.due = Math.max(0, this.feeSummary.totalFees - totalPaid);
  }

  printMarksheet() {
    window.print();
  }
}
