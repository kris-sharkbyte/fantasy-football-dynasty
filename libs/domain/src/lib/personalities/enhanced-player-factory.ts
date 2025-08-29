import { Player, Position } from '@fantasy-football-dynasty/types';
import {
  EnhancedPlayer,
  PlayerPersonality,
  PersonalityTraits,
  PersonalityWeights,
  PersonalityBehaviors,
  HiddenSliders,
  FeedbackTemplates,
  PersonalityEvolution,
  LocationPreference,
  PersonalityBlending,
  TradePreferences,
  PlayerMarketContext,
} from './enhanced-player';

/**
 * Factory for creating enhanced players with realistic personalities
 * This generates diverse, believable player characters for the game
 */
export class EnhancedPlayerFactory {
  private static personalityTypes: any = null;
  private static locationData: any = null;

  /**
   * Initialize the factory with personality types and location data
   */
  static async initialize(): Promise<void> {
    try {
      // Load personality types
      const personalityResponse = await fetch(
        '/assets/personalities/personality-types.json'
      );
      this.personalityTypes = await personalityResponse.json();

      // Load location data (could be expanded later)
      this.locationData = this.getDefaultLocationData();
    } catch (error) {
      console.warn('Could not load personality types, using defaults');
      this.personalityTypes = this.getDefaultPersonalityTypes();
      this.locationData = this.getDefaultLocationData();
    }
  }

  /**
   * Create an enhanced player from a base player
   */
  static createEnhancedPlayer(
    basePlayer: Player,
    currentYear: number
  ): EnhancedPlayer {
    // Generate personality
    const personality = this.createPlayerPersonality(basePlayer, currentYear);

    // Generate location preferences
    const locationPreferences = this.generateLocationPreferences(basePlayer);

    // Create enhanced player
    const enhancedPlayer: EnhancedPlayer = {
      ...basePlayer,
      personality,
      locationPreferences,
      currentTeamId: undefined,
      previousTeamIds: [],
      contractHistory: [],
      negotiationHistory: [],
      marketExperiences: [],
      lifeEvents: [],
    };

    return enhancedPlayer;
  }

  /**
   * Generate a realistic personality for a player
   */
  private static createPlayerPersonality(
    player: Player,
    currentYear: number
  ): PlayerPersonality {
    // Get base personality type data
    const typeData = this.getPersonalityTypeData(player);

    // Generate personality blending (70% primary, 30% secondary chance)
    const blending = this.generatePersonalityBlending(player, typeData);

    // Generate core personality components
    const traits = this.generateTraits(player, typeData.traits);
    const weights = this.generateWeights(player, typeData.weights);
    const behaviors = this.generateBehaviors(player, typeData.behaviors);
    const hiddenSliders = this.generateHiddenSliders(player, typeData);
    const feedbackTemplates = this.generateFeedbackTemplates(
      typeData.feedback_templates
    );

    // Generate trade preferences
    const tradePreferences = this.generateTradePreferences(player, traits);

    // Generate market context
    const marketContext = this.generateMarketContext(player, currentYear);

    // Generate evolution tracking
    const evolution = this.generateEvolutionTracking(currentYear);

    return {
      type: typeData.name,
      rarity: typeData.rarity,
      traits,
      weights,
      behaviors,
      hiddenSliders,
      feedbackTemplates,
      blending,
      tradePreferences,
      marketContext,
      evolution,
    };
  }

