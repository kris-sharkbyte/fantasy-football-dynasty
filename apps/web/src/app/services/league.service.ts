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
import { LeagueMembershipService } from './league-membership.service';
import { TeamService } from './team.service';
import { UserProfileService } from './user-profile.service';
import {
  League,
  LeagueRules,
  ScoringRules,
  CapRules,
  ContractRules,
  DraftRules,
  FreeAgencyRules,
} from '../../../../../libs/types/src/lib/types';

export interface CreateLeagueData {
  name: string;
  teamName: string;
  description?: string;
  type: string;
  scoring: string;
  teams: number;
  salaryCap: number;
  minSpend: number;
  maxContractYears: number;
  franchiseTagCost: number;
  allowVoidYears: boolean;
  rosterSize: number;
  taxiSquadSize: number;
  draftDate?: string;
  draftTimeLimit: number;
  requiredPositions: string[];
  inviteEmails?: string;
  entryFee: number;
  publicLeague: boolean;
}

export interface FirestoreLeague
  extends Omit<League, 'id' | 'createdAt' | 'updatedAt'> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  ownerUserId: string;
  memberUserIds: string[];
  status: 'active' | 'pending' | 'archived';
}

@Injectable({
  providedIn: 'root',
})
export class LeagueService {
  private readonly db = inject(Firestore);
  private readonly authService = inject(AuthService);
  private readonly leagueMembershipService = inject(LeagueMembershipService);
  private readonly teamService = inject(TeamService);
  private readonly userProfileService = inject(UserProfileService);

  private _userLeagues = signal<League[]>([]);
  private _isLoading = signal(false);
  private _error = signal<string | null>(null);
  private _selectedLeagueId = signal<string | null>(null);

  // Public readonly signals
  public userLeagues = this._userLeagues.asReadonly();
  public isLoading = this._isLoading.asReadonly();
  public error = this._error.asReadonly();
  public hasLeagues = computed(() => this._userLeagues().length > 0);
  public selectedLeagueId = this._selectedLeagueId.asReadonly();

  /**
   * Create a new league and associate it with the current user
   */
  /**
   * Set the selected league ID
   */
  setSelectedLeagueId(leagueId: string | null) {
    this._selectedLeagueId.set(leagueId);
  }

