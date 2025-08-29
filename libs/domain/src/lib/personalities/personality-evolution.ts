import {
  EnhancedPlayer,
  PersonalityChange,
  EvolutionCooldown,
  AgeMilestone,
  MarketExperience,
  LifeEvent,
} from './enhanced-player';

/**
 * Engine for managing personality evolution over time
 * Handles life events, market experiences, and age-based changes
 */
export class PersonalityEvolutionEngine {
  /**
   * Add a life event that can influence personality
   */
  static addLifeEvent(
    player: EnhancedPlayer,
    eventType: string,
    year: number,
    week?: number,
    description?: string
  ): void {
    const impact = this.calculateLifeEventImpact(eventType, player);

    const lifeEvent: LifeEvent = {
      type: eventType as any,
      year,
      week,
      description: description || this.generateLifeEventDescription(eventType),
      impact,
      durationWeeks: this.calculateEventDuration(eventType),
    };

    player.personality.evolution.lifeEvents.push(lifeEvent);

    // Apply immediate impact
    this.applyPersonalityChanges(player, impact);

    // Add cooldowns to prevent rapid changes
    this.addEvolutionCooldowns(player, impact);
  }

  /**
   * Add a market experience that can influence personality
   */
  static addMarketExperience(
    player: EnhancedPlayer,
    experienceType: string,
    year: number,
    week?: number,
    description?: string
  ): void {
    const impact = this.calculateMarketExperienceImpact(experienceType, player);

    const marketExperience: MarketExperience = {
      type: experienceType as any,
      year,
      week,
      description:
        description || this.generateMarketExperienceDescription(experienceType),
      impact,
      durationWeeks: this.calculateExperienceDuration(experienceType),
    };

    player.personality.evolution.marketExperiences.push(marketExperience);

    // Apply immediate impact
    this.applyPersonalityChanges(player, impact);

    // Add cooldowns to prevent rapid changes
    this.addEvolutionCooldowns(player, impact);
  }

  /**
   * Process personality evolution with cooldowns and age-based changes
   */
  static processPersonalityEvolution(
    player: EnhancedPlayer,
    currentYear: number
  ): void {
    // Check cooldowns first
    this.updateCooldowns(player, currentYear);

    // Process different types of evolution
    const lifeEventChanges = this.processLifeEvents(player, currentYear);
    const marketExperienceChanges = this.processMarketExperiences(
      player,
      currentYear
    );
    const ageBasedChanges = this.processAgeBasedEvolution(player, currentYear);

    // Combine all changes
    const allChanges = [
      ...lifeEventChanges,
      ...marketExperienceChanges,
      ...ageBasedChanges,
    ];

    if (allChanges.length > 0) {
      player.personality.evolution.evolutionCount++;
      player.personality.evolution.lastEvolutionYear = currentYear;
      player.personality.evolution.evolutionHistory.push(...allChanges);

      // Apply changes
      this.applyPersonalityChanges(player, allChanges);
    }
  }

  /**
   * Update cooldowns and remove expired ones
   */
  private static updateCooldowns(
    player: EnhancedPlayer,
    currentYear: number
  ): void {
    const currentTime = currentYear * 52; // Convert years to weeks

    player.personality.evolution.cooldowns =
      player.personality.evolution.cooldowns.filter((cooldown) => {
        if (currentTime - cooldown.startTime >= cooldown.durationWeeks) {
          cooldown.isActive = false;
          return false; // Remove expired cooldowns
        }
        return true;
      });
  }