  /**
   * Generate personality blending from multiple archetypes
   */
  private static generatePersonalityBlending(
    player: Player,
    primaryTypeData: any
  ): PersonalityBlending {
    // For now, disable blending to avoid complexity issues
    // TODO: Re-enable blending once the basic system is stable
    return {
      primaryArchetype: primaryTypeData.name,
      blendRatio: 0.0,
      inheritedTraits: [],
      resolvedParams: {},
    };

    // Original blending logic (commented out for now)
    /*
    // 70% chance of pure archetype, 30% chance of blending
    if (Math.random() > 0.3) {
      return {
        primaryArchetype: primaryTypeData.name,
        blendRatio: 0.0,
        inheritedTraits: [],
        resolvedParams: {},
      };
    }

    // Select secondary archetype (different from primary)
    const availableTypes = Object.keys(this.personalityTypes).filter(
      (type) => type !== primaryTypeData.name
    );
    const secondaryType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    const secondaryTypeData = this.personalityTypes[secondaryType];

    // Blend ratio between 0.2 and 0.4 (subtle influence)
    const blendRatio = 0.2 + Math.random() * 0.2;

    // Determine which traits to inherit from secondary
    const inheritedTraits: string[] = [];
    if (Math.random() > 0.5) inheritedTraits.push('negotiation_style');
    if (Math.random() > 0.6) inheritedTraits.push('risk_tolerance');
    if (Math.random() > 0.7) inheritedTraits.push('team_loyalty');

    // Resolve blended parameters
    const resolvedParams = this.resolveBlendedParameters(
      primaryTypeData,
      secondaryTypeData,
      blendRatio,
      inheritedTraits
    );

    return {
      primaryArchetype: primaryTypeData.name,
      secondaryArchetype: secondaryType,
      blendRatio,
      inheritedTraits,
      resolvedParams,
    };
    */
  }

  /**
   * Resolve blended parameters from multiple archetypes
   */
  private static resolveBlendedParameters(
    primary: any,
    secondary: any,
    blendRatio: number,
    inheritedTraits: string[]
  ): Record<string, number> {
    const params: Record<string, number> = {};

    // Blend weights
    params['moneyPriority'] = this.blendValue(
      primary.weights.money_priority,
      secondary.weights.money_priority,
      blendRatio
    );
    params['winningPriority'] = this.blendValue(
      primary.weights.winning_priority,
      secondary.weights.winning_priority,
      blendRatio
    );
    params['locationPriority'] = this.blendValue(
      primary.weights.location_priority,
      secondary.weights.location_priority,
      blendRatio
    );
    params['guaranteePriority'] = this.blendValue(
      primary.weights.guarantee_priority,
      secondary.weights.guarantee_priority,
      blendRatio
    );
    params['lengthPriority'] = this.blendValue(
      primary.weights.length_priority,
      secondary.weights.length_priority,
      blendRatio
    );

    // Blend behaviors
    params['holdoutThreshold'] = this.blendValue(
      primary.behaviors.holdout_threshold,
      secondary.behaviors.holdout_threshold,
      blendRatio
    );
    params['counterOfferMultiplier'] = this.blendValue(
      primary.behaviors.counter_offer_multiplier,
      secondary.behaviors.counter_offer_multiplier,
      blendRatio
    );

    return params;
  }

  /**
   * Blend two values based on ratio
   */
  private static blendValue(
    primary: number,
    secondary: number,
    ratio: number
  ): number {
    return primary * (1 - ratio) + secondary * ratio;
  }

  /**
   * Generate trade preferences based on personality
   */
  private static generateTradePreferences(
    player: Player,
    traits: PersonalityTraits
  ): TradePreferences {
    // Extension probability based on risk tolerance and age
    let extensionProbability = 0.3; // Base 30%
    if (traits.riskTolerance === 'very_low') extensionProbability += 0.3;
    if (traits.riskTolerance === 'low') extensionProbability += 0.2;
    if (player.age > 30) extensionProbability += 0.2;
    if (player.age > 35) extensionProbability += 0.2;

    // Trade deadline behavior based on personality
    let tradeDeadlineBehavior: TradePreferences['tradeDeadlineBehavior'] =
      'accept_quickly';
    if (traits.negotiationStyle === 'aggressive')
      tradeDeadlineBehavior = 'require_extension';
    if (traits.negotiationStyle === 'desperate')
      tradeDeadlineBehavior = 'accept_quickly';
    if (traits.negotiationStyle === 'patient')
      tradeDeadlineBehavior = 'wait_for_best';

    return {
      requiresExtensionProbability: Math.min(0.9, extensionProbability),
      reportingDelayIfUnhappy: Math.floor(Math.random() * 3) + 1, // 1-3 days
      tradeDeadlineBehavior,
      extensionTerms: {
        minYears: Math.floor(Math.random() * 2) + 2, // 2-3 years
        minGuaranteedPct: 0.6 + Math.random() * 0.3, // 60-90%
        apyMultiplier: 1.0 + Math.random() * 0.2, // 0-20% premium
      },
    };
  }

