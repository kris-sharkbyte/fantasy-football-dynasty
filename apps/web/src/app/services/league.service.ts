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
  getDoc,
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
  LeaguePhase,
} from '../../../../../libs/types/src/lib/types';

export interface CreateLeagueData {
  name: string;
  description?: string;
  numberOfTeams: number;
  rules: LeagueRules;
  isPrivate: boolean;
}

export interface FirestoreLeague {
  id: string;
  name: string;
  description?: string;
  numberOfTeams: number;
  currentYear: number;
  phase: LeaguePhase;
  status: 'active' | 'inactive' | 'completed' | 'drafting' | 'free-agency';
  isPrivate: boolean;
  joinCode: string;
  rules: LeagueRules;
  draftOrder?: string[]; // team IDs in draft order
  createdAt: Date;
  updatedAt: Date;
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
   * Set the selected league ID
   */
  setSelectedLeagueId(leagueId: string | null) {
    this._selectedLeagueId.set(leagueId);
  }

  /**
   * Generate a unique join code for private leagues
   */
  private generateJoinCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Create a new league and associate it with the current user
   */
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
        scoring: this.mapScoringRules('ppr'), // Default to PPR for now
        cap: {
          salaryCap: leagueData.rules.cap.salaryCap,
          minimumSpend: leagueData.rules.cap.minimumSpend,
          deadMoneyRules: {
            preJune1: true,
            signingBonusAcceleration: true,
          },
        },
        contracts: {
          maxYears: leagueData.rules.contracts.maxYears,
          maxSigningBonus: leagueData.rules.contracts.maxSigningBonus,
          rookieScale: leagueData.rules.contracts.rookieScale,
        },
        draft: {
          mode: leagueData.rules.draft.mode,
          rounds: leagueData.rules.draft.rounds,
          timeLimit: leagueData.rules.draft.timeLimit,
          snakeOrder: leagueData.rules.draft.snakeOrder,
          autodraftDelay: leagueData.rules.draft.autodraftDelay,
          rookieAutoContracts: leagueData.rules.draft.rookieAutoContracts,
          veteranNegotiationWindow:
            leagueData.rules.draft.veteranNegotiationWindow,
        },
        freeAgency: {
          bidRounds: leagueData.rules.freeAgency.bidRounds,
          tieBreakers: leagueData.rules.freeAgency.tieBreakers,
        },
      };

      const firestoreLeague: Omit<FirestoreLeague, 'id'> = {
        name: leagueData.name,
        description: leagueData.description,
        numberOfTeams: leagueData.numberOfTeams,
        currentYear: new Date().getFullYear(),
        phase: 'offseason' as LeaguePhase,
        status: 'active',
        isPrivate: leagueData.isPrivate,
        joinCode: this.generateJoinCode(),
        rules: leagueRules,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add league to Firestore
      const docRef = await addDoc(
        collection(this.db, 'leagues'),
        firestoreLeague
      );

      // Create a default team for the league owner using the provided team name
      const teamId = await this.teamService.createTeam({
        leagueId: docRef.id,
        name: leagueData.name, // Assuming team name is the same as league name for now
        ownerUserId: currentUser.uid,
        capSpace: leagueData.rules.cap.salaryCap,
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

      // Query all leagues and check if user is a member in the members subcollection
      const leaguesRef = collection(this.db, 'leagues');
      const q = query(leaguesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const leagues: League[] = [];

      for (const leagueDoc of querySnapshot.docs) {
        try {
          // Check if user is a member by looking in the members subcollection
          const membersRef = collection(leagueDoc.ref, 'members');
          const memberQuery = query(
            membersRef,
            where('userId', '==', currentUser.uid)
          );
          const memberSnapshot = await getDocs(memberQuery);

          if (!memberSnapshot.empty) {
            // User is a member of this league
            const data = leagueDoc.data() as FirestoreLeague;
            leagues.push({
              id: leagueDoc.id,
              name: data.name,
              description: data.description,
              rules: data.rules,
              currentYear: data.currentYear,
              phase: data.phase,
              status: data.status,
              numberOfTeams: data.numberOfTeams || 0,
              isPrivate: data.isPrivate,
              joinCode: data.joinCode,
              draftOrder: data.draftOrder,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            });
          }
        } catch (error) {
          console.error(
            `Error checking membership for league ${leagueDoc.id}:`,
            error
          );
        }
      }

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
   * Search for public leagues
   */
  async searchPublicLeagues(searchTerm?: string): Promise<League[]> {
    try {
      const currentUser = this.authService.currentUser();
      if (!currentUser) {
        throw new Error('User must be authenticated to search leagues');
      }

      const leaguesRef = collection(this.db, 'leagues');
      let q = query(
        leaguesRef,
        where('isPrivate', '==', false),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const leagues: League[] = [];

      for (const leagueDoc of querySnapshot.docs) {
        try {
          // Check if user is already a member by looking in the members subcollection
          const membersRef = collection(leagueDoc.ref, 'members');
          const memberQuery = query(
            membersRef,
            where('userId', '==', currentUser.uid)
          );
          const memberSnapshot = await getDocs(memberQuery);

          if (!memberSnapshot.empty) {
            // User is already a member, skip this league
            continue;
          }

          const data = leagueDoc.data() as FirestoreLeague;

          // Only include leagues that match search term if provided
          if (
            !searchTerm ||
            data.name.toLowerCase().includes(searchTerm.toLowerCase())
          ) {
            leagues.push({
              id: leagueDoc.id,
              name: data.name,
              description: data.description,
              rules: data.rules,
              currentYear: data.currentYear,
              phase: data.phase,
              status: data.status,
              numberOfTeams: data.numberOfTeams || 0,
              isPrivate: data.isPrivate,
              joinCode: data.joinCode,
              draftOrder: data.draftOrder,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            });
          }
        } catch (error) {
          console.error(
            `Error checking membership for league ${leagueDoc.id}:`,
            error
          );
        }
      }

      return leagues;
    } catch (error) {
      console.error('Error searching public leagues:', error);
      throw error;
    }
  }

  /**
   * Join a league using a join code
   */
  async joinLeagueByCode(
    joinCode: string
  ): Promise<{ success: boolean; leagueId?: string; message: string }> {
    try {
      const currentUser = this.authService.currentUser();
      if (!currentUser) {
        throw new Error('User must be authenticated to join a league');
      }

      // Find league by join code
      const leaguesRef = collection(this.db, 'leagues');
      const q = query(
        leaguesRef,
        where('joinCode', '==', joinCode),
        where('status', '==', 'active')
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return {
          success: false,
          message: 'Invalid join code or league not found',
        };
      }

      const leagueDoc = querySnapshot.docs[0];
      const leagueData = leagueDoc.data() as FirestoreLeague;

      // Add user to league
      await this.leagueMembershipService.addMemberToLeague(
        leagueDoc.id,
        currentUser.uid,
        'member', // Assign lowest role type
        '' // Empty string for now - they'll need to create a team later
      );

      // Refresh user's leagues
      await this.loadUserLeagues();

      return {
        success: true,
        leagueId: leagueDoc.id,
        message: `Successfully joined ${leagueData.name}`,
      };
    } catch (error) {
      console.error('Error joining league:', error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to join league',
      };
    }
  }

  /**
   * Set draft order manually
   */
  async setDraftOrder(leagueId: string, teamIds: string[]): Promise<void> {
    try {
      const leagueRef = doc(this.db, 'leagues', leagueId);
      await updateDoc(leagueRef, {
        draftOrder: teamIds,
        updatedAt: Timestamp.now(),
      });

      // Refresh user's leagues
      await this.loadUserLeagues();
    } catch (error) {
      console.error('Error setting draft order:', error);
      throw error;
    }
  }

  /**
   * Randomize draft order
   */
  async randomizeDraftOrder(leagueId: string): Promise<void> {
    try {
      // Get teams for the league
      const teamsResponse = await this.getLeagueTeams(leagueId);
      const teams = teamsResponse.teams;

      if (!teams || teams.length === 0) {
        throw new Error('No teams found in league');
      }

      // Shuffle teams randomly
      const shuffledTeams = [...teams];
      for (let i = shuffledTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledTeams[i], shuffledTeams[j]] = [
          shuffledTeams[j],
          shuffledTeams[i],
        ];
      }

      // Extract team IDs in the new order
      const teamIds = shuffledTeams.map((team) => team.id);

      // Save the new draft order
      await this.setDraftOrder(leagueId, teamIds);
    } catch (error) {
      console.error('Error randomizing draft order:', error);
      throw error;
    }
  }

  /**
   * Get current draft order for a league
   */
  async getDraftOrder(leagueId: string): Promise<string[]> {
    try {
      const league = await this.getLeague(leagueId);
      return league?.league.draftOrder || [];
    } catch (error) {
      console.error('Error getting draft order:', error);
      return [];
    }
  }

  /**
   * Refresh leagues data
   */
  async refresh(): Promise<void> {
    await this.loadUserLeagues();
  }
}
