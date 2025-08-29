import { Injectable, signal, computed } from '@angular/core';
import {
  NegotiationSession,
  Offer,
  CounterOffer,
  NegotiationResult,
  NegotiationEngine,
  MarketContext,
} from '@fantasy-football-dynasty/domain';
import { SportsDataService } from './sports-data.service';

// Local interface for negotiation state
export interface NegotiationState {
  session: NegotiationSession | null;
  currentOffer: Offer | null;
  lastResult: NegotiationResult | null;
  isNegotiating: boolean;
  round: number;
  patience: number;
}

@Injectable({
  providedIn: 'root',
})
export class NegotiationService {
  // Private state signals
  private _activeSessions = signal<NegotiationSession[]>([]);
  private _currentSession = signal<NegotiationSession | null>(null);
  private _marketContext = signal<MarketContext | null>(null);

  // Public readonly signals
  public activeSessions = this._activeSessions.asReadonly();
  public currentSession = this._currentSession.asReadonly();
  public marketContext = this._marketContext.asReadonly();

  // Computed signals
  public isNegotiating = computed(() => this._currentSession() !== null);
  public currentRound = computed(() => this._currentSession()?.round || 0);
  public remainingPatience = computed(
    () => this._currentSession()?.patience || 0
  );
  public negotiationHistory = computed(
    () => this._currentSession()?.history || []
  );

  constructor(private sportsDataService: SportsDataService) {}

  /**
   * Start a new negotiation session with a player
   */
  startNegotiation(
    playerId: string,
    teamId: string,
    leagueRules?: { maxYears?: number }
  ): NegotiationSession | null {
    const player = this.sportsDataService.getPlayer(Number(playerId));
    if (!player) {
      console.error('Player not found for negotiation');
      return null;
    }

    // Create market context (simplified for now)
    const marketContext: MarketContext = {
      competingOffers: Math.floor(Math.random() * 3), // 0-2 competing offers
      positionalDemand: this.calculatePositionalDemand(player.Position),
      capSpaceAvailable: 50000000, // Mock cap space
      recentComps: [], // Will be populated from real data later
      seasonStage: 'EarlyFA',
      teamReputation: 0, // Neutral reputation for now
      currentWeek: 1, // Default to week 1 for negotiation service
    };

    // Create negotiation session with basic rules (will be enhanced later)
    const session: NegotiationSession = {
      id: `negotiation_${playerId}_${teamId}_${Date.now()}`,
      playerId,
      teamId,
      status: 'active',
      round: 1,
      patience: 100,
      reservation: {
        aav: (player as any).overall * 100000, // Base reservation value
        gtdPct: 0.3, // 30% guaranteed
        years: 3, // 3 years preferred
      },
      askAnchor: {
        aav: (player as any).overall * 120000, // Ask anchor value
        gtdPct: 0.5, // 50% guaranteed
        years: 4, // 4 years preferred
      },
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      marketContext,
    };

    // Store session
    this._activeSessions.update((sessions) => [...sessions, session]);
    this._currentSession.set(session);
    this._marketContext.set(marketContext);

    console.log('Started negotiation session:', session);
    return session;
  }

  /**
   * Submit an offer to the current negotiation
   */
  submitOffer(offer: Offer): NegotiationResult | null {
    const session = this._currentSession();
    if (!session) {
      console.error('No active negotiation session');
      return null;
    }

    const player = this.sportsDataService.getPlayer(Number(session.playerId));
    if (!player) {
      console.error('Player not found for offer evaluation');
      return null;
    }

    // Evaluate the offer using the negotiation engine
    const result = NegotiationEngine.evaluateOffer(offer, session, player);

    // Update current session
    this._currentSession.set(result.session);

    // Update active sessions
    this._activeSessions.update((sessions) =>
      sessions.map((s) => (s.id === session.id ? result.session : s))
    );

    console.log('Offer evaluated:', result);
    return result;
  }

  /**
   * Accept a counter-offer from the player
   */
  acceptCounter(counter: Offer): boolean {
    const session = this._currentSession();
    if (!session) {
      console.error('No active negotiation session');
      return false;
    }

    // Create a new offer that matches the counter
    const acceptanceOffer: Offer = {
      aav: counter.aav,
      gtdPct: counter.gtdPct,
      years: counter.years,
      bonusPct: counter.bonusPct,
      role: counter.role,
      noTradeClause: counter.noTradeClause,
    };

    // Submit the acceptance
    const result = this.submitOffer(acceptanceOffer);
    return result?.accepted || false;
  }

  /**
   * Decline a counter-offer and end negotiation
   */
  declineCounter(): void {
    const session = this._currentSession();
    if (!session) return;

    // Update session status
    session.status = 'declined';
    session.updatedAt = new Date();

    // Update signals
    this._currentSession.set(session);
    this._activeSessions.update((sessions) =>
      sessions.map((s) => (s.id === session.id ? session : s))
    );

    console.log('Negotiation declined by team');
  }

  /**
   * End the current negotiation
   */
  endNegotiation(): void {
    const session = this._currentSession();
    if (session && session.status === 'active') {
      session.status = 'expired';
      session.updatedAt = new Date();

      // Update signals
      this._currentSession.set(session);
      this._activeSessions.update((sessions) =>
        sessions.map((s) => (s.id === session.id ? session : s))
      );
    }

    this._currentSession.set(null);
    console.log('Negotiation ended');
  }

  /**
   * Get the current negotiation state
   */
  getNegotiationState(): NegotiationState {
    const session = this._currentSession();

    return {
      session,
      currentOffer: null, // Will be populated when offers are made
      lastResult: null, // Will be populated after offer evaluation
      isNegotiating: session !== null,
      round: session?.round || 0,
      patience: session?.patience || 0,
    };
  }

  /**
   * Calculate positional demand based on market conditions
   */
  private calculatePositionalDemand(position: string): number {
    // Mock positional demand (will be replaced with real market analysis)
    const demandMap: Record<string, number> = {
      QB: 0.9, // High demand for QBs
      RB: 0.7, // Moderate demand for RBs
      WR: 0.8, // High demand for WRs
      TE: 0.6, // Lower demand for TEs
      K: 0.3, // Low demand for Ks
      DEF: 0.5, // Moderate demand for DEF
    };

    return demandMap[position] || 0.5;
  }

  /**
   * Get market context for a specific player/position
   */
  getMarketContext(playerId: string): MarketContext | null {
    const player = this.sportsDataService.getPlayer(Number(playerId));
    if (!player) return null;

    // This will be enhanced with real market data later
    return {
      competingOffers: Math.floor(Math.random() * 3),
      positionalDemand: this.calculatePositionalDemand(player.Position),
      capSpaceAvailable: 50000000,
      recentComps: [],
      seasonStage: 'EarlyFA',
      teamReputation: 0,
      currentWeek: 1, // Default to week 1 for negotiation service
    };
  }

  /**
   * Get all active negotiations for a team
   */
  getTeamNegotiations(teamId: string): NegotiationSession[] {
    return this._activeSessions().filter(
      (session) => session.teamId === teamId
    );
  }

  /**
   * Get negotiation history for a player
   */
  getPlayerNegotiationHistory(playerId: string): NegotiationSession[] {
    return this._activeSessions().filter(
      (session) => session.playerId === playerId && session.status !== 'active'
    );
  }

  /**
   * Clear all negotiation data (for testing/reset)
   */
  clearAllNegotiations(): void {
    this._activeSessions.set([]);
    this._currentSession.set(null);
    this._marketContext.set(null);
  }
}
