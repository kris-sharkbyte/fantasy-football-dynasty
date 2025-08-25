import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * Guest Guard - Redirects authenticated users to the main app
 * Use this guard on public/guest-only routes like home page
 */
export const GuestGuard: CanActivateFn = (route, state) => {
  const firebaseAuth = inject(Auth);
  const router = inject(Router);

  return new Promise<boolean | UrlTree>((resolve) => {
    onAuthStateChanged(firebaseAuth, (user) => {
      console.log('GuestGuard - User state:', user ? 'authenticated' : 'guest');

      if (user) {
        // User is authenticated, redirect to main app
        console.log('Redirecting authenticated user to /leagues');
        resolve(router.createUrlTree(['/leagues']));
      } else {
        // User is not authenticated, allow access to guest routes
        resolve(true);
      }
    });
  });
};
