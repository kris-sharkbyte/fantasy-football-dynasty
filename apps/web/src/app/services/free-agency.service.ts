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
} from '@fantasy-football-dynasty/types';
import { PlayerDataService, SleeperPlayer } from './player-data.service';
import { TeamService } from './team.service';
import { LeagueService } from './league.service';

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
  private readonly playerDataService = inject(PlayerDataService);
  private readonly teamService = inject(TeamService);
  private readonly leagueService = inject(LeagueService);

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

      // Update local state immediately for responsiveness
      this._activeBids.update((bids) => [...bids, bid]);
      this.updateTeamBidStatus(teamId, bid.id);
      this.updatePlayerBidStatus(playerId, 'bidding');

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
   * Advance to next FA week - direct Firestore operation
   */
  async advanceToNextWeek(): Promise<boolean> {
    try {
      const currentWeek = this._currentFAWeek();
      if (!currentWeek) return false;

      // Process current week evaluation
      await this.processWeekEvaluation();

      // Mark current week as completed
      const currentWeekRef = doc(this.firestore, 'faWeeks', currentWeek.id);
      await updateDoc(currentWeekRef, {
        status: 'completed',
        updatedAt: new Date(),
      });

      // Create next week
      const nextWeekNumber = currentWeek.weekNumber + 1;
      const nextWeek = await this.createFAWeek(
        currentWeek.leagueId,
        nextWeekNumber
      );

      this._currentFAWeek.set(nextWeek);

      // Reset team readiness
      this._teamStatuses.update((statuses) =>
        statuses.map((status) => ({ ...status, isReady: false }))
      );

      this._isReadyToAdvance.set(false);

      console.log('Advanced to week:', nextWeekNumber);
      return true;
    } catch (error) {
      console.error('Failed to advance week:', error);
      return false;
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
      // Ensure players are loaded first
      if (!this.playerDataService.hasPlayers()) {
        await this.playerDataService.loadPlayers();
      }

      // Get all players and filter out retired/inactive ones
      const allPlayers = this.playerDataService.getAllPlayers();
      const availablePlayers: FAWeekPlayer[] = allPlayers
        .filter((player) => {
          // Filter out retired/inactive players
          const isRetired =
            player.status === 'Inactive' ||
            player.status === 'Retired' ||
            player.status === 'Suspended' ||
            (player.team === 'FA' && player.status !== 'Active');

          // Filter out players without valid positions
          const hasValidPosition =
            player.position &&
            player.position !== 'NA' &&
            player.position !== '';

          // Filter out players without names
          const hasValidName =
            player.first_name &&
            player.last_name &&
            player.first_name.trim() !== '' &&
            player.last_name.trim() !== '';

          return !isRetired && hasValidPosition && hasValidName;
        })
        .slice(0, 50)
        .map((player) => ({
          id: player.player_id,
          name: `${player.first_name} ${player.last_name}`,
          position: player.position,
          age: player.age,
          overall: this.calculatePlayerOverall(player),
          nflTeam: player.team,
          bidCount: 0,
          status: 'available',
        }));

      this._availablePlayers.set(availablePlayers);
    } catch (error) {
      console.error('Failed to load available players:', error);
    }
  }

  /**
   * Calculate player overall rating from Sleeper data
   */
  private calculatePlayerOverall(player: any): number {
    // Simple calculation based on search rank and experience
    // In production, this would use the domain logic
    const baseRating = 100 - (player.search_rank || 1000) / 10;
    const experienceBonus = Math.min(player.years_exp || 0, 5) * 2;
    const agePenalty = Math.max(0, (player.age || 25) - 28) * 1.5;

    return Math.max(
      50,
      Math.min(99, Math.round(baseRating + experienceBonus - agePenalty))
    );
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
   * Cancel a pending bid - direct Firestore operation
   */
  async cancelBid(bidId: string): Promise<boolean> {
    try {
      const bid = this._activeBids().find((b) => b.id === bidId);
      if (!bid || bid.status !== 'pending') return false;

      // Update status in Firestore
      const bidRef = doc(this.firestore, 'faBids', bidId);
      await updateDoc(bidRef, {
        status: 'cancelled',
        updatedAt: new Date(),
      });

      // Remove bid from active bids
      this._activeBids.update((bids) => bids.filter((b) => b.id !== bidId));

      // Update team status
      this._teamStatuses.update((statuses) =>
        statuses.map((status) =>
          status.teamId === bid.teamId
            ? {
                ...status,
                activeBids: status.activeBids.filter((id) => id !== bidId),
              }
            : status
        )
      );

      // Update player status if no more bids
      const remainingBids = this.getPlayerBids(bid.playerId);
      if (remainingBids.length === 0) {
        this.updatePlayerBidStatus(bid.playerId, 'available');
      }

      console.log('Bid cancelled:', bidId);
      return true;
    } catch (error) {
      console.error('Failed to cancel bid:', error);
      return false;
    }
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
    const player = this.playerDataService
      .getAllPlayers()
      .find((p) => p.player_id === playerId);
    if (!player) return null;

    const isRetired =
      player.status === 'Inactive' ||
      player.status === 'Retired' ||
      player.status === 'Suspended' ||
      (player.team === 'FA' && player.status !== 'Active');

    return {
      isRetired,
      status: player.status,
      team: player.team,
    };
  }

  /**
   * Clean up real-time listeners
   */
  ngOnDestroy(): void {
    this.unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
  }
}
