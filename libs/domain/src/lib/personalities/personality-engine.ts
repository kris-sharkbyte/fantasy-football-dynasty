import {
  EnhancedPlayer,
  ContractOffer,
  TeamLocation,
  MarketConditions,
  PlayerMarketContext,
  ContractEvaluationContext,
  PlayerDecision,
} from './enhanced-player';

/**
 * Core personality engine that drives all player contract decisions
 * This implements the explicit scoring formula and integrates hidden sliders
 */
export class PersonalityEngine {
  private static personalityTypes: any = null;

  /**
   * Initialize personality types from JSON
   */
  static async initialize(): Promise<void> {
    try {
      // In production, this would load from Firestore
      // For now, we'll load from the JSON file
      const response = await fetch(
        '/assets/personalities/personality-types.json'
      );
      this.personalityTypes = await response.json();
    } catch (error) {
      console.warn('Could not load personality types, using defaults');
      this.personalityTypes = this.getDefaultPersonalityTypes();
    }
  }

  /**
   * Evaluate a contract offer based on player personality
   */
  static evaluateContractOffer(
    player: EnhancedPlayer,
    context: ContractEvaluationContext
  ): PlayerDecision {
    // Calculate base offer score using explicit formula
    const baseScore = this.calculateExplicitOfferScore(player, context);

    // Apply hidden slider modifiers
    const hiddenSliderScore = this.applyHiddenSliderModifiers(
      player,
      context,
      baseScore
    );

    // Apply market dynamics and league context
    const finalScore = this.applyMarketDynamicsModifiers(
      player,
      context,
      hiddenSliderScore
    );

    // Determine decision based on final score and personality thresholds
    const decision = this.determineDecisionWithThresholds(
      player,
      finalScore,
      context
    );

    // Generate realistic feedback with dynamic variables
    const feedback = this.generateDynamicFeedback(player, decision, context);

    // Calculate counter-offer if applicable
    const counterOffer = this.calculateCounterOffer(player, decision, context);

    return {
      playerId: player.id,
      offer: context.offer,
      decision: decision.decision,
      reasoning: decision.reasoning,
      feedback,
      counterOffer,
      holdoutDuration: decision.holdoutDuration,
      personalityFactors: decision.personalityFactors,
    };
  }

  /**
   * Calculate explicit offer score using the formula outlined by the user
   *
   * Offer attractiveness (0–1):
   * money_term = clamp(offered_apy / market_apy_pos, 0, 1)
   * guarantee_term = clamp(guaranteed / offered_total, 0, 1)
   * length_term = clamp(offered_years / desired_years, 0, 1)
   * winning_term = clamp(team_elo / league_top_elo, 0, 1)
   * location_term = location_affinity(city, personality)
   *
   * base_score = (
   *   w.money_priority * money_term +
   *   w.guarantee_priority * guarantee_term +
   *   w.length_priority * length_term +
   *   w.winning_priority * winning_term +
   *   w.location_priority * location_term
   * ) / (sum of all weights)
   */
  private static calculateExplicitOfferScore(
    player: EnhancedPlayer,
    context: ContractEvaluationContext
  ): number {
    const { offer, team, marketConditions } = context;
    const weights = player.personality.weights;

    // Calculate individual terms
    const moneyTerm = this.calculateMoneyTerm(offer, marketConditions, player);
    const guaranteeTerm = this.calculateGuaranteeTerm(offer);
    const lengthTerm = this.calculateLengthTerm(offer, player);
    const winningTerm = this.calculateWinningTerm(team, marketConditions);
    const locationTerm = this.calculateLocationTerm(player, team);

    // Calculate weighted score
    const totalWeight = Object.values(weights).reduce(
      (sum, weight) => sum + weight,
      0
    );

    if (totalWeight === 0) return 0.5; // Default neutral score

    const baseScore =
      (weights.moneyPriority * moneyTerm +
        weights.guaranteePriority * guaranteeTerm +
        weights.lengthPriority * lengthTerm +
        weights.winningPriority * winningTerm +
        weights.locationPriority * locationTerm) /
      totalWeight;

    return Math.max(0.0, Math.min(1.0, baseScore));
  }

