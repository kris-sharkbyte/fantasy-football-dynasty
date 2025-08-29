import { Injectable, signal, computed, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  writeBatch,
  getDoc,
} from '@angular/fire/firestore';
import {
  FAWeek,
  FABid,
  FAWeekState,
  FAWeekSettings,
  TeamFAStatus,
  OpenFASigning,
  ContractOffer,
  Player,
  Position,
  MarketContext,
  FAEvaluationResult,
  PlayerDecision,
} from '@fantasy-football-dynasty/types';
import { SportsDataService } from './sports-data.service';
import { TeamService } from './team.service';
import { LeagueService } from './league.service';
import { EnhancedPlayerMinimumService } from './enhanced-player-minimum.service';

export interface FAWeekBid {
  id: string;
  playerId: string;
  playerName: string;
  position: string;
  teamName: string;
  offer: ContractOffer;
  status: 'pending' | 'accepted' | 'shortlisted' | 'rejected';
  submittedAt: Date;
  feedback?: string;
}

export interface FAWeekPlayer {
  id: string;
  name: string;
  position: string;
  age: number;
  overall: number;
  nflTeam: string;
  bidCount: number;
  highestBid?: number;
  status: 'available' | 'bidding' | 'evaluating' | 'signed' | 'shortlisted';
}

@Injectable({
  providedIn: 'root',
})
export class FreeAgencyService {
  private readonly firestore = inject(Firestore);
  private readonly sportsDataService = inject(SportsDataService);
  private readonly teamService = inject(TeamService);
  private readonly leagueService = inject(LeagueService);
  private readonly enhancedPlayerMinimumService = inject(
    EnhancedPlayerMinimumService
  );

  // State signals
  public currentFAWeek = signal<FAWeek | null>(null);
  public activeBids = signal<FABid[]>([]);
  public teamStatuses = signal<TeamFAStatus[]>([]);
  public availablePlayers = signal<FAWeekPlayer[]>([]);
  public isReadyToAdvance = signal<boolean>(false);
  // New signals for week advancement
  public playerDecisions = signal<FAEvaluationResult[]>([]);
  public isAdvancingWeek = signal<boolean>(false);
  public weekAdvancementProgress = signal<string>('');

  // Computed signals
  public currentWeekNumber = computed(
    () => this.currentFAWeek()?.weekNumber || 0
  );
  public isFAWeekPhase = computed(
    () => this.currentFAWeek()?.phase === 'FA_WEEK'
  );
  public isOpenFAPhase = computed(
    () => this.currentFAWeek()?.phase === 'OPEN_FA'
  );
  public weekStatus = computed(
    () => this.currentFAWeek()?.status || 'inactive'
  );
  public readyTeamsCount = computed(() => {
    return this.currentFAWeek()?.readyTeams?.length || 0;
  });
  public totalTeamsCount = computed(() => {
    return this.leagueService.teamsCount();
  });

  // FA Week Settings (defaults)
  private defaultSettings: FAWeekSettings = {
    maxConcurrentOffers: 6,
    evaluationFrequency: 'weekly',
    shortlistSize: 3,
    trustPenalty: 0.2,
    marketRippleEnabled: true,
    openFADiscount: 20,
  };

  // Unsubscribe functions for real-time listeners
  private unsubscribeFunctions: (() => void)[] = [];

  constructor() {
    // Initialize service
    this.loadCurrentFAWeek();
  }

  /**
   * Load the current FA week for the active league
   */
  async loadCurrentFAWeek(): Promise<void> {
    try {
      const currentLeague = this.leagueService.selectedLeague();
      if (!currentLeague) return;

      // Check if FA week already exists
      const existingWeek = await this.getExistingFAWeek(currentLeague.id);

      if (existingWeek) {
        this.currentFAWeek.set(existingWeek);
      } else {
        // Create new FA week
        const newWeek = await this.createFAWeek(currentLeague.id, 1);
        this.currentFAWeek.set(newWeek);
      }

      // Set up real-time listeners
      this.setupRealtimeListeners(currentLeague.id);

      await this.loadAvailablePlayers();
      await this.loadTeamStatuses();

      // Check if ready to advance after initial load
      this.checkReadyToAdvance();
    } catch (error) {
      console.error('Failed to load FA week:', error);
    }
  }

