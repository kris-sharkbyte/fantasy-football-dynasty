import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { onAuthStateChanged } from 'firebase/auth';

export const AuthGuard: CanActivateFn = (route, state) => {
  const firebaseAuth = inject(Auth);
  const router = inject(Router);

  // Wrap the native Firebase callback in a Promise:
  return new Promise<boolean | UrlTree>((resolve) => {
    onAuthStateChanged(firebaseAuth, (user) => {
      console.log('User changed:', user);
      if (user) {
        resolve(true);
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
