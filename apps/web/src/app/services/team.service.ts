import { Injectable, signal, computed, inject } from '@angular/core';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  Firestore,
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { Team } from '@fantasy-football-dynasty/types';

export interface CreateTeamData {
  leagueId: string;
  name: string;
  ownerUserId: string;
  capSpace: number;
}

export interface FirestoreTeam
  extends Omit<Team, 'id' | 'createdAt' | 'updatedAt'> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

@Injectable({
  providedIn: 'root',
})
export class TeamService {
  private readonly db = inject(Firestore);
  private readonly authService = inject(AuthService);

  private _userTeams = signal<Team[]>([]);
  private _isLoading = signal(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  public userTeams = this._userTeams.asReadonly();
  public isLoading = this._isLoading.asReadonly();
  public error = this._error.asReadonly();
  public hasTeams = computed(() => this._userTeams().length > 0);

  /**
   * Create a new team
   */
  async createTeam(teamData: CreateTeamData): Promise<string> {
    try {
      this._isLoading.set(true);
      this._error.set(null);

      const firestoreTeam: Omit<FirestoreTeam, 'id'> = {
        leagueId: teamData.leagueId,
        name: teamData.name,
        ownerUserId: teamData.ownerUserId,
        capSpace: teamData.capSpace,
        roster: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Add team to Firestore
      const docRef = await addDoc(collection(this.db, 'teams'), firestoreTeam);

      // Refresh user's teams
      await this.loadUserTeams();

      return docRef.id;
    } catch (error) {
      console.error('Error creating team:', error);
      this._error.set(
        error instanceof Error ? error.message : 'Failed to create team'
      );
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Create a default team for a league owner
   */
  async createDefaultTeam(
    leagueId: string,
    leagueName: string,
    ownerUserId: string,
    salaryCap: number,
    ownerDisplayName?: string
  ): Promise<string> {
    const teamName = ownerDisplayName
      ? `${ownerDisplayName}'s Team`
      : `${leagueName} - Owner Team`;

    return this.createTeam({
      leagueId,
      name: teamName,
      ownerUserId,
      capSpace: salaryCap,
    });
  }

  /**
   * Load all teams for the current user
   */
  async loadUserTeams(): Promise<void> {
    try {
      this._isLoading.set(true);
      this._error.set(null);

      const currentUser = this.authService.currentUser();
      if (!currentUser) {
        this._userTeams.set([]);
        return;
      }

      // Query teams where user is the owner
      const teamsRef = collection(this.db, 'teams');
      const q = query(
        teamsRef,
        where('ownerUserId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const teams: Team[] = [];

      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data() as FirestoreTeam;
        teams.push({
          id: doc.id,
          leagueId: data.leagueId,
          name: data.name,
          ownerUserId: data.ownerUserId,
          capSpace: data.capSpace,
          roster: data.roster,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        });
      });

      this._userTeams.set(teams);
    } catch (error) {
      console.error('Error loading user teams:', error);
      this._error.set(
        error instanceof Error ? error.message : 'Failed to load teams'
      );
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Get a specific team by ID
   */
  async getTeam(teamId: string): Promise<Team | null> {
    try {
      // This would need to be implemented with a getDoc call
      // For now, return from local state
      return this._userTeams().find((team) => team.id === teamId) || null;
    } catch (error) {
      console.error('Error getting team:', error);
      return null;
    }
  }

  /**
   * Get teams by league ID
   */
  async getTeamsByLeague(leagueId: string): Promise<Team[]> {
    try {
      const teamsRef = collection(this.db, 'teams');
      const q = query(
        teamsRef,
        where('leagueId', '==', leagueId),
        orderBy('createdAt', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const teams: Team[] = [];

      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data() as FirestoreTeam;
        teams.push({
          id: doc.id,
          leagueId: data.leagueId,
          name: data.name,
          ownerUserId: data.ownerUserId,
          capSpace: data.capSpace,
          roster: data.roster,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        });
      });

      return teams;
    } catch (error) {
      console.error('Error getting teams by league:', error);
      return [];
    }
  }

  /**
   * Update team information
   */
  async updateTeam(teamId: string, updates: Partial<Team>): Promise<void> {
    try {
      const teamRef = doc(this.db, 'teams', teamId);
      await updateDoc(teamRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });

      // Refresh user's teams
      await this.loadUserTeams();
    } catch (error) {
      console.error('Error updating team:', error);
      throw error;
    }
  }

  /**
   * Delete a team (only for team owner)
   */
  async deleteTeam(teamId: string): Promise<void> {
    try {
      const currentUser = this.authService.currentUser();
      if (!currentUser) {
        throw new Error('User must be authenticated to delete a team');
      }

      // Check if user is the owner
      const team = await this.getTeam(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      if (team.ownerUserId !== currentUser.uid) {
        throw new Error('Only team owner can delete the team');
      }

      await deleteDoc(doc(this.db, 'teams', teamId));

      // Refresh user's teams
      await this.loadUserTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
      throw error;
    }
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Refresh teams data
   */
  async refresh(): Promise<void> {
    await this.loadUserTeams();
  }
}
