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

      // Get player data for contract validation
      const player = this.sportsDataService.getPlayerById(parseInt(playerId));
      if (!player) {
        throw new Error('Player not found');
      }

      // Get current league for rules and validation
      const currentLeague = this.leagueService.selectedLeague();
      if (!currentLeague) {
        throw new Error('No active league found');
      }

      // Validate contract against new dynamic minimum calculation
      const dynamicMinimum = await this.calculateDynamicPlayerMinimum(
        player,
        currentLeague.rules
      );

      if (offer.apy < dynamicMinimum) {
        throw new Error(
          `Bid must be at least $${dynamicMinimum.toLocaleString()} (dynamic minimum)`
        );
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

      console.log(`[FA Service] Bid submitted successfully:`, {
        bidId: bid.id,
        playerId,
        teamId,
        offerValue: offer.apy,
        dynamicMinimum,
        leagueRules: currentLeague.rules,
      });

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

      console.log(
        `[FA Service] Starting week advancement from week ${currentWeek.weekNumber}`
      );

      this.isAdvancingWeek.set(true);
      this.weekAdvancementProgress.set('Processing player decisions...');

      // Get current league for rules and validation
      const currentLeague = this.leagueService.selectedLeague();
      if (!currentLeague) {
        throw new Error('No active league found for week advancement');
      }

      console.log(`[FA Service] League context:`, {
        leagueId: currentLeague.id,
        leagueName: currentLeague.name,
        scoringRules: currentLeague.rules.scoring,
        rosterRules: currentLeague.rules.roster,
        capRules: currentLeague.rules.cap,
      });

      // Process weekly player evaluation before advancing
      console.log(`[FA Service] Processing weekly player evaluation...`);
      await this.processWeeklyPlayerEvaluation();

      this.weekAdvancementProgress.set('Carrying over active bids...');

      // Carry over non-rejected bids to next week
      console.log(
        `[FA Service] Carrying over active bids to week ${
          currentWeek.weekNumber + 1
        }`
      );
      await this.carryOverActiveBids(currentWeek.weekNumber + 1);

      this.weekAdvancementProgress.set('Updating player statuses...');

      // Update current week status to completed
      const faWeekRef = doc(this.firestore, 'faWeeks', currentWeek.id);
      await updateDoc(faWeekRef, {
        status: 'completed',
        updatedAt: new Date(),
      });

      console.log(
        `[FA Service] Week ${currentWeek.weekNumber} marked as completed`
      );

      this.weekAdvancementProgress.set('Creating next week...');

      // Create next week with enhanced settings
      const nextWeek = await this.createEnhancedFAWeek(
        currentWeek.leagueId,
        currentWeek.weekNumber + 1,
        currentLeague.rules
      );

      // Update current week reference
      this.currentFAWeek.set(nextWeek);

      console.log(
        `[FA Service] Week ${nextWeek.weekNumber} created successfully:`,
        {
          nextWeekId: nextWeek.id,
          phase: nextWeek.phase,
          startDate: nextWeek.startDate,
          endDate: nextWeek.endDate,
        }
      );

      this.weekAdvancementProgress.set('Week advancement complete!');

      // Reset advancement state after a delay
      setTimeout(() => {
        this.isAdvancingWeek.set(false);
        this.weekAdvancementProgress.set('');
      }, 3000);

      console.log(`[FA Service] Week advancement completed successfully`);
      return true;
    } catch (error) {
      console.error('Error advancing week:', error);
      this.isAdvancingWeek.set(false);
      this.weekAdvancementProgress.set('Error advancing week');
      return false;
    }
  }

  /**
   * Create an enhanced FA week with personality and rating considerations
   */
  private async createEnhancedFAWeek(
    leagueId: string,
    weekNumber: number,
    leagueRules: any
  ): Promise<FAWeek> {
    console.log(
      `[FA Service] Creating enhanced FA week ${weekNumber} for league ${leagueId}`
    );

    // Determine phase based on week number and league rules
    const phase = this.determineFAWeekPhase(weekNumber, leagueRules);

    // Calculate week duration based on league settings
    const weekDuration = this.calculateWeekDuration(weekNumber, leagueRules);

    const faWeek: FAWeek = {
      id: `${leagueId}_week_${weekNumber}`,
      leagueId,
      weekNumber,
      phase,
      startDate: new Date(),
      endDate: new Date(Date.now() + weekDuration),
      status: 'active',
      readyTeams: [],
      evaluationResults: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log(`[FA Service] Enhanced FA week created:`, {
      weekId: faWeek.id,
      phase: faWeek.phase,
      duration: weekDuration,
      startDate: faWeek.startDate,
      endDate: faWeek.endDate,
    });

    // Save to Firestore
    const faWeekRef = doc(this.firestore, 'faWeeks', faWeek.id);
    await setDoc(faWeekRef, faWeek);

    return faWeek;
  }

  /**
   * Determine FA week phase based on week number and league rules
   */
  private determineFAWeekPhase(
    weekNumber: number,
    leagueRules: any
  ): 'FA_WEEK' | 'OPEN_FA' {
    // Early weeks (1-4): Structured FA with bidding rounds
    // Later weeks (5+): Open FA with immediate signings
    if (weekNumber <= 4) {
      return 'FA_WEEK';
    } else {
      return 'OPEN_FA';
    }
  }

  /**
   * Calculate week duration based on week number and league rules
   */
  private calculateWeekDuration(weekNumber: number, leagueRules: any): number {
    // Early weeks: longer duration for strategic bidding
    // Later weeks: shorter duration for quick signings
    if (weekNumber <= 2) {
      return 7 * 24 * 60 * 60 * 1000; // 7 days
    } else if (weekNumber <= 4) {
      return 5 * 24 * 60 * 60 * 1000; // 5 days
    } else {
      return 3 * 24 * 60 * 60 * 1000; // 3 days
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
      const allPlayers = this.sportsDataService.activePlayers();

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

      const allPlayers = this.sportsDataService.activePlayers();

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

      const allPlayers = this.sportsDataService.activePlayers();
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

      // Get current league for rules and validation
      const currentLeague = this.leagueService.selectedLeague();
      if (!currentLeague) {
        throw new Error('No active league found for player evaluation');
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

      // Create enhanced market context with new personality system
      const marketContext = await this.createEnhancedMarketContext(
        currentLeague
      );
      console.log(
        '[FA Service] Enhanced market context created:',
        marketContext
      );

      // Get all players for evaluation with enhanced data
      const allPlayers = await this.getAllEnhancedPlayersForEvaluation(
        currentLeague
      );
      console.log(
        '[FA Service] Enhanced players for evaluation:',
        allPlayers.length
      );

      // Process evaluation using enhanced logic
      const evaluationResults = await this.evaluateAllPlayerBidsWithPersonality(
        pendingBids,
        allPlayers,
        marketContext,
        currentLeague.rules
      );
      console.log(
        '[FA Service] Enhanced evaluation results:',
        evaluationResults.length
      );

      // Apply evaluation results
      await this.applyEvaluationResults(evaluationResults);

      // Update FA week status to evaluating
      await this.updateFAWeekStatus('evaluating');

      console.log(
        '[FA Service] Enhanced weekly player evaluation completed successfully'
      );
    } catch (error) {
      console.error('Error processing weekly player evaluation:', error);
      throw error;
    }
  }

  /**
   * Create enhanced market context with personality and rating considerations
   */
  private async createEnhancedMarketContext(league: any): Promise<any> {
    console.log('[FA Service] Creating enhanced market context...');

    // Get recent contracts for market context
    const recentContracts = await this.getRecentContracts();

    // Calculate positional demand based on available players and team needs
    const positionalDemand = await this.calculateEnhancedPositionalDemand(
      league
    );

    // Get team cap space information
    const teamCapSpace = await this.getTeamCapSpace();

    // Determine season stage
    const currentWeek = this.currentFAWeek();
    const seasonStage = currentWeek
      ? this.determineSeasonStage(currentWeek.weekNumber)
      : 'EarlyFA';

    // Get league roster information for realistic market saturation
    const leagueRosterInfo = await this.getLeagueRosterInfo();

    // Enhanced market context with personality factors
    const enhancedContext = {
      competingOffers: 0, // Default value
      positionalDemand,
      capSpaceAvailable: 0, // Default value
      recentComps: recentContracts,
      seasonStage: seasonStage === 'OpenFA' ? 'Camp' : seasonStage,
      teamReputation: 0.5, // Default neutral reputation
      currentWeek: currentWeek?.weekNumber || 1,
      leagueRosterInfo,
      // New personality and rating factors
      personalityInfluence: this.calculatePersonalityInfluence(),
      ratingTierImpact: this.calculateRatingTierImpact(),
      marketVolatility: this.calculateMarketVolatility(league),
      leagueScoringImpact: this.calculateLeagueScoringImpact(
        league.rules.scoring
      ),
    };

    console.log(
      '[FA Service] Enhanced market context created:',
      enhancedContext
    );
    return enhancedContext;
  }

  /**
   * Calculate personality influence on market behavior
   */
  private calculatePersonalityInfluence(): Record<string, number> {
    // Different personality types affect market behavior
    return {
      Balanced: 1.0, // Neutral influence
      Aggressive: 1.2, // More likely to accept higher offers
      Conservative: 0.8, // More likely to reject risky offers
      Loyal: 1.1, // Values team stability
      Mercenary: 1.3, // Values highest bid
      'Team Player': 0.9, // Values team fit over money
      'Prima Donna': 1.4, // Demands premium treatment
    };
  }

  /**
   * Calculate rating tier impact on market behavior
   */
  private calculateRatingTierImpact(): Record<string, number> {
    // Higher-rated players have more market power
    return {
      'Elite (95+)': 1.5, // Maximum market power
      'Pro Bowl (90-94)': 1.3, // High market power
      'Starter (85-89)': 1.1, // Moderate market power
      'Average (80-84)': 1.0, // Standard market power
      'Below Average (75-79)': 0.9, // Reduced market power
      'Backup (70-74)': 0.7, // Limited market power
      'Practice Squad (<70)': 0.5, // Minimal market power
    };
  }

  /**
   * Calculate market volatility based on league settings
   */
  private calculateMarketVolatility(league: any): number {
    // More teams = higher volatility
    // More cap space = higher volatility
    const teamCount = league.numberOfTeams || 12;
    const salaryCap = league.rules.cap.salaryCap || 200000000;

    let volatility = 1.0;

    if (teamCount > 16) volatility *= 1.3;
    else if (teamCount > 12) volatility *= 1.2;
    else if (teamCount > 8) volatility *= 1.1;

    if (salaryCap > 250000000) volatility *= 1.2;
    else if (salaryCap > 200000000) volatility *= 1.1;

    return Math.min(volatility, 1.5); // Cap at 1.5x
  }

  /**
   * Calculate league scoring impact on market behavior
   */
  private calculateLeagueScoringImpact(scoring: any): Record<string, number> {
    // Different scoring systems favor different positions
    const impact: Record<string, number> = {};

    if (scoring.ppr > 0) {
      // PPR leagues favor WRs and TEs
      impact['WR'] = 1.2;
      impact['TE'] = 1.1;
      impact['RB'] = 1.0;
      impact['QB'] = 1.0;
    } else {
      // Standard scoring favors RBs
      impact['RB'] = 1.2;
      impact['WR'] = 0.9;
      impact['TE'] = 0.9;
      impact['QB'] = 1.0;
    }

    return impact;
  }

  /**
   * Get all enhanced players for evaluation with personality and rating data
   */
  private async getAllEnhancedPlayersForEvaluation(
    league: any
  ): Promise<Player[]> {
    console.log('[FA Service] Getting enhanced players for evaluation...');

    const allPlayers = this.sportsDataService.activePlayers();
    console.log(
      '[FA Service] Raw players from sports data:',
      allPlayers.length
    );

    // Convert SportsPlayer to enhanced Player interface
    const enhancedPlayers: Player[] = allPlayers.map((sportsPlayer) => {
      // Calculate enhanced overall rating using new system
      const enhancedOverall = this.calculateEnhancedOverallRating(
        sportsPlayer,
        league.rules
      );

      // Generate personality based on player characteristics
      const personality = this.generatePlayerPersonality(
        sportsPlayer,
        enhancedOverall
      );

      // Calculate market value using new contract system
      const marketValue = this.calculatePlayerMarketValue(
        sportsPlayer,
        enhancedOverall,
        league.rules
      );

      return {
        id: sportsPlayer.PlayerID.toString(),
        name: `${sportsPlayer.FirstName} ${sportsPlayer.LastName}`,
        position: sportsPlayer.Position as Position,
        age: sportsPlayer.Age || 25,
        overall: enhancedOverall,
        yearsExp: sportsPlayer.Experience || 0,
        nflTeam: sportsPlayer.Team || 'FA',
        status: sportsPlayer.Status,
        devGrade: this.calculateDevGrade(enhancedOverall),
        traits: this.calculatePlayerTraits(sportsPlayer, enhancedOverall),
        stats: [], // Empty stats for FA players - stats are in the enhanced player object
        // Enhanced properties
        personality,
        marketValue,
        ratingTier: this.getRatingTier(enhancedOverall),
        fantasyImpact: this.calculateFantasyImpact(
          sportsPlayer,
          league.rules.scoring
        ),
      };
    });

    console.log(
      '[FA Service] Enhanced players created:',
      enhancedPlayers.length
    );
    return enhancedPlayers;
  }

  /**
   * Calculate enhanced overall rating using new system
   */
  private calculateEnhancedOverallRating(
    player: any,
    leagueRules: any
  ): number {
    // Use the new rating system if available
    if (player.overall && player.overall > 0) {
      return player.overall;
    }

    // Fallback calculation
    const baseRating = 70;
    const experienceBonus = Math.min(player.Experience || 0, 10) * 0.5;
    const agePenalty = Math.max(0, (player.Age || 25) - 28) * 0.3;

    return Math.max(
      50,
      Math.min(99, Math.round(baseRating + experienceBonus - agePenalty))
    );
  }

  /**
   * Generate player personality based on characteristics
   */
  private generatePlayerPersonality(player: any, overall: number): string {
    const personalities = [
      'Balanced',
      'Aggressive',
      'Conservative',
      'Loyal',
      'Mercenary',
      'Team Player',
      'Prima Donna',
    ];

    // Elite players are more likely to be Prima Donna or Mercenary
    if (overall >= 95) {
      return Math.random() > 0.7 ? 'Prima Donna' : 'Mercenary';
    }

    // High-rated players are more likely to be Aggressive
    if (overall >= 90) {
      return Math.random() > 0.6 ? 'Aggressive' : 'Balanced';
    }

    // Veterans are more likely to be Loyal or Conservative
    if ((player.Experience || 0) > 8) {
      return Math.random() > 0.6 ? 'Loyal' : 'Conservative';
    }

    // Young players are more likely to be Team Player
    if ((player.Age || 25) < 25) {
      return Math.random() > 0.7 ? 'Team Player' : 'Balanced';
    }

    // Default to Balanced
    return 'Balanced';
  }

  /**
   * Calculate player market value using new contract system
   */
  private calculatePlayerMarketValue(
    player: any,
    overall: number,
    leagueRules: any
  ): number {
    try {
      // Use the league service's new contract calculation
      const minimumContract = this.leagueService[
        'calculateMarketAdjustedContract'
      ](
        overall,
        player.Position,
        this.sportsDataService.activePlayers(),
        leagueRules,
        12 // Default to 12 teams
      );

      // Market value is typically 1.2x minimum contract
      return Math.round(minimumContract * 1.2);
    } catch (error) {
      console.error('[FA Service] Error calculating market value:', error);

      // Fallback calculation
      return Math.round(overall * 600000); // $600K per overall point
    }
  }

  /**
   * Calculate development grade from overall rating
   */
  private calculateDevGrade(overall: number): 'A' | 'B' | 'C' | 'D' {
    if (overall >= 90) return 'A';
    if (overall >= 80) return 'B';
    if (overall >= 70) return 'C';
    return 'D';
  }

  /**
   * Calculate player traits based on overall and position
   */
  private calculatePlayerTraits(player: any, overall: number): any {
    const baseTraits = {
      speed: 50,
      strength: 50,
      agility: 50,
      awareness: 50,
      injury: 50,
      schemeFit: [],
    };

    // Adjust traits based on overall rating
    const ratingMultiplier = overall / 70;

    baseTraits.speed = Math.min(99, Math.round(50 * ratingMultiplier));
    baseTraits.strength = Math.min(99, Math.round(50 * ratingMultiplier));
    baseTraits.agility = Math.min(99, Math.round(50 * ratingMultiplier));
    baseTraits.awareness = Math.min(99, Math.round(50 * ratingMultiplier));
    baseTraits.injury = Math.max(1, Math.round(100 - 50 * ratingMultiplier));

    return baseTraits;
  }

  /**
   * Get rating tier from overall rating
   */
  private getRatingTier(overall: number): string {
    if (overall >= 95) return 'Elite (95+)';
    if (overall >= 90) return 'Pro Bowl (90-94)';
    if (overall >= 85) return 'Starter (85-89)';
    if (overall >= 80) return 'Average (80-84)';
    if (overall >= 75) return 'Below Average (75-79)';
    if (overall >= 70) return 'Backup (70-74)';
    return 'Practice Squad (<70)';
  }

  /**
   * Calculate fantasy impact based on scoring rules
   */
  private calculateFantasyImpact(player: any, scoring: any): number {
    // Base impact on overall rating
    let impact = (player.overall || 70) / 100;

    // Adjust based on position and scoring rules
    if (scoring.ppr > 0) {
      if (player.Position === 'WR' || player.Position === 'TE') {
        impact *= 1.2; // Boost for PPR positions
      }
    } else {
      if (player.Position === 'RB') {
        impact *= 1.2; // Boost for standard scoring
      }
    }

    return Math.min(1.0, Math.max(0.1, impact));
  }

  /**
   * Calculate enhanced positional demand with personality factors
   */
  private async calculateEnhancedPositionalDemand(
    league: any
  ): Promise<number> {
    console.log('[FA Service] Calculating enhanced positional demand...');

    const availablePlayers = this.availablePlayers();
    const totalPlayers = availablePlayers.length;

    if (totalPlayers === 0) return 0.5;

    // Calculate demand based on position scarcity and personality distribution
    const positionCounts = availablePlayers.reduce((acc, player) => {
      acc[player.position] = (acc[player.position] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get personality distribution for each position
    const personalityDemand = this.calculatePersonalityDemand(availablePlayers);

    // Combine scarcity and personality demand
    const avgPlayersPerPosition =
      totalPlayers / Object.keys(positionCounts).length;
    const scarcityDemand =
      Object.values(positionCounts).reduce((sum, count) => {
        return sum + avgPlayersPerPosition / count;
      }, 0) / Object.keys(positionCounts).length;

    const finalDemand = (scarcityDemand + personalityDemand) / 2;
    const normalizedDemand = Math.min(
      1,
      Math.max(0, finalDemand / avgPlayersPerPosition)
    );

    console.log('[FA Service] Enhanced positional demand calculated:', {
      scarcityDemand,
      personalityDemand,
      finalDemand,
      normalizedDemand,
    });

    return normalizedDemand;
  }

  /**
   * Calculate personality-based demand
   */
  private calculatePersonalityDemand(players: any[]): number {
    // Players with certain personalities are more in demand
    const personalityValues: Record<string, number> = {
      Balanced: 1.0,
      Aggressive: 1.1,
      Conservative: 0.9,
      Loyal: 1.2,
      Mercenary: 1.3,
      'Team Player': 1.1,
      'Prima Donna': 0.8,
    };

    let totalDemand = 0;
    let playerCount = 0;

    players.forEach((player) => {
      // For now, assume balanced personality (can be enhanced later)
      const personality = 'Balanced';
      totalDemand += personalityValues[personality] || 1.0;
      playerCount++;
    });

    return playerCount > 0 ? totalDemand / playerCount : 1.0;
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
   * Evaluate all player bids with enhanced personality and rating system
   */
  private async evaluateAllPlayerBidsWithPersonality(
    bids: FABid[],
    players: Player[],
    marketContext: any,
    leagueRules: any
  ): Promise<FAEvaluationResult[]> {
    console.log(
      '[FA Service] Evaluating bids with enhanced personality system:',
      {
        bidCount: bids.length,
        playerCount: players.length,
        marketContext: marketContext,
        leagueRules: leagueRules,
      }
    );

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
      '[FA Service] Enhanced evaluation completed, results:',
      results.length
    );
    return results;
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
  private async calculateDynamicPlayerMinimum(
    player: any,
    leagueRules: any
  ): Promise<number> {
    try {
      // Get player stats for fantasy performance calculation
      const playerStats = player.stats || {};

      // Calculate minimum using the new dynamic system
      const overall = player.overall || 70;
      const position = player.Position;

      // Use the league service's new contract calculation
      const minimumContract = this.leagueService[
        'calculateMarketAdjustedContract'
      ](
        overall,
        position,
        this.sportsDataService.activePlayers(),
        leagueRules,
        12 // Default to 12 teams if not available
      );

      console.log(`[FA Service] Dynamic minimum calculated:`, {
        playerName: `${player.FirstName} ${player.LastName}`,
        position,
        overall,
        minimumContract,
        fantasyPoints: playerStats.FantasyPoints || 'N/A',
        fantasyPointsPPR: playerStats.FantasyPointsPPR || 'N/A',
      });

      return minimumContract;
    } catch (error) {
      console.error('[FA Service] Error calculating dynamic minimum:', error);

      // Fallback to basic calculation
      const baseValue = (player.overall || 70) * 500000;
      const positionMultiplier = this.getPositionMultiplier(player.Position);
      return Math.round((baseValue * positionMultiplier) / 100000) * 100000;
    }
  }

  /**
   * Get position multiplier for fallback calculation
   */
  private getPositionMultiplier(position: string): number {
    const multipliers: Record<string, number> = {
      QB: 2.0,
      RB: 1.8,
      WR: 1.6,
      TE: 1.4,
      K: 0.3,
      DEF: 0.4,
      DL: 0.8,
      LB: 0.8,
      DB: 0.7,
    };
    return multipliers[position] || 1.0;
  }
}
