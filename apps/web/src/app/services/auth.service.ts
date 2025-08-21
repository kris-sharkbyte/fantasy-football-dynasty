import { Injectable, signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map } from 'rxjs';
import { User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseService } from './firebase.service';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  roles: string[];
  createdAt: Date;
  lastLoginAt: Date;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Signal-based user state
  private _currentUser = signal<User | null>(null);

  // Public readonly signals
  public currentUser = this._currentUser.asReadonly();
  public isAuthenticated = computed(() => this._currentUser() !== null);

  constructor(
    private firebaseService: FirebaseService,
    private router: Router
  ) {
    this.initializeAuthState();
  }

  private initializeAuthState(): void {
    // Subscribe to Firebase auth state changes and update signal
    onAuthStateChanged(
      this.firebaseService.getAuth(),
      (user) => {
        console.log('Auth state changed:', user);
        this._currentUser.set(user);
      },
      (error) => {
        console.error('Auth state change error:', error);
      }
    );

    // Effect to handle navigation when user becomes authenticated
    effect(() => {
      const user = this._currentUser();
      console.log('Auth effect triggered - user:', user);

      if (user) {
        console.log('User authenticated, checking navigation...');
        // TODO: Load user permissions/profile here
        // this.loadUserPermissions(user.uid);

        // Navigate after sign in if appropriate
        this.navigateAfterSignIn();
      }
    });
  }

  // Legacy observable getter for backward compatibility (if needed)
  get currentUser$(): Observable<User | null> {
    return this.firebaseService.currentUser$;
  }

  // Sign in user
  async signIn(email: string, password: string): Promise<User> {
    try {
      const user = await this.firebaseService.signIn(email, password);
      // TODO: Update last login time in user profile

      // Navigation is now handled automatically by the auth state effect
      return user;
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  // Sign up new user
  async signUp(
    email: string,
    password: string,
    displayName?: string
  ): Promise<User> {
    try {
      const user = await this.firebaseService.signUp(email, password);

      // TODO: Create user profile in Firestore
      // await this.createUserProfile(user.uid, email, displayName);

      // Navigation is now handled automatically by the auth state effect
      return user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Sign out user
  async signOut(): Promise<void> {
    try {
      await this.firebaseService.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // Check if user has specific role
  hasRole(role: string): boolean {
    const user = this.currentUser();
    if (!user) return false;

    // TODO: Check user roles from profile
    // For now, return false - will implement when we add user profiles
    return false;
  }

  // Check if user is league owner
  isLeagueOwner(): boolean {
    return this.hasRole('owner');
  }

  // Check if user is commissioner
  isCommissioner(): boolean {
    return this.hasRole('commissioner');
  }

  // Check if user is general manager
  isGeneralManager(): boolean {
    return this.hasRole('general-manager');
  }

  // Get user profile (placeholder for now)
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    // TODO: Implement when we add Firestore user profiles
    return null;
  }

  // Update user profile (placeholder for now)
  async updateUserProfile(
    uid: string,
    updates: Partial<UserProfile>
  ): Promise<void> {
    // TODO: Implement when we add Firestore user profiles
  }

  // Navigate user after sign in
  private navigateAfterSignIn(): void {
    const currentUrl = this.router.url;
    const currentDomain = window.location.hostname;

    // Don't navigate if already in leagues or admin subdomain
    if (currentUrl.includes('/leagues') || currentDomain.startsWith('admin.')) {
      return;
    }

    // Navigate to leagues page
    this.router.navigate(['/leagues']);
  }
}