  /**
   * Get existing FA week from Firestore
   */
  private async getExistingFAWeek(leagueId: string): Promise<FAWeek | null> {
    try {
      const faWeeksRef = collection(this.firestore, 'faWeeks');
      const q = query(
        faWeeksRef,
        where('leagueId', '==', leagueId),
        where('status', '==', 'active'),
        orderBy('weekNumber', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as FAWeek;
      }
      return null;
    } catch (error) {
      console.error('Error getting existing FA week:', error);
      return null;
    }
  }

  /**
   * Create a new FA week directly in Firestore
   */
  private async createFAWeek(
    leagueId: string,
    weekNumber: number
  ): Promise<FAWeek> {
    const faWeek: FAWeek = {
      id: `${leagueId}_week_${weekNumber}`,
      leagueId,
      weekNumber,
      phase: weekNumber <= 4 ? 'FA_WEEK' : 'OPEN_FA',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'active',
      readyTeams: [],
      evaluationResults: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to Firestore
    const faWeekRef = doc(this.firestore, 'faWeeks', faWeek.id);
    await setDoc(faWeekRef, faWeek);

    return faWeek;
  }

  /**
   * Set up real-time listeners for FA data
   */
  private setupRealtimeListeners(leagueId: string): void {
    // Listen to FA week changes
    const faWeekRef = doc(
      this.firestore,
      'faWeeks',
      `${leagueId}_week_${this.currentWeekNumber()}`
    );
    const unsubscribeFAWeek = onSnapshot(faWeekRef, (doc) => {
      if (doc.exists()) {
        const faWeek = { id: doc.id, ...doc.data() } as FAWeek;
        this.currentFAWeek.set(faWeek);

        // Check if ready to advance whenever FA week data changes
        this.checkReadyToAdvance();
      }
    });

    // Listen to active bids (current week + any carried over from previous weeks)
    const bidsRef = collection(this.firestore, 'faBids');
    const bidsQuery = query(
      bidsRef,
      where('leagueId', '==', leagueId),
      where('status', 'in', ['pending', 'evaluating', 'shortlisted'])
    );

    const unsubscribeBids = onSnapshot(bidsQuery, (snapshot) => {
      const bids: FABid[] = [];
      snapshot.forEach((doc) => {
        bids.push({ id: doc.id, ...doc.data() } as FABid);
      });
      this.activeBids.set(bids);
    });

    // Store unsubscribe functions
    this.unsubscribeFunctions.push(unsubscribeFAWeek, unsubscribeBids);
  }

  /**
   * Submit a bid for a player - direct Firestore operation
   */
  async submitBid(
    playerId: string,
    teamId: string,
    offer: ContractOffer
  ): Promise<FABid | null> {
    try {
      // Check if team can submit more bids
      if (!this.canSubmitBid(teamId)) {
        throw new Error('Maximum concurrent bids reached');
      }

      const currentWeek = this.currentFAWeek();
      if (!currentWeek) {
        throw new Error('No active FA week');
      }

      // Create bid with cleaner ID format (no week number in ID)
      const bid: FABid = {
        id: `${currentWeek.leagueId}_bid_${Date.now()}`,
        leagueId: currentWeek.leagueId,
        teamId,
        playerId,
        weekNumber: currentWeek.weekNumber,
        offer,
        status: 'pending',
        submittedAt: new Date(),
      };

      // Save directly to Firestore
      const bidRef = doc(this.firestore, 'faBids', bid.id);
      await setDoc(bidRef, bid);

      // Don't update local state immediately - let the Firestore listener handle it
      // This prevents duplicate entries when the listener fires

      return bid;
    } catch (error) {
      console.error('Failed to submit bid:', error);
      return null;
    }
  }

  /**
   * Check if a team can submit more bids
   */
  canSubmitBid(teamId: string): boolean {
    const teamBids = this.activeBids().filter(
      (bid) => bid.teamId === teamId && bid.status === 'pending'
    );
    return teamBids.length < this.defaultSettings.maxConcurrentOffers;
  }

  /**
   * Mark a team as ready to advance to the next week
   */
  async markTeamReady(teamId: string): Promise<void> {
    try {
      const currentWeek = this.currentFAWeek();
      if (!currentWeek) {
        return;
      }

      // Add team to ready list if not already there
      if (!currentWeek.readyTeams.includes(teamId)) {
        const updatedReadyTeams = [...currentWeek.readyTeams, teamId];

        // Update Firestore directly
        const faWeekRef = doc(this.firestore, 'faWeeks', currentWeek.id);
        await updateDoc(faWeekRef, {
          readyTeams: updatedReadyTeams,
          updatedAt: new Date(),
        });

        // Update local state
        this.currentFAWeek.set({
          ...currentWeek,
          readyTeams: updatedReadyTeams,
          updatedAt: new Date(),
        });

        // Update team status
        this.teamStatuses.update((statuses) =>
          statuses.map((status) =>
            status.teamId === teamId
              ? { ...status, isReady: true, lastActivity: new Date() }
              : status
          )
        );

        // Check if all teams are ready
        this.checkReadyToAdvance();
      }
    } catch (error) {
      console.error('Failed to mark team ready:', error);
    }
  }

  /**
   * Check if all teams are ready to advance
   */
  private checkReadyToAdvance(): void {
    const currentWeek = this.currentFAWeek();
    if (!currentWeek?.readyTeams) {
      this.isReadyToAdvance.set(false);
      return;
    }

    const totalTeams = this.leagueService.teamsCount();
    const readyTeamsCount = currentWeek.readyTeams.length;
    const isReady = totalTeams > 0 && readyTeamsCount === totalTeams;

    this.isReadyToAdvance.set(isReady);
  }

  /**
   * Advance to next week (commissioner only)
   */
  async advanceToNextWeek(): Promise<boolean> {
    try {
      const currentWeek = this.currentFAWeek();
      if (!currentWeek) {
        throw new Error('No active FA week found');
      }

      this.isAdvancingWeek.set(true);
      this.weekAdvancementProgress.set('Processing player decisions...');

      // Process weekly player evaluation before advancing
      await this.processWeeklyPlayerEvaluation();

      this.weekAdvancementProgress.set('Carrying over active bids...');

      // Carry over non-rejected bids to next week
      await this.carryOverActiveBids(currentWeek.weekNumber + 1);

      this.weekAdvancementProgress.set('Updating player statuses...');

      // Update current week status to completed
      const faWeekRef = doc(this.firestore, 'faWeeks', currentWeek.id);
      await updateDoc(faWeekRef, {
        status: 'completed',
        updatedAt: new Date(),
      });

      this.weekAdvancementProgress.set('Creating next week...');

      // Create next week
      const nextWeek = await this.createFAWeek(
        currentWeek.leagueId,
        currentWeek.weekNumber + 1
      );

      // Update current week reference
      this.currentFAWeek.set(nextWeek);

      this.weekAdvancementProgress.set('Week advancement complete!');

      // Reset advancement state after a delay
      setTimeout(() => {
        this.isAdvancingWeek.set(false);
        this.weekAdvancementProgress.set('');
      }, 3000);

      return true;
    } catch (error) {
      console.error('Error advancing week:', error);
      this.isAdvancingWeek.set(false);
      this.weekAdvancementProgress.set('Error advancing week');
      return false;
    }
  }

  /**
   * Get player decisions for the current week
   */
  async getPlayerDecisions(): Promise<FAEvaluationResult[]> {
    try {
      const currentWeek = this.currentFAWeek();
      if (!currentWeek) return [];

      // Get evaluation results from the current week
      const decisions = currentWeek.evaluationResults || [];
      this.playerDecisions.set(decisions);
      return decisions;
    } catch (error) {
      console.error('Error getting player decisions:', error);
      return [];
    }
  }

  /**
   * Get detailed decision information for a specific player
   */
  getPlayerDecisionDetails(playerId: string): FAEvaluationResult | null {
    const decisions = this.playerDecisions();
    return decisions.find((decision) => decision.playerId === playerId) || null;
  }

  /**
   * Get all accepted contracts for the current week
   */
  getAcceptedContracts(): FABid[] {
    const decisions = this.playerDecisions();
    const acceptedBidIds = decisions
      .flatMap((decision) => decision.decisions)
      .filter((decision) => decision.acceptedBidId)
      .map((decision) => decision.acceptedBidId!);

    return this.activeBids().filter((bid) => acceptedBidIds.includes(bid.id));
  }

  /**
   * Get all shortlisted bids for the current week
   */
  getShortlistedBids(): FABid[] {
    const decisions = this.playerDecisions();
    const shortlistedBidIds = decisions
      .flatMap((decision) => decision.decisions)
      .flatMap((decision) => decision.shortlistedBidIds);

    return this.activeBids().filter((bid) =>
      shortlistedBidIds.includes(bid.id)
    );
  }

  /**
   * Get all rejected bids for the current week
   */
  getRejectedBids(): FABid[] {
    const decisions = this.playerDecisions();
    const rejectedBidIds = decisions
      .flatMap((decision) => decision.decisions)
      .flatMap((decision) => decision.rejectedBidIds);

    return this.activeBids().filter((bid) => rejectedBidIds.includes(bid.id));
  }

  /**
   * Trigger weekly player evaluation manually (for testing)
   */
  async triggerWeeklyEvaluation(): Promise<void> {
    try {
      await this.processWeeklyPlayerEvaluation();
    } catch (error) {
      console.error('Error triggering weekly evaluation:', error);
      throw error;
    }
  }

  /**
   * Process FA week evaluation (simulate player decisions)
   */
  private async processWeekEvaluation(): Promise<void> {
    try {
      const currentBids = this.activeBids();
      const pendingBids = currentBids.filter((bid) => bid.status === 'pending');

      // Simulate player decisions
      for (const bid of pendingBids) {
        const decision = this.simulatePlayerDecision(bid);

        // Update bid status in Firestore
        const bidRef = doc(this.firestore, 'faBids', bid.id);
        await updateDoc(bidRef, {
          status: decision.status,
          feedback: decision.feedback,
          evaluatedAt: new Date(),
        });

        // Update player status
        this.updatePlayerBidStatus(bid.playerId, decision.status);
      }
    } catch (error) {
      console.error('Failed to process week evaluation:', error);
    }
  }

  /**
   * Simulate a player's decision on a bid
   */
  private simulatePlayerDecision(bid: FABid): {
    status: 'accepted' | 'shortlisted' | 'rejected';
    feedback: string;
  } {
    const contract = bid.offer;

    // Simple decision logic based on offer value
    const isHighValue = contract.apy > 10000000; // $10M+ AAV
    const isLowValue = contract.apy < 2000000; // $2M- AAV

    if (isHighValue) {
      return {
        status: 'accepted',
        feedback: 'This is an excellent offer that meets my expectations!',
      };
    } else if (isLowValue) {
      return {
        status: 'rejected',
        feedback: 'This offer is below market value and I cannot accept it.',
      };
    } else {
      return {
        status: 'shortlisted',
        feedback: "I'm considering this offer along with others.",
      };
    }
  }

  /**
   * Load available players for FA
   */
  private async loadAvailablePlayers(): Promise<void> {
    try {
      // Wait for sports data to be loaded
      await this.sportsDataService.waitForData();

      // Get all active players from sports data service
      const allPlayers = this.sportsDataService.getActivePlayers();

      const availablePlayers: FAWeekPlayer[] = allPlayers
        .filter((player) => {
          // Filter out players without valid positions
          const hasValidPosition =
            player.Position &&
            player.Position !== 'NA' &&
            player.Position !== '';

          // Filter out players without names
          const hasValidName =
            player.FirstName &&
            player.LastName &&
            player.FirstName.trim() !== '' &&
            player.LastName.trim() !== '';

          return hasValidPosition && hasValidName;
        })
        .slice(0, 200) // Increased from 50 to 200 for better initial load
        .map((player) => ({
          id: player.PlayerID.toString(),
          name: `${player.FirstName} ${player.LastName}`,
          position: player.Position,
          age: player.Age,
          overall: player.overall || 70,
          nflTeam: player.Team || 'FA',
          bidCount: 0,
          status: 'available',
        }));

      this.availablePlayers.set(availablePlayers);
    } catch (error) {
      console.error('Failed to load available players:', error);
    }
  }

  /**
   * Load additional players (for pagination or search)
   */
  public async loadAdditionalPlayers(
    offset: number = 0,
    limit: number = 100
  ): Promise<FAWeekPlayer[]> {
    try {
      await this.sportsDataService.waitForData();

      const allPlayers = this.sportsDataService.getActivePlayers();

      const additionalPlayers: FAWeekPlayer[] = allPlayers
        .filter((player) => {
          const hasValidPosition =
            player.Position &&
            player.Position !== 'NA' &&
            player.Position !== '';

          const hasValidName =
            player.FirstName &&
            player.LastName &&
            player.FirstName.trim() !== '' &&
            player.LastName.trim() !== '';

          return hasValidPosition && hasValidName;
        })
        .slice(offset, offset + limit)
        .map((player) => ({
          id: player.PlayerID.toString(),
          name: `${player.FirstName} ${player.LastName}`,
          position: player.Position,
          age: player.Age,
          overall: player.overall || 70,
          nflTeam: player.Team || 'FA',
          bidCount: 0,
          status: 'available',
        }));

      return additionalPlayers;
    } catch (error) {
      console.error('Failed to load additional players:', error);
      return [];
    }
  }

  /**
   * Search players by name or team
   */
  public async searchPlayers(query: string): Promise<FAWeekPlayer[]> {
    try {
      await this.sportsDataService.waitForData();

      const allPlayers = this.sportsDataService.getActivePlayers();
      const searchQuery = query.toLowerCase();

      const searchResults: FAWeekPlayer[] = allPlayers
        .filter((player) => {
          const hasValidPosition =
            player.Position &&
            player.Position !== 'NA' &&
            player.Position !== '';

          const hasValidName =
            player.FirstName &&
            player.LastName &&
            player.FirstName.trim() !== '' &&
            player.LastName.trim() !== '';

          if (!hasValidPosition || !hasValidName) return false;

          const fullName =
            `${player.FirstName} ${player.LastName}`.toLowerCase();
          const team = (player.Team || '').toLowerCase();

          return fullName.includes(searchQuery) || team.includes(searchQuery);
        })
        .slice(0, 100) // Limit search results to 100
        .map((player) => ({
          id: player.PlayerID.toString(),
          name: `${player.FirstName} ${player.LastName}`,
          position: player.Position,
          age: player.Age,
          overall: player.overall || 70,
          nflTeam: player.Team || 'FA',
          bidCount: 0,
          status: 'available',
        }));

      return searchResults;
    } catch (error) {
      console.error('Failed to search players:', error);
      return [];
    }
  }

  /**
   * Load team statuses for the current FA week
   */
  private async loadTeamStatuses(): Promise<void> {
    try {
      // Get the actual teams from the league service
      const totalTeams = this.leagueService.teamsCount();

      if (totalTeams === 0) {
        // Fallback to default mock data if no teams found
        const mockStatuses: TeamFAStatus[] = [
          {
            teamId: 'team1',
            leagueId: this.currentFAWeek()?.leagueId || '',
            currentWeek: this.currentFAWeek()?.weekNumber || 1,
            activeBids: [],
            capHolds: 0,
            isReady: false,
            lastActivity: new Date(),
          },
        ];
        this.teamStatuses.set(mockStatuses);
        return;
      }

      // Create mock statuses for all teams in the league
      const mockStatuses: TeamFAStatus[] = [];
      for (let i = 1; i <= totalTeams; i++) {
        mockStatuses.push({
          teamId: `team${i}`,
          leagueId: this.currentFAWeek()?.leagueId || '',
          currentWeek: this.currentFAWeek()?.weekNumber || 1,
          activeBids: [],
          capHolds: 0,
          isReady: false,
          lastActivity: new Date(),
        });
      }

      this.teamStatuses.set(mockStatuses);
    } catch (error) {
      console.error('Failed to load team statuses:', error);
    }
  }

  /**
   * Update team bid status
   */
  private updateTeamBidStatus(teamId: string, bidId: string): void {
    this.teamStatuses.update((statuses) =>
      statuses.map((status) =>
        status.teamId === teamId
          ? { ...status, activeBids: [...status.activeBids, bidId] }
          : status
      )
    );
  }

  /**
   * Update player bid status
   */
  private updatePlayerBidStatus(playerId: string, status: string): void {
    this.availablePlayers.update((players) =>
      players.map((player) =>
        player.id === playerId ? { ...player, status: status as any } : player
      )
    );
  }

  /**
   * Get bids for a specific player
   */
  getPlayerBids(playerId: string): FABid[] {
    return this.activeBids().filter((bid) => bid.playerId === playerId);
  }

  /**
   * Get team's active bids
   */
  getTeamBids(teamId: string): FABid[] {
    return this.activeBids().filter((bid) => bid.teamId === teamId);
  }

  /**
   * Cancel a pending bid
   */
  async cancelBid(bidId: string): Promise<boolean> {
    try {
      const bidRef = doc(this.firestore, 'faBids', bidId);
      await updateDoc(bidRef, {
        status: 'cancelled',
        updatedAt: new Date(),
      });
      return true;
    } catch (error) {
      console.error('Error cancelling bid:', error);
      return false;
    }
  }

  // ============================================================================
  // PHASE 6: PLAYER DECISION SYSTEM
  // ============================================================================

  /**
   * Process weekly player evaluation for all pending bids
   */
  async processWeeklyPlayerEvaluation(): Promise<void> {
    try {
      console.log('[FA Service] Starting weekly player evaluation...');

      const currentWeek = this.currentFAWeek();
      if (!currentWeek || currentWeek.status !== 'active') {
        throw new Error('No active FA week found');
      }

      // Get all pending bids for the current week
      const pendingBids = this.activeBids().filter(
        (bid) =>
          bid.status === 'pending' && bid.weekNumber === currentWeek.weekNumber
      );

      console.log('[FA Service] Found pending bids:', pendingBids.length);

      if (pendingBids.length === 0) {
        console.log('[FA Service] No pending bids to evaluate');
        return;
      }

      // Create market context for evaluation
      const marketContext = await this.createMarketContext();
      console.log('[FA Service] Market context created:', marketContext);

      // Get all players for evaluation
      const allPlayers = await this.getAllPlayersForEvaluation();
      console.log('[FA Service] Players for evaluation:', allPlayers.length);

      // Process evaluation using FAWeekManager
      const evaluationResults = await this.evaluateAllPlayerBids(
        pendingBids,
        allPlayers,
        marketContext
      );
      console.log('[FA Service] Evaluation results:', evaluationResults.length);

      // Apply evaluation results
      await this.applyEvaluationResults(evaluationResults);

      // Update FA week status to evaluating
      await this.updateFAWeekStatus('evaluating');

      console.log(
        '[FA Service] Weekly player evaluation completed successfully'
      );
    } catch (error) {
      console.error('Error processing weekly player evaluation:', error);
      throw error;
    }
  }

  /**
   * Create market context for player evaluation
   */
  private async createMarketContext(): Promise<any> {
    const currentWeek = this.currentFAWeek();
    if (!currentWeek) {
      throw new Error('No active FA week');
    }

    // Get recent contracts for market context
    const recentContracts = await this.getRecentContracts();

    // Calculate positional demand based on available players and team needs
    const positionalDemand = await this.calculatePositionalDemand();

    // Get team cap space information
    const teamCapSpace = await this.getTeamCapSpace();

    // Determine season stage
    const seasonStage = this.determineSeasonStage(currentWeek.weekNumber);

    // Get league roster information for realistic market saturation
    const leagueRosterInfo = await this.getLeagueRosterInfo();

    // Return domain-compatible market context
    return {
      competingOffers: 0, // Default value
      positionalDemand,
      capSpaceAvailable: 0, // Default value
      recentComps: recentContracts,
      seasonStage: seasonStage === 'OpenFA' ? 'Camp' : seasonStage,
      teamReputation: 0.5, // Default neutral reputation
      currentWeek: currentWeek.weekNumber,
      leagueRosterInfo, // League roster information for realistic market behavior
    };
  }

  /**
   * Get league roster information for market saturation calculation
   */
  private async getLeagueRosterInfo(): Promise<any> {
    try {
      // Get current league from the FA week
      const currentWeek = this.currentFAWeek();
      if (!currentWeek) {
        console.warn('[FA Service] No current FA week for league roster info');
        return undefined;
      }

      // Get league data from league service
      const leagueData = this.leagueService.selectedLeague();
      if (!leagueData) {
        console.warn('[FA Service] No current league data for roster info');
        return undefined;
      }

      // Extract roster information
      const rosterRules = leagueData.rules.roster;
      if (!rosterRules) {
        console.warn('[FA Service] No roster rules found in league data');
        return undefined;
      }

      // Get team count from league members
      const teamCount = this.leagueService.leagueMembers().length;
      if (teamCount === 0) {
        console.warn('[FA Service] No teams found in league');
        return undefined;
      }

      return {
        teamCount,
        positionRequirements: rosterRules.positionRequirements,
        maxPlayers: rosterRules.maxPlayers,
        allowIR: rosterRules.allowIR,
        maxIR: rosterRules.maxIR,
      };
    } catch (error) {
      console.error('[FA Service] Error getting league roster info:', error);
      return undefined;
    }
  }

  /**
   * Get all players needed for evaluation
   */
  private async getAllPlayersForEvaluation(): Promise<Player[]> {
    const allPlayers = this.sportsDataService.getActivePlayers();

    // Convert SportsPlayer to Player interface
    return allPlayers.map((sportsPlayer) => ({
      id: sportsPlayer.PlayerID.toString(),
      name: `${sportsPlayer.FirstName} ${sportsPlayer.LastName}`,
      position: sportsPlayer.Position as Position,
      age: sportsPlayer.Age || 25,
      overall: sportsPlayer.overall || 70,
      yearsExp: sportsPlayer.Experience || 0,
      nflTeam: sportsPlayer.Team || 'FA',
      status: sportsPlayer.Status,
      devGrade: 'C' as const, // Default grade for FA players
      traits: {
        speed: 50,
        strength: 50,
        agility: 50,
        awareness: 50,
        injury: 50,
        schemeFit: [],
      },
      stats: [], // Empty stats for FA players
    }));
  }

  /**
   * Evaluate all player bids using FAWeekManager
   */
  private async evaluateAllPlayerBids(
    bids: FABid[],
    players: Player[],
    marketContext: any
  ): Promise<FAEvaluationResult[]> {
    console.log('[FA Service] evaluateAllPlayerBids called with:', {
      bidCount: bids.length,
      playerCount: players.length,
      marketContext: marketContext,
    });

    // Import FAWeekManager from domain
    const { FAWeekManager } = await import('@fantasy-football-dynasty/domain');
    console.log('[FA Service] FAWeekManager imported successfully');

    // Use the existing FAWeekManager to process evaluation
    const results = FAWeekManager.processFAWeekEvaluation(
      bids,
      players,
      marketContext,
      this.defaultSettings
    );

    console.log(
      '[FA Service] FAWeekManager evaluation completed, results:',
      results.length
    );
    return results;
  }

  /**
   * Apply evaluation results to bids and update player statuses
   */
  private async applyEvaluationResults(
    results: FAEvaluationResult[]
  ): Promise<void> {
    console.log(
      '[FA Service] Applying evaluation results for',
      results.length,
      'players'
    );

    const batch = writeBatch(this.firestore);

    for (const result of results) {
      console.log(
        '[FA Service] Processing result for player:',
        result.playerId
      );

      const decision = result.decisions[0]; // Get the first decision
      if (!decision) {
        console.log(
          '[FA Service] No decision found for player:',
          result.playerId
        );
        continue;
      }

      console.log('[FA Service] Decision:', {
        playerId: result.playerId,
        acceptedBidId: decision.acceptedBidId,
        shortlistedCount: decision.shortlistedBidIds.length,
        rejectedCount: decision.rejectedBidIds.length,
        feedback: decision.feedback,
      });

      // Update accepted bid
      if (decision.acceptedBidId) {
        console.log(
          '[FA Service] Updating accepted bid:',
          decision.acceptedBidId
        );
        const acceptedBidRef = doc(
          this.firestore,
          'faBids',
          decision.acceptedBidId
        );
        batch.update(acceptedBidRef, {
          status: 'accepted',
          feedback: decision.feedback,
          evaluatedAt: new Date(),
        });

        // Add player to team roster
        console.log('[FA Service] Adding player to team roster...');
        await this.addPlayerToTeamRoster(
          result.playerId,
          decision.acceptedBidId
        );
      }

      // Update shortlisted bids
      for (const shortlistedBidId of decision.shortlistedBidIds) {
        console.log('[FA Service] Updating shortlisted bid:', shortlistedBidId);
        const shortlistedBidRef = doc(
          this.firestore,
          'faBids',
          shortlistedBidId
        );
        batch.update(shortlistedBidRef, {
          status: 'shortlisted',
          feedback: decision.feedback,
          evaluatedAt: new Date(),
        });
      }

      // Update rejected bids
      for (const rejectedBidId of decision.rejectedBidIds) {
        console.log('[FA Service] Updating rejected bid:', rejectedBidId);
        const rejectedBidRef = doc(this.firestore, 'faBids', rejectedBidId);
        batch.update(rejectedBidRef, {
          status: 'rejected',
          feedback: decision.feedback,
          evaluatedAt: new Date(),
        });
      }

      // Update player status
      console.log('[FA Service] Updating player status for:', result.playerId);
      await this.updatePlayerStatus(result.playerId, decision);
    }

    // Commit all updates
    console.log('[FA Service] Committing batch updates...');
    await batch.commit();
    console.log('[FA Service] Batch updates committed successfully');
  }

  /**
   * Update player status based on decision
   *
   * TODO: MIGRATION TO FIREBASE PLAYER COLLECTION
   * Currently using local JSON files from SportsDataService for player data.
   * In the future, we should migrate to a Firebase 'players' collection to:
   * - Track player statuses across leagues
   * - Enable real-time player updates
   * - Support player history and contract tracking
   * - Allow for dynamic player pools per league
   *
   * Migration steps:
   * 1. Create 'players' collection in Firestore
   * 2. Import initial player data from SportsDataService
   * 3. Update this method to use Firestore instead of local state
   * 4. Add player status change listeners
   * 5. Consider player data versioning for different leagues
   */
  private async updatePlayerStatus(
    playerId: string,
    decision: PlayerDecision
  ): Promise<void> {
    console.log('[FA Service] updatePlayerStatus called for player:', playerId);
    console.log('[FA Service] Decision details:', {
      acceptedBidId: decision.acceptedBidId,
      shortlistedCount: decision.shortlistedBidIds.length,
      rejectedCount: decision.rejectedBidIds.length,
    });

    // For now, skip updating player status since we're using local JSON data
    // and don't have a Firebase players collection yet
    console.log(
      '[FA Service] Skipping player status update - using local JSON data'
    );

    // TODO: When migrating to Firebase players collection, uncomment this code:
    /*
    const playerRef = doc(this.firestore, 'players', playerId);

    if (decision.acceptedBidId) {
      // Player signed a contract
      await updateDoc(playerRef, {
        status: 'signed',
        updatedAt: new Date(),
      });
    } else if (decision.shortlistedBidIds.length > 0) {
      // Player is considering offers
      await updateDoc(playerRef, {
        status: 'shortlisted',
        updatedAt: new Date(),
      });
    } else {
      // Player rejected all offers
      await updateDoc(playerRef, {
        status: 'available',
        updatedAt: new Date(),
      });
    }
    */
  }

  /**
   * Get recent contracts for market context
   */
  private async getRecentContracts(): Promise<ContractOffer[]> {
    // This would typically query recent signings from Firestore
    // For now, return empty array - can be enhanced later
    return [];
  }

  /**
   * Calculate positional demand based on available players and team needs
   */
  private async calculatePositionalDemand(): Promise<number> {
    // Simple calculation - can be enhanced with more sophisticated logic
    const availablePlayers = this.availablePlayers();
    const totalPlayers = availablePlayers.length;

    if (totalPlayers === 0) return 0.5;

    // Calculate demand based on position scarcity
    const positionCounts = availablePlayers.reduce((acc, player) => {
      acc[player.position] = (acc[player.position] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Higher demand for positions with fewer available players
    const avgPlayersPerPosition =
      totalPlayers / Object.keys(positionCounts).length;
    const demandScore =
      Object.values(positionCounts).reduce((sum, count) => {
        return sum + avgPlayersPerPosition / count;
      }, 0) / Object.keys(positionCounts).length;

    return Math.min(1, Math.max(0, demandScore / avgPlayersPerPosition));
  }

  /**
   * Get team cap space information
   */
  private async getTeamCapSpace(): Promise<Record<string, number>> {
    // This would typically query team cap information from Firestore
    // For now, return mock data - can be enhanced later
    return {};
  }

  /**
   * Determine season stage based on week number
   */
  private determineSeasonStage(
    weekNumber: number
  ): 'EarlyFA' | 'MidFA' | 'LateFA' | 'OpenFA' {
    if (weekNumber <= 1) return 'EarlyFA';
    if (weekNumber <= 2) return 'MidFA';
    if (weekNumber <= 4) return 'LateFA';
    return 'OpenFA';
  }

  /**
   * Calculate positional market trends
   */
  private calculatePositionalTrends(): Record<
    string,
    'rising' | 'falling' | 'stable'
  > {
    // This would analyze recent contract data to determine trends
    // For now, return stable for all positions
    const positions: Position[] = [
      'QB',
      'RB',
      'WR',
      'TE',
      'K',
      'DEF',
      'DL',
      'LB',
      'DB',
    ];
    return positions.reduce((acc, position) => {
      acc[position] = 'stable';
      return acc;
    }, {} as Record<string, 'rising' | 'falling' | 'stable'>);
  }

  /**
   * Calculate tier-based market trends
   */
  private calculateTierTrends(): Record<
    string,
    'rising' | 'falling' | 'stable'
  > {
    // This would analyze recent contract data by player tier
    // For now, return stable for all tiers
    return {
      elite: 'stable',
      starter: 'stable',
      depth: 'stable',
    };
  }

  /**
   * Update FA week status
   */
  private async updateFAWeekStatus(
    status: 'active' | 'evaluating' | 'completed'
  ): Promise<void> {
    const currentWeek = this.currentFAWeek();
    if (!currentWeek) return;

    const faWeekRef = doc(this.firestore, 'faWeeks', currentWeek.id);
    await updateDoc(faWeekRef, {
      status,
      updatedAt: new Date(),
    });
  }

  /**
   * Process open FA immediate signing - direct Firestore operation
   */
  async processOpenFASigning(
    playerId: string,
    teamId: string
  ): Promise<OpenFASigning | null> {
    try {
      if (!this.isOpenFAPhase()) {
        throw new Error('Open FA phase not active');
      }

      const currentWeek = this.currentFAWeek();
      if (!currentWeek) return null;

      // TODO: Calculate auto-priced contract using domain logic
      const autoContract: ContractOffer = {
        years: 1,
        baseSalary: { [new Date().getFullYear()]: 5000000 }, // $5M default
        signingBonus: 0,
        guarantees: [],
        contractType: 'prove_it',
        totalValue: 5000000,
        apy: 5000000,
      };

      const signing: OpenFASigning = {
        id: `${currentWeek.leagueId}_openfa_${playerId}_${teamId}`,
        leagueId: currentWeek.leagueId,
        teamId,
        playerId,
        contract: autoContract,
        signedAt: new Date(),
        marketPrice: autoContract.apy,
        discountApplied: this.defaultSettings.openFADiscount,
      };

      // Save to Firestore
      const signingRef = doc(this.firestore, 'openFASignings', signing.id);
      await setDoc(signingRef, signing);

      // Update player status
      this.updatePlayerBidStatus(playerId, 'signed');

      return signing;
    } catch (error) {
      console.error('Failed to process open FA signing:', error);
      return null;
    }
  }

  /**
   * Get player status information
   */
  getPlayerStatusInfo(
    playerId: string
  ): { isRetired: boolean; status: string; team: string } | null {
    const player = this.sportsDataService.getPlayerById(parseInt(playerId));
    if (!player) return null;

    const isRetired = player.Status !== 'Active';

    return {
      isRetired,
      status: player.Status,
      team: player.Team || 'FA',
    };
  }

  /**
   * Get enhanced player minimum using market ripple effects and league cap context
   */
  async getEnhancedPlayerMinimum(playerId: string): Promise<number | null> {
    const sportsPlayer = this.sportsDataService.getPlayerById(
      parseInt(playerId)
    );

    if (!sportsPlayer) return null;

    // Convert SportsPlayer to FAWeekPlayer format with calculated overall
    const player = {
      id: sportsPlayer.PlayerID.toString(),
      name: `${sportsPlayer.FirstName} ${sportsPlayer.LastName}`,
      position: sportsPlayer.Position,
      age: sportsPlayer.Age,
      overall: sportsPlayer.overall || 70,
      nflTeam: sportsPlayer.Team || 'FA',
      bidCount: 0,
      status: 'available',
    };

    return await this.enhancedPlayerMinimumService.calculatePlayerMinimum(
      player
    );
  }

  /**
   * Get market context summary for display
   */
  async getMarketContextSummary() {
    return await this.enhancedPlayerMinimumService.getMarketContextSummary();
  }

  /**
   * Clean up real-time listeners
   */
  cleanup(): void {
    this.unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeFunctions = [];
  }

  /**
   * Carry over non-rejected bids to the next week
   */
  private async carryOverActiveBids(nextWeekNumber: number): Promise<void> {
    try {
      console.log(
        '[FA Service] Carrying over active bids to week',
        nextWeekNumber
      );

      // Get all bids that are not rejected (accepted, shortlisted, pending)
      const activeBids = this.activeBids().filter(
        (bid) => bid.status !== 'rejected'
      );

      console.log(
        '[FA Service] Found',
        activeBids.length,
        'bids to carry over'
      );

      if (activeBids.length === 0) {
        console.log('[FA Service] No bids to carry over');
        return;
      }

      const batch = writeBatch(this.firestore);

      for (const bid of activeBids) {
        // Update bid to next week
        const bidRef = doc(this.firestore, 'faBids', bid.id);
        batch.update(bidRef, {
          weekNumber: nextWeekNumber,
          updatedAt: new Date(),
        });

        console.log(
          '[FA Service] Carrying over bid:',
          bid.id,
          'to week',
          nextWeekNumber
        );
      }

      // Commit all updates
      await batch.commit();
      console.log(
        '[FA Service] Successfully carried over',
        activeBids.length,
        'bids'
      );
    } catch (error) {
      console.error('[FA Service] Error carrying over bids:', error);
      throw error;
    }
  }

  /**
   * Add a player to the team roster when their bid is accepted
   */
  private async addPlayerToTeamRoster(
    playerId: string,
    bidId: string
  ): Promise<void> {
    try {
      console.log(
        `[FA Service] Adding player ${playerId} to team roster (bid: ${bidId})`
      );

      // Get the accepted bid to find the team ID
      const bidRef = doc(this.firestore, 'faBids', bidId);
      const bidDoc = await getDoc(bidRef);

      if (!bidDoc.exists()) {
        console.error(`[FA Service] Bid ${bidId} not found`);
        return;
      }

      const bidData = bidDoc.data() as FABid;
      const teamId = bidData.teamId;

      console.log(`[FA Service] Adding player ${playerId} to team ${teamId}`);

      // Find the team in the current league
      const currentLeague = this.currentFAWeek();
      if (!currentLeague) {
        console.error('[FA Service] No current FA week found');
        return;
      }

      // Get the team's member document from the league service
      const teamMember = this.leagueService
        .leagueMembers()
        .find((member) => member.teamId === teamId);

      if (!teamMember) {
        console.error(
          `[FA Service] Team ${teamId} not found in league ${currentLeague.leagueId}`
        );
        return;
      }

      // Add player to roster in the member document
      const memberRef = doc(
        this.firestore,
        'leagues',
        currentLeague.leagueId,
        'members',
        teamMember.userId
      );

      // Create the roster entry
      const rosterEntry = {
        playerId,
        bidId,
        signedAt: new Date(),
        contract: bidData.offer,
        status: 'active',
      };

      // Update the member document with the new roster entry
      await updateDoc(memberRef, {
        roster: [...teamMember.roster, rosterEntry],
        updatedAt: new Date(),
      });

      console.log(
        `[FA Service] Successfully added player ${playerId} to team ${teamId} roster`
      );
      console.log(`[FA Service] Roster entry:`, rosterEntry);
    } catch (error) {
      console.error(
        `[FA Service] Error adding player ${playerId} to roster:`,
        error
      );
      // Don't throw - this shouldn't prevent the week advancement
    }
  }

  /**
   * Update player status based on decision
   *
   * TODO: MIGRATION TO FIREBASE PLAYER COLLECTION
   * Currently using local JSON files from SportsDataService for player data.
   * In the future, we should migrate to a Firebase 'players' collection to:
   * - Track player statuses across leagues
   * - Enable real-time player updates
   * - Support player history and contract tracking
   * - Allow for dynamic player pools per league
   *
   * Migration steps:
   * 1. Create 'players' collection in Firestore
   * 2. Import initial player data from SportsDataService
   * 3. Update this method to use Firestore instead of local state
   * 4. Add player status change listeners
   * 5. Consider player data versioning for different leagues
   */
}
