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

  // Private state signals
  private _currentFAWeek = signal<FAWeek | null>(null);
  private _activeBids = signal<FABid[]>([]);
  private _teamStatuses = signal<TeamFAStatus[]>([]);
  private _availablePlayers = signal<FAWeekPlayer[]>([]);
  private _marketBenchmarks = signal<any[]>([]);
  private _isReadyToAdvance = signal<boolean>(false);

  // Public readonly signals
  public currentFAWeek = this._currentFAWeek.asReadonly();
  public activeBids = this._activeBids.asReadonly();
  public teamStatuses = this._teamStatuses.asReadonly();
  public availablePlayers = this._availablePlayers.asReadonly();
  public marketBenchmarks = this._marketBenchmarks.asReadonly();
  public isReadyToAdvance = this._isReadyToAdvance.asReadonly();

  // Computed signals
  public currentWeekNumber = computed(
    () => this._currentFAWeek()?.weekNumber || 0
  );
  public isFAWeekPhase = computed(
    () => this._currentFAWeek()?.phase === 'FA_WEEK'
  );
  public isOpenFAPhase = computed(
    () => this._currentFAWeek()?.phase === 'OPEN_FA'
  );
  public weekStatus = computed(
    () => this._currentFAWeek()?.status || 'inactive'
  );
  public readyTeamsCount = computed(
    () => this._currentFAWeek()?.readyTeams.length || 0
  );
  public totalTeamsCount = computed(() => this._teamStatuses().length);

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
        this._currentFAWeek.set(existingWeek);
      } else {
        // Create new FA week
        const newWeek = await this.createFAWeek(currentLeague.id, 1);
        this._currentFAWeek.set(newWeek);
      }

      // Set up real-time listeners
      this.setupRealtimeListeners(currentLeague.id);

      await this.loadAvailablePlayers();
      await this.loadTeamStatuses();
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
        this._currentFAWeek.set(faWeek);
      }
    });

    // Listen to active bids
    const bidsRef = collection(this.firestore, 'faBids');
    const bidsQuery = query(
      bidsRef,
      where('leagueId', '==', leagueId),
      where('weekNumber', '==', this.currentWeekNumber()),
      where('status', 'in', ['pending', 'evaluating'])
    );

    const unsubscribeBids = onSnapshot(bidsQuery, (snapshot) => {
      const bids: FABid[] = [];
      snapshot.forEach((doc) => {
        bids.push({ id: doc.id, ...doc.data() } as FABid);
      });
      this._activeBids.set(bids);
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

      const currentWeek = this._currentFAWeek();
      if (!currentWeek) {
        throw new Error('No active FA week');
      }

      // Create bid
      const bid: FABid = {
        id: `${currentWeek.id}_bid_${Date.now()}`,
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
      // this._activeBids.update((bids) => [...bids, bid]);
      // this.updateTeamBidStatus(teamId, bid.id);
      // this.updatePlayerBidStatus(playerId, 'bidding');

      console.log('Bid submitted successfully:', bid);
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
    const teamBids = this._activeBids().filter(
      (bid) => bid.teamId === teamId && bid.status === 'pending'
    );
    return teamBids.length < this.defaultSettings.maxConcurrentOffers;
  }

  /**
   * Mark team as ready to advance - direct Firestore operation
   */
  async markTeamReady(teamId: string): Promise<void> {
    try {
      const currentWeek = this._currentFAWeek();
      if (!currentWeek) return;

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
        this._currentFAWeek.set({
          ...currentWeek,
          readyTeams: updatedReadyTeams,
          updatedAt: new Date(),
        });

        // Update team status
        this._teamStatuses.update((statuses) =>
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
    const allTeams = this._teamStatuses();
    const readyTeams = allTeams.filter((status) => status.isReady);
    const isReady =
      allTeams.length > 0 && readyTeams.length === allTeams.length;

    this._isReadyToAdvance.set(isReady);
  }

  /**
   * Advance to next week (commissioner only)
   */
  async advanceToNextWeek(): Promise<boolean> {
    try {
      const currentWeek = this._currentFAWeek();
      if (!currentWeek) {
        throw new Error('No active FA week found');
      }

      // Process weekly player evaluation before advancing
      await this.processWeeklyPlayerEvaluation();

      // Update current week status to completed
      const faWeekRef = doc(this.firestore, 'faWeeks', currentWeek.id);
      await updateDoc(faWeekRef, {
        status: 'completed',
        updatedAt: new Date(),
      });

      // Create next week
      const nextWeek = await this.createFAWeek(
        currentWeek.leagueId,
        currentWeek.weekNumber + 1
      );

      // Update current week reference
      this._currentFAWeek.set(nextWeek);

      console.log(`Advanced to week ${nextWeek.weekNumber}`);
      return true;
    } catch (error) {
      console.error('Error advancing week:', error);
      return false;
    }
  }

  /**
   * Trigger weekly player evaluation manually (for testing)
   */
  async triggerWeeklyEvaluation(): Promise<void> {
    try {
      await this.processWeeklyPlayerEvaluation();
      console.log('Weekly player evaluation completed');
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
      const currentBids = this._activeBids();
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

      console.log('Week evaluation processed');
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
      console.log('FreeAgencyService.loadAvailablePlayers() called');

      // Wait for sports data to be loaded
      await this.sportsDataService.waitForData();
      console.log('Sports data is ready, proceeding to load players');

      // Get all active players from sports data service
      const allPlayers = this.sportsDataService.getActivePlayers();
      console.log('SportsDataService returned players:', allPlayers.length);

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

      console.log('Filtered and mapped players:', availablePlayers.length);
      console.log('First few mapped players:', availablePlayers.slice(0, 3));

      this._availablePlayers.set(availablePlayers);
      console.log(`Loaded ${availablePlayers.length} available players for FA`);
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
   * Load team statuses for current FA week
   */
  private async loadTeamStatuses(): Promise<void> {
    try {
      // TODO: Load from Firebase - for now use mock data
      const mockStatuses: TeamFAStatus[] = [
        {
          teamId: 'team1',
          leagueId: this._currentFAWeek()?.leagueId || '',
          currentWeek: this._currentFAWeek()?.weekNumber || 1,
          activeBids: [],
          capHolds: 0,
          isReady: false,
          lastActivity: new Date(),
        },
        // Add more mock teams as needed
      ];

      this._teamStatuses.set(mockStatuses);
    } catch (error) {
      console.error('Failed to load team statuses:', error);
    }
  }

  /**
   * Update team bid status
   */
  private updateTeamBidStatus(teamId: string, bidId: string): void {
    this._teamStatuses.update((statuses) =>
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
    this._availablePlayers.update((players) =>
      players.map((player) =>
        player.id === playerId ? { ...player, status: status as any } : player
      )
    );
  }

  /**
   * Get bids for a specific player
   */
  getPlayerBids(playerId: string): FABid[] {
    return this._activeBids().filter((bid) => bid.playerId === playerId);
  }

  /**
   * Get team's active bids
   */
  getTeamBids(teamId: string): FABid[] {
    return this._activeBids().filter((bid) => bid.teamId === teamId);
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
      const currentWeek = this._currentFAWeek();
      if (!currentWeek || currentWeek.status !== 'active') {
        throw new Error('No active FA week found');
      }

      // Get all pending bids for the current week
      const pendingBids = this._activeBids().filter(
        (bid) =>
          bid.status === 'pending' && bid.weekNumber === currentWeek.weekNumber
      );

      if (pendingBids.length === 0) {
        console.log('No pending bids to evaluate');
        return;
      }

      // Create market context for evaluation
      const marketContext = await this.createMarketContext();

      // Get all players for evaluation
      const allPlayers = await this.getAllPlayersForEvaluation();

      // Process evaluation using FAWeekManager
      const evaluationResults = await this.evaluateAllPlayerBids(
        pendingBids,
        allPlayers,
        marketContext
      );

      // Apply evaluation results
      await this.applyEvaluationResults(evaluationResults);

      // Update FA week status to evaluating
      await this.updateFAWeekStatus('evaluating');

      console.log(`Processed ${evaluationResults.length} player evaluations`);
    } catch (error) {
      console.error('Error processing weekly player evaluation:', error);
      throw error;
    }
  }

  /**
   * Create market context for player evaluation
   */
  private async createMarketContext(): Promise<any> {
    // Use any to match domain interface
    const currentWeek = this._currentFAWeek();
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

    return {
      competingOffers: 0, // Default value
      positionalDemand,
      capSpaceAvailable: 0, // Default value
      recentComps: recentContracts,
      seasonStage: seasonStage === 'OpenFA' ? 'Camp' : seasonStage, // Map to domain values
      teamReputation: 0.5, // Default neutral reputation
    };
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
    marketContext: any // Use any to match domain interface
  ): Promise<FAEvaluationResult[]> {
    // Import FAWeekManager from domain
    const { FAWeekManager } = await import('@fantasy-football-dynasty/domain');

    // Use the existing FAWeekManager to process evaluation
    return FAWeekManager.processFAWeekEvaluation(
      bids,
      players,
      marketContext,
      this.defaultSettings
    );
  }

  /**
   * Apply evaluation results to bids and update player statuses
   */
  private async applyEvaluationResults(
    results: FAEvaluationResult[]
  ): Promise<void> {
    const batch = writeBatch(this.firestore);

    for (const result of results) {
      const decision = result.decisions[0]; // Get the first decision
      if (!decision) continue;

      // Update accepted bid
      if (decision.acceptedBidId) {
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
      }

      // Update shortlisted bids
      for (const shortlistedBidId of decision.shortlistedBidIds) {
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
        const rejectedBidRef = doc(this.firestore, 'faBids', rejectedBidId);
        batch.update(rejectedBidRef, {
          status: 'rejected',
          feedback: decision.feedback,
          evaluatedAt: new Date(),
        });
      }

      // Update player status
      await this.updatePlayerStatus(result.playerId, decision);
    }

    // Commit all updates
    await batch.commit();
  }

  /**
   * Update player status based on decision
   */
  private async updatePlayerStatus(
    playerId: string,
    decision: PlayerDecision
  ): Promise<void> {
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
    const availablePlayers = this._availablePlayers();
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
    const currentWeek = this._currentFAWeek();
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

      const currentWeek = this._currentFAWeek();
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

      console.log('Open FA signing processed:', signing);
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
  ngOnDestroy(): void {
    this.unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
  }
}