  /**
   * Generate market context for position-specific behavior
   */
  private static generateMarketContext(
    player: Player,
    currentYear: number
  ): PlayerMarketContext {
    // Base market data (in real implementation, this would come from league data)
    const baseAAV = player.overall * 100000;
    const baseGuarantee = 0.6 + (player.overall / 100) * 0.3; // 60-90% based on overall

    // Position-specific adjustments
    let positionMultiplier = 1.0;
    let supplyPressure = 0.5;

    switch (player.position) {
      case 'QB':
        positionMultiplier = 2.5;
        supplyPressure = 0.8; // QBs are scarce
        break;
      case 'RB':
        positionMultiplier = 1.2;
        supplyPressure = 0.3; // RBs are plentiful
        break;
      case 'WR':
        positionMultiplier = 1.5;
        supplyPressure = 0.4; // WRs are somewhat scarce
        break;
      case 'TE':
        positionMultiplier = 1.3;
        supplyPressure = 0.6; // TEs are moderately scarce
        break;
      default:
        positionMultiplier = 1.0;
        supplyPressure = 0.5;
    }

    const marketAAV = baseAAV * positionMultiplier;
    const marketGuarantee = baseGuarantee;

    return {
      position: player.position,
      apyPercentiles: {
        p25: Math.round(marketAAV * 0.7),
        p50: Math.round(marketAAV),
        p75: Math.round(marketAAV * 1.3),
        p90: Math.round(marketAAV * 1.6),
      },
      guaranteePercentiles: {
        p25: marketGuarantee * 0.8,
        p50: marketGuarantee,
        p75: marketGuarantee * 1.1,
        p90: marketGuarantee * 1.2,
      },
      supplyPressure,
      marketTrend: Math.random() > 0.5 ? 'rising' : 'stable',
      lastUpdated: currentYear,
    };
  }

  /**
   * Generate enhanced evolution tracking
   */
  private static generateEvolutionTracking(
    currentYear: number
  ): PersonalityEvolution {
    return {
      evolutionCount: 0,
      lastEvolutionYear: currentYear,
      evolutionHistory: [],
      cooldowns: [],
      ageEvolutionMilestones: [],
      marketExperiences: [],
      lifeEvents: [],
    };
  }

  /**
   * Select personality type based on player characteristics
   */
  private static selectPersonalityType(player: Player): string {
    // Ensure personality types are loaded
    if (!this.personalityTypes || !this.personalityTypes.personality_types) {
      this.personalityTypes = this.getDefaultPersonalityTypes();
    }

    const personalityTypes = Object.keys(
      this.personalityTypes.personality_types
    );
    const weights: number[] = [];

    // Calculate weights based on player characteristics
    for (const type of personalityTypes) {
      let weight = this.personalityTypes.personality_types[type].rarity;

      // Adjust based on player age
      if (player.age >= 30) {
        if (type === 'conservative_veteran') weight *= 2.0;
        if (type === 'aggressive_negotiator') weight *= 0.5;
      }

      // Adjust based on player overall
      if (player.overall >= 85) {
        if (type === 'aggressive_negotiator') weight *= 1.5;
        if (type === 'desperate_signer') weight *= 0.3;
      } else if (player.overall <= 70) {
        if (type === 'desperate_signer') weight *= 2.0;
        if (type === 'aggressive_negotiator') weight *= 0.5;
      }

      // Adjust based on position
      if (player.position === 'QB') {
        if (type === 'contender_chaser') weight *= 1.3;
        if (type === 'loyal_teammate') weight *= 0.8;
      } else if (player.position === 'WR') {
        if (type === 'aggressive_negotiator') weight *= 1.2;
        if (type === 'big_markets') weight *= 1.1;
      }

      weights.push(Math.max(0.1, weight));
    }

    // Select personality type based on weights
    return this.weightedRandomSelection(personalityTypes, weights);
  }

