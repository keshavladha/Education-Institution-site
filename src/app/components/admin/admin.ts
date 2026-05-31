import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService, Student } from '../../services/supabase.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css']
})
export class Admin implements OnInit {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  students: Student[] = [];
  isLoading = false;
  errorMessage = '';

  searchQuery: string = '';
  classFilter: string = '';
  statusFilter: string = '';

  // Management Hub Overlay State
  selectedStudent: Student | null = null;
  showManageHub = false;
  hubTab: 'profile' | 'grades' | 'fees' = 'profile';
  isHubActionLoading = false;

  // Student details cache
  studentMarks: any[] = [];
  studentPayments: any[] = [];

  // Form states for adding grade
  newMarkSubject = '';
  newMarkTestName = '';
  newMarkMax = 100;
  newMarkObtained = 0;
  isAbsent = false;
  newMarkDate = new Date().toISOString().substring(0, 10);

  // Form states for adding payment
  newPaymentAmount = 1000;
  newPaymentCourse = '';

  ngOnInit() {
    this.loadStudents();
  }

  async loadStudents() {
    console.log('⏳ [Admin] loadStudents() triggered.');
    this.isLoading = true;
    this.errorMessage = '';
    try {
      console.log('🛰️ [Admin] Fetching students from Supabase...');
      const { data, error } = await this.supabase.client
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [Admin] Supabase select error:', error);
        throw error;
      }
      console.log('✅ [Admin] Fetch success. Count:', data ? data.length : 0, data);
      
      // Filter out admin accounts from the students management list
      const adminEmails = ['admin@futureinstitute.edu', 'principal@futureinstitute.edu'];
      this.students = (data || []).filter(student => student && !adminEmails.includes(student.email));
    } catch (e: any) {
      console.error('💥 [Admin] Fatal error in loadStudents:', e);
      this.errorMessage = 'Failed to load students: ' + (e.message || e);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges(); // Force UI re-rendering
      console.log('🏁 [Admin] loadStudents() completed. isLoading =', this.isLoading);
    }
  }

  get filteredStudents(): Student[] {
    if (!this.students) return [];
    try {
      return this.students.filter(student => {
        if (!student) return false;
        // Search filter
        const matchesSearch = !this.searchQuery ? true : (
          (student.full_name && student.full_name.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
          (student.email && student.email.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
          (student.father_name && student.father_name.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
          (student.phone && student.phone.toLowerCase().includes(this.searchQuery.toLowerCase()))
        );

        // Class filter
        const matchesClass = !this.classFilter ? true : (student.class === this.classFilter);

        // Status filter
        const matchesStatus = !this.statusFilter ? true : (
          this.statusFilter === 'complete' ? !!student.profile_complete : !student.profile_complete
        );

        return !!(matchesSearch && matchesClass && matchesStatus);
      });
    } catch (err: any) {
      console.error('💥 [Admin] Error in filteredStudents getter:', err);
      return [];
    }
  }

  clearFilters() {
    this.searchQuery = '';
    this.classFilter = '';
    this.statusFilter = '';
  }

  navigateToAddStudent() {
    this.router.navigate(['/admin/add-student']);
  }

  // ─── Student Hub management operations ───
  async openManageHub(student: Student) {
    // Create a local deep copy of student to edit without mutating the table row immediately
    this.selectedStudent = { ...student };
    this.showManageHub = true;
    this.hubTab = 'profile';
    this.errorMessage = '';
    
    // Default form states
    this.newPaymentCourse = student.course || '';
    
    // Fetch details
    await Promise.all([
      this.loadStudentGrades(),
      this.loadStudentPayments()
    ]);
  }

  closeManageHub() {
    this.showManageHub = false;
    this.selectedStudent = null;
    this.studentMarks = [];
    this.studentPayments = [];
  }

  async loadStudentGrades() {
    if (!this.selectedStudent) return;
    console.log('📚 Loading grades for student:', this.selectedStudent.id);
    try {
      const { data, error } = await this.supabase.client
        .from('test_marks')
        .select('*')
        .eq('student_id', this.selectedStudent.id)
        .order('test_date', { ascending: false });
      
      if (error) throw error;
      
      // Load and merge local test marks
      const localData = localStorage.getItem('local_test_marks');
      console.log('📦 Raw localStorage data:', localData);
      const localMarks = JSON.parse(localData || '[]');
      console.log('📊 Parsed local marks count:', localMarks.length);
      const filteredLocal = localMarks.filter((m: any) => m.student_id === this.selectedStudent?.id);
      console.log('🔍 Filtered local marks for this student:', filteredLocal.length);
      
      const merged = [...filteredLocal, ...(data || [])];
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

      this.studentMarks = Array.from(uniqueMarksMap.values()).sort((a: any, b: any) => 
        new Date(b.test_date).getTime() - new Date(a.test_date).getTime()
      );
      console.log('✅ Final studentMarks array:', this.studentMarks);
    } catch (e: any) {
      console.warn('⚠️ Failed to load grades from Supabase, pulling from local storage fallback:', e.message);
      const localData = localStorage.getItem('local_test_marks');
      const localMarks = JSON.parse(localData || '[]');
      console.log('📦 Fallback - localStorage data:', localData, 'parsed:', localMarks);
      
      const filteredLocal = localMarks.filter((m: any) => m.student_id === this.selectedStudent?.id);
      const uniqueMarksMap = new Map();
      filteredLocal.forEach((item: any) => {
        const key = `${item.student_id}_${item.subject}_${item.test_name}_${item.test_date}`;
        uniqueMarksMap.set(key, item);
      });

      this.studentMarks = Array.from(uniqueMarksMap.values()).sort((a: any, b: any) => 
        new Date(b.test_date).getTime() - new Date(a.test_date).getTime()
      );
      console.log('📊 Fallback - filtered marks:', this.studentMarks);
    }
  }

  async loadStudentPayments() {
    if (!this.selectedStudent?.full_name) return;
    try {
      this.studentPayments = await this.supabase.getPaymentsForStudent(this.selectedStudent.full_name);
    } catch (e: any) {
      console.error('Failed to load payments:', e.message);
    }
  }

  async saveStudentProfile() {
    if (!this.selectedStudent) return;
    this.isHubActionLoading = true;
    this.errorMessage = '';
    try {
      const { error } = await this.supabase.client
        .from('students')
        .update({
          full_name: this.selectedStudent.full_name,
          father_name: this.selectedStudent.father_name,
          class: this.selectedStudent.class,
          course: this.selectedStudent.course,
          phone: this.selectedStudent.phone,
          profile_complete: this.selectedStudent.profile_complete
        })
        .eq('id', this.selectedStudent.id);

      if (error) throw error;
      
      // Update local students array
      const idx = this.students.findIndex(s => s.id === this.selectedStudent?.id);
      if (idx !== -1) {
        this.students[idx] = { ...this.selectedStudent };
      }

      alert('Profile updated successfully!');
    } catch (e: any) {
      this.errorMessage = 'Failed to update profile: ' + e.message;
    } finally {
      this.isHubActionLoading = false;
    }
  }

  async deleteStudent() {
    if (!this.selectedStudent) return;
    if (!confirm(`Are you absolutely sure you want to delete ${this.selectedStudent.full_name}? This will wipe their profile record. This action is irreversible.`)) return;

    this.isHubActionLoading = true;
    this.errorMessage = '';
    try {
      const { error } = await this.supabase.client
        .from('students')
        .delete()
        .eq('id', this.selectedStudent.id);

      if (error) throw error;

      // Remove from local list
      this.students = this.students.filter(s => s.id !== this.selectedStudent?.id);
      alert('Student record deleted successfully.');
      this.closeManageHub();
    } catch (e: any) {
      this.errorMessage = 'Failed to delete student: ' + e.message;
    } finally {
      this.isHubActionLoading = false;
    }
  }

  async addTestMark() {
    if (!this.selectedStudent) return;
    if (this.isHubActionLoading) return; // Prevent double-submit
    if (!this.newMarkSubject || !this.newMarkTestName || this.newMarkMax <= 0 || (!this.isAbsent && this.newMarkObtained < 0)) {
      alert('Please fill out all grade fields correctly.');
      return;
    }

    // Check if localStorage is available (might be disabled in some browsers)
    let localStorageAvailable = false;
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      localStorageAvailable = true;
    } catch (e) {
      console.error('localStorage not available:', e);
    }

    this.isHubActionLoading = true;
    try {
      let obtained = this.isAbsent ? 0 : this.newMarkObtained;
      let percentage = parseFloat(((obtained / this.newMarkMax) * 100).toFixed(1));
      
      let grade = 'F';
      if (this.isAbsent) {
        grade = 'AB';
        percentage = 0;
        obtained = 0;
      } else {
        if (percentage >= 90) grade = 'A+';
        else if (percentage >= 80) grade = 'A';
        else if (percentage >= 70) grade = 'B';
        else if (percentage >= 60) grade = 'C';
        else if (percentage >= 50) grade = 'D';
        else if (percentage >= 33) grade = 'E';
      }

      // Create the mark object once
      const newMark = {
        id: 'MOCK-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        student_id: this.selectedStudent.id,
        subject: this.newMarkSubject,
        test_name: this.newMarkTestName,
        max_marks: this.newMarkMax,
        obtained_marks: obtained,
        percentage: percentage,
        grade: grade,
        test_date: this.newMarkDate,
        created_at: new Date().toISOString()
      };

      // Try Supabase first
      try {
        const { data, error } = await this.supabase.client
          .from('test_marks')
          .insert([{
            student_id: this.selectedStudent.id,
            subject: this.newMarkSubject,
            test_name: this.newMarkTestName,
            max_marks: this.newMarkMax,
            obtained_marks: obtained,
            percentage: percentage,
            grade: grade,
            test_date: this.newMarkDate
          }])
          .select();

        if (error) throw error;
        // If Supabase succeeds, use the returned ID
        if (data && data[0]) {
          newMark.id = data[0].id;
        }
      } catch (dbErr: any) {
        console.warn('⚠️ Supabase grade insert failed, using local storage fallback:', dbErr.message);
      }

      // Always save to localStorage as backup
      try {
        const existingData = localStorage.getItem('local_test_marks');
        const localMarks = JSON.parse(existingData || '[]');
        localMarks.push(newMark); // Use the same object
        localStorage.setItem('local_test_marks', JSON.stringify(localMarks));
        console.log('✅ Saved to localStorage:', newMark);
      } catch (storageErr: any) {
        console.error('💥 localStorage error:', storageErr);
      }

      // Add to UI array (same object used everywhere)
      this.studentMarks = [newMark, ...this.studentMarks].sort((a: any, b: any) => 
        new Date(b.test_date).getTime() - new Date(a.test_date).getTime()
      );
      
      // Reset form
      this.newMarkSubject = '';
      this.newMarkTestName = '';
      this.newMarkObtained = 0;
      this.isAbsent = false;
      
      // Force immediate UI update
      this.cdr.detectChanges();
      
      // Show success feedback
      alert('Grade saved successfully!');
    } catch (e: any) {
      console.error('Failed to save grade:', e);
      alert('Failed to save grade: ' + e.message);
    } finally {
      this.isHubActionLoading = false;
    }
  }

  async deleteTestMark(markId: string) {
    if (!confirm('Delete this test grade record?')) return;
    try {
      // Immediately update UI - remove from local array first
      this.studentMarks = this.studentMarks.filter((m: any) => m.id !== markId);
      this.cdr.detectChanges(); // Force immediate UI update
      
      // Then handle storage deletion
      if (markId.startsWith('MOCK-')) {
        // Delete from local storage
        const localMarks = JSON.parse(localStorage.getItem('local_test_marks') || '[]');
        const updated = localMarks.filter((m: any) => m.id !== markId);
        localStorage.setItem('local_test_marks', JSON.stringify(updated));
        console.log('✅ Deleted from localStorage:', markId);
      } else {
        const { error } = await this.supabase.client
          .from('test_marks')
          .delete()
          .eq('id', markId);
        if (error) throw error;
      }
    } catch (e: any) {
      console.error('Failed to delete grade:', e);
      alert('Failed to delete grade: ' + e.message);
      // Reload on error to restore correct state
      await this.loadStudentGrades();
      this.cdr.detectChanges();
    }
  }

  async addPayment() {
    if (!this.selectedStudent) return;
    if (this.newPaymentAmount <= 0 || !this.newPaymentCourse) {
      alert('Please enter a valid amount and course.');
      return;
    }

    this.isHubActionLoading = true;
    try {
      await this.supabase.insertPayment(
        this.selectedStudent.full_name || 'Anonymous',
        this.selectedStudent.class || 'N/A',
        this.selectedStudent.father_name || 'N/A',
        this.newPaymentCourse,
        this.newPaymentAmount
      );

      // Refresh payments
      await this.loadStudentPayments();
      this.newPaymentAmount = 1000;
    } catch (e: any) {
      alert('Failed to add fee record: ' + e.message);
    } finally {
      this.isHubActionLoading = false;
    }
  }

  async deletePayment(payId: string) {
    if (!confirm('Are you sure you want to remove this fee payment record?')) return;
    try {
      const { error } = await this.supabase.client
        .from('payments')
        .delete()
        .eq('id', payId);
      if (error) throw error;
      await this.loadStudentPayments();
    } catch (e: any) {
      alert('Failed to delete payment record: ' + e.message);
    }
  }
}
