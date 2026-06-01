import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { EmailService } from '../../services/email.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  contactForm!: FormGroup;
  isLoading = false;
  
  // Dynamic Alert Config
  alertMessage = '';
  alertType: 'success' | 'danger' | 'warning' | '' = '';

  constructor(
    private fb: FormBuilder,
    private supabaseService: SupabaseService,
    private emailService: EmailService
  ) {}

  ngOnInit(): void {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required]],
      fname: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      subject: ['', [Validators.required]],
      message: ['', [Validators.required]]
    });
  }

  // Field verification helpers
  isInvalid(fieldName: string): boolean {
    const control = this.contactForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  async onSubmit(): Promise<void> {
    this.alertMessage = '';
    this.alertType = '';

    if (this.contactForm.invalid) {
      this.alertType = 'warning';
      this.alertMessage = 'Please fill out all required fields correctly before submitting.';
      // Mark all controls as touched to display errors
      Object.keys(this.contactForm.controls).forEach(key => {
        const control = this.contactForm.get(key);
        if (control) control.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    const { name, fname, email, phone, subject, message } = this.contactForm.value;

    try {
      await this.supabaseService.insertContact(name, fname, email, phone, subject, message);
      this.alertType = 'success';
      this.alertMessage = 'Thank you for reaching out! Your enquiry has been received successfully.';
      this.contactForm.reset();

      // Trigger asynchronous email alert to administrator in background
      this.emailService.sendAdminContactNotification(name, fname, email, phone, subject, message);
    } catch (err: any) {
      console.error('❌ Supabase Submission Error:', err.message);
      this.alertType = 'danger';
      this.alertMessage = 'Error saving contact details: ' + err.message;
    } finally {
      this.isLoading = false;
    }
  }
}