  /**
   * Get personality type data for a player
   */
  private static getPersonalityTypeData(player: Player): any {
    const personalityType = this.selectPersonalityType(player);
    return this.personalityTypes.personality_types[personalityType];
  }

  /**
   * Generate personality traits with randomization
   */
  private static generateTraits(
    player: Player,
    baseTraits: any
  ): PersonalityTraits {
    const traits: PersonalityTraits = {
      negotiationStyle: this.randomizeTrait(
        baseTraits.negotiation_style as
          | 'aggressive'
          | 'patient'
          | 'desperate'
          | 'cooperative'
          | 'flexible'
          | 'conservative',
        [
          'aggressive',
          'patient',
          'desperate',
          'cooperative',
          'flexible',
          'conservative',
        ] as const
      ),
      riskTolerance: this.randomizeTrait(
        baseTraits.risk_tolerance as
          | 'very_low'
          | 'low'
          | 'medium'
          | 'high'
          | 'very_high',
        ['very_low', 'low', 'medium', 'high', 'very_high'] as const
      ),
      teamLoyalty: this.randomizeTrait(
        baseTraits.team_loyalty as
          | 'very_low'
          | 'low'
          | 'medium'
          | 'high'
          | 'very_high',
        ['very_low', 'low', 'medium', 'high', 'very_high'] as const
      ),
      locationPreference: this.randomizeTrait(
        baseTraits.location_preference as
          | 'big_markets'
          | 'warm_weather'
          | 'rural_areas'
          | 'neutral'
          | 'current_team'
          | 'winning_teams'
          | 'stable_markets',
        [
          'big_markets',
          'warm_weather',
          'rural_areas',
          'neutral',
          'current_team',
          'winning_teams',
          'stable_markets',
        ] as const
      ),
      deadlineBehavior: this.randomizeTrait(
        baseTraits.deadline_behavior as
          | 'pressure_team'
          | 'wait_for_best'
          | 'accept_quickly'
          | 'compromise'
          | 'prioritize_opportunity'
          | 'seek_security',
        [
          'pressure_team',
          'wait_for_best',
          'accept_quickly',
          'compromise',
          'prioritize_opportunity',
          'seek_security',
        ] as const
      ),
    };

    // Apply position-specific adjustments
    this.applyPositionSpecificTraits(traits, player.position);

    return traits;
  }

  /**
   * Generate personality weights with randomization
   */
  private static generateWeights(
    player: Player,
    baseWeights: any
  ): PersonalityWeights {
    const weights: PersonalityWeights = {
      moneyPriority: this.randomizeWeight(baseWeights.money_priority, 0.2),
      winningPriority: this.randomizeWeight(baseWeights.winning_priority, 0.2),
      locationPriority: this.randomizeWeight(
        baseWeights.location_priority,
        0.2
      ),
      guaranteePriority: this.randomizeWeight(
        baseWeights.guarantee_priority,
        0.2
      ),
      lengthPriority: this.randomizeWeight(baseWeights.length_priority, 0.2),
    };

    // Apply age-based adjustments
    this.applyAgeBasedWeights(weights, player.age);

    // Apply overall-based adjustments
    this.applyOverallBasedWeights(weights, player.overall);

    // Normalize weights to sum to 1.0
    this.normalizeWeights(weights);

    return weights;
  }

