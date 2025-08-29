import { PlayerStats } from './league-setup.service';

export interface PlayerRatingContext {
  position: string;
  experience: number;
  age: number;
  fantasyPoints: number;
  fantasyPointsPPR: number;
  gamesPlayed: number;
  gamesStarted: number;
}

export class PlayerRatingService {
  // Position-specific fantasy point benchmarks for elite performance
  private static readonly ELITE_FANTASY_BENCHMARKS = {
    QB: { ppr: 400, standard: 350 },
    RB: { ppr: 300, standard: 250 },
    WR: { ppr: 250, standard: 200 },
    TE: { ppr: 200, standard: 150 }, // TEs are more valuable due to scarcity
    K: { ppr: 150, standard: 150 },
    DEF: { ppr: 150, standard: 150 },
    DL: { ppr: 100, standard: 100 },
    LB: { ppr: 120, standard: 120 },
    DB: { ppr: 100, standard: 100 },
  };

  // Position scarcity multipliers (higher = more valuable)
  private static readonly POSITION_SCARCITY_MULTIPLIERS = {
    QB: 1.2, // Most valuable position
    RB: 1.1, // High value, but shorter careers
    WR: 1.0, // Standard baseline
    TE: 1.3, // High value due to scarcity and dual-threat
    K: 0.7, // Least valuable
    DEF: 0.9, // Team defense
    DL: 0.8, // IDP positions
    LB: 0.8,
    DB: 0.8,
  };

  /**
   * Calculate overall rating based on fantasy performance and position factors
   */
  static calculateOverallRating(
    stats: PlayerStats,
    context: PlayerRatingContext
  ): number {
    // Base rating from fantasy performance
    const fantasyRating = this.calculateFantasyBasedRating(stats, context);

    // Position-specific adjustments
    const positionRating = this.calculatePositionSpecificRating(stats, context);

    // Experience and age modifiers
    const experienceRating = this.calculateExperienceRating(context);

    // Combine ratings with weights
    const overall = Math.round(
      fantasyRating * 0.6 + // 60% fantasy performance
        positionRating * 0.3 + // 30% position-specific skills
        experienceRating * 0.1 // 10% experience/age
    );

    // Clamp to 50-99 range
    return Math.max(50, Math.min(99, overall));
  }

  /**
   * Calculate rating based on fantasy performance relative to position benchmarks
   */
  private static calculateFantasyBasedRating(
    stats: PlayerStats,
    context: PlayerRatingContext
  ): number {
    const benchmark =
      this.ELITE_FANTASY_BENCHMARKS[
        context.position as keyof typeof this.ELITE_FANTASY_BENCHMARKS
      ];
    if (!benchmark) return 70;

    // Use PPR if available, fallback to standard
    const fantasyPoints =
      context.fantasyPointsPPR || context.fantasyPoints || 0;
    const gamesPlayed = context.gamesPlayed || 1;

    // Calculate per-game fantasy points
    const fantasyPointsPerGame = fantasyPoints / gamesPlayed;

    // Calculate percentage of elite benchmark
    const pprPercentage = fantasyPointsPerGame / (benchmark.ppr / 17); // 17 games season
    const standardPercentage = fantasyPointsPerGame / (benchmark.standard / 17);

    // Use the higher percentage (PPR or standard)
    const performancePercentage = Math.max(pprPercentage, standardPercentage);

    // Scale to rating: 50 = replacement level, 99 = elite
    let rating = 50 + performancePercentage * 49;

    // Bonus for high volume (games played)
    if (gamesPlayed >= 15) rating += 2;
    if (gamesPlayed >= 16) rating += 1;

    return Math.min(99, rating);
  }

