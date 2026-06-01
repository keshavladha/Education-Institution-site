import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService, ADMIN_EMAILS } from './services/supabase.service';

export const authGuard: CanActivateFn = () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  if (!supabase.isLoggedIn) {
    return router.createUrlTree(['/login']);
  }

  // Redirect admins to admin panel - they shouldn't access student pages
  const student = supabase.student;
  if (student && ADMIN_EMAILS.includes(student.email)) {
    return router.createUrlTree(['/admin']);
  }

  return true;
};