  /**
   * Generate personality behaviors with randomization
   */
  private static generateBehaviors(
    player: Player,
    baseBehaviors: any
  ): PersonalityBehaviors {
    const behaviors: PersonalityBehaviors = {
      holdoutThreshold: this.randomizeBehavior(
        baseBehaviors.holdout_threshold,
        0.15
      ),
      counterOfferMultiplier: this.randomizeBehavior(
        baseBehaviors.counter_offer_multiplier,
        0.1
      ),
      deadlineSoftening: this.randomizeBehavior(
        baseBehaviors.deadline_softening,
        0.01
      ),
      comparisonWeight: this.randomizeBehavior(
        baseBehaviors.comparison_weight,
        0.2
      ),
      deadlineSusceptibility: this.randomizeBehavior(
        baseBehaviors.deadline_susceptibility,
        0.2
      ),
    };

    return behaviors;
  }

  /**
   * Generate hidden sliders for personality depth
   */
  private static generateHiddenSliders(
    player: Player,
    typeData: any
  ): HiddenSliders {
    return {
      ego: this.randomizeWeight(0.5, 0.3), // Base ego level
      injuryAnxiety: this.randomizeWeight(0.3, 0.4), // Base injury concern
      agentQuality: this.randomizeWeight(0.6, 0.3), // Base agent effectiveness
      schemeFit: this.randomizeWeight(0.7, 0.3), // Base scheme compatibility
      rolePromise: this.randomizeWeight(0.6, 0.3), // Base role clarity
      taxSensitivity: this.randomizeWeight(0.4, 0.3), // Base tax concern
      endorsementValue: this.randomizeWeight(0.5, 0.3), // Base endorsement potential
    };
  }

  /**
   * Generate feedback templates
   */
  private static generateFeedbackTemplates(
    baseTemplates: any
  ): FeedbackTemplates {
    return {
      rejectLowOffer: Array.isArray(baseTemplates.reject_low_offer)
        ? baseTemplates.reject_low_offer
        : [
            baseTemplates.reject_low_offer ||
              "I'm not interested in this offer.",
          ],
      counterOffer: Array.isArray(baseTemplates.counter_offer)
        ? baseTemplates.counter_offer
        : [
            baseTemplates.counter_offer ||
              'I need better terms to consider this.',
          ],
      holdoutWarning: Array.isArray(baseTemplates.holdout_warning)
        ? baseTemplates.holdout_warning
        : [
            baseTemplates.holdout_warning ||
              "I'm willing to hold out for better terms.",
          ],
      accept: Array.isArray(baseTemplates.accept)
        ? baseTemplates.accept
        : [baseTemplates.accept || 'This offer meets my expectations.'],
      gmNote: Array.isArray(baseTemplates.gm_note)
        ? baseTemplates.gm_note
        : [
            baseTemplates.gm_note ||
              'Player evaluated the offer based on their preferences.',
          ],
    };
  }

  /**
   * Generate location preferences for a player
   */
  private static generateLocationPreferences(
    player: Player
  ): LocationPreference[] {
    const preferences: LocationPreference[] = [];

    // Primary location preference
    const primaryType = this.selectLocationPreferenceType(player);
    preferences.push({
      type: primaryType,
      weight: 0.8,
      cities: this.getCitiesForPreferenceType(primaryType),
      currentTeamMatch: false,
    });

    // Secondary location preference (optional)
    if (Math.random() < 0.4) {
      const secondaryType = this.selectSecondaryLocationPreference(primaryType);
      preferences.push({
        type: secondaryType,
        weight: 0.4,
        cities: this.getCitiesForPreferenceType(secondaryType),
        currentTeamMatch: false,
      });
    }

    return preferences;
  }

  /**
   * Select primary location preference type
   */
  private static selectLocationPreferenceType(player: Player): string {
    const types = [
      'big_markets',
      'warm_weather',
      'rural_areas',
      'neutral',
      'winning_teams',
      'stable_markets',
    ];
    const weights = [0.3, 0.25, 0.15, 0.2, 0.05, 0.05];

    // Adjust weights based on player characteristics
    if (player.position === 'WR') {
      weights[0] *= 1.5; // WRs prefer big markets
    }

    if (player.age >= 30) {
      weights[4] *= 2.0; // Veterans prefer winning teams
      weights[5] *= 1.5; // Veterans prefer stable markets
    }

    return this.weightedRandomSelection(types, weights);
  }

