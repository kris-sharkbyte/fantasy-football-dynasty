import { Injectable, signal, computed, inject } from '@angular/core';
import {
  Firestore,
  Timestamp,
  doc,
  setDoc,
  updateDoc,
  getDoc,
} from '@angular/fire/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  bio?: string | null;
  location?: string | null;
  timezone?: string | null;
  preferences: UserPreferences;
  systemRoles: SystemRole[]; // System-level roles
  stats: UserStats;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
}

export type SystemRole = 'system-admin' | 'system-moderator' | 'user';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: NotificationPreferences;
  privacy: PrivacySettings;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  tradeOffers: boolean;
  leagueUpdates: boolean;
  draftReminders: boolean;
  gameResults: boolean;
}

export interface PrivacySettings {
  profileVisible: boolean;
  showEmail: boolean;
  showStats: boolean;
  allowInvites: boolean;
}

export interface UserStats {
  totalLeagues: number;
  activeLeagues: number;
  championships: number;
  playoffAppearances: number;
  totalWins: number;
  totalLosses: number;
  winPercentage: number;
  bestFinish: number;
  worstFinish: number;
}

export interface FirestoreUserProfile
  extends Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt' | 'lastLoginAt'> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
}

@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  private readonly firestore = inject(Firestore);
  private _currentProfile = signal<UserProfile | null>(null);
  private _isLoading = signal(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  public currentProfile = this._currentProfile.asReadonly();
  public isLoading = this._isLoading.asReadonly();
  public error = this._error.asReadonly();
  public hasProfile = computed(() => this._currentProfile() !== null);

  constructor() {}

  /**
   * Create a new user profile
   */
  async createUserProfile(
    uid: string,
    email: string,
    displayName?: string | null
  ): Promise<void> {
    try {
      this._isLoading.set(true);
      this._error.set(null);

      const defaultProfile = {
        uid,
        email,
        displayName: displayName || null, // Convert undefined to null for Firestore
        preferences: {
          theme: 'auto',
          notifications: {
            email: true,
            push: true,
            tradeOffers: true,
            leagueUpdates: true,
            draftReminders: true,
            gameResults: true,
          },
          privacy: {
            profileVisible: true,
            showEmail: false,
            showStats: true,
            allowInvites: true,
          },
        },
        systemRoles: ['user'] as SystemRole[],
        stats: {
          totalLeagues: 0,
          activeLeagues: 0,
          championships: 0,
          playoffAppearances: 0,
          totalWins: 0,
          totalLosses: 0,
          winPercentage: 0,
          bestFinish: 0,
          worstFinish: 0,
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
      };

      const userRef = doc(this.firestore, 'users', uid);
      await setDoc(userRef, defaultProfile);

      // Update local state
      this._currentProfile.set({
        ...defaultProfile,
        displayName: defaultProfile.displayName || undefined, // Convert null back to undefined for local state
        preferences: {
          ...defaultProfile.preferences,
          theme: defaultProfile.preferences.theme as 'light' | 'dark' | 'auto',
        },
        createdAt: defaultProfile.createdAt.toDate(),
        updatedAt: defaultProfile.updatedAt.toDate(),
        lastLoginAt: defaultProfile.lastLoginAt.toDate(),
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
      this._error.set(
        error instanceof Error ? error.message : 'Failed to create user profile'
      );
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load user profile by UID (called from AuthService)
   */
  async loadUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      console.log('Loading user profile for UID:', uid);
      const userRef = doc(this.firestore, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        // Don't auto-create profile here - let AuthService handle it
        console.log('User profile not found, returning null');
        return null;
      }

      const data = userSnap.data() as any;
      const profile: UserProfile = {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        firstName: data.firstName,
        lastName: data.lastName,
        avatar: data.avatar,
        bio: data.bio,
        location: data.location,
        timezone: data.timezone,
        preferences: data.preferences,
        systemRoles: data.systemRoles,
        stats: data.stats,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        lastLoginAt: data.lastLoginAt.toDate(),
      };

      this._currentProfile.set(profile);
      return profile;
    } catch (error) {
      console.error('Error loading user profile:', error);
      this._error.set(
        error instanceof Error ? error.message : 'Failed to load user profile'
      );
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    uid: string,
    updates: Partial<UserProfile>
  ): Promise<void> {
    try {
      this._isLoading.set(true);
      this._error.set(null);

      const userRef = doc(this.firestore, 'users', uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });

      // Refresh profile
      await this.loadUserProfile(uid);
    } catch (error) {
      console.error('Error updating user profile:', error);
      this._error.set(
        error instanceof Error ? error.message : 'Failed to update user profile'
      );
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Update user's last login time
   */
  async updateLastLogin(uid: string): Promise<void> {
    try {
      const userRef = doc(this.firestore, 'users', uid);
      await updateDoc(userRef, {
        lastLoginAt: Timestamp.now(),
      });

      // Update local state
      const currentProfile = this._currentProfile();
      if (currentProfile && currentProfile.uid === uid) {
        this._currentProfile.set({
          ...currentProfile,
          lastLoginAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  /**
   * Check if user has a specific system role
   */
  hasSystemRole(role: SystemRole): boolean {
    const profile = this._currentProfile();
    return profile ? profile.systemRoles.includes(role) : false;
  }

  /**
   * Check if user is a system admin
   */
  isSystemAdmin(): boolean {
    return this.hasSystemRole('system-admin');
  }

  /**
   * Check if user is a system moderator
   */
  isSystemModerator(): boolean {
    return this.hasSystemRole('system-moderator');
  }

  /**
   * Check if user is a regular user
   */
  isRegularUser(): boolean {
    return this.hasSystemRole('user');
  }

  /**
   * Get user's display name
   */
  getDisplayName(): string {
    const profile = this._currentProfile();
    return (
      profile?.displayName ||
      profile?.firstName ||
      profile?.email ||
      'Unknown User'
    );
  }

  /**
   * Set current profile (called from AuthService)
   */
  setCurrentProfile(profile: UserProfile | null): void {
    this._currentProfile.set(profile);
  }

  /**
   * Clear user profile (called during logout)
   */
  clearUserProfile(): void {
    this._currentProfile.set(null);
    this._error.set(null);
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Refresh profile data
   */
  async refresh(uid: string): Promise<void> {
    await this.loadUserProfile(uid);
  }
}
