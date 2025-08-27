import { Injectable, inject, signal, computed } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
} from '@angular/fire/firestore';
import {
  EnhancedPlayerMinimumCalculator,
  LeagueCapContext,
  MarketRippleContext,
} from '@fantasy-football-dynasty/domain';
import { PlayerDataService, SleeperPlayer } from './player-data.service';
import { LeagueService } from './league.service';
import { TeamService } from './team.service';

@Injectable({
  providedIn: 'root',
})
export class EnhancedPlayerMinimumService {
  private readonly firestore = inject(Firestore);
  private readonly playerDataService = inject(PlayerDataService);
  private readonly leagueService = inject(LeagueService);
  private readonly teamService = inject(TeamService);

  // Private state signals
  private _leagueCapContext = signal<LeagueCapContext | null>(null);
  private _marketRippleContext = signal<MarketRippleContext | null>(null);

  // Public readonly signals
  public leagueCapContext = this._leagueCapContext.asReadonly();
  public marketRippleContext = this._marketRippleContext.asReadonly();

  constructor() {
    // Don't call async method in constructor - it won't work
    // this.initializeContexts();
  }

  /**
   * Initialize league cap context and market ripple context
   */
  private async initializeContexts(): Promise<void> {
    try {
      await this.loadLeagueCapContext();
      await this.loadMarketRippleContext();
    } catch (error) {
      console.error('Failed to initialize contexts:', error);
    }
  }

  /**
   * Ensure contexts are loaded before use
   */
  private async ensureContextsLoaded(): Promise<void> {
    if (!this._leagueCapContext() || !this._marketRippleContext()) {
      await this.initializeContexts();
    }
  }

  /**
   * Load league cap context from Firestore
   */
  private async loadLeagueCapContext(): Promise<void> {
    try {
      const currentLeague = this.leagueService.selectedLeague();
      if (!currentLeague) return;

      // Get league settings for cap information
      const leagueRef = doc(this.firestore, 'leagues', currentLeague.id);
      const leagueDoc = await getDoc(leagueRef);

      if (!leagueDoc.exists()) return;

      const leagueData = leagueDoc.data();

      // Get team cap information
      const teamsRef = collection(this.firestore, 'teams');
      const teamsQuery = query(
        teamsRef,
        where('leagueId', '==', currentLeague.id)
      );
      const teamsSnapshot = await getDocs(teamsQuery);

      let totalCapSpace = 0;
      let teamCount = 0;

      teamsSnapshot.forEach((doc) => {
        const teamData = doc.data();
        totalCapSpace += teamData['capSpace'] || 0;
        teamCount++;
      });

      const averageTeamCapSpace = teamCount > 0 ? totalCapSpace / teamCount : 0;

      // Get recent signings for market context
      const recentSignings = await this.getRecentSignings(currentLeague.id);

      // Determine league health based on cap space
      const leagueHealth = this.determineLeagueHealth(
        averageTeamCapSpace,
        leagueData['salaryCap']
      );

      const context: LeagueCapContext = {
        currentYearCap: leagueData['salaryCap'] || 200000000, // Default $200M cap
        projectedCapGrowth: leagueData['capGrowth'] || 0.05, // Default 5% growth
        totalTeamCapSpace: totalCapSpace,
        averageTeamCapSpace,
        recentSignings,
        marketBenchmarks: await this.calculateMarketBenchmarks(recentSignings),
        leagueHealth,
      };

      this._leagueCapContext.set(context);
    } catch (error) {
      console.error('Failed to load league cap context:', error);
    }
  }

  /**
   * Load market ripple context from Firestore
   */
  private async loadMarketRippleContext(): Promise<void> {
    try {
      const currentLeague = this.leagueService.selectedLeague();
      if (!currentLeague) return;

      // Get recent signings to analyze market ripple effects
      const recentSignings = await this.getRecentSignings(currentLeague.id);

      // Analyze market trends from recent signings
      const marketRipple = this.analyzeMarketTrends(recentSignings);

      this._marketRippleContext.set(marketRipple);
    } catch (error) {
      console.error('Failed to load market ripple context:', error);
    }
  }

