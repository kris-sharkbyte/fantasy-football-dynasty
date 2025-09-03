import { Injectable, signal, computed, effect, inject } from '@angular/core';
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
  writeBatch,
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import {
  LeagueMembershipService,
  LeaguePermissions,
} from './league-membership.service';
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
  EnhancedSportsPlayer,
  TeamLocation,
} from '../../../../../libs/types/src/lib/types';
import {
  LeagueSetupService,
  LeagueSetupData,
  PlayerSetupResult,
} from '../../../../../libs/domain/src/lib/league-setup.service';
import { SportsDataService } from './sports-data.service';
import { SportsPlayer } from '../../../../../libs/domain/src/lib/league-setup.service';

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

// New interfaces for cached data
export interface LeagueTeam {
  id: string;
  leagueId: string;
  name: string;
  ownerUserId: string;
  capSpace: number;
  roster: any[];
  location?: TeamLocation; // Optional for backward compatibility
  createdAt: Date;
  updatedAt: Date;
}

export interface LeagueMember {
  userId: string;
  leagueId: string;
  role: 'owner' | 'commissioner' | 'general-manager' | 'member';
  teamName: string;
  teamId: string;
  capSpace: number;
  roster: any[];
  joinedAt: Date;
  isActive: boolean;
  permissions: LeaguePermissions;
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
  private readonly leagueSetupService = inject(LeagueSetupService);
  private readonly sportsDataService = inject(SportsDataService);

  private _userLeagues = signal<League[]>([]);
  private _isLoading = signal(false);
  private _error = signal<string | null>(null);
  private _selectedLeagueId = signal<string | null>(null);

  // New: Cached league data signals
  private _leagueTeams = signal<LeagueTeam[]>([]);
  private _leagueMembers = signal<LeagueMember[]>([]);
  private _isLoadingLeagueData = signal(false);

  // Public readonly signals
  public userLeagues = this._userLeagues.asReadonly();
  public isLoading = this._isLoading.asReadonly();
  public error = this._error.asReadonly();
  public hasLeagues = computed(() => this._userLeagues().length > 0);
  public selectedLeagueId = this._selectedLeagueId.asReadonly();
  public hasSelectedLeague = computed(() => this._selectedLeagueId() !== null);
  public selectedLeague = computed(() =>
    this._userLeagues().find((league) => league.id === this._selectedLeagueId())
  );

  // New: Public cached data signals
  public leagueTeams = this._leagueTeams.asReadonly();
  public leagueMembers = this._leagueMembers.asReadonly();
  public isLoadingLeagueData = this._isLoadingLeagueData.asReadonly();
  public hasLeagueData = computed(
    () => this._leagueTeams().length > 0 || this._leagueMembers().length > 0
  );

  // New: Computed values for easy access
  public currentUserTeam = computed(() => {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return null;

    return this._leagueMembers().find(
      (member) => member.userId === currentUser.uid && member.isActive
    );
  });

  public currentUserTeamId = computed(
    () => this.currentUserTeam()?.teamId || null
  );
  public currentUserRole = computed(() => this.currentUserTeam()?.role || null);
  public teamsCount = computed(() => this._leagueTeams().length);

