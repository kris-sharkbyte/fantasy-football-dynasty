import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth, connectAuthEmulator } from '@angular/fire/auth';
import {
  provideFirestore,
  getFirestore,
  connectFirestoreEmulator,
} from '@angular/fire/firestore';
import {
  provideStorage,
  getStorage,
  connectStorageEmulator,
} from '@angular/fire/storage';
import {
  provideFunctions,
  getFunctions,
  connectFunctionsEmulator,
} from '@angular/fire/functions';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideClientHydration(),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } },
    }),
    provideFirebaseApp(() => initializeApp(environment.firebase)),

    provideAuth(() => {
      const auth = getAuth();
      if (environment.useEmulators) {
        connectAuthEmulator(auth, `http://${environment.emulators.auth}`, {
          disableWarnings: true,
        });
      }
      return auth;
    }),

    provideFirestore(() => {
      const db = getFirestore();
      if (environment.useEmulators) {
        const [, port] = environment.emulators.firestore.split(':');
        connectFirestoreEmulator(db, 'localhost', parseInt(port, 10));
      }
      return db;
    }),

    provideFunctions(() => {
      // specify region if you deploy in non-default; default is 'us-central1'
      const fns = getFunctions(undefined, 'us-central1');
      if (environment.useEmulators) {
        const [, port] = environment.emulators.functions.split(':');
        connectFunctionsEmulator(fns, 'localhost', parseInt(port, 10));
      }
      return fns;
    }),

    provideStorage(() => {
      const storage = getStorage();
      if (environment.useEmulators) {
        const [, port] = environment.emulators.storage.split(':');
        connectStorageEmulator(storage, 'localhost', parseInt(port, 10));
      }
      return storage;
    }),
  ],
};