  /**
   * Get recent signings from Firestore
   */
  private async getRecentSignings(leagueId: string): Promise<any[]> {
    try {
      // Get recent FA signings
      const faSigningsRef = collection(this.firestore, 'faSignings');
      const faQuery = query(
        faSigningsRef,
        where('leagueId', '==', leagueId),
        orderBy('signedAt', 'desc'),
        limit(20)
      );
      const faSnapshot = await getDocs(faQuery);

      const faSignings = faSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Get recent open FA signings
      const openFARef = collection(this.firestore, 'openFASignings');
      const openFAQuery = query(
        openFARef,
        where('leagueId', '==', leagueId),
        orderBy('signedAt', 'desc'),
        limit(20)
      );
      const openFASnapshot = await getDocs(openFAQuery);

      const openFASignings = openFASnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Combine and sort by date
      const allSignings = [...faSignings, ...openFASignings];
      return allSignings.sort((a: any, b: any) => {
        const aDate = a['signedAt']?.toDate?.() || new Date(0);
        const bDate = b['signedAt']?.toDate?.() || new Date(0);
        return bDate.getTime() - aDate.getTime();
      });
    } catch (error) {
      console.error('Failed to get recent signings:', error);
      return [];
    }
  }

  /**
   * Calculate market benchmarks by position
   */
  private async calculateMarketBenchmarks(
    recentSignings: any[]
  ): Promise<Record<string, number>> {
    const benchmarks: Record<string, number> = {};

    // Group signings by position
    const positionGroups: Record<string, any[]> = {};

    recentSignings.forEach((signing) => {
      const position = signing.player?.position || signing.contract?.position;
      if (position) {
        if (!positionGroups[position]) {
          positionGroups[position] = [];
        }
        positionGroups[position].push(signing);
      }
    });

    // Calculate average contract value by position
    Object.entries(positionGroups).forEach(([position, signings]) => {
      const totalValue = signings.reduce((sum, signing) => {
        return (
          sum + (signing.contract?.apy || signing.contract?.totalValue || 0)
        );
      }, 0);

      benchmarks[position] = totalValue / signings.length;
    });

    return benchmarks;
  }

  /**
   * Determine league health based on cap space
   */
  private determineLeagueHealth(
    averageTeamCapSpace: number,
    salaryCap: number
  ): 'healthy' | 'struggling' | 'prosperous' {
    const capSpacePercentage = averageTeamCapSpace / salaryCap;

    if (capSpacePercentage > 0.15) return 'prosperous';
    if (capSpacePercentage < 0.05) return 'struggling';
    return 'healthy';
  }