  /**
   * Calculate money term: clamp(offered_apy / market_apy_pos, 0, 1)
   */
  private static calculateMoneyTerm(
    offer: ContractOffer,
    marketConditions: MarketConditions,
    player: EnhancedPlayer
  ): number {
    const expectedAAV = this.calculateExpectedAAV(player, marketConditions);
    const ratio = offer.apy / expectedAAV;

    // Clamp to [0, 1] with some flexibility for overpayment
    return Math.max(0.0, Math.min(1.0, ratio));
  }

  /**
   * Calculate guarantee term: clamp(guaranteed / offered_total, 0, 1)
   */
  private static calculateGuaranteeTerm(offer: ContractOffer): number {
    const guaranteeRatio = offer.guaranteedAmount / offer.totalValue;
    return Math.max(0.0, Math.min(1.0, guaranteeRatio));
  }

  /**
   * Calculate length term: clamp(offered_years / desired_years, 0, 1)
   */
  private static calculateLengthTerm(
    offer: ContractOffer,
    player: EnhancedPlayer
  ): number {
    const desiredYears = this.calculateDesiredYears(player);
    const ratio = offer.years / desiredYears;

    // Clamp to [0, 1] - prefer shorter deals for most players
    return Math.max(0.0, Math.min(1.0, ratio));
  }

  /**
   * Calculate winning term: clamp(team_elo / league_top_elo, 0, 1)
   */
  private static calculateWinningTerm(
    team: TeamLocation,
    marketConditions: MarketConditions
  ): number {
    // For now, use team.isContender as a proxy for ELO
    // In the future, this could be actual team ELO ratings
    if (team.isContender) return 0.9;
    if (team.isStable) return 0.6;
    return 0.3;
  }

  /**
   * Calculate location term using player preferences
   */
  private static calculateLocationTerm(
    player: EnhancedPlayer,
    team: TeamLocation
  ): number {
    // Use the existing location matching logic
    return this.calculateLocationMatch(player, team);
  }

  /**
   * Apply hidden slider modifiers to the base score
   */
  private static applyHiddenSliderModifiers(
    player: EnhancedPlayer,
    context: ContractEvaluationContext,
    baseScore: number
  ): number {
    const hiddenSliders = player.personality.hiddenSliders;
    let modifiedScore = baseScore;

    // Ego modifier: amplifies brand/market desires and "respect" rejections
    if (hiddenSliders.ego > 0.7) {
      // High ego players are more sensitive to perceived disrespect
      if (baseScore < 0.6) {
        modifiedScore *= 0.8; // More likely to reject "disrespectful" offers
      }
    }

    // Injury anxiety modifier: increases guarantee priority dynamically
    if (hiddenSliders.injuryAnxiety > 0.6) {
      // Players with high injury anxiety value guarantees more
      const guaranteeBonus = hiddenSliders.injuryAnxiety * 0.1;
      modifiedScore = Math.min(1.0, modifiedScore + guaranteeBonus);
    }

    // Agent quality modifier: improves counter timing, reduces bad acceptances
    if (hiddenSliders.agentQuality > 0.8) {
      // High-quality agents are better at negotiation
      if (baseScore < 0.7) {
        modifiedScore *= 0.9; // Less likely to accept mediocre offers
      }
    }

    // Scheme fit modifier: interacts with winning_priority and length_priority
    if (hiddenSliders.schemeFit < 0.4) {
      // Poor scheme fit reduces overall appeal
      modifiedScore *= 0.9;
    }

    // Role promise modifier: multiplies winning_term (players care about usage)
    if (hiddenSliders.rolePromise < 0.5) {
      // Unclear role reduces appeal
      modifiedScore *= 0.85;
    }

    // Tax sensitivity modifier: adjust money_term by state income tax
    const taxModifier = this.calculateTaxModifier(
      context.team,
      hiddenSliders.taxSensitivity
    );
    modifiedScore *= taxModifier;

    // Endorsement value modifier: feeds location_term (big markets boost WR/QB more than OG)
    const endorsementModifier = this.calculateEndorsementModifier(
      player,
      context.team,
      hiddenSliders.endorsementValue
    );
    modifiedScore *= endorsementModifier;

    return Math.max(0.0, Math.min(1.0, modifiedScore));
  }