  /**
   * Calculate position-specific rating based on relevant stats
   */
  private static calculatePositionSpecificRating(
    stats: PlayerStats,
    context: PlayerRatingContext
  ): number {
    switch (context.position) {
      case 'QB':
        return this.calculateQBRating(stats);
      case 'RB':
        return this.calculateRBRating(stats);
      case 'WR':
        return this.calculateWRRating(stats);
      case 'TE':
        return this.calculateTERating(stats);
      case 'K':
        return this.calculateKRating(stats);
      case 'DEF':
      case 'DL':
      case 'LB':
      case 'DB':
        return this.calculateDefenseRating(stats);
      default:
        return 70;
    }
  }

  /**
   * Calculate QB rating based on passing and rushing efficiency
   */
  private static calculateQBRating(stats: PlayerStats): number {
    let rating = 70;

    if (stats.PassingAttempts && stats.PassingAttempts > 0) {
      // Completion percentage (0-10 points)
      const completionRate =
        (stats.PassingCompletions || 0) / stats.PassingAttempts;
      rating += completionRate * 10;

      // Yards per attempt (0-10 points)
      const yardsPerAttempt = (stats.PassingYards || 0) / stats.PassingAttempts;
      rating += Math.min(10, yardsPerAttempt * 0.5);

      // TD rate (0-10 points)
      const tdRate = (stats.PassingTouchdowns || 0) / stats.PassingAttempts;
      rating += Math.min(10, tdRate * 100);

      // INT rate penalty (0-10 points)
      const intRate = (stats.PassingInterceptions || 0) / stats.PassingAttempts;
      rating -= Math.min(10, intRate * 100);
    }

    // Rushing bonus (0-5 points)
    if (stats.RushingYards && stats.RushingYards > 0) {
      rating += Math.min(5, stats.RushingYards / 100);
    }

    return Math.min(99, rating);
  }

  /**
   * Calculate RB rating based on rushing and receiving efficiency
   */
  private static calculateRBRating(stats: PlayerStats): number {
    let rating = 70;

    if (stats.RushingAttempts && stats.RushingAttempts > 0) {
      // Yards per carry (0-15 points)
      const yardsPerCarry = (stats.RushingYards || 0) / stats.RushingAttempts;
      rating += Math.min(15, yardsPerCarry * 3);

      // TD rate (0-10 points)
      const tdRate = (stats.RushingTouchdowns || 0) / stats.RushingAttempts;
      rating += Math.min(10, tdRate * 100);
    }

    // Receiving efficiency (0-10 points)
    if (stats.ReceivingTargets && stats.ReceivingTargets > 0) {
      const catchRate = (stats.Receptions || 0) / stats.ReceivingTargets;
      rating += catchRate * 5;

      if (stats.ReceivingYards && stats.ReceivingYards > 0) {
        rating += Math.min(5, stats.ReceivingYards / 100);
      }
    }

    return Math.min(99, rating);
  }

  /**
   * Calculate WR rating based on receiving efficiency
   */
  private static calculateWRRating(stats: PlayerStats): number {
    let rating = 70;

    if (stats.ReceivingTargets && stats.ReceivingTargets > 0) {
      // Catch rate (0-10 points)
      const catchRate = (stats.Receptions || 0) / stats.ReceivingTargets;
      rating += catchRate * 10;

      // Yards per target (0-15 points)
      if (stats.ReceivingYards && stats.ReceivingYards > 0) {
        const yardsPerTarget = stats.ReceivingYards / stats.ReceivingTargets;
        rating += Math.min(15, yardsPerTarget * 0.3);
      }

      // TD rate (0-10 points)
      const tdRate = (stats.ReceivingTouchdowns || 0) / stats.ReceivingTargets;
      rating += Math.min(10, tdRate * 100);
    }

    return Math.min(99, rating);
  }