  /**
   * Add cooldowns to prevent rapid personality changes
   */
  private static addEvolutionCooldowns(
    player: EnhancedPlayer,
    changes: PersonalityChange[]
  ): void {
    const currentTime = Date.now() / (1000 * 60 * 60 * 24 * 7); // Current time in weeks

    for (const change of changes) {
      // Check if trait is already on cooldown
      const existingCooldown = player.personality.evolution.cooldowns.find(
        (c) => c.trait === change.trait && c.isActive
      );

      if (!existingCooldown) {
        const cooldown: EvolutionCooldown = {
          trait: change.trait,
          startTime: currentTime,
          durationWeeks: this.calculateCooldownDuration(
            change.trait,
            change.change
          ),
          reason: `Recent change: ${change.reason}`,
          isActive: true,
        };

        player.personality.evolution.cooldowns.push(cooldown);
      }
    }
  }

  /**
   * Calculate cooldown duration based on trait and change magnitude
   */
  private static calculateCooldownDuration(
    trait: string,
    changeAmount: number
  ): number {
    const baseDuration = 4; // Base 4 weeks

    // Longer cooldowns for more significant changes
    if (Math.abs(changeAmount) > 0.3) return baseDuration * 3;
    if (Math.abs(changeAmount) > 0.2) return baseDuration * 2;
    if (Math.abs(changeAmount) > 0.1) return baseDuration * 1.5;

    return baseDuration;
  }

  /**
   * Process life events for evolution
   */
  private static processLifeEvents(
    player: EnhancedPlayer,
    currentYear: number
  ): PersonalityChange[] {
    const changes: PersonalityChange[] = [];
    const recentEvents = player.personality.evolution.lifeEvents.filter(
      (event) => currentYear - event.year <= 2 && event.durationWeeks > 0
    );

    for (const event of recentEvents) {
      // Check if event is still active
      if (event.durationWeeks > 0) {
        changes.push(...event.impact);
        event.durationWeeks--; // Decrease duration
      }
    }

    return changes;
  }

  /**
   * Process market experiences for evolution
   */
  private static processMarketExperiences(
    player: EnhancedPlayer,
    currentYear: number
  ): PersonalityChange[] {
    const changes: PersonalityChange[] = [];
    const recentExperiences =
      player.personality.evolution.marketExperiences.filter(
        (exp) => currentYear - exp.year <= 1 && exp.durationWeeks > 0
      );

    for (const experience of recentExperiences) {
      // Check if experience is still active
      if (experience.durationWeeks > 0) {
        changes.push(...experience.impact);
        experience.durationWeeks--; // Decrease duration
      }
    }

    return changes;
  }

  /**
   * Process age-based evolution milestones
   */
  private static processAgeBasedEvolution(
    player: EnhancedPlayer,
    currentYear: number
  ): PersonalityChange[] {
    const changes: PersonalityChange[] = [];
    const age = player.age;

    // Check if we've hit a new age milestone
    const existingMilestones =
      player.personality.evolution.ageEvolutionMilestones.map((m) => m.age);

    if (age >= 30 && age < 35 && !existingMilestones.includes(30)) {
      const milestone: AgeMilestone = {
        age: 30,
        year: currentYear,
        changes: [
          {
            trait: 'guarantee_priority',
            change: 0.1,
            reason: 'Age 30: Seeking more security',
            permanent: false,
          },
          {
            trait: 'risk_tolerance',
            change: -0.1,
            reason: 'Age 30: Becoming more conservative',
            permanent: false,
          },
        ],
        description: 'Player reached age 30 milestone',
      };

      player.personality.evolution.ageEvolutionMilestones.push(milestone);
      changes.push(...milestone.changes);
    } else if (age >= 35 && !existingMilestones.includes(35)) {
      const milestone: AgeMilestone = {
        age: 35,
        year: currentYear,
        changes: [
          {
            trait: 'guarantee_priority',
            change: 0.2,
            reason: 'Age 35: Prioritizing security over money',
            permanent: false,
          },
          {
            trait: 'winning_priority',
            change: 0.1,
            reason: 'Age 35: Wanting to win before retirement',
            permanent: false,
          },
          {
            trait: 'length_priority',
            change: -0.1,
            reason: 'Age 35: Preferring shorter deals',
            permanent: false,
          },
        ],
        description: 'Player reached age 35 milestone',
      };

      player.personality.evolution.ageEvolutionMilestones.push(milestone);
      changes.push(...milestone.changes);
    }

    return changes;
  }