  /**
   * Apply market dynamics modifiers for league-aware decision making
   */
  private static applyMarketDynamicsModifiers(
    player: EnhancedPlayer,
    context: ContractEvaluationContext,
    score: number
  ): number {
    const { marketConditions, offer } = context;
    let modifiedScore = score;

    // Position-specific market pressure from player's market context
    const playerMarketContext = player.personality.marketContext;
    if (playerMarketContext.supplyPressure > 0.7) {
      // High demand for this position - players can be more demanding
      modifiedScore *= 1.15;
    } else if (playerMarketContext.supplyPressure < 0.3) {
      // Low demand for this position - players need to be more flexible
      modifiedScore *= 0.85;
    }

    // Market trend effects from player's context
    if (playerMarketContext.marketTrend === 'rising') {
      modifiedScore *= 1.08; // Rising market = higher expectations
    } else if (playerMarketContext.marketTrend === 'falling') {
      modifiedScore *= 0.92; // Falling market = lower expectations
    }

    // Market anchors: compare offer to position-specific percentiles
    const apyPercentile = this.calculateAPYPercentile(
      offer.apy,
      playerMarketContext
    );
    const guaranteePercentile = this.calculateGuaranteePercentile(
      offer.guaranteedAmount / offer.totalValue,
      playerMarketContext
    );

    // Boost score if offer is above market percentiles
    if (apyPercentile > 0.75) modifiedScore *= 1.1;
    if (guaranteePercentile > 0.75) modifiedScore *= 1.05;

    // Competing offers effect
    if (context.competingOffers.length > 0) {
      const bestCompetingOffer = Math.max(
        ...context.competingOffers.map((o) => o.apy)
      );
      const offerRatio = offer.apy / bestCompetingOffer;

      if (offerRatio < 0.8) {
        modifiedScore *= 0.9; // Significantly below competing offers
      } else if (offerRatio > 1.2) {
        modifiedScore *= 1.1; // Significantly above competing offers
      }
    }

    return Math.max(0.0, Math.min(1.0, modifiedScore));
  }

  /**
   * Calculate APY percentile relative to position market
   */
  private static calculateAPYPercentile(
    apy: number,
    marketContext: PlayerMarketContext
  ): number {
    const { apyPercentiles } = marketContext;

    if (apy <= apyPercentiles.p25) return 0.25;
    if (apy <= apyPercentiles.p50) return 0.5;
    if (apy <= apyPercentiles.p75) return 0.75;
    if (apy <= apyPercentiles.p90) return 0.9;
    return 1.0;
  }

  /**
   * Calculate guarantee percentile relative to position market
   */
  private static calculateGuaranteePercentile(
    guaranteePct: number,
    marketContext: PlayerMarketContext
  ): number {
    const { guaranteePercentiles } = marketContext;

    if (guaranteePct <= guaranteePercentiles.p25) return 0.25;
    if (guaranteePct <= guaranteePercentiles.p50) return 0.5;
    if (guaranteePct <= guaranteePercentiles.p75) return 0.75;
    if (guaranteePct <= guaranteePercentiles.p90) return 0.9;
    return 1.0;
  }

  /**
   * Check if player would accept a trade to the given team
   */
  static wouldAcceptTrade(player: EnhancedPlayer, teamCity: string): boolean {
    // In fantasy football, trades are league decisions, not player preferences
    // Players can be traded to any team regardless of their personality
    return true;
  }

  /**
   * Check if player would require extension on trade
   */
  static wouldRequireExtensionOnTrade(player: EnhancedPlayer): boolean {
    const tradePrefs = player.personality.tradePreferences;
    return Math.random() < tradePrefs.requiresExtensionProbability;
  }

  /**
   * Get extension terms if player requires extension on trade
   */
  static getExtensionTerms(player: EnhancedPlayer): any {
    const tradePrefs = player.personality.tradePreferences;
    return tradePrefs.extensionTerms;
  }

  /**
   * Get trade deadline behavior for this player
   */
  static getTradeDeadlineBehavior(player: EnhancedPlayer): string {
    return player.personality.tradePreferences.tradeDeadlineBehavior;
  }

  /**
   * Get reporting delay if player is unhappy with trade destination
   */
  static getReportingDelayIfUnhappy(player: EnhancedPlayer): number {
    return player.personality.tradePreferences.reportingDelayIfUnhappy;
  }

