import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private app: any;
  private auth!: Auth;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    try {
      this.app = initializeApp(environment.firebase);
      this.auth = getAuth(this.app);

      // Listen for auth state changes
      onAuthStateChanged(this.auth, (user) => {
        this.currentUserSubject.next(user);
      });
    } catch (error) {
      console.error('Error initializing Firebase:', error);
    }
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      return userCredential.user;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  // Create new user with email and password
  async signUp(email: string, password: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      return userCredential.user;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.auth.currentUser !== null;
  }

  // Get auth instance (for other Firebase services)
  getAuth(): Auth {
    return this.auth;
  }
}