  /**
   * Calculate impact of life events
   */
  private static calculateLifeEventImpact(
    eventType: string,
    player: EnhancedPlayer
  ): PersonalityChange[] {
    const changes: PersonalityChange[] = [];

    switch (eventType) {
      case 'major_injury':
        changes.push(
          {
            trait: 'guarantee_priority',
            change: 0.3,
            reason: 'Major injury: Seeking guaranteed money',
            permanent: false,
          },
          {
            trait: 'risk_tolerance',
            change: -0.2,
            reason: 'Major injury: Becoming more risk-averse',
            permanent: false,
          }
        );
        break;

      case 'championship_win':
        changes.push(
          {
            trait: 'winning_priority',
            change: 0.2,
            reason: 'Championship win: Proving winning matters',
            permanent: false,
          },
          {
            trait: 'ego',
            change: 0.1,
            reason: 'Championship win: Increased confidence',
            permanent: false,
          }
        );
        break;

      case 'team_change':
        changes.push({
          trait: 'team_loyalty',
          change: -0.1,
          reason: 'Team change: Reduced loyalty to organizations',
          permanent: false,
        });
        break;

      case 'age_milestone':
        // Age milestones are handled separately
        break;

      case 'personal_issue':
        changes.push({
          trait: 'guarantee_priority',
          change: 0.2,
          reason: 'Personal issue: Seeking financial security',
          permanent: false,
        });
        break;

      case 'career_highlight':
        changes.push({
          trait: 'ego',
          change: 0.15,
          reason: 'Career highlight: Increased self-confidence',
          permanent: false,
        });
        break;
    }

    return changes;
  }

  /**
   * Calculate impact of market experiences
   */
  private static calculateMarketExperienceImpact(
    experienceType: string,
    player: EnhancedPlayer
  ): PersonalityChange[] {
    const changes: PersonalityChange[] = [];

    switch (experienceType) {
      case 'successful_holdout':
        changes.push(
          {
            trait: 'holdout_threshold',
            change: 0.1,
            reason: 'Successful holdout: More willing to hold out',
            permanent: false,
          },
          {
            trait: 'ego',
            change: 0.1,
            reason: 'Successful holdout: Increased confidence',
            permanent: false,
          }
        );
        break;

      case 'failed_holdout':
        changes.push({
          trait: 'holdout_threshold',
          change: -0.15,
          reason: 'Failed holdout: Less willing to hold out',
          permanent: false,
        });
        break;

      case 'market_overpayment':
        changes.push({
          trait: 'money_priority',
          change: 0.1,
          reason: 'Market overpayment: Money matters more',
          permanent: false,
        });
        break;

      case 'team_betrayal':
        changes.push({
          trait: 'team_loyalty',
          change: -0.2,
          reason: 'Team betrayal: Reduced organizational loyalty',
          permanent: false,
        });
        break;

      case 'championship_win':
        changes.push({
          trait: 'winning_priority',
          change: 0.15,
          reason: 'Championship win: Proving winning matters',
          permanent: false,
        });
        break;

      case 'playoff_exit':
        changes.push({
          trait: 'winning_priority',
          change: 0.1,
          reason: 'Playoff exit: Wanting to win more',
          permanent: false,
        });
        break;

      case 'injury_recovery':
        changes.push({
          trait: 'injury_anxiety',
          change: -0.1,
          reason: 'Injury recovery: Reduced injury anxiety',
          permanent: false,
        });
        break;
    }

    return changes;
  }

  /**
   * Calculate duration for different event types
   */
  private static calculateEventDuration(eventType: string): number {
    switch (eventType) {
      case 'major_injury':
        return 26; // 6 months
      case 'championship_win':
        return 52; // 1 year
      case 'team_change':
        return 13; // 3 months
      case 'personal_issue':
        return 26; // 6 months
      case 'career_highlight':
        return 13; // 3 months
      default:
        return 13; // 3 months default
    }
  }

