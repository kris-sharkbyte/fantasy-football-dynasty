import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  getAuth,
  Auth,
  User as FirebaseUser,
  UserCredential,
} from '@angular/fire/auth';
import { UserProfileService } from './user-profile.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly userProfileService = inject(UserProfileService);
  private readonly firebaseAuth = inject(Auth);

  private _currentUser = signal<FirebaseUser | null>(null);
  private _isLoading = signal(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  public currentUser = this._currentUser.asReadonly();
  public isLoading = this._isLoading.asReadonly();
  public error = this._error.asReadonly();
  public isAuthenticated = computed(() => this._currentUser() !== null);

  constructor() {
    // Initialize auth state
    this.initializeAuthState();
  }

  /**
   * Initialize authentication state listener
   */
  private initializeAuthState(): void {
    console.log('Initializing auth state');
    try {
      console.log('Setting auth state listener');
      onAuthStateChanged(this.firebaseAuth, async (user) => {
        this._currentUser.set(user);

        if (user) {
          // Load or create user profile
          await this.loadUserProfile(user.uid);
        }
      });
    } catch (error) {
      console.error('Error initializing auth state:', error);
    }
  }

  /**
   * Load user profile, creating one if it doesn't exist
   */
  private async loadUserProfile(uid: string): Promise<void> {
    try {
      console.log('Loading user profile for UID:', uid);
      let profile = await this.userProfileService.loadUserProfile(uid);
      console.log('Profile loaded:', profile);

      if (!profile) {
        // Profile doesn't exist, create one
        const user = this._currentUser();
        if (user) {
          await this.userProfileService.createUserProfile(
            uid,
            user.email || '',
            user.displayName || undefined
          );
          profile = await this.userProfileService.loadUserProfile(uid);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string): Promise<UserCredential> {
    try {
      this._isLoading.set(true);
      this._error.set(null);

      const result = await createUserWithEmailAndPassword(
        this.firebaseAuth,
        email,
        password
      );

      // Profile creation is handled by the effect when auth state changes
      return result;
    } catch (error) {
      console.error('Error signing up:', error);
      this._error.set(
        error instanceof Error ? error.message : 'Failed to sign up'
      );
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<UserCredential> {
    try {
      this._isLoading.set(true);
      this._error.set(null);

      const result = await signInWithEmailAndPassword(
        this.firebaseAuth,
        email,
        password
      );

      // Update last login time
      if (result.user) {
        await this.userProfileService.updateLastLogin(result.user.uid);
      }

      return result;
    } catch (error) {
      console.error('Error signing in:', error);
      this._error.set(
        error instanceof Error ? error.message : 'Failed to sign in'
      );
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      this._isLoading.set(true);
      this._error.set(null);

      await signOut(this.firebaseAuth);

      // Clear user state immediately
      this._currentUser.set(null);

      // Clear user profile service state
      this.userProfileService.clearUserProfile();
    } catch (error) {
      console.error('Error signing out:', error);
      this._error.set(
        error instanceof Error ? error.message : 'Failed to sign out'
      );
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Check if user has a specific system role
   */
  hasSystemRole(role: string): boolean {
    return this.userProfileService.hasSystemRole(role as any);
  }

  /**
   * Check if user is a system admin
   */
  isSystemAdmin(): boolean {
    return this.userProfileService.isSystemAdmin();
  }

  /**
   * Check if user is a system moderator
   */
  isSystemModerator(): boolean {
    return this.userProfileService.isSystemModerator();
  }

  /**
   * Check if user is a regular user
   */
  isRegularUser(): boolean {
    return this.userProfileService.isRegularUser();
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }
}
