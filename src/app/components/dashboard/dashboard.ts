import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
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

export interface Announcement {
  id: string;
  title: string;
  description: string;
  date: string;
  tag: string;
  tagClass: 'exam' | 'resources' | 'event';
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
  private cdr = inject(ChangeDetectorRef);

  student: Student | null = null;
  payments: any[] = [];
  isLoading = true;

  // Tab state
  activeTab: 'marks' | 'fees' = 'marks';

  // Live Announcements
  announcements: Announcement[] = [
    {
      id: '1',
      title: 'CBSE Class 12 Accountancy Mock Test',
      description: 'Full-syllabus mock test scheduled for this Sunday. Attendance is mandatory for performance benchmarking.',
      date: '02 Jun 2026',
      tag: 'Exam',
      tagClass: 'exam'
    },
    {
      id: '2',
      title: 'Economics Revision Notes Uploaded',
      description: 'Chapter 3 detailed revision notes and graphical analysis cheatsheets have been uploaded under resources.',
      date: '30 May 2026',
      tag: 'Resources',
      tagClass: 'resources'
    },
    {
      id: '3',
      title: 'CA Career Guest Lecture',
      description: 'Interactive career guidance webinar by CA Vikram Patel scheduled next Friday at 4:00 PM.',
      date: '28 May 2026',
      tag: 'Event',
      tagClass: 'event'
    }
  ];

  // Test marks
  marks: TestMark[] = [];
  isLoadingMarks = false;

  // Interactive Grade Chart State
  selectedSubject = 'All';
  hoveredMark: TestMark | null = null;
  hoveredMarkIndex: number | null = null;

  get subjects(): string[] {
    const subs = this.marks.map(m => m.subject);
    return ['All', ...Array.from(new Set(subs))];
  }

  get filteredMarks(): TestMark[] {
    if (this.selectedSubject === 'All') {
      return this.marks;
    }
    return this.marks.filter(m => m.subject === this.selectedSubject);
  }

  get chronologicalMarks(): TestMark[] {
    return [...this.filteredMarks].sort((a, b) => 
      new Date(a.test_date).getTime() - new Date(b.test_date).getTime()
    );
  }

  get svgPoints(): string {
    const pts = this.chronologicalMarks;
    if (pts.length === 0) return '';
    return pts.map((m, i) => {
      const x = 45 + (pts.length > 1 ? (i / (pts.length - 1)) * 415 : 207.5);
      const y = 120 - (m.percentage / 100) * 90;
      return `${x},${y}`;
    }).join(' ');
  }

  get svgAreaPoints(): string {
    const pts = this.chronologicalMarks;
    if (pts.length === 0) return '';
    const pointsStr = this.svgPoints;
    const startX = 45;
    const endX = 45 + (pts.length > 1 ? (pts.length - 1) * (415 / (pts.length - 1)) : 207.5);
    return `${startX},130 ${pointsStr} ${endX},130`;
  }

  get chartDots() {
    const pts = this.chronologicalMarks;
    return pts.map((m, i) => {
      const x = 45 + (pts.length > 1 ? (i / (pts.length - 1)) * 415 : 207.5);
      const y = 120 - (m.percentage / 100) * 90;
      return { x, y, mark: m, index: i };
    });
  }

  // Fee summary
  feeSummary: FeeSummary = {
    totalFees: 25000, // Default total fee amount
    paid: 0,
    due: 25000
  };

  ngOnInit() {
    this.supabase.student$.subscribe(async student => {
      this.student = student;
      if (student) {
        this.isLoading = true;
        if (student.full_name) {
          try {
            this.payments = await this.supabase.getPaymentsForStudent(student.full_name);
            this.calculateFeeSummary();
          } catch (e) {
            console.error('Error fetching payments', e);
          }
        }
        await this.loadMarks();
        this.isLoading = false;
        this.cdr.detectChanges(); // Force UI update on async load
      }
    });
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

    const merged = [...filteredLocal, ...dbMarks];
    const uniqueMarksMap = new Map();
    merged.forEach((item: any) => {
      const key = `${item.student_id}_${item.subject}_${item.test_name}_${item.test_date}`;
      if (uniqueMarksMap.has(key)) {
        const existing = uniqueMarksMap.get(key);
        if (existing.id.startsWith('MOCK-') && !item.id.startsWith('MOCK-')) {
          uniqueMarksMap.set(key, item);
        }
      } else {
        uniqueMarksMap.set(key, item);
      }
    });

    this.marks = Array.from(uniqueMarksMap.values()).sort((a: any, b: any) => 
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