  /**
   * Calculate duration for different experience types
   */
  private static calculateExperienceDuration(experienceType: string): number {
    switch (experienceType) {
      case 'successful_holdout':
        return 26; // 6 months
      case 'failed_holdout':
        return 39; // 9 months
      case 'market_overpayment':
        return 13; // 3 months
      case 'team_betrayal':
        return 52; // 1 year
      case 'championship_win':
        return 52; // 1 year
      case 'playoff_exit':
        return 26; // 6 months
      case 'injury_recovery':
        return 13; // 3 months
      default:
        return 13; // 3 months default
    }
  }

  /**
   * Generate descriptions for life events
   */
  private static generateLifeEventDescription(eventType: string): string {
    switch (eventType) {
      case 'major_injury':
        return 'Suffered a major injury that affected career trajectory';
      case 'championship_win':
        return 'Won a championship, proving winning matters';
      case 'team_change':
        return 'Changed teams, affecting organizational loyalty';
      case 'age_milestone':
        return 'Reached a significant age milestone';
      case 'personal_issue':
        return 'Faced personal challenges affecting career decisions';
      case 'career_highlight':
        return 'Achieved a major career milestone';
      default:
        return 'Experienced a significant life event';
    }
  }

  /**
   * Generate descriptions for market experiences
   */
  private static generateMarketExperienceDescription(
    experienceType: string
  ): string {
    switch (experienceType) {
      case 'successful_holdout':
        return 'Successfully held out and got desired contract terms';
      case 'failed_holdout':
        return 'Failed holdout resulted in unfavorable contract';
      case 'market_overpayment':
        return 'Received above-market compensation';
      case 'team_betrayal':
        return 'Team acted against player interests';
      case 'championship_win':
        return 'Won championship with current team';
      case 'playoff_exit':
        return 'Early playoff exit despite strong season';
      case 'injury_recovery':
        return 'Successfully recovered from injury';
      default:
        return 'Experienced significant market event';
    }
  }

  /**
   * Get evolution summary for debugging/UI
   */
  static getEvolutionSummary(player: EnhancedPlayer): string {
    const evolution = player.personality.evolution;
    const activeCooldowns = evolution.cooldowns.filter(
      (c) => c.isActive
    ).length;
    const recentEvents = evolution.lifeEvents.filter(
      (e) => e.durationWeeks > 0
    ).length;
    const recentExperiences = evolution.marketExperiences.filter(
      (e) => e.durationWeeks > 0
    ).length;

    return `Evolution Count: ${evolution.evolutionCount}, Last Year: ${evolution.lastEvolutionYear}, Active Cooldowns: ${activeCooldowns}, Recent Events: ${recentEvents}, Recent Experiences: ${recentExperiences}`;
  }

  /**
   * Check if personality should evolve
   */
  private static shouldEvolvePersonality(
    player: EnhancedPlayer,
    currentYear: number
  ): boolean {
    const evolution = player.personality.evolution;
    const yearsSinceLastEvolution = currentYear - evolution.lastEvolutionYear;

    // Personality can evolve every 2-3 years
    return yearsSinceLastEvolution >= 2 && evolution.evolutionCount < 3;
  }

  /**
   * Apply personality changes to a player
   */
  static applyPersonalityChanges(
    player: EnhancedPlayer,
    changes: PersonalityChange[]
  ): void {
    for (const change of changes) {
      this.applyPersonalityChange(player, change);
    }
  }

