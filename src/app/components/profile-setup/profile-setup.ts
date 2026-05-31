import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile-setup',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './profile-setup.html',
  styleUrls: ['./profile-setup.css']
})
export class ProfileSetup {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  subjects = [
    { name: 'Accountancy', selected: false },
    { name: 'Economics', selected: false },
    { name: 'Business Studies', selected: false },
    { name: 'Mathematics', selected: false }
  ];

  profileForm = this.fb.group({
    fatherName:  ['', Validators.required],
    phone:       ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
    studentClass: ['', Validators.required]
  });

  errorMessage = '';
  isLoading = false;

  get student() {
    return this.supabase.student;
  }

  get selectedCount(): number {
    return this.subjects.filter(s => s.selected).length;
  }

  toggleSubject(index: number) {
    this.subjects[index].selected = !this.subjects[index].selected;
  }

  async onSubmit() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    if (this.selectedCount === 0) {
      this.errorMessage = 'Please select at least one subject.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { fatherName, phone, studentClass } = this.profileForm.value;
    const student = this.supabase.student;
    const selectedSubjects = this.subjects.filter(s => s.selected).map(s => s.name).join(', ');

    if (!student) {
      this.router.navigate(['/login']);
      return;
    }

    try {
      await this.supabase.updateStudentProfile(student.id, {
        father_name: fatherName!,
        phone: phone!,
        class: studentClass!,
        course: selectedSubjects
      });

      this.router.navigate(['/dashboard']);
    } catch (e: any) {
      this.errorMessage = e.message || 'Failed to save profile. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  isInvalid(field: string): boolean {
    const c = this.profileForm.get(field);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }
}
