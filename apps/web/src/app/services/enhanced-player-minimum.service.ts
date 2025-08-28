import { Injectable, inject, signal, computed } from '@angular/core';
import { LeagueService } from './league.service';
import {
  ContractMinimumCalculator,
  EnhancedPlayerMinimumCalculator,
  PlayerRatingCalculator,
  type LeagueCapContext,
  type MarketRippleContext,
} from '@fantasy-football-dynasty/domain';

@Injectable({
  providedIn: 'root',
})
export class EnhancedPlayerMinimumService {
  private readonly leagueService = inject(LeagueService);

  constructor() {
    // No initialization needed for simple calculation
  }

  /**
   * Calculate player minimum using the comprehensive system from domain.ts
   * This leverages ContractMinimumCalculator and EnhancedPlayerMinimumCalculator
   */
  async calculatePlayerMinimum(player: any): Promise<number | null> {
    try {
      if (!player || !player.overall || !player.position) {
        return null;
      }

      // Get league context for enhanced calculation
      const leagueContext = await this.getLeagueCapContext();
      const marketRipple = await this.getMarketRippleContext();

      // Use the enhanced calculator from domain.ts
      const enhancedMinimum =
        EnhancedPlayerMinimumCalculator.calculateEnhancedMinimum(
          player,
          leagueContext,
          marketRipple
        );

      return enhancedMinimum;
    } catch (error) {
      console.error('Error calculating enhanced player minimum:', error);

      // Fallback to basic calculation if enhanced fails
      return this.calculateBasicMinimum(player);
    }
  }

  /**
   * Fallback basic calculation using ContractMinimumCalculator
   */
  private calculateBasicMinimum(player: any): number {
    try {
      // Determine player tier using the sophisticated system
      const tier = ContractMinimumCalculator.determinePlayerTier(
        player.overall || 70,
        player.years_exp || 0,
        player.position
      );

      // Calculate age (handle both Age property and BirthDate)
      let age = player.age;
      if (!age && player.BirthDate) {
        age = this.calculateAgeFromBirthDate(player.BirthDate);
      }
      if (!age) age = 25; // Default age

      // Get salary cap from league or use default
      const salaryCap = this.getSalaryCap();

      // Calculate minimum using the tier-based system
      const minimum = ContractMinimumCalculator.calculateMinimumContract(
        tier,
        age,
        player.position,
        salaryCap
      );

      return minimum;
    } catch (error) {
      console.error('Error in basic minimum calculation:', error);

      // Ultimate fallback: simple formula
      const baseMinimum = (player.overall || 70) * 50000;
      return Math.max(100000, Math.min(50000000, baseMinimum));
    }
  }

  /**
   * Calculate age from birth date string
   */
  private calculateAgeFromBirthDate(birthDate: string): number {
    if (!birthDate) return 25;

    try {
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birth.getDate())
      ) {
        age--;
      }

      return age;
    } catch (error) {
      console.warn('Error calculating age from birth date:', birthDate, error);
      return 25;
    }
  }

  /**
   * Get salary cap from league or use default
   */
  private getSalaryCap(): number {
    try {
      const league = this.leagueService.selectedLeague();
      return league?.rules?.cap?.salaryCap || 200000000; // Default $200M cap
    } catch (error) {
      return 200000000; // Default fallback
    }
  }

  /**
   * Get league cap context for enhanced calculation
   */
  private async getLeagueCapContext(): Promise<LeagueCapContext> {
    try {
      const league = this.leagueService.selectedLeague();
      const salaryCap = this.getSalaryCap();

      // Default context if league data not available
      return {
        currentYearCap: salaryCap,
        projectedCapGrowth: 0.06, // 6% growth
        totalTeamCapSpace: salaryCap * 0.1, // Assume 10% total cap space
        averageTeamCapSpace: salaryCap * 0.01, // Assume 1% average per team
        recentSignings: [], // No recent signings data yet
        marketBenchmarks: this.getDefaultMarketBenchmarks(),
        leagueHealth: 'healthy' as const,
      };
    } catch (error) {
      // Return default context
      return {
        currentYearCap: 200000000,
        projectedCapGrowth: 0.06,
        totalTeamCapSpace: 20000000,
        averageTeamCapSpace: 2000000,
        recentSignings: [],
        marketBenchmarks: this.getDefaultMarketBenchmarks(),
        leagueHealth: 'healthy' as const,
      };
    }
  }

  /**
   * Get market ripple context for enhanced calculation
   */
  private async getMarketRippleContext(): Promise<MarketRippleContext> {
    // Default market context since we don't have historical data yet
    return {
      similarPlayerSignings: [],
      positionMarketTrend: 'stable' as const,
      tierMarketTrend: 'stable' as const,
      recentMarketShifts: [],
    };
  }

  /**
   * Get default market benchmarks by position
   */
  private getDefaultMarketBenchmarks(): Record<string, number> {
    return {
      QB: 15000000, // $15M for QBs
      RB: 8000000, // $8M for RBs
      WR: 10000000, // $10M for WRs
      TE: 7000000, // $7M for TEs
      K: 3000000, // $3M for Kickers
      DEF: 5000000, // $5M for Defense
      DL: 6000000, // $6M for DL
      LB: 6000000, // $6M for LBs
      DB: 5000000, // $5M for DBs
    };
  }

  /**
   * Get market context summary for display
   */
  async getMarketContextSummary() {
    try {
      const leagueContext = await this.getLeagueCapContext();

      return {
        averageTeamCapSpace: leagueContext.averageTeamCapSpace,
        totalLeagueCapSpace: leagueContext.totalTeamCapSpace,
        recentSignings: leagueContext.recentSignings,
        marketTrends: leagueContext.leagueHealth,
        salaryCap: leagueContext.currentYearCap,
        projectedGrowth: leagueContext.projectedCapGrowth,
      };
    } catch (error) {
      // Return default summary
      return {
        averageTeamCapSpace: 2000000,
        totalLeagueCapSpace: 20000000,
        recentSignings: [],
        marketTrends: 'healthy',
        salaryCap: 200000000,
        projectedGrowth: 0.06,
      };
    }
  }

  /**
   * Validate if a contract meets minimum requirements
   */
  async validateContractMinimum(
    contract: any,
    player: any,
    isRookie: boolean = false,
    draftRound?: number
  ) {
    try {
      const salaryCap = this.getSalaryCap();

      return ContractMinimumCalculator.validateContractMinimum(
        contract,
        {
          age:
            player.age ||
            this.calculateAgeFromBirthDate(player.BirthDate) ||
            25,
          position: player.position,
          overall: player.overall || 70,
          yearsExp: player.years_exp || 0,
        },
        salaryCap,
        isRookie,
        draftRound
      );
    } catch (error) {
      console.error('Error validating contract minimum:', error);
      return {
        isValid: false,
        minimumRequired: 0,
        currentValue: 0,
        message: 'Error validating contract minimum',
      };
    }
  }
}
