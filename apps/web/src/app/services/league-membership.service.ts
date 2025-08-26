import { Injectable, signal, computed, inject } from '@angular/core';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  Timestamp,
  getFirestore,
  Firestore,
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';

export interface LeagueMember {
  userId: string;
  leagueId: string;
  role: LeagueRole;
  teamId: string;
  joinedAt: Date;
  isActive: boolean;
  permissions: LeaguePermissions;
}

export type LeagueRole =
  | 'owner'
  | 'commissioner'
  | 'general-manager'
  | 'member';

export interface LeaguePermissions {
  canManageLeague: boolean;
  canManageTeams: boolean;
  canApproveTrades: boolean;
  canManageDraft: boolean;
  canManageFreeAgency: boolean;
  canViewAllTeams: boolean;
  canEditScoring: boolean;
  canEditRules: boolean;
}

export interface FirestoreLeagueMember extends Omit<LeagueMember, 'joinedAt'> {
  joinedAt: Timestamp;
}

@Injectable({
  providedIn: 'root',
})
export class LeagueMembershipService {
  private readonly db = inject(Firestore);
  private readonly authService = inject(AuthService);

  private _userMemberships = signal<LeagueMember[]>([]);
  private _isLoading = signal(false);
  private _error = signal<string | null>(null);

  // New: Current league permissions signal
  private _currentLeaguePermissions = signal<Record<string, boolean>>({});
  private _isLoadingPermissions = signal(false);

  // Public readonly signals
  public userMemberships = this._userMemberships.asReadonly();
  public isLoading = this._userMemberships.asReadonly();
  public error = this._error.asReadonly();
  public hasMemberships = computed(() => this._userMemberships().length > 0);

  // New: Public permission signals
  public currentLeaguePermissions = this._currentLeaguePermissions.asReadonly();
  public isLoadingPermissions = this._isLoadingPermissions.asReadonly();

  // New: Computed permission getters
  public canManageLeague = computed(
    () => this._currentLeaguePermissions()['canManageLeague'] || false
  );
  public canManageDraft = computed(
    () => this._currentLeaguePermissions()['canManageDraft'] || false
  );
  public canManageTeams = computed(
    () => this._currentLeaguePermissions()['canManageTeams'] || false
  );
  public canApproveTrades = computed(
    () => this._currentLeaguePermissions()['canApproveTrades'] || false
  );
  public canManageFreeAgency = computed(
    () => this._currentLeaguePermissions()['canManageFreeAgency'] || false
  );
  public canViewAllTeams = computed(
    () => this._currentLeaguePermissions()['canViewAllTeams'] || false
  );
  public canEditScoring = computed(
    () => this._currentLeaguePermissions()['canEditScoring'] || false
  );
  public canEditRules = computed(
    () => this._currentLeaguePermissions()['canEditRules'] || false
  );

  /**
   * Get league role permissions
   */
  private getRolePermissions(role: LeagueRole): LeaguePermissions {
    switch (role) {
      case 'owner':
        return {
          canManageLeague: true,
          canManageTeams: true,
          canApproveTrades: true,
          canManageDraft: true,
          canManageFreeAgency: true,
          canViewAllTeams: true,
          canEditScoring: true,
          canEditRules: true,
        };
      case 'commissioner':
        return {
          canManageLeague: true,
          canManageTeams: true,
          canApproveTrades: true,
          canManageDraft: true,
          canManageFreeAgency: true,
          canViewAllTeams: true,
          canEditScoring: false,
          canEditRules: false,
        };
      case 'general-manager':
        return {
          canManageLeague: false,
          canManageTeams: true,
          canApproveTrades: false,
          canManageDraft: false,
          canManageFreeAgency: false,
          canViewAllTeams: true,
          canEditScoring: false,
          canEditRules: false,
        };
      case 'member':
        return {
          canManageLeague: false,
          canManageTeams: false,
          canApproveTrades: false,
          canManageDraft: false,
          canManageFreeAgency: false,
          canViewAllTeams: false,
          canEditScoring: false,
          canEditRules: false,
        };
      default:
        return {
          canManageLeague: false,
          canManageTeams: false,
          canApproveTrades: false,
          canManageDraft: false,
          canManageFreeAgency: false,
          canViewAllTeams: false,
          canEditScoring: false,
          canEditRules: false,
        };
    }
  }