  /**
   * Analyze market trends from recent signings
   */
  private analyzeMarketTrends(recentSignings: any[]): MarketRippleContext {
    // Group signings by position and analyze trends
    const positionTrends = this.analyzePositionTrends(recentSignings);
    const tierTrends = this.analyzeTierTrends(recentSignings);

    // Convert recent signings to market ripple format
    const similarPlayerSignings = recentSignings
      .map((signing) => {
        const player = signing.player;
        if (!player) return null;

        const tier = this.determinePlayerTier(
          player.overall,
          player.years_exp || 0,
          player.position
        );
        const contractValue =
          signing.contract?.apy || signing.contract?.totalValue || 0;
        const expectedValue = player.overall * 100000;

        let marketImpact: 'positive' | 'negative' | 'neutral';
        if (contractValue < expectedValue * 0.8) {
          marketImpact = 'negative';
        } else if (contractValue > expectedValue * 1.2) {
          marketImpact = 'positive';
        } else {
          marketImpact = 'neutral';
        }

        return {
          playerId: player.id || player.player_id,
          position: player.position,
          tier,
          contractValue,
          signedAt: signing['signedAt']?.toDate?.() || new Date(),
          marketImpact,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      similarPlayerSignings,
      positionMarketTrend: positionTrends,
      tierMarketTrend: tierTrends,
      recentMarketShifts: [],
    };
  }

  /**
   * Analyze position-specific market trends
   */
  private analyzePositionTrends(
    recentSignings: any[]
  ): 'rising' | 'falling' | 'stable' {
    // Simple trend analysis based on recent contract values
    // In a real implementation, this would be more sophisticated
    return 'stable';
  }

  /**
   * Analyze tier-specific market trends
   */
  private analyzeTierTrends(
    recentSignings: any[]
  ): 'rising' | 'falling' | 'stable' {
    // Simple trend analysis based on recent contract values
    // In a real implementation, this would be more sophisticated
    return 'stable';
  }

  /**
   * Determine player tier (copied from domain logic for consistency)
   */
  private determinePlayerTier(
    overall: number,
    yearsExp: number,
    position: string
  ): 'elite' | 'starter' | 'depth' {
    if (overall >= 85 || (yearsExp >= 3 && overall >= 80)) {
      return 'elite';
    }
    if (overall >= 75 || (yearsExp <= 2 && overall >= 70)) {
      return 'starter';
    }
    return 'depth';
  }

  /**
   * Calculate enhanced minimum for a player
   */
  public async calculatePlayerMinimum(player: any): Promise<number> {
    console.log('Calculating player minimum for:', player);

    // Ensure contexts are loaded
    await this.ensureContextsLoaded();

    const leagueContext = this._leagueCapContext();
    const marketRipple = this._marketRippleContext();

    console.log('League context:', leagueContext);
    console.log('Market ripple:', marketRipple);

    if (!leagueContext || !marketRipple) {
      console.log('Contexts not loaded, using simple calculation');
      // Fallback to simple calculation if contexts aren't loaded
      return this.calculateSimpleMinimum(player);
    }

    try {
      const result = EnhancedPlayerMinimumCalculator.calculateEnhancedMinimum(
        player,
        leagueContext,
        marketRipple
      );
      console.log('Enhanced minimum calculated:', result);
      return result;
    } catch (error) {
      console.error(
        'Failed to calculate enhanced minimum, falling back to simple:',
        error
      );
      return this.calculateSimpleMinimum(player);
    }
  }

  /**
   * Calculate simple minimum as fallback
   */
  private calculateSimpleMinimum(player: any): number {
    console.log('Using simple calculation for player:', player);

    const baseValue = player.overall * 100000; // $100k per overall point

    // Apply basic position modifiers
    let positionModifier = 1.0;
    switch (player.position) {
      case 'QB':
        positionModifier = 1.2;
        break;
      case 'RB':
      case 'WR':
        positionModifier = 1.0;
        break;
      case 'TE':
        positionModifier = 0.8;
        break;
      case 'K':
        positionModifier = 0.3;
        break;
      case 'DEF':
        positionModifier = 0.6;
        break;
    }

    const result = Math.round(baseValue * positionModifier);
    console.log(
      'Simple minimum calculated:',
      result,
      'baseValue:',
      baseValue,
      'positionModifier:',
      positionModifier
    );
    return result;
  }

  /**
   * Update market ripple context when a new signing occurs
   */
  public updateMarketRipple(signedPlayer: any, contractValue: number): void {
    const currentRipple = this._marketRippleContext();
    if (!currentRipple) return;

    try {
      const updatedRipple = EnhancedPlayerMinimumCalculator.analyzeMarketRipple(
        signedPlayer,
        contractValue,
        currentRipple
      );

      this._marketRippleContext.set(updatedRipple);
    } catch (error) {
      console.error('Failed to update market ripple:', error);
    }
  }

  /**
   * Get market context summary for display
   */
  public async getMarketContextSummary(): Promise<{
    leagueHealth: string;
    averageCapSpace: string;
    recentSigningsCount: number;
    marketTrends: Record<string, string>;
  } | null> {
    // Ensure contexts are loaded
    await this.ensureContextsLoaded();

    const leagueContext = this._leagueCapContext();
    const marketRipple = this._marketRippleContext();

    if (!leagueContext || !marketRipple) return null;

    return {
      leagueHealth: leagueContext.leagueHealth,
      averageCapSpace: this.formatCurrency(leagueContext.averageTeamCapSpace),
      recentSigningsCount: leagueContext.recentSignings.length,
      marketTrends: {
        position: marketRipple.positionMarketTrend,
        tier: marketRipple.tierMarketTrend,
      },
    };
  }

  /**
   * Format currency for display
   */
  private formatCurrency(amount: number): string {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  }
}
