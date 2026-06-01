import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmailService {

  private config = environment.emailjs;

  /**
   * Helper: evaluates if EmailJS keys are still set to placeholders
   */
  private isConfigured(): boolean {
    return !!(
      this.config.publicKey && 
      this.config.publicKey !== 'YOUR_EMAILJS_PUBLIC_KEY' &&
      this.config.serviceId && 
      this.config.serviceId !== 'YOUR_EMAILJS_SERVICE_ID'
    );
  }

  /**
   * Sends an admin email alert when a student submits a new contact form query
   */
  async sendAdminContactNotification(
    name: string,
    fatherName: string,
    studentEmail: string,
    phone: string,
    course: string,
    message: string
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn(
        '⚠️ [EmailService] EmailJS is not configured. Skipping admin query email notification.\n' +
        'Register at emailjs.com and insert your keys in environment.ts to enable live notifications.'
      );
      return false;
    }

    const templateParams = {
      to_email: this.config.adminEmail,
      from_name: name,
      student_email: studentEmail,
      father_name: fatherName || 'N/A',
      student_phone: phone,
      course_interested: course || 'N/A',
      student_message: message
    };

    return this.postEmailSend(this.config.contactTemplateId, templateParams);
  }

  /**
   * Sends a professional receipt confirmation email to the student when a fee payment completes
   */
  async sendStudentPaymentReceipt(
    studentName: string,
    studentClass: string,
    fatherName: string,
    course: string,
    amount: number,
    transactionId: string,
    recipientEmail: string
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn(
        '⚠️ [EmailService] EmailJS is not configured. Skipping student payment receipt email notification.\n' +
        'Register at emailjs.com and insert your keys in environment.ts to enable live notifications.'
      );
      return false;
    }

    const templateParams = {
      to_email: recipientEmail,
      student_name: studentName,
      student_class: studentClass || 'N/A',
      father_name: fatherName || 'N/A',
      course_name: course,
      payment_amount: amount,
      receipt_id: transactionId,
      payment_date: new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    return this.postEmailSend(this.config.paymentTemplateId, templateParams);
  }

  /**
   * POST payload helper to the EmailJS send endpoint
   */
  private async postEmailSend(templateId: string, templateParams: any): Promise<boolean> {
    if (!templateId || templateId.startsWith('YOUR_')) {
      console.warn('⚠️ [EmailService] Missing template ID. Skipping email.');
      return false;
    }

    const payload = {
      service_id: this.config.serviceId,
      template_id: templateId,
      user_id: this.config.publicKey,
      template_params: templateParams
    };

    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`EmailJS responded with status ${response.status}: ${errorText}`);
      }

      console.log('✉️ [EmailService] Notification email sent successfully.');
      return true;
    } catch (e: any) {
      console.error('💥 [EmailService] Failed to dispatch email via EmailJS:', e.message || e);
      return false;
    }
  }
}