  /**
   * Determine decision using explicit thresholds
   */
  private static determineDecisionWithThresholds(
    player: EnhancedPlayer,
    finalScore: number,
    context: ContractEvaluationContext
  ): {
    decision: 'accept' | 'reject' | 'counter' | 'holdout' | 'shortlist';
    reasoning: string;
    holdoutDuration?: number;
    personalityFactors: string[];
  } {
    const behaviors = player.personality.behaviors;
    const traits = player.personality.traits;
    const personalityFactors: string[] = [];

    // Check for holdout using explicit threshold
    if (finalScore < behaviors.holdoutThreshold) {
      personalityFactors.push('holdout_threshold', 'low_offer_score');
      return {
        decision: 'holdout',
        reasoning: `Offer score (${finalScore.toFixed(
          2
        )}) below holdout threshold (${behaviors.holdoutThreshold.toFixed(2)})`,
        holdoutDuration: this.calculateHoldoutDuration(player),
        personalityFactors,
      };
    }

    // Check for rejection (very low scores)
    if (finalScore < 0.4) {
      personalityFactors.push('low_offer_score', 'personality_preferences');
      return {
        decision: 'reject',
        reasoning: `Offer score (${finalScore.toFixed(2)}) too low to consider`,
        personalityFactors,
      };
    }

    // Check for counter-offer (moderate scores with negotiation potential)
    if (finalScore < 0.7 && traits.negotiationStyle !== 'desperate') {
      personalityFactors.push('moderate_offer_score', 'negotiation_style');
      return {
        decision: 'counter',
        reasoning: `Offer score (${finalScore.toFixed(
          2
        )}) acceptable but can be improved`,
        personalityFactors,
      };
    }

    // Check for acceptance (high scores)
    if (finalScore >= 0.7) {
      personalityFactors.push('high_offer_score', 'meets_expectations');
      return {
        decision: 'accept',
        reasoning: `Offer score (${finalScore.toFixed(
          2
        )}) meets or exceeds expectations`,
        personalityFactors,
      };
    }

    // Default to shortlist
    personalityFactors.push('moderate_offer_score', 'considering_options');
    return {
      decision: 'shortlist',
      reasoning: `Offer score (${finalScore.toFixed(
        2
      )}) in consideration range`,
      personalityFactors,
    };
  }

  /**
   * Calculate counter-offer based on personality and hidden sliders
   */
  private static calculateCounterOffer(
    player: EnhancedPlayer,
    decision: any,
    context: ContractEvaluationContext
  ): ContractOffer | undefined {
    if (decision.decision !== 'counter') return undefined;

    const behaviors = player.personality.behaviors;
    const hiddenSliders = player.personality.hiddenSliders;
    const currentOffer = context.offer;

    // Base counter-offer calculation
    const counterMultiplier = behaviors.counterOfferMultiplier;
    let counterAAV = Math.round(currentOffer.apy * counterMultiplier);
    const counterTotal = counterAAV * currentOffer.years;

    // Hidden slider adjustments
    let counterGuarantees = Math.round(currentOffer.guaranteedAmount * 1.2);

    // Injury anxiety increases guarantee demands
    if (hiddenSliders.injuryAnxiety > 0.7) {
      counterGuarantees = Math.round(counterGuarantees * 1.1);
    }

    // Ego affects counter-offer aggressiveness
    if (hiddenSliders.ego > 0.8) {
      counterAAV = Math.round(counterAAV * 1.05);
    }

    return {
      ...currentOffer,
      apy: counterAAV,
      totalValue: counterTotal,
      guaranteedAmount: counterGuarantees,
    };
  }

  /**
   * Generate dynamic feedback with template variables
   */
  private static generateDynamicFeedback(
    player: EnhancedPlayer,
    decision: any,
    context: ContractEvaluationContext
  ): string {
    const templates = player.personality.feedbackTemplates;
    const finalScore = decision.finalScore || 0.5;

    switch (decision.decision) {
      case 'accept':
        return this.generateAcceptanceFeedback(player, context);
      case 'reject':
        const rejectTemplate = this.selectRandomTemplate(
          templates.rejectLowOffer
        );
        return this.replaceTemplateVariables(
          rejectTemplate,
          player,
          context,
          finalScore
        );
      case 'counter':
        const counterTemplate = this.selectRandomTemplate(
          templates.counterOffer
        );
        return this.replaceTemplateVariables(
          counterTemplate,
          player,
          context,
          finalScore
        );
      case 'holdout':
        return this.selectRandomTemplate(templates.holdoutWarning);
      case 'shortlist':
        return this.generateShortlistFeedback(player, context);
      default:
        return "I'm considering my options.";
    }
  }