  /**
   * Select secondary location preference
   */
  private static selectSecondaryLocationPreference(
    primaryType: string
  ): string {
    const secondaryTypes = [
      'big_markets',
      'warm_weather',
      'rural_areas',
      'neutral',
      'winning_teams',
      'stable_markets',
    ];
    const weights = [0.2, 0.2, 0.2, 0.2, 0.1, 0.1];

    // Reduce weight of primary type
    const primaryIndex = secondaryTypes.indexOf(primaryType);
    if (primaryIndex >= 0) {
      weights[primaryIndex] *= 0.3;
    }

    return this.weightedRandomSelection(secondaryTypes, weights);
  }

  /**
   * Get cities for a preference type
   */
  private static getCitiesForPreferenceType(type: string): string[] {
    const locationData = this.locationData.location_preferences[type];
    return locationData ? locationData.cities : ['Unknown'];
  }

  /**
   * Apply position-specific trait adjustments
   */
  private static applyPositionSpecificTraits(
    traits: PersonalityTraits,
    position: Position
  ): void {
    switch (position) {
      case 'QB':
        // QBs tend to be more loyal and less likely to hold out
        if (Math.random() < 0.7) {
          traits.teamLoyalty = this.randomizeTrait(traits.teamLoyalty, [
            'medium',
            'high',
            'very_high',
          ] as const);
        }
        break;

      case 'WR':
        // WRs tend to prefer big markets and be more aggressive
        if (Math.random() < 0.6) {
          traits.locationPreference = 'big_markets';
        }
        if (Math.random() < 0.5) {
          traits.negotiationStyle = this.randomizeTrait(
            traits.negotiationStyle,
            ['aggressive', 'patient', 'flexible'] as const
          );
        }
        break;

      case 'RB':
        // RBs tend to be more conservative due to injury risk
        if (Math.random() < 0.6) {
          traits.riskTolerance = this.randomizeTrait(traits.riskTolerance, [
            'very_low',
            'low',
            'medium',
          ] as const);
        }
        break;

      case 'TE':
        // TEs tend to be more cooperative
        if (Math.random() < 0.6) {
          traits.negotiationStyle = this.randomizeTrait(
            traits.negotiationStyle,
            ['cooperative', 'patient', 'flexible'] as const
          );
        }
        break;
    }
  }

  /**
   * Apply age-based weight adjustments
   */
  private static applyAgeBasedWeights(
    weights: PersonalityWeights,
    age: number
  ): void {
    if (age >= 30) {
      weights.guaranteePriority += 0.1;
      weights.lengthPriority += 0.1;
      weights.moneyPriority -= 0.05;
    }

    if (age >= 35) {
      weights.guaranteePriority += 0.15;
      weights.lengthPriority += 0.15;
      weights.moneyPriority -= 0.1;
    }
  }

  /**
   * Apply overall-based weight adjustments
   */
  private static applyOverallBasedWeights(
    weights: PersonalityWeights,
    overall: number
  ): void {
    if (overall >= 85) {
      weights.moneyPriority += 0.1;
      weights.winningPriority += 0.05;
    } else if (overall <= 70) {
      weights.guaranteePriority += 0.1;
      weights.moneyPriority -= 0.05;
    }
  }

  /**
   * Normalize weights to sum to 1.0
   */
  private static normalizeWeights(weights: PersonalityWeights): void {
    const total = Object.values(weights).reduce(
      (sum, weight) => sum + weight,
      0
    );
    if (total > 0) {
      Object.keys(weights).forEach((key) => {
        (weights as any)[key] = (weights as any)[key] / total;
      });
    }
  }

  /**
   * Randomize a trait with some variation
   */
  private static randomizeTrait<T extends string>(
    baseTrait: T,
    options: T[]
  ): T {
    if (Math.random() < 0.7) {
      return baseTrait;
    }

    // 30% chance to pick a different trait
    const otherOptions = options.filter((opt) => opt !== baseTrait);
    return otherOptions[Math.floor(Math.random() * otherOptions.length)];
  }