  async createLeague(leagueData: CreateLeagueData): Promise<string> {
    try {
      this._isLoading.set(true);
      this._error.set(null);

      const currentUser = this.authService.currentUser();
      if (!currentUser) {
        throw new Error('User must be authenticated to create a league');
      }

      // Convert form data to league structure
      const leagueRules: LeagueRules = {
        scoring: this.mapScoringRules(leagueData.scoring),
        cap: {
          salaryCap: leagueData.salaryCap,
          minimumSpend: leagueData.minSpend,
          deadMoneyRules: {
            preJune1: true,
            signingBonusAcceleration: true,
          },
        },
        contracts: {
          maxYears: leagueData.maxContractYears,
          maxSigningBonus: leagueData.salaryCap * 0.25, // 25% of cap
          rookieScale: true,
        },
        draft: {
          mode: 'snake',
          rounds: leagueData.rosterSize,
          timeLimit: leagueData.draftTimeLimit,
          snakeOrder: true,
          autodraftDelay: 30, // 30 seconds before autodraft
          rookieAutoContracts: true,
          veteranNegotiationWindow: 72, // 72 hours
        },
        freeAgency: {
          bidRounds: 30, // 30 seconds between rounds
          tieBreakers: ['guarantees', 'apy', 'length', 'random'],
        },
      };

      const firestoreLeague: Omit<FirestoreLeague, 'id'> = {
        name: leagueData.name,
        rules: leagueRules,
        currentYear: new Date().getFullYear(),
        phase: 'offseason',
        ownerUserId: currentUser.uid,
        memberUserIds: [currentUser.uid],
        status: 'active',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Add league to Firestore
      const docRef = await addDoc(
        collection(this.db, 'leagues'),
        firestoreLeague
      );

      // Create a default team for the league owner using the provided team name
      const teamId = await this.teamService.createTeam({
        leagueId: docRef.id,
        name: leagueData.teamName,
        ownerUserId: currentUser.uid,
        capSpace: leagueData.salaryCap,
      });

      // Add user as owner to the league with the team ID
      await this.leagueMembershipService.addMemberToLeague(
        docRef.id,
        currentUser.uid,
        'owner',
        teamId
      );

      // Refresh user's leagues
      await this.loadUserLeagues();

      return docRef.id;
    } catch (error) {
      console.error('Error creating league:', error);
      this._error.set(
        error instanceof Error ? error.message : 'Failed to create league'
      );
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load all leagues for the current user
   */
  async loadUserLeagues(): Promise<void> {
    try {
      this._isLoading.set(true);
      this._error.set(null);

      const currentUser = this.authService.currentUser();
      if (!currentUser) {
        this._userLeagues.set([]);
        return;
      }

      // Query leagues where user is a member
      const leaguesRef = collection(this.db, 'leagues');
      const q = query(
        leaguesRef,
        where('memberUserIds', 'array-contains', currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const leagues: League[] = [];

      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data() as FirestoreLeague;
        leagues.push({
          id: doc.id,
          name: data.name,
          rules: data.rules,
          currentYear: data.currentYear,
          phase: data.phase,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        });
      });

      this._userLeagues.set(leagues);
    } catch (error) {
      console.error('Error loading user leagues:', error);
      this._error.set(
        error instanceof Error ? error.message : 'Failed to load leagues'
      );
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Get a specific league by ID
   */
  async getLeague(leagueId: string): Promise<{ league: League } | null> {
    try {
      // This would need to be implemented with a getDoc call
      // For now, return from local state
      const league =
        this._userLeagues().find((league) => league.id === leagueId) || null;
      return league ? { league } : null;
    } catch (error) {
      console.error('Error getting league:', error);
      return null;
    }
  }

  /**
   * Get teams for a league (temporary mock implementation)
   * TODO: Implement proper team fetching
   */
  async getLeagueTeams(leagueId: string): Promise<{ teams: any[] }> {
    // For now, return mock data
    // In a real implementation, this would fetch from a teams collection
    return {
      teams: [
        {
          id: 'team1',
          leagueId,
          name: 'Team 1',
          ownerUserId: 'user1',
          capSpace: 100000000,
          roster: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'team2',
          leagueId,
          name: 'Team 2',
          ownerUserId: 'user2',
          capSpace: 100000000,
          roster: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
  }

  /**
   * Update league information
   */
  async updateLeague(
    leagueId: string,
    updates: Partial<League>
  ): Promise<void> {
    try {
      const leagueRef = doc(this.db, 'leagues', leagueId);
      await updateDoc(leagueRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });

      // Refresh user's leagues
      await this.loadUserLeagues();
    } catch (error) {
      console.error('Error updating league:', error);
      throw error;
    }
  }

  /**
   * Delete a league (only for league owner)
   */
  async deleteLeague(leagueId: string): Promise<void> {
    try {
      const currentUser = this.authService.currentUser();
      if (!currentUser) {
        throw new Error('User must be authenticated to delete a league');
      }

      // Check if user is the owner
      const league = await this.getLeague(leagueId);
      if (!league) {
        throw new Error('League not found');
      }

      // TODO: Add proper ownership check when we implement user profiles
      // For now, allow deletion if user is a member

      await deleteDoc(doc(this.db, 'leagues', leagueId));

      // Remove user from league members
      await this.leagueMembershipService.removeMemberFromLeague(
        leagueId,
        currentUser.uid
      );

      // Refresh user's leagues
      await this.loadUserLeagues();
    } catch (error) {
      console.error('Error deleting league:', error);
      throw error;
    }
  }

  /**
   * Map scoring system string to scoring rules
   */
  private mapScoringRules(scoringSystem: string): ScoringRules {
    switch (scoringSystem) {
      case 'ppr':
        return {
          ppr: 1.0,
          passingYards: 0.04,
          rushingYards: 0.1,
          receivingYards: 0.1,
          passingTouchdown: 4,
          rushingTouchdown: 6,
          receivingTouchdown: 6,
          interception: -2,
          fumble: -2,
          fieldGoal: 3,
          extraPoint: 1,
        };
      case 'half-ppr':
        return {
          ppr: 0.5,
          passingYards: 0.04,
          rushingYards: 0.1,
          receivingYards: 0.1,
          passingTouchdown: 4,
          rushingTouchdown: 6,
          receivingTouchdown: 6,
          interception: -2,
          fumble: -2,
          fieldGoal: 3,
          extraPoint: 1,
        };
      case 'standard':
        return {
          ppr: 0,
          passingYards: 0.04,
          rushingYards: 0.1,
          receivingYards: 0.1,
          passingTouchdown: 4,
          rushingTouchdown: 6,
          receivingTouchdown: 6,
          interception: -2,
          fumble: -2,
          fieldGoal: 3,
          extraPoint: 1,
        };
      default:
        return {
          ppr: 1.0,
          passingYards: 0.04,
          rushingYards: 0.1,
          receivingYards: 0.1,
          passingTouchdown: 4,
          rushingTouchdown: 6,
          receivingTouchdown: 6,
          interception: -2,
          fumble: -2,
          fieldGoal: 3,
          extraPoint: 1,
        };
    }
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Refresh leagues data
   */
  async refresh(): Promise<void> {
    await this.loadUserLeagues();
  }
}