  /**
   * Replace template variables with actual values
   */
  private static replaceTemplateVariables(
    template: string,
    player: EnhancedPlayer,
    context: ContractEvaluationContext,
    score: number
  ): string {
    let result = template;

    // Replace common variables
    result = result.replace(
      '{gap_to_market}',
      this.calculateGapToMarket(context)
    );
    result = result.replace(
      '{team_competitiveness}',
      this.getTeamCompetitiveness(context.team)
    );
    result = result.replace(
      '{money_priority}',
      player.personality.weights.moneyPriority.toFixed(2)
    );
    result = result.replace(
      '{guarantee_priority}',
      player.personality.weights.guaranteePriority.toFixed(2)
    );
    result = result.replace(
      '{location_match}',
      context.offer.locationMatch.toFixed(2)
    );
    result = result.replace(
      '{ego_level}',
      this.getEgoLevel(player.personality.hiddenSliders.ego)
    );
    result = result.replace(
      '{agent_quality}',
      this.getAgentQualityLevel(player.personality.hiddenSliders.agentQuality)
    );
    result = result.replace(
      '{role_promise}',
      this.getRolePromiseLevel(player.personality.hiddenSliders.rolePromise)
    );
    result = result.replace(
      '{injury_anxiety}',
      this.getInjuryAnxietyLevel(player.personality.hiddenSliders.injuryAnxiety)
    );

    return result;
  }

  // Helper methods for template variable replacement
  private static calculateGapToMarket(
    context: ContractEvaluationContext
  ): string {
    if (context.competingOffers.length === 0) return 'unknown';

    const avgCompetingAAV =
      context.competingOffers.reduce((sum, o) => sum + o.apy, 0) /
      context.competingOffers.length;
    const gap = ((context.offer.apy - avgCompetingAAV) / avgCompetingAAV) * 100;

    if (gap > 10) return 'significantly above market';
    if (gap > 5) return 'above market';
    if (gap > -5) return 'at market';
    if (gap > -10) return 'below market';
    return 'significantly below market';
  }

  private static getTeamCompetitiveness(team: TeamLocation): string {
    if (team.isContender) return 'high';
    if (team.isStable) return 'medium';
    return 'low';
  }

  private static getEgoLevel(ego: number): string {
    if (ego > 0.8) return 'very high';
    if (ego > 0.6) return 'high';
    if (ego > 0.4) return 'medium';
    if (ego > 0.2) return 'low';
    return 'very low';
  }

  private static getAgentQualityLevel(quality: number): string {
    if (quality > 0.8) return 'excellent';
    if (quality > 0.6) return 'good';
    if (quality > 0.4) return 'average';
    if (quality > 0.2) return 'poor';
    return 'very poor';
  }

  private static getRolePromiseLevel(promise: number): string {
    if (promise > 0.8) return 'clear starter role';
    if (promise > 0.6) return 'rotation player';
    if (promise > 0.4) return 'depth player';
    return 'unclear role';
  }

  private static getInjuryAnxietyLevel(anxiety: number): string {
    if (anxiety > 0.8) return 'very high';
    if (anxiety > 0.6) return 'high';
    if (anxiety > 0.4) return 'moderate';
    if (anxiety > 0.2) return 'low';
    return 'very low';
  }

  // Tax and endorsement calculation methods
  private static calculateTaxModifier(
    team: TeamLocation,
    taxSensitivity: number
  ): number {
    // Simplified tax calculation - in reality this would use actual state tax rates
    const taxFreeStates = ['TX', 'FL', 'WA', 'NV', 'SD', 'WY', 'TN', 'NH'];
    const highTaxStates = ['CA', 'NY', 'NJ', 'CT', 'IL', 'PA', 'OH', 'MI'];

    if (taxFreeStates.includes(team.state)) {
      return 1.0 + taxSensitivity * 0.05; // Tax-free states are more attractive
    } else if (highTaxStates.includes(team.state)) {
      return 1.0 - taxSensitivity * 0.03; // High-tax states are less attractive
    }

    return 1.0; // Neutral tax impact
  }

