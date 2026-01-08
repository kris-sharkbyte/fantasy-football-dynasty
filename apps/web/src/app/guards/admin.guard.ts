import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { onAuthStateChanged } from 'firebase/auth';

// List of admin email addresses
const ADMIN_EMAILS = [
  // Add admin emails here
];

export const AdminGuard: CanActivateFn = (route, state) => {
  const firebaseAuth = inject(Auth);
  const router = inject(Router);

  return new Promise<boolean | UrlTree>((resolve) => {
    onAuthStateChanged(firebaseAuth, (user) => {
      if (user) {
        // For now, allow any authenticated user to access simulator
        // In production, you can check against ADMIN_EMAILS or custom claims
        // const isAdmin = ADMIN_EMAILS.includes(user.email || '');
        const isAdmin = true; // Allow all authenticated users for now

        if (isAdmin) {
          resolve(true);
        } else {
          console.warn('User is not an admin:', user.email);
          resolve(router.createUrlTree(['/leagues']));
        }
      } else {
        resolve(
          router.createUrlTree(['/'], {
            queryParams: { returnUrl: state.url },
          })
        );
      }
    });
  });
};

