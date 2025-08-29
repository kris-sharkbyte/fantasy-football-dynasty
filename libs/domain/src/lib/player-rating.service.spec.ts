import {
  PlayerRatingService,
  PlayerRatingContext,
} from './player-rating.service';
import { PlayerStats } from './league-setup.service';

describe('PlayerRatingService', () => {
  describe('calculateOverallRating', () => {
    it('should calculate high overall for elite TE performance like Brock Bowers', () => {
      // Brock Bowers 2024 stats
      const brockBowersStats: PlayerStats = {
        PlayerID: 24943,
        SeasonType: 1,
        Season: 2024,
        Team: 'LV',
        Number: 89,
        Name: 'B.Bowers',
        Position: 'TE',
        PositionCategory: 'OFF',
        Played: 17,
        Started: 16,
        PassingAttempts: 0,
        PassingCompletions: 0,
        PassingYards: 0,
        PassingCompletionPercentage: 0,
        PassingYardsPerAttempt: 0,
        PassingYardsPerCompletion: 0,
        PassingTouchdowns: 0,
        PassingInterceptions: 0,
        PassingRating: 0,
        PassingLong: 0,
        PassingSacks: 0,
        PassingSackYards: 0,
        RushingAttempts: 5,
        RushingYards: 13,
        RushingYardsPerAttempt: 2.6,
        RushingTouchdowns: 0,
        RushingLong: 12,
        ReceivingTargets: 153,
        Receptions: 112,
        ReceivingYards: 1194,
        ReceivingYardsPerReception: 10.7,
        ReceivingTouchdowns: 5,
        ReceivingLong: 57,
        Fumbles: 0,
        FumblesLost: 0,
        PuntReturns: 0,
        PuntReturnYards: 0,
        PuntReturnTouchdowns: 0,
        KickReturns: 0,
        KickReturnYards: 0,
        KickReturnTouchdowns: 0,
        SoloTackles: 3,
        AssistedTackles: 0,
        TacklesForLoss: 0,
        Sacks: 0,
        SackYards: 0,
        QuarterbackHits: 0,
        PassesDefended: 0,
        FumblesForced: 0,
        FumblesRecovered: 0,
        FumbleReturnTouchdowns: 0,
        Interceptions: 0,
        InterceptionReturnTouchdowns: 0,
        FieldGoalsAttempted: 0,
        FieldGoalsMade: 0,
        ExtraPointsMade: 0,
        TwoPointConversionPasses: 0,
        TwoPointConversionRuns: 0,
        TwoPointConversionReceptions: 0,
        FantasyPoints: 150.7,
        FantasyPointsPPR: 262.7,
        FantasyPosition: 'TE',
        PlayerSeasonID: 991166148,
        ExtraPointsAttempted: 0,
        AuctionValue: null,
        AuctionValuePPR: null,
        FantasyPointsFanDuel: 212.7,
        FieldGoalsMade0to19: 0,
        FieldGoalsMade20to29: 0,
        FieldGoalsMade30to39: 0,
        FieldGoalsMade40to49: 0,
        FieldGoalsMade50Plus: 0,
        FantasyPointsDraftKings: 268.7,
        AverageDraftPosition: null,
        AverageDraftPositionPPR: null,
        TeamID: 25,
        AverageDraftPositionRookie: null,
        AverageDraftPositionDynasty: null,
        AverageDraftPosition2QB: null,
      };

      const context: PlayerRatingContext = {
        position: 'TE',
        experience: 1, // Rookie
        age: 21,
        fantasyPoints: 150.7,
        fantasyPointsPPR: 262.7,
        gamesPlayed: 17,
        gamesStarted: 16,
      };

      const overall = PlayerRatingService.calculateOverallRating(
        brockBowersStats,
        context
      );

      // Brock Bowers should have a very high overall given his elite TE performance
      expect(overall).toBeGreaterThanOrEqual(85);
      expect(overall).toBeLessThanOrEqual(99);

      console.log(`Brock Bowers Overall Rating: ${overall}`);
    });

    it('should calculate appropriate ratings for different positions', () => {
      // Test QB with good stats
      const qbStats: PlayerStats = {
        PlayerID: 1,
        SeasonType: 1,
        Season: 2024,
        Team: 'KC',
        Number: 15,
        Name: 'P.Mahomes',
        Position: 'QB',
        PositionCategory: 'OFF',
        Played: 17,
        Started: 17,
        PassingAttempts: 600,
        PassingCompletions: 400,
        PassingYards: 4500,
        PassingCompletionPercentage: 66.7,
        PassingYardsPerAttempt: 7.5,
        PassingYardsPerCompletion: 11.25,
        PassingTouchdowns: 35,
        PassingInterceptions: 12,
        PassingRating: 98.5,
        PassingLong: 75,
        PassingSacks: 25,
        PassingSackYards: 150,
        RushingAttempts: 50,
        RushingYards: 300,
        RushingYardsPerAttempt: 6.0,
        RushingTouchdowns: 2,
        RushingLong: 25,
        ReceivingTargets: 0,
        Receptions: 0,
        ReceivingYards: 0,
        ReceivingYardsPerReception: 0,
        ReceivingTouchdowns: 0,
        ReceivingLong: 0,
        Fumbles: 3,
        FumblesLost: 2,
        PuntReturns: 0,
        PuntReturnYards: 0,
        PuntReturnTouchdowns: 0,
        KickReturns: 0,
        KickReturnYards: 0,
        KickReturnTouchdowns: 0,
        SoloTackles: 0,
        AssistedTackles: 0,
        TacklesForLoss: 0,
        Sacks: 0,
        SackYards: 0,
        QuarterbackHits: 0,
        PassesDefended: 0,
        FumblesForced: 0,
        FumblesRecovered: 0,
        FumbleReturnTouchdowns: 0,
        Interceptions: 0,
        InterceptionReturnTouchdowns: 0,
        FieldGoalsAttempted: 0,
        FieldGoalsMade: 0,
        ExtraPointsMade: 0,
        TwoPointConversionPasses: 0,
        TwoPointConversionRuns: 0,
        TwoPointConversionReceptions: 0,
        FantasyPoints: 380,
        FantasyPointsPPR: 380,
        FantasyPosition: 'QB',
        PlayerSeasonID: 1,
        ExtraPointsAttempted: 0,
        AuctionValue: null,
        AuctionValuePPR: null,
        FantasyPointsFanDuel: 380,
        FieldGoalsMade0to19: 0,
        FieldGoalsMade20to29: 0,
        FieldGoalsMade30to39: 0,
        FieldGoalsMade40to49: 0,
        FieldGoalsMade50Plus: 0,
        FantasyPointsDraftKings: 380,
        AverageDraftPosition: null,
        AverageDraftPositionPPR: null,
        TeamID: 1,
        AverageDraftPositionRookie: null,
        AverageDraftPositionDynasty: null,
        AverageDraftPosition2QB: null,
      };

      const qbContext: PlayerRatingContext = {
        position: 'QB',
        experience: 7,
        age: 28,
        fantasyPoints: 380,
        fantasyPointsPPR: 380,
        gamesPlayed: 17,
        gamesStarted: 17,
      };

      const qbOverall = PlayerRatingService.calculateOverallRating(
        qbStats,
        qbContext
      );
      expect(qbOverall).toBeGreaterThanOrEqual(80);
      expect(qbOverall).toBeLessThanOrEqual(99);
    });

    it('should handle players with no stats gracefully', () => {
      const noStats: PlayerStats = {
        PlayerID: 999,
        SeasonType: 1,
        Season: 2024,
        Team: 'FA',
        Number: 0,
        Name: 'Rookie Player',
        Position: 'WR',
        PositionCategory: 'OFF',
        Played: 0,
        Started: 0,
        PassingAttempts: 0,
        PassingCompletions: 0,
        PassingYards: 0,
        PassingCompletionPercentage: 0,
        PassingYardsPerAttempt: 0,
        PassingYardsPerCompletion: 0,
        PassingTouchdowns: 0,
        PassingInterceptions: 0,
        PassingRating: 0,
        PassingLong: 0,
        PassingSacks: 0,
        PassingSackYards: 0,
        RushingAttempts: 0,
        RushingYards: 0,
        RushingYardsPerAttempt: 0,
        RushingTouchdowns: 0,
        RushingLong: 0,
        ReceivingTargets: 0,
        Receptions: 0,
        ReceivingYards: 0,
        ReceivingYardsPerReception: 0,
        ReceivingTouchdowns: 0,
        ReceivingLong: 0,
        Fumbles: 0,
        FumblesLost: 0,
        PuntReturns: 0,
        PuntReturnYards: 0,
        PuntReturnTouchdowns: 0,
        KickReturns: 0,
        KickReturnYards: 0,
        KickReturnTouchdowns: 0,
        SoloTackles: 0,
        AssistedTackles: 0,
        TacklesForLoss: 0,
        Sacks: 0,
        SackYards: 0,
        QuarterbackHits: 0,
        PassesDefended: 0,
        FumblesForced: 0,
        FumblesRecovered: 0,
        FumbleReturnTouchdowns: 0,
        Interceptions: 0,
        InterceptionReturnTouchdowns: 0,
        FieldGoalsAttempted: 0,
        FieldGoalsMade: 0,
        ExtraPointsMade: 0,
        TwoPointConversionPasses: 0,
        TwoPointConversionRuns: 0,
        TwoPointConversionReceptions: 0,
        FantasyPoints: 0,
        FantasyPointsPPR: 0,
        FantasyPosition: 'WR',
        PlayerSeasonID: 999,
        ExtraPointsAttempted: 0,
        AuctionValue: null,
        AuctionValuePPR: null,
        FantasyPointsFanDuel: 0,
        FieldGoalsMade0to19: 0,
        FieldGoalsMade20to29: 0,
        FieldGoalsMade30to39: 0,
        FieldGoalsMade40to49: 0,
        FieldGoalsMade50Plus: 0,
        FantasyPointsDraftKings: 0,
        AverageDraftPosition: null,
        AverageDraftPositionPPR: null,
        TeamID: 0,
        AverageDraftPositionRookie: null,
        AverageDraftPositionDynasty: null,
        AverageDraftPosition2QB: null,
      };

      const context: PlayerRatingContext = {
        position: 'WR',
        experience: 0,
        age: 22,
        fantasyPoints: 0,
        fantasyPointsPPR: 0,
        gamesPlayed: 0,
        gamesStarted: 0,
      };

      const overall = PlayerRatingService.calculateOverallRating(
        noStats,
        context
      );

      // Should return a reasonable default rating for players with no stats
      expect(overall).toBeGreaterThanOrEqual(50);
      expect(overall).toBeLessThanOrEqual(75);
    });
  });

  describe('position-specific ratings', () => {
    it('should calculate TE rating with proper position weighting', () => {
      const teStats: PlayerStats = {
        PlayerID: 1,
        SeasonType: 1,
        Season: 2024,
        Team: 'SF',
        Number: 85,
        Name: 'G.Kittle',
        Position: 'TE',
        PositionCategory: 'OFF',
        Played: 16,
        Started: 16,
        PassingAttempts: 0,
        PassingCompletions: 0,
        PassingYards: 0,
        PassingCompletionPercentage: 0,
        PassingYardsPerAttempt: 0,
        PassingYardsPerCompletion: 0,
        PassingTouchdowns: 0,
        PassingInterceptions: 0,
        PassingRating: 0,
        PassingLong: 0,
        PassingSacks: 0,
        PassingSackYards: 0,
        RushingAttempts: 0,
        RushingYards: 0,
        RushingYardsPerAttempt: 0,
        RushingTouchdowns: 0,
        RushingLong: 0,
        ReceivingTargets: 90,
        Receptions: 65,
        ReceivingYards: 800,
        ReceivingYardsPerReception: 12.3,
        ReceivingTouchdowns: 6,
        ReceivingLong: 45,
        Fumbles: 1,
        FumblesLost: 1,
        PuntReturns: 0,
        PuntReturnYards: 0,
        PuntReturnTouchdowns: 0,
        KickReturns: 0,
        KickReturnYards: 0,
        KickReturnTouchdowns: 0,
        SoloTackles: 0,
        AssistedTackles: 0,
        TacklesForLoss: 0,
        Sacks: 0,
        SackYards: 0,
        QuarterbackHits: 0,
        PassesDefended: 0,
        FumblesForced: 0,
        FumblesRecovered: 0,
        FumbleReturnTouchdowns: 0,
        Interceptions: 0,
        InterceptionReturnTouchdowns: 0,
        FieldGoalsAttempted: 0,
        FieldGoalsMade: 0,
        ExtraPointsMade: 0,
        TwoPointConversionPasses: 0,
        TwoPointConversionRuns: 0,
        TwoPointConversionReceptions: 0,
        FantasyPoints: 120,
        FantasyPointsPPR: 185,
        FantasyPosition: 'TE',
        PlayerSeasonID: 1,
        ExtraPointsAttempted: 0,
        AuctionValue: null,
        AuctionValuePPR: null,
        FantasyPointsFanDuel: 185,
        FieldGoalsMade0to19: 0,
        FieldGoalsMade20to29: 0,
        FieldGoalsMade30to39: 0,
        FieldGoalsMade40to49: 0,
        FieldGoalsMade50Plus: 0,
        FantasyPointsDraftKings: 185,
        AverageDraftPosition: null,
        AverageDraftPositionPPR: null,
        TeamID: 1,
        AverageDraftPositionRookie: null,
        AverageDraftPositionDynasty: null,
        AverageDraftPosition2QB: null,
      };

      const context: PlayerRatingContext = {
        position: 'TE',
        experience: 6,
        age: 30,
        fantasyPoints: 120,
        fantasyPointsPPR: 185,
        gamesPlayed: 16,
        gamesStarted: 16,
      };

      const overall = PlayerRatingService.calculateOverallRating(
        teStats,
        context
      );

      // Good TE performance should result in solid overall
      expect(overall).toBeGreaterThanOrEqual(75);
      expect(overall).toBeLessThanOrEqual(95); // Increased from 89 since TEs now get proper valuation
    });

    it('should calculate RB rating with rushing and receiving efficiency', () => {
      const rbStats: PlayerStats = {
        PlayerID: 1,
        SeasonType: 1,
        Season: 2024,
        Team: 'SF',
        Number: 23,
        Name: 'C.McCaffrey',
        Position: 'RB',
        PositionCategory: 'OFF',
        Played: 17,
        Started: 17,
        PassingAttempts: 0,
        PassingCompletions: 0,
        PassingYards: 0,
        PassingCompletionPercentage: 0,
        PassingYardsPerAttempt: 0,
        PassingYardsPerCompletion: 0,
        PassingTouchdowns: 0,
        PassingInterceptions: 0,
        PassingRating: 0,
        PassingLong: 0,
        PassingSacks: 0,
        PassingSackYards: 0,
        RushingAttempts: 300,
        RushingYards: 1500,
        RushingYardsPerAttempt: 5.0,
        RushingTouchdowns: 15,
        RushingLong: 65,
        ReceivingTargets: 80,
        Receptions: 65,
        ReceivingYards: 600,
        ReceivingYardsPerReception: 9.2,
        ReceivingTouchdowns: 5,
        ReceivingLong: 35,
        Fumbles: 2,
        FumblesLost: 1,
        PuntReturns: 0,
        PuntReturnYards: 0,
        PuntReturnTouchdowns: 0,
        KickReturns: 0,
        KickReturnYards: 0,
        KickReturnTouchdowns: 0,
        SoloTackles: 0,
        AssistedTackles: 0,
        TacklesForLoss: 0,
        Sacks: 0,
        SackYards: 0,
        QuarterbackHits: 0,
        PassesDefended: 0,
        FumblesForced: 0,
        FumblesRecovered: 0,
        FumbleReturnTouchdowns: 0,
        Interceptions: 0,
        InterceptionReturnTouchdowns: 0,
        FieldGoalsAttempted: 0,
        FieldGoalsMade: 0,
        ExtraPointsMade: 0,
        TwoPointConversionPasses: 0,
        TwoPointConversionRuns: 0,
        TwoPointConversionReceptions: 0,
        FantasyPoints: 250,
        FantasyPointsPPR: 315,
        FantasyPosition: 'RB',
        PlayerSeasonID: 1,
        ExtraPointsAttempted: 0,
        AuctionValue: null,
        AuctionValuePPR: null,
        FantasyPointsFanDuel: 315,
        FieldGoalsMade0to19: 0,
        FieldGoalsMade20to29: 0,
        FieldGoalsMade30to39: 0,
        FieldGoalsMade40to49: 0,
        FieldGoalsMade50Plus: 0,
        FantasyPointsDraftKings: 315,
        AverageDraftPosition: null,
        AverageDraftPositionPPR: null,
        TeamID: 1,
        AverageDraftPositionRookie: null,
        AverageDraftPositionDynasty: null,
        AverageDraftPosition2QB: null,
      };

      const context: PlayerRatingContext = {
        position: 'RB',
        experience: 7,
        age: 27,
        fantasyPoints: 250,
        fantasyPointsPPR: 315,
        gamesPlayed: 17,
        gamesStarted: 17,
      };

      const overall = PlayerRatingService.calculateOverallRating(
        rbStats,
        context
      );

      // Elite RB performance should result in very high overall
      expect(overall).toBeGreaterThanOrEqual(85);
      expect(overall).toBeLessThanOrEqual(99);
    });
  });

  describe('fantasy performance scaling', () => {
    it('should scale ratings based on fantasy performance tiers', () => {
      // Test different fantasy point levels for TE
      const baseStats: PlayerStats = {
        PlayerID: 1,
        SeasonType: 1,
        Season: 2024,
        Team: 'TEAM',
        Number: 1,
        Name: 'Test TE',
        Position: 'TE',
        PositionCategory: 'OFF',
        Played: 17,
        Started: 17,
        PassingAttempts: 0,
        PassingCompletions: 0,
        PassingYards: 0,
        PassingCompletionPercentage: 0,
        PassingYardsPerAttempt: 0,
        PassingYardsPerCompletion: 0,
        PassingTouchdowns: 0,
        PassingInterceptions: 0,
        PassingRating: 0,
        PassingLong: 0,
        PassingSacks: 0,
        PassingSackYards: 0,
        RushingAttempts: 0,
        RushingYards: 0,
        RushingYardsPerAttempt: 0,
        RushingTouchdowns: 0,
        RushingLong: 0,
        ReceivingTargets: 80,
        Receptions: 50,
        ReceivingYards: 500,
        ReceivingYardsPerReception: 10,
        ReceivingTouchdowns: 3,
        ReceivingLong: 30,
        Fumbles: 0,
        FumblesLost: 0,
        PuntReturns: 0,
        PuntReturnYards: 0,
        PuntReturnTouchdowns: 0,
        KickReturns: 0,
        KickReturnYards: 0,
        KickReturnTouchdowns: 0,
        SoloTackles: 0,
        AssistedTackles: 0,
        TacklesForLoss: 0,
        Sacks: 0,
        SackYards: 0,
        QuarterbackHits: 0,
        PassesDefended: 0,
        FumblesForced: 0,
        FumblesRecovered: 0,
        FumbleReturnTouchdowns: 0,
        Interceptions: 0,
        InterceptionReturnTouchdowns: 0,
        FieldGoalsAttempted: 0,
        FieldGoalsMade: 0,
        ExtraPointsMade: 0,
        TwoPointConversionPasses: 0,
        TwoPointConversionRuns: 0,
        TwoPointConversionReceptions: 0,
        FantasyPoints: 0,
        FantasyPointsPPR: 0,
        FantasyPosition: 'TE',
        PlayerSeasonID: 1,
        ExtraPointsAttempted: 0,
        AuctionValue: null,
        AuctionValuePPR: null,
        FantasyPointsFanDuel: 0,
        FieldGoalsMade0to19: 0,
        FieldGoalsMade20to29: 0,
        FieldGoalsMade30to39: 0,
        FieldGoalsMade40to49: 0,
        FieldGoalsMade50Plus: 0,
        FantasyPointsDraftKings: 0,
        AverageDraftPosition: null,
        AverageDraftPositionPPR: null,
        TeamID: 1,
        AverageDraftPositionRookie: null,
        AverageDraftPositionDynasty: null,
        AverageDraftPosition2QB: null,
      };

      const context: PlayerRatingContext = {
        position: 'TE',
        experience: 3,
        age: 25,
        fantasyPoints: 0,
        fantasyPointsPPR: 0,
        gamesPlayed: 17,
        gamesStarted: 17,
      };

      // Test different fantasy point levels
      const testCases = [
        { fantasyPoints: 50, expectedMin: 50, expectedMax: 75 }, // Poor performance - increased from 70
        { fantasyPoints: 100, expectedMin: 60, expectedMax: 85 }, // Average performance - increased from 80
        { fantasyPoints: 150, expectedMin: 70, expectedMax: 95 }, // Good performance - increased from 90
        { fantasyPoints: 200, expectedMin: 80, expectedMax: 99 }, // Elite performance - increased from 95
      ];

      testCases.forEach(({ fantasyPoints, expectedMin, expectedMax }) => {
        const statsWithPoints = {
          ...baseStats,
          FantasyPoints: fantasyPoints,
          FantasyPointsPPR: fantasyPoints,
        };
        const contextWithPoints = {
          ...context,
          fantasyPoints,
          fantasyPointsPPR: fantasyPoints,
        };

        const overall = PlayerRatingService.calculateOverallRating(
          statsWithPoints,
          contextWithPoints
        );

        expect(overall).toBeGreaterThanOrEqual(expectedMin);
        expect(overall).toBeLessThanOrEqual(expectedMax);

        console.log(
          `TE with ${fantasyPoints} fantasy points: ${overall} overall`
        );
      });
    });
  });

  describe('position scarcity multipliers', () => {
    it('should return correct position scarcity multipliers', () => {
      expect(PlayerRatingService.getPositionScarcityMultiplier('QB')).toBe(1.2);
      expect(PlayerRatingService.getPositionScarcityMultiplier('TE')).toBe(1.3);
      expect(PlayerRatingService.getPositionScarcityMultiplier('WR')).toBe(1.0);
      expect(PlayerRatingService.getPositionScarcityMultiplier('RB')).toBe(1.1);
      expect(PlayerRatingService.getPositionScarcityMultiplier('K')).toBe(0.7);
      expect(PlayerRatingService.getPositionScarcityMultiplier('DEF')).toBe(
        0.9
      );
      expect(PlayerRatingService.getPositionScarcityMultiplier('UNKNOWN')).toBe(
        1.0
      );
    });
  });

  describe('elite fantasy benchmarks', () => {
    it('should return correct elite fantasy benchmarks', () => {
      const qbBenchmark = PlayerRatingService.getEliteFantasyBenchmark('QB');
      expect(qbBenchmark).toEqual({ ppr: 400, standard: 350 });

      const teBenchmark = PlayerRatingService.getEliteFantasyBenchmark('TE');
      expect(teBenchmark).toEqual({ ppr: 200, standard: 150 });

      const wrBenchmark = PlayerRatingService.getEliteFantasyBenchmark('WR');
      expect(wrBenchmark).toEqual({ ppr: 250, standard: 200 });

      const unknownBenchmark =
        PlayerRatingService.getEliteFantasyBenchmark('UNKNOWN');
      expect(unknownBenchmark).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle zero fantasy points gracefully', () => {
      const zeroStats: PlayerStats = {
        PlayerID: 1,
        SeasonType: 1,
        Season: 2024,
        Team: 'TEAM',
        Number: 1,
        Name: 'Zero Stats Player',
        Position: 'WR',
        PositionCategory: 'OFF',
        Played: 0,
        Started: 0,
        PassingAttempts: 0,
        PassingCompletions: 0,
        PassingYards: 0,
        PassingCompletionPercentage: 0,
        PassingYardsPerAttempt: 0,
        PassingYardsPerCompletion: 0,
        PassingTouchdowns: 0,
        PassingInterceptions: 0,
        PassingRating: 0,
        PassingLong: 0,
        PassingSacks: 0,
        PassingSackYards: 0,
        RushingAttempts: 0,
        RushingYards: 0,
        RushingYardsPerAttempt: 0,
        RushingTouchdowns: 0,
        RushingLong: 0,
        ReceivingTargets: 0,
        Receptions: 0,
        ReceivingYards: 0,
        ReceivingYardsPerReception: 0,
        ReceivingTouchdowns: 0,
        ReceivingLong: 0,
        Fumbles: 0,
        FumblesLost: 0,
        PuntReturns: 0,
        PuntReturnYards: 0,
        PuntReturnTouchdowns: 0,
        KickReturns: 0,
        KickReturnYards: 0,
        KickReturnTouchdowns: 0,
        SoloTackles: 0,
        AssistedTackles: 0,
        TacklesForLoss: 0,
        Sacks: 0,
        SackYards: 0,
        QuarterbackHits: 0,
        PassesDefended: 0,
        FumblesForced: 0,
        FumblesRecovered: 0,
        FumbleReturnTouchdowns: 0,
        Interceptions: 0,
        InterceptionReturnTouchdowns: 0,
        FieldGoalsAttempted: 0,
        FieldGoalsMade: 0,
        ExtraPointsMade: 0,
        TwoPointConversionPasses: 0,
        TwoPointConversionRuns: 0,
        TwoPointConversionReceptions: 0,
        FantasyPoints: 0,
        FantasyPointsPPR: 0,
        FantasyPosition: 'WR',
        PlayerSeasonID: 1,
        ExtraPointsAttempted: 0,
        AuctionValue: null,
        AuctionValuePPR: null,
        FantasyPointsFanDuel: 0,
        FieldGoalsMade0to19: 0,
        FieldGoalsMade20to29: 0,
        FieldGoalsMade30to39: 0,
        FieldGoalsMade40to49: 0,
        FieldGoalsMade50Plus: 0,
        FantasyPointsDraftKings: 0,
        AverageDraftPosition: null,
        AverageDraftPositionPPR: null,
        TeamID: 1,
        AverageDraftPositionRookie: null,
        AverageDraftPositionDynasty: null,
        AverageDraftPosition2QB: null,
      };

      const context: PlayerRatingContext = {
        position: 'WR',
        experience: 0,
        age: 22,
        fantasyPoints: 0,
        fantasyPointsPPR: 0,
        gamesPlayed: 0,
        gamesStarted: 0,
      };

      const overall = PlayerRatingService.calculateOverallRating(
        zeroStats,
        context
      );

      // Should return a reasonable minimum rating
      expect(overall).toBeGreaterThanOrEqual(50);
      expect(overall).toBeLessThanOrEqual(70);
    });

    it('should handle very high fantasy points without exceeding 99', () => {
      const highStats: PlayerStats = {
        PlayerID: 1,
        SeasonType: 1,
        Season: 2024,
        Team: 'TEAM',
        Number: 1,
        Name: 'Super Star',
        Position: 'QB',
        PositionCategory: 'OFF',
        Played: 17,
        Started: 17,
        PassingAttempts: 600,
        PassingCompletions: 450,
        PassingYards: 5500,
        PassingCompletionPercentage: 75,
        PassingYardsPerAttempt: 9.2,
        PassingYardsPerCompletion: 12.2,
        PassingTouchdowns: 45,
        PassingInterceptions: 8,
        PassingRating: 110.5,
        PassingLong: 80,
        PassingSacks: 20,
        PassingSackYards: 120,
        RushingAttempts: 80,
        RushingYards: 600,
        RushingYardsPerAttempt: 7.5,
        RushingTouchdowns: 8,
        RushingLong: 45,
        ReceivingTargets: 0,
        Receptions: 0,
        ReceivingYards: 0,
        ReceivingYardsPerReception: 0,
        ReceivingTouchdowns: 0,
        ReceivingLong: 0,
        Fumbles: 2,
        FumblesLost: 1,
        PuntReturns: 0,
        PuntReturnYards: 0,
        PuntReturnTouchdowns: 0,
        KickReturns: 0,
        KickReturnYards: 0,
        KickReturnTouchdowns: 0,
        SoloTackles: 0,
        AssistedTackles: 0,
        TacklesForLoss: 0,
        Sacks: 0,
        SackYards: 0,
        QuarterbackHits: 0,
        PassesDefended: 0,
        FumblesForced: 0,
        FumblesRecovered: 0,
        FumbleReturnTouchdowns: 0,
        Interceptions: 0,
        InterceptionReturnTouchdowns: 0,
        FieldGoalsAttempted: 0,
        FieldGoalsMade: 0,
        ExtraPointsMade: 0,
        TwoPointConversionPasses: 0,
        TwoPointConversionRuns: 0,
        TwoPointConversionReceptions: 0,
        FantasyPoints: 500,
        FantasyPointsPPR: 500,
        FantasyPosition: 'QB',
        PlayerSeasonID: 1,
        ExtraPointsAttempted: 0,
        AuctionValue: null,
        AuctionValuePPR: null,
        FantasyPointsFanDuel: 500,
        FieldGoalsMade0to19: 0,
        FieldGoalsMade20to29: 0,
        FieldGoalsMade30to39: 0,
        FieldGoalsMade40to49: 0,
        FieldGoalsMade50Plus: 0,
        FantasyPointsDraftKings: 500,
        AverageDraftPosition: null,
        AverageDraftPositionPPR: null,
        TeamID: 1,
        AverageDraftPositionRookie: null,
        AverageDraftPositionDynasty: null,
        AverageDraftPosition2QB: null,
      };

      const context: PlayerRatingContext = {
        position: 'QB',
        experience: 5,
        age: 26,
        fantasyPoints: 500,
        fantasyPointsPPR: 500,
        gamesPlayed: 17,
        gamesStarted: 17,
      };

      const overall = PlayerRatingService.calculateOverallRating(
        highStats,
        context
      );

      // Should be very high but not exceed 99
      expect(overall).toBeGreaterThanOrEqual(90);
      expect(overall).toBeLessThanOrEqual(99);
    });
  });
});