  /**
   * Calculate TE rating - enhanced for position scarcity and dual-threat capability
   */
  private static calculateTERating(stats: PlayerStats): number {
    let rating = 70;

    if (stats.ReceivingTargets && stats.ReceivingTargets > 0) {
      // Catch rate (0-12 points) - TEs get slightly higher weight
      const catchRate = (stats.Receptions || 0) / stats.ReceivingTargets;
      rating += catchRate * 12;

      // Yards per target (0-18 points) - TEs get higher weight for efficiency
      if (stats.ReceivingYards && stats.ReceivingYards > 0) {
        const yardsPerTarget = stats.ReceivingYards / stats.ReceivingTargets;
        rating += Math.min(18, yardsPerTarget * 0.35);
      }

      // TD rate (0-12 points) - TEs get higher weight for scoring
      const tdRate = (stats.ReceivingTouchdowns || 0) / stats.ReceivingTargets;
      rating += Math.min(12, tdRate * 100);

      // Volume bonus for TEs (0-5 points) - high-volume TEs are very valuable
      if (stats.ReceivingTargets >= 100) rating += 3;
      if (stats.ReceivingTargets >= 120) rating += 2;
    }

    // Rushing bonus for TEs (0-3 points) - dual-threat capability
    if (stats.RushingYards && stats.RushingYards > 0) {
      rating += Math.min(3, stats.RushingYards / 50);
    }

    // Blocking/versatility bonus (0-2 points) - TEs are valued for blocking
    if (stats.Started && stats.Started > 0) {
      rating += Math.min(2, stats.Started / 8);
    }

    return Math.min(99, rating);
  }

  /**
   * Calculate K rating based on kicking accuracy and distance
   */
  private static calculateKRating(stats: PlayerStats): number {
    let rating = 70;

    if (stats.FieldGoalsAttempted && stats.FieldGoalsAttempted > 0) {
      // Accuracy (0-20 points)
      const accuracy = (stats.FieldGoalsMade || 0) / stats.FieldGoalsAttempted;
      rating += accuracy * 20;

      // Long field goal bonus (0-10 points)
      rating += Math.min(10, (stats.FieldGoalsMade50Plus || 0) * 2);
    }

    return Math.min(99, rating);
  }

  /**
   * Calculate defense rating based on defensive stats
   */
  private static calculateDefenseRating(stats: PlayerStats): number {
    let rating = 70;

    // Tackles (0-10 points)
    const totalTackles =
      (stats.SoloTackles || 0) + (stats.AssistedTackles || 0);
    rating += Math.min(10, totalTackles / 5);

    // Sacks (0-10 points)
    rating += Math.min(10, (stats.Sacks || 0) * 2);

    // Interceptions (0-10 points)
    rating += Math.min(10, (stats.Interceptions || 0) * 3);

    // Passes defended (0-5 points)
    rating += Math.min(5, stats.PassesDefended || 0);

    // Tackles for loss bonus (0-3 points)
    rating += Math.min(3, stats.TacklesForLoss || 0);

    return Math.min(99, rating);
  }

  /**
   * Calculate experience and age rating modifier
   */
  private static calculateExperienceRating(
    context: PlayerRatingContext
  ): number {
    let rating = 70;

    // Experience bonus/penalty
    if (context.experience === 0) {
      rating -= 5; // Rookie penalty
    } else if (context.experience <= 2) {
      rating -= 2; // Young player penalty
    } else if (context.experience >= 8) {
      rating -= 3; // Veteran penalty
    }

    // Age modifier
    if (context.age < 22) rating -= 3; // Too young
    if (context.age >= 30) rating -= 2; // Aging

    return Math.max(50, Math.min(99, rating));
  }

  /**
   * Get position scarcity multiplier
   */
  static getPositionScarcityMultiplier(position: string): number {
    return (
      this.POSITION_SCARCITY_MULTIPLIERS[
        position as keyof typeof this.POSITION_SCARCITY_MULTIPLIERS
      ] || 1.0
    );
  }

  /**
   * Get elite fantasy benchmark for a position
   */
  static getEliteFantasyBenchmark(
    position: string
  ): { ppr: number; standard: number } | null {
    return (
      this.ELITE_FANTASY_BENCHMARKS[
        position as keyof typeof this.ELITE_FANTASY_BENCHMARKS
      ] || null
    );
  }
}