  /**
   * Apply a single personality change
   */
  private static applyPersonalityChange(
    player: EnhancedPlayer,
    change: PersonalityChange
  ): void {
    const { trait, change: changeAmount, reason } = change;

    // Apply changes to weights
    if (trait.includes('priority')) {
      const weightKey = trait as keyof typeof player.personality.weights;
      if (weightKey in player.personality.weights) {
        const current = player.personality.weights[weightKey];
        player.personality.weights[weightKey] = Math.max(
          0.0,
          Math.min(1.0, current + changeAmount)
        );
      }
    }

    // Apply changes to behaviors
    if (trait === 'holdout_threshold') {
      const current = player.personality.behaviors.holdoutThreshold;
      player.personality.behaviors.holdoutThreshold = Math.max(
        0.0,
        Math.min(1.0, current + changeAmount)
      );
    } else if (trait === 'counter_offer_multiplier') {
      const current = player.personality.behaviors.counterOfferMultiplier;
      player.personality.behaviors.counterOfferMultiplier = Math.max(
        1.0,
        Math.min(2.0, current + changeAmount)
      );
    } else if (trait === 'deadline_softening') {
      const current = player.personality.behaviors.deadlineSoftening;
      player.personality.behaviors.deadlineSoftening = Math.max(
        0.0,
        Math.min(0.1, current + changeAmount)
      );
    } else if (trait === 'comparison_weight') {
      const current = player.personality.behaviors.comparisonWeight;
      player.personality.behaviors.comparisonWeight = Math.max(
        0.0,
        Math.min(1.0, current + changeAmount)
      );
    } else if (trait === 'deadline_susceptibility') {
      const current = player.personality.behaviors.deadlineSusceptibility;
      player.personality.behaviors.deadlineSusceptibility = Math.max(
        0.0,
        Math.min(1.0, current + changeAmount)
      );
    }

    // Apply changes to hidden sliders
    if (trait === 'ego') {
      const current = player.personality.hiddenSliders.ego;
      player.personality.hiddenSliders.ego = Math.max(
        0.0,
        Math.min(1.0, current + changeAmount)
      );
    } else if (trait === 'injury_anxiety') {
      const current = player.personality.hiddenSliders.injuryAnxiety;
      player.personality.hiddenSliders.injuryAnxiety = Math.max(
        0.0,
        Math.min(1.0, current + changeAmount)
      );
    } else if (trait === 'agent_quality') {
      const current = player.personality.hiddenSliders.agentQuality;
      player.personality.hiddenSliders.agentQuality = Math.max(
        0.0,
        Math.min(1.0, current + changeAmount)
      );
    }

    // Log the change
    console.log(
      `Applied personality change: ${trait} ${
        changeAmount > 0 ? '+' : ''
      }${changeAmount} (${reason})`
    );
  }

  /**
   * Reset personality to base state (for testing/admin)
   */
  static resetPersonality(player: EnhancedPlayer): void {
    // Reset evolution tracking
    player.personality.evolution.evolutionCount = 0;
    player.personality.evolution.lastEvolutionYear =
      player.personality.evolution.lastEvolutionYear;
    player.personality.evolution.evolutionHistory = [];

    // Clear events
    player.personality.evolution.lifeEvents = [];
    player.personality.evolution.marketExperiences = [];
    player.personality.evolution.ageEvolutionMilestones = [];
    player.personality.evolution.cooldowns = [];

    // Note: We don't reset the actual personality values as they're now the "base"
    // In a real implementation, you might want to store the original values and restore them
  }

  /**
   * Get personality change history
   */
  static getPersonalityChangeHistory(player: EnhancedPlayer): any[] {
    return player.personality.evolution.evolutionHistory.map((change) => ({
      trait: change.trait,
      change: change.change,
      reason: change.reason,
      permanent: change.permanent,
    }));
  }

  /**
   * Check if a trait has evolved significantly
   */
  static hasTraitEvolved(
    player: EnhancedPlayer,
    trait: string,
    threshold: number = 0.2
  ): boolean {
    const changes = player.personality.evolution.evolutionHistory.filter(
      (change) => change.trait === trait
    );

    const totalChange = changes.reduce((sum, change) => sum + change.change, 0);
    return Math.abs(totalChange) >= threshold;
  }
}
