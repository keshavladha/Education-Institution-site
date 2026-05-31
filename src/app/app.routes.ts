import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Payment } from './components/payment/payment';
import { Timeline } from './components/timeline/timeline';

import { authGuard } from './auth.guard';
import { adminGuard } from './admin.guard';

export const routes: Routes = [
  { path: '', component: Home, title: 'Future Institute of Commerce | Home' },
  { path: 'payment', component: Payment, title: 'Secure Fee Payment | Future Institute of Commerce' },
  { path: 'year', component: Timeline, title: 'Our Timeline & Memories | Future Institute of Commerce' },
  { path: 'login', loadComponent: () => import('./components/login/login').then(m => m.Login), title: 'Student Login | Future Institute of Commerce' },
  { path: 'admin-login', loadComponent: () => import('./components/admin-login/admin-login').then(m => m.AdminLogin), title: 'Admin Portal Login | Future Institute of Commerce' },
  
  // Protected student routes
  { path: 'dashboard', loadComponent: () => import('./components/dashboard/dashboard').then(m => m.Dashboard), canActivate: [authGuard], title: 'Student Dashboard | Future Institute of Commerce' },
  { path: 'profile-setup', loadComponent: () => import('./components/profile-setup/profile-setup').then(m => m.ProfileSetup), canActivate: [authGuard], title: 'Profile Setup | Future Institute of Commerce' },
  
  // Admin-only routes for student management
  { path: 'admin', loadComponent: () => import('./components/admin/admin').then(m => m.Admin), canActivate: [adminGuard], title: 'Admin Control Center | Future Institute of Commerce' },
  { path: 'admin/add-student', loadComponent: () => import('./components/admin-add-student/admin-add-student').then(m => m.AdminAddStudent), canActivate: [adminGuard], title: 'Add New Student | Admin' },
  
  { path: '**', loadComponent: () => import('./components/not-found/not-found').then(m => m.NotFound), title: 'Page Not Found | Future Institute of Commerce' }
];