  private static calculateEndorsementModifier(
    player: EnhancedPlayer,
    team: TeamLocation,
    endorsementValue: number
  ): number {
    // Big markets boost endorsement potential for skill positions
    const skillPositions = ['QB', 'WR', 'RB', 'TE'];
    const isSkillPosition = skillPositions.includes(player.position);
    const isBigMarket = team.marketSize === 'large';

    if (isSkillPosition && isBigMarket) {
      return 1.0 + endorsementValue * 0.1; // Up to 10% boost for skill players in big markets
    }

    return 1.0; // No endorsement boost
  }

  // Existing helper methods (keeping for compatibility)
  private static calculateLocationMatch(
    player: EnhancedPlayer,
    team: TeamLocation
  ): number {
    // This would use the existing EnhancedPlayerUtils.calculateLocationMatch
    // For now, return a simplified calculation
    return 0.7; // Placeholder
  }

  private static calculateExpectedAAV(
    player: EnhancedPlayer,
    marketConditions: any
  ): number {
    // Base calculation from player overall and position
    let baseAAV = player.overall * 100000; // $100k per overall point

    // Adjust for market conditions
    if (marketConditions.positionDemand > 0.7) {
      baseAAV *= 1.2; // High demand = 20% premium
    } else if (marketConditions.positionDemand < 0.3) {
      baseAAV *= 0.8; // Low demand = 20% discount
    }

    // Adjust for market trend
    if (marketConditions.marketTrend === 'rising') {
      baseAAV *= 1.1;
    } else if (marketConditions.marketTrend === 'falling') {
      baseAAV *= 0.9;
    }

    return baseAAV;
  }

  private static calculateDesiredYears(player: EnhancedPlayer): number {
    // Younger players prefer longer deals, older players prefer shorter
    if (player.age < 25) return 4;
    if (player.age < 30) return 3;
    if (player.age < 35) return 2;
    return 1; // Veterans prefer 1-year deals
  }

  private static calculateHoldoutDuration(player: EnhancedPlayer): number {
    const style = player.personality.traits.negotiationStyle;
    const baseDuration = 30; // Base 30 days

    switch (style) {
      case 'aggressive':
        return baseDuration * 1.5; // 45 days
      case 'patient':
        return baseDuration * 1.3; // 39 days
      case 'conservative':
        return baseDuration * 1.2; // 36 days
      case 'cooperative':
        return baseDuration * 0.8; // 24 days
      case 'desperate':
        return baseDuration * 0.5; // 15 days
      case 'flexible':
        return baseDuration * 1.0; // 30 days
      default:
        return baseDuration;
    }
  }

  private static selectRandomTemplate(templates: string[]): string {
    if (templates.length === 0) return "I'm considering my options.";
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private static generateAcceptanceFeedback(
    player: EnhancedPlayer,
    context: ContractEvaluationContext
  ): string {
    const traits = player.personality.traits;

    if (
      traits.teamLoyalty === 'very_high' &&
      player.currentTeamId === context.team.teamId
    ) {
      return "I'm excited to continue building something special with this team!";
    } else if (
      traits.locationPreference === 'big_markets' &&
      context.team.marketSize === 'large'
    ) {
      return 'This is exactly the kind of market where I can build my brand!';
    } else if (context.team.isContender) {
      return 'I want to win championships, and this team gives me that opportunity!';
    } else {
      return "This offer meets my expectations and I'm ready to contribute!";
    }
  }

  private static generateShortlistFeedback(
    player: EnhancedPlayer,
    context: ContractEvaluationContext
  ): string {
    const traits = player.personality.traits;

    if (traits.negotiationStyle === 'patient') {
      return "I'm considering this offer along with others. I want to make the right decision.";
    } else if (traits.negotiationStyle === 'conservative') {
      return 'I need to think about the guarantees and security this offer provides.';
    } else {
      return 'This is an interesting offer. Let me see what else develops in the market.';
    }
  }

  private static getDefaultPersonalityTypes(): any {
    return {
      personality_types: {
        aggressive_negotiator: {
          name: 'Aggressive Negotiator',
          traits: { negotiation_style: 'aggressive' },
          weights: { money_priority: 0.9 },
          behaviors: { holdout_threshold: 0.8 },
        },
      },
    };
  }
}