  // Effect: Automatically load permissions when selected league changes
  constructor() {
    effect(() => {
      const selectedLeagueId = this._selectedLeagueId();
      console.log(
        'Selected league changed, loading permissions for:',
        selectedLeagueId
      );

      if (selectedLeagueId) {
        // Load permissions for the new selected league
        this.leagueMembershipService.loadCurrentLeaguePermissions(
          selectedLeagueId
        );

        // Load all league data when league is selected
        this.loadLeagueData(selectedLeagueId);
      } else {
        // Clear cached data when no league is selected
        this._leagueTeams.set([]);
        this._leagueMembers.set([]);
      }
    });
  }

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
        roster: {
          minPlayers: leagueData.rules.roster.minPlayers,
          maxPlayers: leagueData.rules.roster.maxPlayers,
          positionRequirements: leagueData.rules.roster.positionRequirements,
          allowIR: leagueData.rules.roster.allowIR,
          allowTaxi: leagueData.rules.roster.allowTaxi,
          maxIR: leagueData.rules.roster.maxIR,
          maxTaxi: leagueData.rules.roster.maxTaxi,
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

      // Add user as owner to the league (auto-creates team)
      await this.leagueMembershipService.addMemberToLeague(
        docRef.id,
        currentUser.uid,
        'owner'
      );

      // Refresh user's leagues
      await this.loadUserLeagues();

      // Set up league players with personalities
      await this.setupLeaguePlayers(docRef.id, leagueRules);

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
   * Set up league players with personalities and store them in Firestore
   */
  private async setupLeaguePlayers(
    leagueId: string,
    rules: LeagueRules
  ): Promise<void> {
    try {
      const leagueSetupData: LeagueSetupData = {
        name: 'Temp League',
        numberOfTeams: 12,
        currentYear: new Date().getFullYear(),
        rules,
        isPrivate: false,
      };

      // Get enhanced players that already have calculated overall ratings
      const enhancedPlayers =
        this.sportsDataService.enhancedPlayers() as EnhancedSportsPlayer[];

      // Create a simple result structure that matches what LeagueSetupService expects
      const result = {
        players: enhancedPlayers.map((player) => ({
          enhancedPlayer: player,
          overall: player.overall || 70, // Use the pre-calculated overall
          minimumContract: this.calculateMarketAdjustedContract(
            player.overall || 70,
            player.Position || 'QB',
            enhancedPlayers, // Pass all players for market analysis
            rules, // Pass league rules for demand calculation
            12 // Default to 12 teams for demand calculation
          ),
        })),
      };

      // Log market summary for validation
      this.logMarketSummary(result.players);

      const batch = writeBatch(this.db);
      const playersCollection = collection(
        this.db,
        'leagues',
        leagueId,
        'players'
      );

      // Filter for only fantasy-relevant positions and active players (including IDP)
      const fantasyPositions = [
        'QB',
        'RB',
        'WR',
        'TE',
        'K',
        'DEF',
        'DL', // Added for IDP
        'LB', // Added for IDP
        'DB', // Added for IDP
      ];
      const activePlayers = result.players.filter(
        (player) =>
          fantasyPositions.includes(player.enhancedPlayer.Position) &&
          player.enhancedPlayer.Team !== 'FA' // Only active players
      );

      for (const playerResult of activePlayers) {
        const { enhancedPlayer, overall, minimumContract } = playerResult;

        const playerDoc = {
          playerId: enhancedPlayer.PlayerID.toString(), // Use PlayerID from enhanced player
          name: enhancedPlayer.FirstName + ' ' + enhancedPlayer.LastName,
          position: enhancedPlayer.Position,
          age: enhancedPlayer.Age || 25,
          overall,
          nflTeam: enhancedPlayer.Team || 'FA',
          devGrade: this.getDevGradeFromOverall(overall),
          yearsExp: enhancedPlayer.Experience || 0,
          traits: {
            speed: 0,
            strength: 0,
            agility: 0,
            awareness: 0,
            injury: 0,
            schemeFit: [],
          },
          stats: [], // Stats are already factored into the overall rating
          personality: {
            type: 'Balanced',
            rarity: 'Common',
            traits: [],
            weights: {},
            behaviors: {},
            hiddenSliders: {},
            feedbackTemplates: {},
            blending: {},
            tradePreferences: {},
            marketContext: {},
            evolution: {},
          },
          minimumContract,
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true,
        };
        const playerRef = doc(playersCollection);
        batch.set(playerRef, playerDoc);
      }
      await batch.commit();
      console.log(
        `Successfully created ${activePlayers.length} player records for league ${leagueId}`
      );
    } catch (error) {
      console.error('Error setting up league players:', error);
    }
  }

  /**
   * Calculate a realistic minimum contract based on position, overall, and market dynamics
   */
  private calculateSimpleMinimumContract(
    overall: number,
    position: string,
    playerStats?: any,
    leagueRules?: LeagueRules
  ): number {
    const salaryCap = 200000000; // $200M salary cap

    // Base market value per overall point (much more realistic)
    let baseValue = overall * 500000; // $500K per overall point instead of $1M

    // Calculate dynamic position multiplier based on fantasy performance and league rules
    const positionMultiplier = this.calculateDynamicPositionMultiplier(
      position,
      playerStats,
      leagueRules
    );

    baseValue *= positionMultiplier;

    // Enhanced QB tiering for more realistic contracts
    if (position === 'QB') {
      baseValue = this.calculateQBContract(overall, baseValue);
    } else if (position === 'RB') {
      baseValue = this.calculateRBContract(overall, baseValue);
    } else if (position === 'WR') {
      baseValue = this.calculateWRContract(overall, baseValue);
    } else if (position === 'TE') {
      baseValue = this.calculateTEContract(overall, baseValue);
    } else if (position === 'DL') {
      baseValue = this.calculateDLContract(overall, baseValue);
    } else if (position === 'LB') {
      baseValue = this.calculateLBContract(overall, baseValue);
    } else if (position === 'DB') {
      baseValue = this.calculateDBContract(overall, baseValue);
    } else if (position === 'K') {
      baseValue = this.calculateKContract(overall, baseValue);
    } else if (position === 'DEF') {
      baseValue = this.calculateDEFContract(overall, baseValue);
    } else {
      // Overall rating tiers for other positions
      baseValue = this.applyRatingTiers(overall, baseValue);
    }

    // Cap constraints - ensure no single player can consume more than 15% of cap
    const maxContractValue = salaryCap * 0.15; // $30M max instead of $50M
    baseValue = Math.min(baseValue, maxContractValue);

    // Minimum floor - ensure contracts aren't too low
    const minContractValue = 500000; // $500K minimum
    baseValue = Math.max(baseValue, minContractValue);

    // Round to nearest $100K for cleaner numbers
    const finalValue = Math.round(baseValue / 100000) * 100000;

    return finalValue;
  }

  /**
   * Calculate dynamic position multiplier based on fantasy performance and league rules
   */
  private calculateDynamicPositionMultiplier(
    position: string,
    playerStats?: any,
    leagueRules?: LeagueRules
  ): number {
    // Base position multipliers (fallback when no stats available)
    const baseMultipliers: Record<string, number> = {
      QB: 2.0, // High base value
      RB: 1.8, // High value, but shorter careers
      WR: 1.6, // High value, longer careers
      TE: 1.4, // Good value, but less depth
      K: 0.3, // Lowest value position
      DEF: 0.4, // Low value, team-based
      DL: 0.8, // IDP positions have moderate value
      LB: 0.9, // IDP positions have moderate value
      DB: 0.7, // Lower value, many available
    };

    // If no stats available, return base multiplier
    if (!playerStats || !leagueRules) {
      return baseMultipliers[position] || 1.0;
    }

    // Calculate fantasy performance multiplier
    const fantasyMultiplier = this.calculateFantasyPerformanceMultiplier(
      position,
      playerStats,
      leagueRules
    );

    // Calculate league scoring multiplier
    const scoringMultiplier = this.calculateLeagueScoringMultiplier(
      position,
      leagueRules
    );

    // Combine multipliers (base + fantasy + scoring)
    const dynamicMultiplier =
      baseMultipliers[position] * fantasyMultiplier * scoringMultiplier;

    return dynamicMultiplier;
  }

  /**
   * Calculate fantasy performance multiplier based on actual stats
   */
  private calculateFantasyPerformanceMultiplier(
    position: string,
    playerStats: any,
    leagueRules: LeagueRules
  ): number {
    const fantasyPoints = playerStats.FantasyPoints || 0;
    const fantasyPointsPPR = playerStats.FantasyPointsPPR || 0;

    // Use PPR if available, otherwise standard
    const points = fantasyPointsPPR > 0 ? fantasyPointsPPR : fantasyPoints;

    if (points === 0) return 1.0; // No performance data

    // Calculate performance tier based on position
    let performanceMultiplier = 1.0;

    switch (position) {
      case 'QB':
        if (points >= 350)
          performanceMultiplier = 1.8; // Elite (Mahomes, Allen)
        else if (points >= 300) performanceMultiplier = 1.5; // Pro Bowl
        else if (points >= 250) performanceMultiplier = 1.2; // Good starter
        else if (points >= 200) performanceMultiplier = 1.0; // Average
        else if (points >= 150) performanceMultiplier = 0.8; // Below average
        else performanceMultiplier = 0.6; // Backup
        break;

      case 'RB':
        if (points >= 300)
          performanceMultiplier = 1.8; // Elite (McCaffrey, Ekeler)
        else if (points >= 250) performanceMultiplier = 1.5; // Pro Bowl
        else if (points >= 200) performanceMultiplier = 1.2; // Good starter
        else if (points >= 150) performanceMultiplier = 1.0; // Average
        else if (points >= 100) performanceMultiplier = 0.8; // Below average
        else performanceMultiplier = 0.6; // Backup
        break;

      case 'WR':
        if (points >= 250) performanceMultiplier = 1.8; // Elite (Adams, Hill)
        else if (points >= 200) performanceMultiplier = 1.5; // Pro Bowl
        else if (points >= 150) performanceMultiplier = 1.2; // Good starter
        else if (points >= 100) performanceMultiplier = 1.0; // Average
        else if (points >= 75) performanceMultiplier = 0.8; // Below average
        else performanceMultiplier = 0.6; // Backup
        break;

      case 'TE':
        if (points >= 200)
          performanceMultiplier = 1.8; // Elite (Kelce, Andrews)
        else if (points >= 150) performanceMultiplier = 1.5; // Pro Bowl
        else if (points >= 100) performanceMultiplier = 1.2; // Good starter
        else if (points >= 75) performanceMultiplier = 1.0; // Average
        else if (points >= 50) performanceMultiplier = 0.8; // Below average
        else performanceMultiplier = 0.6; // Backup
        break;

      case 'K':
        if (points >= 150)
          performanceMultiplier = 1.4; // Elite (Tucker, Butker)
        else if (points >= 120) performanceMultiplier = 1.2; // Pro Bowl
        else if (points >= 100) performanceMultiplier = 1.0; // Good starter
        else if (points >= 80) performanceMultiplier = 0.8; // Average
        else performanceMultiplier = 0.6; // Below average
        break;

      case 'DEF':
        if (points >= 150)
          performanceMultiplier = 1.4; // Elite (Ravens, Patriots)
        else if (points >= 120) performanceMultiplier = 1.2; // Pro Bowl
        else if (points >= 100) performanceMultiplier = 1.0; // Good starter
        else if (points >= 80) performanceMultiplier = 0.8; // Average
        else performanceMultiplier = 0.6; // Below average
        break;

      // IDP positions
      case 'DL':
      case 'LB':
      case 'DB':
        if (points >= 200) performanceMultiplier = 1.6; // Elite
        else if (points >= 150) performanceMultiplier = 1.3; // Pro Bowl
        else if (points >= 100) performanceMultiplier = 1.1; // Good starter
        else if (points >= 75) performanceMultiplier = 1.0; // Average
        else if (points >= 50) performanceMultiplier = 0.8; // Below average
        else performanceMultiplier = 0.6; // Backup
        break;

      default:
        performanceMultiplier = 1.0;
    }

    return performanceMultiplier;
  }

  /**
   * Calculate league scoring multiplier based on scoring rules
   */
  private calculateLeagueScoringMultiplier(
    position: string,
    leagueRules: LeagueRules
  ): number {
    const scoring = leagueRules.scoring;

    // PPR leagues favor WRs and TEs more
    if (scoring.ppr > 0) {
      if (position === 'WR') return 1.2; // WRs get boost in PPR
      if (position === 'TE') return 1.1; // TEs get slight boost in PPR
      if (position === 'RB') return 1.0; // RBs stay same
    }

    // Standard scoring leagues favor RBs more
    if (scoring.ppr === 0) {
      if (position === 'RB') return 1.2; // RBs get boost in standard
      if (position === 'WR') return 0.9; // WRs get slight penalty in standard
      if (position === 'TE') return 0.9; // TEs get slight penalty in standard
    }

    // Half-PPR is balanced
    if (scoring.ppr === 0.5) {
      return 1.0; // No adjustments needed
    }

    return 1.0; // Default no change
  }

  /**
   * Calculate QB-specific contracts with realistic tiering
   */
  private calculateQBContract(overall: number, baseValue: number): number {
    // QB contracts should be more granular and realistic
    if (overall >= 95) {
      return baseValue * 1.8; // Elite QBs (Mahomes, Allen, etc.)
    } else if (overall >= 90) {
      return baseValue * 1.5; // Pro Bowl QBs (Lamar, etc.)
    } else if (overall >= 85) {
      return baseValue * 1.2; // Good starting QBs
    } else if (overall >= 80) {
      return baseValue * 1.0; // Average starting QBs
    } else if (overall >= 75) {
      return baseValue * 0.8; // Below average QBs
    } else if (overall >= 70) {
      return baseValue * 0.6; // Backup QBs
    } else {
      return baseValue * 0.4; // Practice squad/developmental QBs
    }
  }

  /**
   * Calculate RB-specific contracts with realistic tiering
   */
  private calculateRBContract(overall: number, baseValue: number): number {
    if (overall >= 95) {
      return baseValue * 1.8; // Top RBs (Saquon, Kamara, etc.)
    } else if (overall >= 90) {
      return baseValue * 1.5; // Good RBs (Mixon, Gordon, etc.)
    } else if (overall >= 85) {
      return baseValue * 1.2; // Solid RBs (McCaffrey, Barkley, etc.)
    } else if (overall >= 80) {
      return baseValue * 1.0; // Average RBs
    } else if (overall >= 75) {
      return baseValue * 0.8; // Below average RBs
    } else if (overall >= 70) {
      return baseValue * 0.6; // Practice squad/developmental RBs
    } else {
      return baseValue * 0.4; // Low-end RBs
    }
  }

  /**
   * Calculate WR-specific contracts with realistic tiering
   */
  private calculateWRContract(overall: number, baseValue: number): number {
    if (overall >= 95) {
      return baseValue * 1.8; // Top WRs (Adams, Metcalf, etc.)
    } else if (overall >= 90) {
      return baseValue * 1.5; // Good WRs (Hopkins, Waller, etc.)
    } else if (overall >= 85) {
      return baseValue * 1.2; // Solid WRs (Cooks, Adams, etc.)
    } else if (overall >= 80) {
      return baseValue * 1.0; // Average WRs
    } else if (overall >= 75) {
      return baseValue * 0.8; // Below average WRs
    } else if (overall >= 70) {
      return baseValue * 0.6; // Practice squad/developmental WRs
    } else {
      return baseValue * 0.4; // Low-end WRs
    }
  }

  /**
   * Calculate TE-specific contracts with realistic tiering
   */
  private calculateTEContract(overall: number, baseValue: number): number {
    if (overall >= 95) {
      return baseValue * 1.8; // Top TEs (Kittle, Kelce, etc.)
    } else if (overall >= 90) {
      return baseValue * 1.5; // Good TEs (Ebron, Rudolph, etc.)
    } else if (overall >= 85) {
      return baseValue * 1.2; // Solid TEs (Hockenson, Irwin, etc.)
    } else if (overall >= 80) {
      return baseValue * 1.0; // Average TEs
    } else if (overall >= 75) {
      return baseValue * 0.8; // Below average TEs
    } else if (overall >= 70) {
      return baseValue * 0.6; // Practice squad/developmental TEs
    } else {
      return baseValue * 0.4; // Low-end TEs
    }
  }

  /**
   * Calculate DL-specific contracts with realistic tiering
   */
  private calculateDLContract(overall: number, baseValue: number): number {
    if (overall >= 95) {
      return baseValue * 1.6; // Elite DLs (Garrett, Bosa, etc.)
    } else if (overall >= 90) {
      return baseValue * 1.3; // Pro Bowl DLs
    } else if (overall >= 85) {
      return baseValue * 1.1; // Solid starting DLs
    } else if (overall >= 80) {
      return baseValue * 1.0; // Average starting DLs
    } else if (overall >= 75) {
      return baseValue * 0.8; // Below average DLs
    } else if (overall >= 70) {
      return baseValue * 0.6; // Backup DLs
    } else {
      return baseValue * 0.4; // Practice squad DLs
    }
  }

  /**
   * Calculate LB-specific contracts with realistic tiering
   */
  private calculateLBContract(overall: number, baseValue: number): number {
    if (overall >= 95) {
      return baseValue * 1.6; // Elite LBs (Wagner, Kuechly, etc.)
    } else if (overall >= 90) {
      return baseValue * 1.3; // Pro Bowl LBs
    } else if (overall >= 85) {
      return baseValue * 1.1; // Solid starting LBs
    } else if (overall >= 80) {
      return baseValue * 1.0; // Average starting LBs
    } else if (overall >= 75) {
      return baseValue * 0.8; // Below average LBs
    } else if (overall >= 70) {
      return baseValue * 0.6; // Backup LBs
    } else {
      return baseValue * 0.4; // Practice squad LBs
    }
  }

  /**
   * Calculate DB-specific contracts with realistic tiering
   */
  private calculateDBContract(overall: number, baseValue: number): number {
    if (overall >= 95) {
      return baseValue * 1.6; // Elite DBs (Ramsey, Gilmore, etc.)
    } else if (overall >= 90) {
      return baseValue * 1.3; // Pro Bowl DBs
    } else if (overall >= 85) {
      return baseValue * 1.1; // Solid starting DBs
    } else if (overall >= 80) {
      return baseValue * 1.0; // Average starting DBs
    } else if (overall >= 75) {
      return baseValue * 0.8; // Below average DBs
    } else if (overall >= 70) {
      return baseValue * 0.6; // Backup DBs
    } else {
      return baseValue * 0.4; // Practice squad DBs
    }
  }

  /**
   * Calculate K-specific contracts with realistic tiering
   */
  private calculateKContract(overall: number, baseValue: number): number {
    if (overall >= 95) {
      return baseValue * 1.4; // Elite Ks (Tucker, Butker, etc.)
    } else if (overall >= 90) {
      return baseValue * 1.2; // Pro Bowl Ks
    } else if (overall >= 85) {
      return baseValue * 1.0; // Solid starting Ks
    } else if (overall >= 80) {
      return baseValue * 0.8; // Average starting Ks
    } else if (overall >= 75) {
      return baseValue * 0.6; // Below average Ks
    } else if (overall >= 70) {
      return baseValue * 0.4; // Backup Ks
    } else {
      return baseValue * 0.2; // Practice squad Ks
    }
  }

  /**
   * Calculate DEF-specific contracts with realistic tiering
   */
  private calculateDEFContract(overall: number, baseValue: number): number {
    if (overall >= 95) {
      return baseValue * 1.4; // Elite DEFs (Ravens, Patriots, etc.)
    } else if (overall >= 90) {
      return baseValue * 1.2; // Pro Bowl DEFs
    } else if (overall >= 85) {
      return baseValue * 1.0; // Solid starting DEFs
    } else if (overall >= 80) {
      return baseValue * 0.8; // Average starting DEFs
    } else if (overall >= 75) {
      return baseValue * 0.6; // Below average DEFs
    } else if (overall >= 70) {
      return baseValue * 0.4; // Backup DEFs
    } else {
      return baseValue * 0.2; // Practice squad DEFs
    }
  }

  /**
   * Apply rating tiers for non-QB positions
   */
  private applyRatingTiers(overall: number, baseValue: number): number {
    if (overall >= 95) {
      return baseValue * 2.0; // Elite superstars
    } else if (overall >= 90) {
      return baseValue * 1.6; // Pro Bowl level
    } else if (overall >= 85) {
      return baseValue * 1.3; // High-end starter
    } else if (overall >= 80) {
      return baseValue * 1.1; // Solid starter
    } else if (overall >= 75) {
      return baseValue * 0.9; // Average starter
    } else if (overall >= 70) {
      return baseValue * 1.0; // Average (no multiplier)
    } else {
      return baseValue * 0.7; // Below average
    }
  }

  /**
   * Calculate market-adjusted minimum contracts considering supply and demand
   */
  private calculateMarketAdjustedContract(
    overall: number,
    position: string,
    allPlayers: any[],
    leagueRules?: LeagueRules,
    numberOfTeams?: number
  ): number {
    // Get base contract value with dynamic position multipliers
    const baseContract = this.calculateSimpleMinimumContract(
      overall,
      position,
      this.findPlayerStats(allPlayers, overall, position), // Pass player stats
      leagueRules // Pass league rules
    );

    // Calculate market supply and demand for this position
    const positionPlayers = allPlayers.filter((p) => p.Position === position);
    const positionCount = positionPlayers.length;

    // Calculate league demand based on roster requirements
    const leagueDemand = this.calculateLeaguePositionDemand(
      position,
      leagueRules,
      numberOfTeams
    );

    // Position scarcity multipliers (fewer players = higher value)
    const scarcityMultipliers: Record<string, number> = {
      QB: 1.8, // Fewer QBs, higher value
      RB: 1.2, // Many RBs, moderate value
      WR: 1.0, // Many WRs, standard value
      TE: 1.3, // Fewer TEs, higher value
      K: 0.5, // Many Ks, lower value
      DEF: 0.6, // Many DEFs, lower value
      DL: 0.9, // Many DLs, moderate value
      LB: 0.8, // Many LBs, moderate value
      DB: 0.7, // Many DBs, lower value
    };

    const scarcityMultiplier = scarcityMultipliers[position] || 1.0;

    // Adjust based on overall rating distribution within position
    const positionOveralls = positionPlayers
      .map((p) => p.overall || 70)
      .sort((a, b) => b - a);
    const playerRank = positionOveralls.indexOf(overall) + 1;
    const totalInPosition = positionOveralls.length;

    // Top players in their position get premium
    let rankMultiplier = 1.0;
    if (playerRank <= Math.ceil(totalInPosition * 0.1)) {
      rankMultiplier = 1.4; // Top 10% get 40% premium
    } else if (playerRank <= Math.ceil(totalInPosition * 0.25)) {
      rankMultiplier = 1.2; // Top 25% get 20% premium
    } else if (playerRank <= Math.ceil(totalInPosition * 0.5)) {
      rankMultiplier = 1.0; // Top 50% get standard value
    } else if (playerRank <= Math.ceil(totalInPosition * 0.75)) {
      rankMultiplier = 0.8; // Bottom 25% get 20% discount
    } else {
      rankMultiplier = 0.6; // Bottom 10% get 40% discount
    }

    // Apply market adjustments
    let marketAdjustedValue =
      baseContract * scarcityMultiplier * rankMultiplier * leagueDemand;

    // Cap constraints - ensure no single player can consume more than 15% of cap
    const salaryCap = 200000000;
    const maxContractValue = salaryCap * 0.15; // $30M max instead of $50M
    marketAdjustedValue = Math.min(marketAdjustedValue, maxContractValue);

    // Minimum floor
    const minContractValue = 500000; // $500K minimum
    marketAdjustedValue = Math.max(marketAdjustedValue, minContractValue);

    // Round to nearest $100K
    const finalValue = Math.round(marketAdjustedValue / 100000) * 100000;

    return finalValue;
  }

  /**
   * Find player stats for a specific player
   */
  private findPlayerStats(
    allPlayers: any[],
    overall: number,
    position: string
  ): any {
    // Find the player with matching overall and position
    const player = allPlayers.find(
      (p) => p.Position === position && (p.overall || 70) === overall
    );

    // Return the stats if available
    return player?.stats || null;
  }

  /**
   * Calculate league-specific position demand based on roster requirements
   */
  private calculateLeaguePositionDemand(
    position: string,
    leagueRules?: LeagueRules,
    numberOfTeams?: number
  ): number {
    if (!leagueRules?.roster?.positionRequirements) {
      // Fallback to default demand if no league rules available
      return this.getDefaultPositionDemand(position);
    }

    const { positionRequirements } = leagueRules.roster;
    const requiredStarters =
      positionRequirements[position as keyof typeof positionRequirements] || 0;
    const totalStartersNeeded = requiredStarters * (numberOfTeams || 12);

    // Calculate how many players are available vs. needed
    const availablePlayers = this.getAvailablePlayersForPosition(position);
    const supplyDemandRatio = availablePlayers / totalStartersNeeded;

    // Convert ratio to demand multiplier
    // Lower ratio (fewer available players) = higher demand = higher contracts
    let demandMultiplier = 1.0;

    if (supplyDemandRatio < 1.5) {
      // Critical shortage - players get premium
      demandMultiplier = 1.8;
    } else if (supplyDemandRatio < 2.0) {
      // Moderate shortage - slight premium
      demandMultiplier = 1.4;
    } else if (supplyDemandRatio < 3.0) {
      // Balanced market - standard value
      demandMultiplier = 1.0;
    } else if (supplyDemandRatio < 4.0) {
      // Oversupply - slight discount
      demandMultiplier = 0.8;
    } else {
      // Heavy oversupply - significant discount
      demandMultiplier = 0.6;
    }

    return demandMultiplier;
  }

  /**
   * Get default position demand when league rules aren't available
   */
  private getDefaultPositionDemand(position: string): number {
    const defaultDemand: Record<string, number> = {
      QB: 1.6, // High demand, scarce
      RB: 1.2, // Moderate demand
      WR: 0.9, // Lower demand, abundant
      TE: 1.4, // Higher demand, scarce
      K: 0.5, // Low demand, very abundant
      DEF: 0.7, // Low demand, abundant
      DL: 0.8, // Moderate demand
      LB: 0.9, // Moderate demand
      DB: 0.7, // Lower demand
    };

    return defaultDemand[position] || 1.0;
  }

  /**
   * Get estimated available players for a position (simplified)
   */
  private getAvailablePlayersForPosition(position: string): number {
    // This is a simplified estimate - in a real system, you'd query actual available players
    const positionEstimates: Record<string, number> = {
      QB: 32, // ~32 starting QBs + some backups
      RB: 120, // ~4 per team + depth
      WR: 180, // ~6 per team + depth
      TE: 80, // ~2 per team + depth
      K: 64, // ~2 per team
      DEF: 32, // 1 per team
      DL: 96, // ~3 per team
      LB: 96, // ~3 per team
      DB: 120, // ~4 per team
    };

    return positionEstimates[position] || 50;
  }

  /**
   * Get the rating multiplier for a given overall rating
   */
  private getRatingMultiplier(overall: number): number {
    if (overall >= 95) return 2.0;
    if (overall >= 90) return 1.6;
    if (overall >= 85) return 1.3;
    if (overall >= 80) return 1.1;
    if (overall >= 75) return 0.9;
    if (overall >= 70) return 1.0;
    return 0.7;
  }

  /**
   * Get development grade from overall rating
   */
  private getDevGradeFromOverall(overall: number): string {
    if (overall >= 90) return 'A';
    if (overall >= 80) return 'B';
    if (overall >= 70) return 'C';
    return 'D';
  }

  /**
   * Get all players with personalities for a specific league
   */
  async getLeaguePlayers(leagueId: string): Promise<any[]> {
    try {
      const playersCollection = collection(
        this.db,
        'leagues',
        leagueId,
        'players'
      );
      const querySnapshot = await getDocs(playersCollection);

      const players: any[] = [];
      querySnapshot.forEach((doc) => {
        players.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return players;
    } catch (error) {
      console.error('Error fetching league players:', error);
      return [];
    }
  }

  /**
   * Get a specific player with personality data
   */
  async getLeaguePlayer(
    leagueId: string,
    playerId: string
  ): Promise<any | null> {
    try {
      const playerDoc = doc(this.db, 'leagues', leagueId, 'players', playerId);
      const playerSnapshot = await getDoc(playerDoc);

      if (playerSnapshot.exists()) {
        return {
          id: playerSnapshot.id,
          ...playerSnapshot.data(),
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching league player:', error);
      return null;
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

      // Also load user memberships to keep services in sync
      await this.leagueMembershipService.loadUserMemberships();
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
   * Load league data for a specific league
   */
  async loadLeagueData(leagueId: string): Promise<void> {
    try {
      this._isLoadingLeagueData.set(true);
      this._error.set(null);

      // Load league members (which contain team data)
      const members = await this.leagueMembershipService.getLeagueMembers(
        leagueId
      );

      // Transform members to both member and team formats
      const leagueMembers: LeagueMember[] = members.map((member) => ({
        userId: member.userId,
        leagueId: member.leagueId,
        role: member.role,
        teamName: member.teamName,
        teamId: member.teamId,
        capSpace: member.capSpace,
        roster: member.roster,
        joinedAt: member.joinedAt,
        isActive: member.isActive,
        permissions: member.permissions,
      }));

      const leagueTeams: LeagueTeam[] = members.map((member) => ({
        id: member.teamId,
        leagueId: member.leagueId,
        name: member.teamName,
        ownerUserId: member.userId,
        capSpace: member.capSpace,
        roster: member.roster,
        createdAt: member.joinedAt,
        updatedAt: member.joinedAt,
      }));

      // Update signals
      this._leagueMembers.set(leagueMembers);
      this._leagueTeams.set(leagueTeams);
    } catch (error) {
      console.error('[LeagueService] Error loading league data:', error);
      this._error.set(
        error instanceof Error ? error.message : 'Failed to load league data'
      );

      // Clear data on error
      this._leagueTeams.set([]);
      this._leagueMembers.set([]);
    } finally {
      this._isLoadingLeagueData.set(false);
    }
  }

  /**
   * Get teams for a league (now reads from cached signals)
   */
  async getLeagueTeams(leagueId: string): Promise<{ teams: LeagueTeam[] }> {
    try {
      // If we already have the data cached and it's for the requested league, return it
      if (
        this._selectedLeagueId() === leagueId &&
        this._leagueTeams().length > 0
      ) {
        console.log('Returning cached teams for league:', leagueId);
        return { teams: this._leagueTeams() };
      }

      // Otherwise, load the data
      await this.loadLeagueData(leagueId);
      return { teams: this._leagueTeams() };
    } catch (error) {
      console.error('Error fetching league teams:', error);
      return { teams: [] };
    }
  }

  /**
   * Get league members (now reads from cached signals)
   */
  async getLeagueMembers(leagueId: string): Promise<LeagueMember[]> {
    try {
      // If we already have the data cached and it's for the requested league, return it
      if (
        this._selectedLeagueId() === leagueId &&
        this._leagueMembers().length > 0
      ) {
        console.log('Returning cached members for league:', leagueId);
        return this._leagueMembers();
      }

      // Otherwise, load the data
      await this.loadLeagueData(leagueId);
      return this._leagueMembers();
    } catch (error) {
      console.error('Error fetching league members:', error);
      return [];
    }
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

      // Add user to league (auto-creates team with their display name)
      await this.leagueMembershipService.addMemberToLeague(
        leagueDoc.id,
        currentUser.uid,
        'member' // Assign lowest role type
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

  /**
   * Log market summary for validation of contract calculations
   */
  private logMarketSummary(
    players: {
      enhancedPlayer: EnhancedSportsPlayer;
      overall: number;
      minimumContract: number;
    }[]
  ) {
    const salaryCap = 200000000; // $200M salary cap
    const minContract = Math.min(...players.map((p) => p.minimumContract));
    const maxContract = Math.max(...players.map((p) => p.minimumContract));
    const avgContract =
      players.reduce((sum, p) => sum + p.minimumContract, 0) / players.length;

    console.log('Market Summary:');
    console.log(`  Salary Cap: $${salaryCap.toLocaleString()}`);
    console.log(`  Minimum Contract: $${minContract.toLocaleString()}`);
    console.log(`  Maximum Contract: $${maxContract.toLocaleString()}`);
    console.log(`  Average Contract: $${avgContract.toLocaleString()}`);
    console.log(`  Number of Players: ${players.length}`);

    // Analyze contracts by position
    this.analyzeContractsByPosition(players);

    // Analyze roster economics
    this.analyzeRosterEconomics(players);
  }

  /**
   * Analyze contracts by position to ensure market balance
   */
  private analyzeContractsByPosition(
    players: {
      enhancedPlayer: EnhancedSportsPlayer;
      overall: number;
      minimumContract: number;
    }[]
  ) {
    const positionAnalysis: Record<
      string,
      { count: number; min: number; max: number; avg: number; total: number }
    > = {};

    // Group players by position
    players.forEach((player) => {
      const position = player.enhancedPlayer.Position;
      if (!positionAnalysis[position]) {
        positionAnalysis[position] = {
          count: 0,
          min: Infinity,
          max: 0,
          avg: 0,
          total: 0,
        };
      }

      const analysis = positionAnalysis[position];
      analysis.count++;
      analysis.min = Math.min(analysis.min, player.minimumContract);
      analysis.max = Math.max(analysis.max, player.minimumContract);
      analysis.total += player.minimumContract;
    });

    // Calculate averages
    Object.keys(positionAnalysis).forEach((position) => {
      const analysis = positionAnalysis[position];
      analysis.avg = analysis.total / analysis.count;
    });

    // Log position analysis
    console.log('Position Analysis:');
    Object.entries(positionAnalysis)
      .sort(([, a], [, b]) => b.avg - a.avg) // Sort by average contract value
      .forEach(([position, analysis]) => {
        console.log(
          `  ${position}: ${
            analysis.count
          } players, $${analysis.min.toLocaleString()} - $${analysis.max.toLocaleString()}, Avg: $${analysis.avg.toLocaleString()}`
        );
      });
  }

  /**
   * Analyze roster economics and market balance
   */
  private analyzeRosterEconomics(
    players: {
      enhancedPlayer: EnhancedSportsPlayer;
      overall: number;
      minimumContract: number;
    }[]
  ) {
    const salaryCap = 200000000;
    const maxPlayerContract = salaryCap * 0.15; // $30M max per player
    const defaultRosterRequirements = {
      QB: 2,
      RB: 4,
      WR: 6,
      TE: 2,
      K: 1,
      DEF: 1,
      DL: 3,
      LB: 3,
      DB: 4,
    };
    const numberOfTeams = 12;

    console.log('Roster Economics Analysis:');
    console.log(`  League Size: ${numberOfTeams} teams`);
    console.log(
      `  Salary Cap per Team: $${(salaryCap / numberOfTeams).toLocaleString()}`
    );
    console.log(
      `  Max Contract per Player: $${maxPlayerContract.toLocaleString()} (15% of cap)`
    );

    // Calculate total roster cost for each position
    Object.entries(defaultRosterRequirements).forEach(
      ([position, required]) => {
        const positionPlayers = players.filter(
          (p) => p.enhancedPlayer.Position === position
        );
        if (positionPlayers.length === 0) return;

        const topPlayers = positionPlayers
          .sort((a, b) => b.overall - a.overall)
          .slice(0, required * numberOfTeams);

        const totalCost = topPlayers.reduce(
          (sum, p) => sum + p.minimumContract,
          0
        );
        const avgCost = totalCost / topPlayers.length;
        const percentageOfCap = (totalCost / numberOfTeams / salaryCap) * 100;

        console.log(`  ${position} (${required} per team):`);
        console.log(
          `    Top ${
            topPlayers.length
          } players cost: $${totalCost.toLocaleString()}`
        );
        console.log(`    Average cost: $${avgCost.toLocaleString()}`);
        console.log(
          `    Per team: $${(
            totalCost / numberOfTeams
          ).toLocaleString()} (${percentageOfCap.toFixed(1)}% of cap)`
        );
      }
    );
  }
}
