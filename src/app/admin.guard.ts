import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService, ADMIN_EMAILS } from './services/supabase.service';

export const adminGuard: CanActivateFn = () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  // Check if user is logged in and is an admin
  const student = supabase.student;
  
  if (supabase.isLoggedIn && student && ADMIN_EMAILS.includes(student.email)) {
    return true;
  }
  
  return router.createUrlTree(['/admin-login']);
};