  /**
   * Randomize a weight with some variation
   */
  private static randomizeWeight(
    baseWeight: number,
    variation: number
  ): number {
    const min = Math.max(0.0, baseWeight - variation);
    const max = Math.min(1.0, baseWeight + variation);
    return min + Math.random() * (max - min);
  }

  /**
   * Randomize a behavior with some variation
   */
  private static randomizeBehavior(
    baseBehavior: number,
    variation: number
  ): number {
    const min = Math.max(0.0, baseBehavior - variation);
    const max = Math.min(1.0, baseBehavior + variation);
    return min + Math.random() * (max - min);
  }

  /**
   * Weighted random selection
   */
  private static weightedRandomSelection<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }

    return items[items.length - 1];
  }

  /**
   * Get default personality types if loading fails
   */
  private static getDefaultPersonalityTypes(): any {
    return {
      personality_types: {
        aggressive_negotiator: {
          name: 'Aggressive Negotiator',
          rarity: 0.15,
          traits: {
            negotiation_style: 'aggressive' as const,
            risk_tolerance: 'high' as const,
            team_loyalty: 'low' as const,
            location_preference: 'big_markets' as const,
            deadline_behavior: 'pressure_team' as const,
          },
          weights: {
            money_priority: 0.9,
            winning_priority: 0.4,
            location_priority: 0.7,
            guarantee_priority: 0.6,
            length_priority: 0.3,
          },
          behaviors: {
            holdout_threshold: 0.8,
            counter_offer_multiplier: 1.3,
            deadline_softening: 0.0,
            comparison_weight: 0.9,
            deadline_susceptibility: 0.1,
          },
          feedback_templates: {
            reject_low_offer: ["I'm worth more than this."],
            counter_offer: ['I need more guaranteed money.'],
            holdout_warning: ["I'm not playing for less than market value."],
            accept: ['This offer meets my expectations.'],
            gm_note: ['Player weighed money and location heavily.'],
          },
        },
        patient_negotiator: {
          name: 'Patient Negotiator',
          rarity: 0.25,
          traits: {
            negotiation_style: 'patient' as const,
            risk_tolerance: 'medium' as const,
            team_loyalty: 'medium' as const,
            location_preference: 'neutral' as const,
            deadline_behavior: 'wait_for_best' as const,
          },
          weights: {
            money_priority: 0.7,
            winning_priority: 0.6,
            location_priority: 0.4,
            guarantee_priority: 0.8,
            length_priority: 0.7,
          },
          behaviors: {
            holdout_threshold: 0.6,
            counter_offer_multiplier: 1.1,
            deadline_softening: 0.02,
            comparison_weight: 0.7,
            deadline_susceptibility: 0.3,
          },
          feedback_templates: {
            reject_low_offer: "I'm willing to wait for the right opportunity.",
            counter_offer: 'I need more guarantees for a deal of this length.',
            holdout_warning:
              "I'm not rushing into anything that doesn't feel right.",
            location_comment: 'Location matters less than the right situation.',
          },
        },
        desperate_signer: {
          name: 'Desperate Signer',
          rarity: 0.2,
          traits: {
            negotiation_style: 'desperate',
            risk_tolerance: 'low',
            team_loyalty: 'high',
            location_preference: 'any',
            deadline_behavior: 'accept_quickly',
          },
          weights: {
            money_priority: 0.5,
            winning_priority: 0.7,
            location_priority: 0.2,
            guarantee_priority: 0.9,
            length_priority: 0.8,
          },
          behaviors: {
            holdout_threshold: 0.3,
            counter_offer_multiplier: 1.05,
            deadline_softening: 0.05,
            comparison_weight: 0.4,
            deadline_susceptibility: 0.6,
          },
          feedback_templates: {
            reject_low_offer:
              'I really want to play, but I need some guarantees.',
            counter_offer: 'Could you add a little more guaranteed money?',
            holdout_warning:
              "I'm not trying to hold out, I just need security.",
            location_comment: "I'll play anywhere if the situation is right.",
          },
        },
        loyal_teammate: {
          name: 'Loyal Teammate',
          rarity: 0.15,
          traits: {
            negotiation_style: 'cooperative',
            risk_tolerance: 'medium',
            team_loyalty: 'very_high',
            location_preference: 'current_team',
            deadline_behavior: 'compromise',
          },
          weights: {
            money_priority: 0.6,
            winning_priority: 0.8,
            location_priority: 0.9,
            guarantee_priority: 0.7,
            length_priority: 0.6,
          },
          behaviors: {
            holdout_threshold: 0.4,
            counter_offer_multiplier: 1.0,
            deadline_softening: 0.03,
            comparison_weight: 0.3,
            deadline_susceptibility: 0.4,
          },
          feedback_templates: {
            reject_low_offer: 'I love this team, but I need fair compensation.',
            counter_offer: "I'm willing to work with you on this.",
            holdout_warning:
              "I don't want to hold out, let's work something out.",
            location_comment: "This is where I want to be. Let's make it work.",
          },
        },
        contender_chaser: {
          name: 'Contender Chaser',
          rarity: 0.1,
          traits: {
            negotiation_style: 'flexible',
            risk_tolerance: 'medium',
            team_loyalty: 'low',
            location_preference: 'winning_teams',
            deadline_behavior: 'prioritize_opportunity',
          },
          weights: {
            money_priority: 0.5,
            winning_priority: 0.9,
            location_priority: 0.3,
            guarantee_priority: 0.6,
            length_priority: 0.4,
          },
          behaviors: {
            holdout_threshold: 0.5,
            counter_offer_multiplier: 1.1,
            deadline_softening: 0.02,
            comparison_weight: 0.6,
            deadline_susceptibility: 0.3,
          },
          feedback_templates: {
            reject_low_offer:
              'I want to win. Show me this team is serious about contending.',
            counter_offer: "I'll take less money if you're building a winner.",
            holdout_warning:
              "I'm not holding out for money, I'm waiting for the right opportunity.",
            location_comment:
              "Location doesn't matter if we're winning championships.",
          },
        },
        conservative_veteran: {
          rarity: 0.15,
          traits: {
            negotiation_style: 'conservative',
            risk_tolerance: 'very_low',
            team_loyalty: 'medium',
            location_preference: 'stable_markets',
            deadline_behavior: 'seek_security',
          },
          weights: {
            money_priority: 0.7,
            winning_priority: 0.5,
            location_priority: 0.6,
            guarantee_priority: 0.9,
            length_priority: 0.8,
          },
          behaviors: {
            holdout_threshold: 0.7,
            counter_offer_multiplier: 1.2,
            deadline_softening: 0.01,
            comparison_weight: 0.8,
            deadline_susceptibility: 0.2,
          },
          feedback_templates: {
            reject_low_offer:
              "I need more guaranteed money for my family's security.",
            counter_offer:
              'I want more guarantees, even if it means less total money.',
            holdout_warning: "I'm not playing without proper guarantees.",
            location_comment: 'I need stability for my family.',
          },
        },
      },
    };
  }

  /**
   * Get default location data
   */
  private static getDefaultLocationData(): any {
    return {
      location_preferences: {
        big_markets: {
          cities: [
            'New York',
            'Los Angeles',
            'Chicago',
            'Dallas',
            'Houston',
            'Miami',
          ],
        },
        warm_weather: {
          cities: [
            'Miami',
            'Los Angeles',
            'Tampa',
            'Phoenix',
            'San Diego',
            'Orlando',
          ],
        },
        rural_areas: {
          cities: [
            'Green Bay',
            'Buffalo',
            'Jacksonville',
            'Cleveland',
            'Cincinnati',
          ],
        },
        neutral: {
          cities: ['*'],
        },
        winning_teams: {
          cities: ['*'],
        },
        stable_markets: {
          cities: ['*'],
        },
      },
    };
  }
}
