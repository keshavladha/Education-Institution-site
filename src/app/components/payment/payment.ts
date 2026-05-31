import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './payment.html',
  styleUrl: './payment.css'
})
export class Payment implements OnInit {
  paymentForm!: FormGroup;
  cardForm!: FormGroup;
  isLoading = false;
  currentStep: 1 | 2 | 3 = 1; // 1: Details, 2: Secure Payment, 3: Completed Receipt
  transactionId = '';

  // Alert State
  alertMessage = '';
  alertType: 'success' | 'danger' | 'warning' | '' = '';

  // Checkout Card Visualizer State
  isCardFlipped = false;

  get cardNameValue(): string {
    return this.cardForm.get('cardName')?.value || '';
  }

  get cardNumberValue(): string {
    return this.cardForm.get('cardNumber')?.value || '';
  }

  get cardExpiryValue(): string {
    return this.cardForm.get('expiry')?.value || '';
  }

  get cardCvvValue(): string {
    return this.cardForm.get('cvv')?.value || '';
  }

  get formattedCardNumberMock(): string {
    const raw = this.cardNumberValue;
    if (!raw) return '•••• •••• •••• ••••';
    
    const parts = [];
    for (let i = 0; i < 16; i += 4) {
      const part = raw.substring(i, i + 4);
      if (part) {
        parts.push(part.padEnd(4, '•'));
      } else {
        parts.push('••••');
      }
    }
    return parts.join(' ');
  }

  constructor(
    private fb: FormBuilder,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit(): void {
    const student = this.supabaseService.student;
    const initialName = student?.full_name || '';

    this.paymentForm = this.fb.group({
      studentName: [initialName, [Validators.required]],
      class: ['', [Validators.required]],
      fatherName: ['', [Validators.required]],
      course: ['', [Validators.required]],
      amount: ['', [Validators.required, Validators.min(500)]]
    });

    this.cardForm = this.fb.group({
      cardName: ['', [Validators.required]],
      cardNumber: ['', [Validators.required, Validators.pattern(/^\d{16}$/)]],
      expiry: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/)]],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3}$/)]]
    });
  }

  isInvalid(fieldName: string): boolean {
    const control = this.paymentForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  isCardInvalid(fieldName: string): boolean {
    const control = this.cardForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  formatCardNumber(event: any): void {
    const val = event.target.value.replace(/\D/g, '');
    this.cardForm.get('cardNumber')?.setValue(val.substring(0, 16), { emitEvent: false });
  }

  formatExpiry(event: any): void {
    let val = event.target.value.replace(/\D/g, '');
    if (val.length >= 2) {
      val = val.substring(0, 2) + '/' + val.substring(2, 4);
    }
    this.cardForm.get('expiry')?.setValue(val.substring(0, 5), { emitEvent: false });
  }

  formatCVV(event: any): void {
    const val = event.target.value.replace(/\D/g, '');
    this.cardForm.get('cvv')?.setValue(val.substring(0, 3), { emitEvent: false });
  }

  proceedToCard(): void {
    this.alertMessage = '';
    this.alertType = '';

    if (this.paymentForm.invalid) {
      this.alertType = 'warning';
      this.alertMessage = 'Please fill out all required payment details correctly before proceeding.';
      Object.keys(this.paymentForm.controls).forEach(key => {
        const control = this.paymentForm.get(key);
        if (control) control.markAsTouched();
      });
      return;
    }

    this.currentStep = 2;
  }

  backToDetails(): void {
    this.currentStep = 1;
  }

  async onPaySubmit(): Promise<void> {
    this.alertMessage = '';
    this.alertType = '';

    if (this.cardForm.invalid) {
      this.alertType = 'warning';
      this.alertMessage = 'Please correct your card details before submitting.';
      Object.keys(this.cardForm.controls).forEach(key => {
        const control = this.cardForm.get(key);
        if (control) control.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    const { studentName, class: studentClass, fatherName, course, amount } = this.paymentForm.value;

    try {
      // Simulate network request & secure authorization
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate a dynamic transaction id
      this.transactionId = 'FIC-' + Math.random().toString(36).substring(2, 11).toUpperCase() + '-' + Date.now().toString().slice(-4);

      // Insert record to database
      await this.supabaseService.insertPayment(studentName, studentClass, fatherName, course, parseFloat(amount));
      
      this.currentStep = 3;
    } catch (err: any) {
      console.error('❌ Supabase Payment Submission Error:', err.message);
      this.alertType = 'danger';
      this.alertMessage = 'Secure Gateway Error: ' + err.message;
    } finally {
      this.isLoading = false;
    }
  }

  resetAll(): void {
    this.paymentForm.reset();
    const student = this.supabaseService.student;
    if (student) {
      this.paymentForm.get('studentName')?.setValue(student.full_name);
    }
    this.cardForm.reset();
    this.currentStep = 1;
    this.alertMessage = '';
    this.alertType = '';
  }
}
