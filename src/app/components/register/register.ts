import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  registerForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  errorMessage: string = '';
  isLoading: boolean = false;

  async onSubmit() {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const { name, email, password } = this.registerForm.value;

    try {
      await this.supabase.signUp(name!, email!, password!);
      this.router.navigate(['/profile-setup']); // ➜ collect student details next
    } catch (e: any) {
      this.errorMessage = e.message || 'Registration failed. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }
}