  /**
   * Add user to league with specific role
   */
  async addMemberToLeague(
    leagueId: string,
    userId: string,
    role: LeagueRole,
    teamId: string
  ): Promise<void> {
    try {
      const member: Omit<FirestoreLeagueMember, 'joinedAt'> = {
        userId,
        leagueId,
        role,
        teamId,
        isActive: true,
        permissions: this.getRolePermissions(role),
      };

      const memberRef = doc(this.db, 'leagues', leagueId, 'members', userId);
      await setDoc(memberRef, {
        ...member,
        joinedAt: Timestamp.now(),
      });

      // Refresh user memberships
      await this.loadUserMemberships();
    } catch (error) {
      console.error('Error adding member to league:', error);
      throw error;
    }
  }

  /**
   * Remove user from league
   */
  async removeMemberFromLeague(
    leagueId: string,
    userId: string
  ): Promise<void> {
    try {
      const memberRef = doc(this.db, 'leagues', leagueId, 'members', userId);
      await deleteDoc(memberRef);

      // Refresh user memberships
      await this.loadUserMemberships();
    } catch (error) {
      console.error('Error removing member from league:', error);
      throw error;
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    leagueId: string,
    userId: string,
    newRole: LeagueRole
  ): Promise<void> {
    try {
      const memberRef = doc(this.db, 'leagues', leagueId, 'members', userId);
      await updateDoc(memberRef, {
        role: newRole,
        permissions: this.getRolePermissions(newRole),
      });

      // Refresh user memberships
      await this.loadUserMemberships();
    } catch (error) {
      console.error('Error updating member role:', error);
      throw error;
    }
  }

  /**
   * Get user's role in a specific league
   */
  async getUserLeagueRole(leagueId: string): Promise<LeagueRole | null> {
    try {
      const currentUser = this.authService.currentUser();
      if (!currentUser) return null;

      const memberRef = doc(
        this.db,
        'leagues',
        leagueId,
        'members',
        currentUser.uid
      );
      const memberSnap = await getDoc(memberRef);

      if (memberSnap.exists()) {
        const data = memberSnap.data() as FirestoreLeagueMember;
        return data.role;
      }

      return null;
    } catch (error) {
      console.error('Error getting user league role:', error);
      return null;
    }
  }

  /**
   * Check if user has specific permission in a league
   */
  async hasLeaguePermission(
    leagueId: string,
    permission: keyof LeaguePermissions
  ): Promise<boolean> {
    try {
      const currentUser = this.authService.currentUser();
      if (!currentUser) {
        console.log('No current user found');
        return false;
      }

      console.log('Checking permission:', {
        leagueId,
        permission,
        userId: currentUser.uid,
      });

      const memberRef = doc(
        this.db,
        'leagues',
        leagueId,
        'members',
        currentUser.uid
      );
      const memberSnap = await getDoc(memberRef);

      if (memberSnap.exists()) {
        const data = memberSnap.data() as FirestoreLeagueMember;
        console.log('Member data found:', {
          permissions: data.permissions,
          requestedPermission: permission,
          hasPermission: data.permissions[permission] || false,
        });
        return data.permissions[permission] || false;
      }

      console.log('Member document does not exist');
      return false;
    } catch (error) {
      console.error('Error checking league permission:', error);
      return false;
    }
  }

  /**
   * Get all league permissions for the current user
   */
  async getLeaguePermissions(
    leagueId: string
  ): Promise<Record<string, boolean>> {
    try {
      const currentUser = this.authService.currentUser();
      if (!currentUser) {
        console.log('No current user found');
        return {};
      }

      const memberRef = doc(
        this.db,
        'leagues',
        leagueId,
        'members',
        currentUser.uid
      );
      const memberSnap = await getDoc(memberRef);

      if (memberSnap.exists()) {
        const data = memberSnap.data() as FirestoreLeagueMember;
        console.log('All league permissions loaded:', data.permissions);
        return { ...data.permissions } as Record<string, boolean>;
      }

      console.log('Member document does not exist');
      return {};
    } catch (error) {
      console.error('Error getting league permissions:', error);
      return {};
    }
  }

  /**
   * Load all league memberships for the current user
   */
  async loadUserMemberships(): Promise<void> {
    try {
      this._isLoading.set(true);
      this._error.set(null);

      const currentUser = this.authService.currentUser();
      if (!currentUser) {
        this._userMemberships.set([]);
        return;
      }

      // Query all leagues where user is a member
      const memberships: LeagueMember[] = [];

      // This is a simplified approach - in production you'd want to use a composite index
      // or store user memberships in a separate collection for better querying
      const leaguesRef = collection(this.db, 'leagues');
      const leaguesSnapshot = await getDocs(leaguesRef);

      for (const leagueDoc of leaguesSnapshot.docs) {
        const leagueData = leagueDoc.data();
        if (leagueData['memberUserIds']?.includes(currentUser.uid)) {
          // Get the specific member document
          const memberRef = doc(
            this.db,
            'leagues',
            leagueDoc.id,
            'members',
            currentUser.uid
          );
          const memberSnap = await getDoc(memberRef);

          if (memberSnap.exists()) {
            const memberData = memberSnap.data() as FirestoreLeagueMember;
            memberships.push({
              userId: memberData.userId,
              leagueId: memberData.leagueId,
              role: memberData.role,
              teamId: memberData.teamId,
              joinedAt: memberData.joinedAt.toDate(),
              isActive: memberData.isActive,
              permissions: memberData.permissions,
            });
          }
        }
      }

      this._userMemberships.set(memberships);
    } catch (error) {
      console.error('Error loading user memberships:', error);
      this._error.set(
        error instanceof Error ? error.message : 'Failed to load memberships'
      );
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Get all members of a league
   */
  async getLeagueMembers(leagueId: string): Promise<LeagueMember[]> {
    try {
      const membersRef = collection(this.db, 'leagues', leagueId, 'members');
      const membersSnapshot = await getDocs(membersRef);
      const members: LeagueMember[] = [];

      membersSnapshot.forEach((doc) => {
        const data = doc.data() as FirestoreLeagueMember;
        members.push({
          userId: data.userId,
          leagueId: data.leagueId,
          role: data.role,
          teamId: data.teamId,
          joinedAt: data.joinedAt.toDate(),
          isActive: data.isActive,
          permissions: data.permissions,
        });
      });

      return members;
    } catch (error) {
      console.error('Error getting league members:', error);
      return [];
    }
  }

  /**
   * Check if user is league owner
   */
  async isLeagueOwner(leagueId: string): Promise<boolean> {
    const role = await this.getUserLeagueRole(leagueId);
    return role === 'owner';
  }

  /**
   * Check if user is league commissioner
   */
  async isLeagueCommissioner(leagueId: string): Promise<boolean> {
    const role = await this.getUserLeagueRole(leagueId);
    return role === 'commissioner' || role === 'owner';
  }

  /**
   * Load permissions for the current selected league
   * This method is called automatically when the selected league changes
   */
  async loadCurrentLeaguePermissions(leagueId: string | null): Promise<void> {
    try {
      if (!leagueId) {
        this._currentLeaguePermissions.set({});
        return;
      }

      this._isLoadingPermissions.set(true);
      const permissions = await this.getLeaguePermissions(leagueId);
      this._currentLeaguePermissions.set(permissions);

      console.log('Current league permissions loaded:', permissions);
    } catch (error) {
      console.error('Error loading current league permissions:', error);
      this._currentLeaguePermissions.set({});
    } finally {
      this._isLoadingPermissions.set(false);
    }
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Refresh memberships data
   */
  async refresh(): Promise<void> {
    await this.loadUserMemberships();
  }
}
