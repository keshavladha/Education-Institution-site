import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-add-student',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './admin-add-student.html',
  styleUrls: ['./admin-add-student.css']
})
export class AdminAddStudent {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  subjects = [
    { name: 'Accountancy', selected: false },
    { name: 'Economics', selected: false },
    { name: 'Business Studies', selected: false },
    { name: 'Mathematics', selected: false }
  ];

  studentForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    father_name: ['', Validators.required],
    phone: ['', Validators.required],
    class: ['', Validators.required]
  });

  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  get selectedCount(): number {
    return this.subjects.filter(s => s.selected).length;
  }

  toggleSubject(index: number) {
    this.subjects[index].selected = !this.subjects[index].selected;
  }

  async onSubmit() {
    if (this.studentForm.invalid) return;

    if (this.selectedCount === 0) {
      this.errorMessage = 'Please select at least one subject.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { name, email, password, father_name, phone, class: studentClass } = this.studentForm.value;
    const selectedSubjects = this.subjects.filter(s => s.selected).map(s => s.name).join(', ');

    try {
      await this.supabase.createStudentByAdmin(
        name!,
        email!,
        password!,
        father_name!,
        phone!,
        studentClass!,
        selectedSubjects
      );

      this.successMessage = `Student account created successfully!\nEmail: ${email}\nPassword: ${password}`;
      
      this.studentForm.reset();
      this.subjects.forEach(s => s.selected = false);
    } catch (e: any) {
      this.errorMessage = e.message || 'Failed to create student account. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  goBack() {
    this.router.navigate(['/admin']);
  }
}
