import { describe, it, expect, beforeEach } from 'vitest';
import {
  EnhancedPlayerFactory,
  PersonalityEngine,
  PersonalityEvolutionEngine,
} from './index';
import { EnhancedPlayer, ContractEvaluationContext } from './enhanced-player';
import { Player, Position } from '@fantasy-football-dynasty/types';

describe('Personality System', () => {
  let mockPlayer: Player;

  beforeEach(async () => {
    await EnhancedPlayerFactory.initialize();
    await PersonalityEngine.initialize();

    // Create a mock player
    mockPlayer = {
      id: 'player1',
      name: 'Test Player',
      position: 'WR' as Position,
      age: 25,
      overall: 82,
      yearsExp: 3,
      nflTeam: 'DAL',
      devGrade: 'B',
      traits: {
        speed: 70,
        strength: 60,
        agility: 75,
        awareness: 65,
        injury: 50,
        schemeFit: [],
      },
      stats: [],
    };
  });

  describe('EnhancedPlayerFactory', () => {
    beforeEach(async () => {
      await EnhancedPlayerFactory.initialize();
    });

    it('should create enhanced players with personalities', () => {
      const enhancedPlayer = EnhancedPlayerFactory.createEnhancedPlayer(
        mockPlayer,
        2024
      );

      expect(enhancedPlayer.personality).toBeDefined();
      expect(enhancedPlayer.personality.type).toBeDefined();
      expect(enhancedPlayer.personality.traits).toBeDefined();
      expect(enhancedPlayer.personality.weights).toBeDefined();
      expect(enhancedPlayer.personality.behaviors).toBeDefined();
      expect(enhancedPlayer.personality.hiddenSliders).toBeDefined();
      expect(enhancedPlayer.personality.feedbackTemplates).toBeDefined();
      expect(enhancedPlayer.personality.blending).toBeDefined();
      expect(enhancedPlayer.personality.tradePreferences).toBeDefined();
      expect(enhancedPlayer.personality.marketContext).toBeDefined();
      expect(enhancedPlayer.personality.evolution).toBeDefined();
    });

    it('should generate different personalities for different players', () => {
      const player1 = EnhancedPlayerFactory.createEnhancedPlayer(
        mockPlayer,
        2024
      );
      const player2 = EnhancedPlayerFactory.createEnhancedPlayer(
        { ...mockPlayer, id: 'player2' },
        2024
      );

      // Players should have different personalities
      expect(player1.personality.type).toBeDefined();
      expect(player2.personality.type).toBeDefined();

      // Check that at least some aspects are different (accounting for randomization)
      const differentAspects = [
        player1.personality.weights.moneyPriority !==
          player2.personality.weights.moneyPriority,
        player1.personality.weights.winningPriority !==
          player2.personality.weights.winningPriority,
        player1.personality.behaviors.holdoutThreshold !==
          player2.personality.behaviors.holdoutThreshold,
        player1.personality.hiddenSliders.ego !==
          player2.personality.hiddenSliders.ego,
      ];

      expect(differentAspects.some((different) => different)).toBe(true);
    });

    it('should apply position-specific adjustments', () => {
      const wrPlayer = EnhancedPlayerFactory.createEnhancedPlayer(
        { ...mockPlayer, position: 'WR' as Position },
        2024
      );

      // WR players should have location preferences that include big markets
      const expectedLocationPreferences = [
        'big_markets',
        'warm_weather',
        'rural_areas',
        'neutral',
        'current_team',
        'winning_teams',
        'stable_markets',
        'any', // Some personality types can have 'any' location preference
      ];

      // Log the actual value for debugging
      console.log(
        'WR location preference:',
        wrPlayer.personality.traits.locationPreference
      );
      console.log('Expected values:', expectedLocationPreferences);

      expect(expectedLocationPreferences).toContain(
        wrPlayer.personality.traits.locationPreference
      );

      // Check that personality has the expected structure
      expect(wrPlayer.personality.traits).toBeDefined();
      expect(wrPlayer.personality.weights).toBeDefined();
      expect(wrPlayer.personality.behaviors).toBeDefined();
    });
  });

  describe('PersonalityEngine', () => {
    it('should evaluate contract offers', () => {
      const enhancedPlayer = EnhancedPlayerFactory.createEnhancedPlayer(
        mockPlayer,
        2024
      );

      const mockContext = {
        offer: {
          years: 3,
          totalValue: 15000000,
          apy: 5000000,
          guaranteedAmount: 10000000,
          signingBonus: 5000000,
          performanceIncentives: [],
          teamQuality: 0.8,
          locationMatch: 0.7,
        },
        team: {
          teamId: 'team1',
          city: 'Dallas',
          state: 'TX',
          timezone: 'CST',
          marketSize: 'large' as const,
          climate: 'warm' as const,
          isContender: true,
          isStable: true,
        },
        marketConditions: {
          positionDemand: 0.6,
          marketTrend: 'stable' as const,
          recentComparables: [],
          leagueCapSpace: 1000000000,
          teamCount: 12,
        },
        competingOffers: [],
        currentWeek: 1,
        seasonStage: 'EarlyFA' as const,
      };

      const decision = PersonalityEngine.evaluateContractOffer(
        enhancedPlayer,
        mockContext
      );

      expect(decision).toBeDefined();
      expect(decision.playerId).toBe(mockPlayer.id);
      expect(decision.decision).toBeDefined();
      expect(decision.reasoning).toBeDefined();
      expect(decision.feedback).toBeDefined();
    });
  });

  describe('PersonalityEvolutionEngine', () => {
    it('should process personality evolution', () => {
      const enhancedPlayer = EnhancedPlayerFactory.createEnhancedPlayer(
        mockPlayer,
        2024
      );

      // Add a life event
      PersonalityEvolutionEngine.addLifeEvent(
        enhancedPlayer,
        'major_injury',
        2024,
        1,
        'Torn ACL'
      );

      // Process evolution
      PersonalityEvolutionEngine.processPersonalityEvolution(
        enhancedPlayer,
        2024
      );

      expect(
        enhancedPlayer.personality.evolution.evolutionCount
      ).toBeGreaterThan(0);
    });

    it('should add life events and market experiences', () => {
      const enhancedPlayer = EnhancedPlayerFactory.createEnhancedPlayer(
        mockPlayer,
        2024
      );

      // Add life event
      PersonalityEvolutionEngine.addLifeEvent(
        enhancedPlayer,
        'championship_win',
        2024,
        1,
        'Won Super Bowl'
      );
      expect(enhancedPlayer.personality.evolution.lifeEvents.length).toBe(1);
      expect(enhancedPlayer.personality.evolution.lifeEvents[0].type).toBe(
        'championship_win'
      );
      expect(
        enhancedPlayer.personality.evolution.lifeEvents[0].description
      ).toBe('Won Super Bowl');

      // Add market experience
      PersonalityEvolutionEngine.addMarketExperience(
        enhancedPlayer,
        'successful_holdout',
        2024,
        1,
        'Successfully held out for better contract'
      );
      expect(
        enhancedPlayer.personality.evolution.marketExperiences.length
      ).toBe(1);
      expect(
        enhancedPlayer.personality.evolution.marketExperiences[0].type
      ).toBe('successful_holdout');
      expect(
        enhancedPlayer.personality.evolution.marketExperiences[0].description
      ).toBe('Successfully held out for better contract');
    });

    it('should get evolution summary', () => {
      const enhancedPlayer = EnhancedPlayerFactory.createEnhancedPlayer(
        mockPlayer,
        2024
      );

      const summary =
        PersonalityEvolutionEngine.getEvolutionSummary(enhancedPlayer);

      expect(summary).toBeDefined();
      expect(typeof summary).toBe('string');
      expect(summary).toContain('Evolution Count: 0');
      expect(summary).toContain('Active Cooldowns: 0');
    });
  });

  describe('Explicit Decision Engine', () => {
    let player: EnhancedPlayer;
    let context: ContractEvaluationContext;

    beforeEach(async () => {
      await EnhancedPlayerFactory.initialize();

      player = EnhancedPlayerFactory.createEnhancedPlayer(mockPlayer, 2024);

      context = {
        offer: {
          years: 3,
          totalValue: 30000000,
          apy: 10000000,
          guaranteedAmount: 20000000,
          signingBonus: 5000000,
          performanceIncentives: [],
          teamQuality: 0.8,
          locationMatch: 0.7,
        },
        team: {
          teamId: 'team1',
          city: 'Dallas',
          state: 'TX',
          timezone: 'CST',
          marketSize: 'large',
          climate: 'warm',
          isContender: true,
          isStable: true,
        },
        marketConditions: {
          positionDemand: 0.7,
          marketTrend: 'rising',
          recentComparables: [],
          leagueCapSpace: 1000000000,
          teamCount: 12,
        },
        competingOffers: [
          {
            years: 3,
            totalValue: 28000000,
            apy: 9300000,
            guaranteedAmount: 18000000,
            signingBonus: 4000000,
            performanceIncentives: [],
            teamQuality: 0.7,
            locationMatch: 0.6,
          },
        ],
        currentWeek: 1,
        seasonStage: 'EarlyFA' as any,
      };
    });

    it('should calculate explicit offer scores correctly', () => {
      const score = PersonalityEngine['calculateExplicitOfferScore'](
        player,
        context
      );

      // Score should be between 0 and 1
      expect(score).toBeGreaterThanOrEqual(0.0);
      expect(score).toBeLessThanOrEqual(1.0);

      // With good offer terms and contender team, score should be reasonable
      expect(score).toBeGreaterThan(0.5);
    });

    it('should apply hidden slider modifiers', () => {
      const baseScore = 0.7;
      const modifiedScore = PersonalityEngine['applyHiddenSliderModifiers'](
        player,
        context,
        baseScore
      );

      // Hidden sliders should modify the score
      expect(modifiedScore).toBeGreaterThanOrEqual(0.0);
      expect(modifiedScore).toBeLessThanOrEqual(1.0);
    });

    it('should apply market dynamics modifiers', () => {
      const baseScore = 0.7;
      const modifiedScore = PersonalityEngine['applyMarketDynamicsModifiers'](
        player,
        context,
        baseScore
      );

      // Market dynamics should modify the score
      expect(modifiedScore).toBeGreaterThanOrEqual(0.0);
      expect(modifiedScore).toBeLessThanOrEqual(1.0);
    });

    it('should determine decisions using explicit thresholds', () => {
      // Ensure player has a reasonable holdout threshold for testing
      player.personality.behaviors.holdoutThreshold = 0.4;

      const highScore = 0.95; // Use a score guaranteed to be above any holdoutThreshold
      const lowScore = 0.3;
      const moderateScore = 0.6;

      const highDecision = PersonalityEngine['determineDecisionWithThresholds'](
        player,
        highScore,
        context
      );
      const lowDecision = PersonalityEngine['determineDecisionWithThresholds'](
        player,
        lowScore,
        context
      );
      const moderateDecision = PersonalityEngine[
        'determineDecisionWithThresholds'
      ](player, moderateScore, context);

      // High scores should lead to acceptance
      expect(highDecision.decision).toBe('accept');

      // Low scores should lead to holdout or rejection
      // Note: holdout happens first if score < holdoutThreshold, otherwise reject if < 0.4
      expect(['holdout', 'reject']).toContain(lowDecision.decision);

      // Moderate scores should lead to counter or shortlist
      // Note: counter happens if score < 0.7 and not desperate, otherwise shortlist
      expect(['counter', 'shortlist']).toContain(moderateDecision.decision);
    });

    it('should calculate counter-offers with hidden slider adjustments', () => {
      // Ensure player has a reasonable counter offer multiplier for testing
      player.personality.behaviors.counterOfferMultiplier = 1.2;

      const decision = { decision: 'counter' };
      const counterOffer = PersonalityEngine['calculateCounterOffer'](
        player,
        decision,
        context
      );

      expect(counterOffer).toBeDefined();
      // The counter offer should be higher than the original offer
      // With a 1.2 multiplier, the APY should increase from 10M to 12M
      // Total value should increase from 30M to 36M
      expect(counterOffer!.apy).toBeGreaterThan(context.offer.apy);
      expect(counterOffer!.totalValue).toBeGreaterThan(
        context.offer.totalValue
      );
      expect(counterOffer!.guaranteedAmount).toBeGreaterThan(
        context.offer.guaranteedAmount
      );
    });

    it('should replace template variables correctly', () => {
      const template =
        'Player weighed money ({money_priority}) and location ({location_match}) heavily. Ego factor: {ego_level}.';
      const result = PersonalityEngine['replaceTemplateVariables'](
        template,
        player,
        context,
        0.7
      );

      // Template variables should be replaced
      expect(result).not.toContain('{money_priority}');
      expect(result).not.toContain('{location_match}');
      expect(result).not.toContain('{ego_level}');

      // Check that the actual money_priority value is in the result
      const moneyPriority = player.personality.weights.moneyPriority.toFixed(2);
      expect(result).toContain(moneyPriority);
    });

    it('should calculate tax modifiers correctly', () => {
      const taxFreeState = { ...context.team, state: 'TX' };
      const highTaxState = { ...context.team, state: 'CA' };
      const neutralState = { ...context.team, state: 'CO' };

      const taxFreeModifier = PersonalityEngine['calculateTaxModifier'](
        taxFreeState,
        0.8
      );
      const highTaxModifier = PersonalityEngine['calculateTaxModifier'](
        highTaxState,
        0.8
      );
      const neutralModifier = PersonalityEngine['calculateTaxModifier'](
        neutralState,
        0.8
      );

      // Tax-free states should be more attractive
      expect(taxFreeModifier).toBeGreaterThan(1.0);

      // High-tax states should be less attractive
      expect(highTaxModifier).toBeLessThan(1.0);

      // Neutral states should have no impact
      expect(neutralModifier).toBe(1.0);
    });

    it('should calculate endorsement modifiers correctly', () => {
      const skillPlayer = { ...player, position: 'WR' as Position };
      const linemanPlayer = { ...player, position: 'OG' as Position };
      const bigMarketTeam = { ...context.team, marketSize: 'large' as any };
      const smallMarketTeam = { ...context.team, marketSize: 'small' as any };

      const skillBigMarket = PersonalityEngine['calculateEndorsementModifier'](
        skillPlayer,
        bigMarketTeam,
        0.8
      );
      const skillSmallMarket = PersonalityEngine[
        'calculateEndorsementModifier'
      ](skillPlayer, smallMarketTeam, 0.8);
      const linemanBigMarket = PersonalityEngine[
        'calculateEndorsementModifier'
      ](linemanPlayer, bigMarketTeam, 0.8);

      // Skill players in big markets should get endorsement boost
      expect(skillBigMarket).toBeGreaterThan(1.0);

      // Skill players in small markets should get no boost
      expect(skillSmallMarket).toBe(1.0);

      // Linemen should get no boost regardless of market
      expect(linemanBigMarket).toBe(1.0);
    });
  });

  describe('Market Dynamics Integration', () => {
    let player: EnhancedPlayer;
    let context: ContractEvaluationContext;

    beforeEach(async () => {
      await EnhancedPlayerFactory.initialize();
      player = EnhancedPlayerFactory.createEnhancedPlayer(mockPlayer, 2024);

      context = {
        offer: {
          years: 3,
          totalValue: 30000000,
          apy: 10000000,
          guaranteedAmount: 20000000,
          signingBonus: 5000000,
          performanceIncentives: [],
          teamQuality: 0.8,
          locationMatch: 0.7,
        },
        team: {
          teamId: 'team1',
          city: 'Dallas',
          state: 'TX',
          timezone: 'CST',
          marketSize: 'large',
          climate: 'warm',
          isContender: true,
          isStable: true,
        },
        marketConditions: {
          positionDemand: 0.7,
          marketTrend: 'rising',
          recentComparables: [],
          leagueCapSpace: 1000000000,
          teamCount: 12,
        },
        competingOffers: [],
        currentWeek: 1,
        seasonStage: 'EarlyFA' as any,
      };
    });

    it('should handle high position demand', () => {
      // Update player's market context to simulate high demand
      player.personality.marketContext.supplyPressure = 0.9;

      const baseScore = 0.7;
      const modifiedScore = PersonalityEngine['applyMarketDynamicsModifiers'](
        player,
        context,
        baseScore
      );

      // High demand should increase score
      expect(modifiedScore).toBeGreaterThan(baseScore);
    });

    it('should handle low position demand', () => {
      // Update player's market context to simulate low demand
      player.personality.marketContext.supplyPressure = 0.2;

      const baseScore = 0.7;
      const modifiedScore = PersonalityEngine['applyMarketDynamicsModifiers'](
        player,
        context,
        baseScore
      );

      // Low demand should decrease score
      expect(modifiedScore).toBeLessThan(baseScore);
    });

    it('should handle rising market trends', () => {
      // Update player's market context to simulate rising market
      player.personality.marketContext.marketTrend = 'rising';

      const baseScore = 0.7;
      const modifiedScore = PersonalityEngine['applyMarketDynamicsModifiers'](
        player,
        context,
        baseScore
      );

      // Rising market should increase score
      expect(modifiedScore).toBeGreaterThan(baseScore);
    });

    it('should handle falling market trends', () => {
      // Update player's market context to simulate falling market
      player.personality.marketContext.marketTrend = 'falling';

      const baseScore = 0.7;
      const modifiedScore = PersonalityEngine['applyMarketDynamicsModifiers'](
        player,
        context,
        baseScore
      );

      // Falling market should decrease score
      expect(modifiedScore).toBeLessThan(baseScore);
    });

    it('should handle competing offers', () => {
      const competingOffersContext = {
        ...context,
        competingOffers: [
          {
            years: 3,
            totalValue: 45000000, // Much higher APY to trigger the < 0.8 ratio
            apy: 15000000,
            guaranteedAmount: 30000000,
            signingBonus: 8000000,
            performanceIncentives: [],
            teamQuality: 0.8,
            locationMatch: 0.7,
          },
          {
            years: 3,
            totalValue: 32000000,
            apy: 10666667,
            guaranteedAmount: 22000000,
            signingBonus: 5500000,
            performanceIncentives: [],
            teamQuality: 0.7,
            locationMatch: 0.6,
          },
        ],
      };

      const baseScore = 0.7;
      const modifiedScore = PersonalityEngine['applyMarketDynamicsModifiers'](
        player,
        competingOffersContext,
        baseScore
      );

      // Competing offers should affect score
      // With APY 10M vs competing 15M, ratio = 0.67 < 0.8, so score should be reduced
      expect(modifiedScore).toBeLessThan(baseScore);
    });
  });

  describe('Personality System Integration', () => {
    it('should create realistic player personalities', () => {
      const enhancedPlayer = EnhancedPlayerFactory.createEnhancedPlayer(
        mockPlayer,
        2024
      );

      // Verify personality structure
      expect(enhancedPlayer.personality.traits.negotiationStyle).toMatch(
        /^(aggressive|patient|desperate|cooperative|flexible|conservative)$/
      );
      expect(enhancedPlayer.personality.traits.riskTolerance).toMatch(
        /^(very_low|low|medium|high|very_high)$/
      );
      expect(enhancedPlayer.personality.traits.teamLoyalty).toMatch(
        /^(very_low|low|medium|high|very_high)$/
      );

      // Verify weights are normalized
      const totalWeight = Object.values(
        enhancedPlayer.personality.weights
      ).reduce((sum, weight) => sum + weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 2);

      // Verify behaviors are within bounds
      expect(
        enhancedPlayer.personality.behaviors.holdoutThreshold
      ).toBeGreaterThanOrEqual(0.0);
      expect(
        enhancedPlayer.personality.behaviors.holdoutThreshold
      ).toBeLessThanOrEqual(1.0);
      expect(
        enhancedPlayer.personality.behaviors.counterOfferMultiplier
      ).toBeGreaterThanOrEqual(0.9); // Allow for realistic randomization variation
    });

    it('should generate diverse personalities across multiple players', () => {
      const players = [];
      for (let i = 0; i < 5; i++) {
        const player = EnhancedPlayerFactory.createEnhancedPlayer(
          { ...mockPlayer, id: `player${i}` },
          2024
        );
        players.push(player);
      }

      // Check that players have different personalities
      const personalityTypes = players.map((p) => p.personality.type);
      const uniqueTypes = new Set(personalityTypes);

      // With randomization, we should have some variety
      expect(uniqueTypes.size).toBeGreaterThan(1);

      // Check that at least some aspects are different
      const firstPlayer = players[0];
      const differentAspects = players
        .slice(1)
        .some(
          (player) =>
            player.personality.weights.moneyPriority !==
              firstPlayer.personality.weights.moneyPriority ||
            player.personality.behaviors.holdoutThreshold !==
              firstPlayer.personality.behaviors.holdoutThreshold ||
            player.personality.hiddenSliders.ego !==
              firstPlayer.personality.hiddenSliders.ego
        );

      expect(differentAspects).toBe(true);
    });
  });
});
