import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService, ADMIN_EMAILS } from '../../services/supabase.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  errorMessage: string = '';
  isLoading: boolean = false;

  async onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const email = this.loginForm.value.email?.toLowerCase() || '';
    const password = this.loginForm.value.password || '';

    if (ADMIN_EMAILS.includes(email)) {
      this.errorMessage = 'Admin logins are not allowed here. Please use the dedicated Admin Portal.';
      this.isLoading = false;
      return;
    }

    try {
      await this.supabase.signIn(email, password);
      this.router.navigate(['/dashboard']);
    } catch (e: any) {
      this.errorMessage = e.message || 'Login failed. Please check your credentials.';
    } finally {
      this.isLoading = false;
    }
  }
}
