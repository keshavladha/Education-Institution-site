import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from './services/supabase.service';

export const adminGuard: CanActivateFn = () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  // Check if user is logged in and is an admin
  // For now, we check if the email contains 'admin' or specific admin emails
  const student = supabase.student;
  const adminEmails = ['admin@futureinstitute.edu', 'principal@futureinstitute.edu'];
  
  if (supabase.isLoggedIn && student && adminEmails.includes(student.email)) {
    return true;
  }
  
  return router.createUrlTree(['/admin-login']);
};
