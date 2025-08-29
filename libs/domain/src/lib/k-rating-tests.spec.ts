import {
  PlayerRatingService,
  PlayerRatingContext,
} from './player-rating.service';
import { PlayerStats } from './league-setup.service';

describe('Kicker Rating Tests - Real 2024 NFL Data', () => {
  // Helper function to create PlayerRatingContext from PlayerStats
  function createContext(stats: PlayerStats): PlayerRatingContext {
    return {
      position: stats.Position || 'K',
      experience: 2024 - (stats.PlayerID || 2020), // Rough experience calculation
      age: 25, // Default age for testing
      fantasyPoints: stats.FantasyPoints || 0,
      fantasyPointsPPR: stats.FantasyPointsPPR || stats.FantasyPoints || 0,
      gamesPlayed: stats.Played || 0,
      gamesStarted: stats.Started || 0,
    };
  }

  describe('Elite Kickers', () => {
    it('should give Brandon Aubrey elite rating for 192.0 fantasy points', () => {
      const aubreyStats: PlayerStats = {
        PlayerID: 1,
        SeasonType: 1,
        Season: 2024,
        Team: 'DAL',
        Number: 17,
        Name: 'B.Aubrey',
        Position: 'K',
        PositionCategory: 'OFF',
        Played: 17,
        Started: 17,
        FieldGoalsMade: 40,
        FieldGoalsAttempted: 47,
        FieldGoalPercentage: 85.1,
        FieldGoalLongMade: 65,
        FieldGoalsMade0to19: 0,
        FieldGoalsMade20to29: 4,
        FieldGoalsMade30to39: 8,
        FieldGoalsMade40to49: 14,
        FieldGoalsMade50Plus: 14,
        ExtraPointsMade: 30,
        ExtraPointsAttempted: 30,
        FantasyPoints: 192.0,
        FantasyPointsPPR: 192.0,
      };

      const context = createContext(aubreyStats);
      const overall = PlayerRatingService.calculateOverallRating(
        aubreyStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(85);
      expect(overall).toBeLessThanOrEqual(99);
    });

    it('should give Chris Boswell elite rating for 191.0 fantasy points', () => {
      const boswellStats: PlayerStats = {
        PlayerID: 2,
        SeasonType: 1,
        Season: 2024,
        Team: 'PIT',
        Number: 9,
        Name: 'C.Boswell',
        Position: 'K',
        PositionCategory: 'OFF',
        Played: 17,
        Started: 17,
        FieldGoalsMade: 41,
        FieldGoalsAttempted: 44,
        FieldGoalPercentage: 93.2,
        FieldGoalLongMade: 57,
        FieldGoalsMade0to19: 0,
        FieldGoalsMade20to29: 9,
        FieldGoalsMade30to39: 12,
        FieldGoalsMade40to49: 7,
        FieldGoalsMade50Plus: 13,
        ExtraPointsMade: 35,
        ExtraPointsAttempted: 35,
        FantasyPoints: 191.0,
        FantasyPointsPPR: 191.0,
      };

      const context = createContext(boswellStats);
      const overall = PlayerRatingService.calculateOverallRating(
        boswellStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(85);
      expect(overall).toBeLessThanOrEqual(99);
    });
  });

  describe('High-Tier Kickers', () => {
    it('should give Cameron Dicker high rating for 179.0 fantasy points', () => {
      const dickerStats: PlayerStats = {
        PlayerID: 3,
        SeasonType: 1,
        Season: 2024,
        Team: 'LAC',
        Number: 3,
        Name: 'C.Dicker',
        Position: 'K',
        PositionCategory: 'OFF',
        Played: 17,
        Started: 17,
        FieldGoalsMade: 39,
        FieldGoalsAttempted: 42,
        FieldGoalPercentage: 92.9,
        FieldGoalLongMade: 59,
        FieldGoalsMade0to19: 1,
        FieldGoalsMade20to29: 9,
        FieldGoalsMade30to39: 9,
        FieldGoalsMade40to49: 11,
        FieldGoalsMade50Plus: 9,
        ExtraPointsMade: 33,
        ExtraPointsAttempted: 36,
        FantasyPoints: 179.0,
        FantasyPointsPPR: 179.0,
      };

      const context = createContext(dickerStats);
      const overall = PlayerRatingService.calculateOverallRating(
        dickerStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(75);
      expect(overall).toBeLessThanOrEqual(90);
    });

    it("should give Ka'imi Fairbairn high rating for 172.0 fantasy points", () => {
      const fairbairnStats: PlayerStats = {
        PlayerID: 4,
        SeasonType: 1,
        Season: 2024,
        Team: 'HOU',
        Number: 7,
        Name: 'K.Fairbairn',
        Position: 'K',
        PositionCategory: 'OFF',
        Played: 17,
        Started: 17,
        FieldGoalsMade: 36,
        FieldGoalsAttempted: 42,
        FieldGoalPercentage: 85.7,
        FieldGoalLongMade: 59,
        FieldGoalsMade0to19: 0,
        FieldGoalsMade20to29: 8,
        FieldGoalsMade30to39: 11,
        FieldGoalsMade40to49: 4,
        FieldGoalsMade50Plus: 13,
        ExtraPointsMade: 34,
        ExtraPointsAttempted: 36,
        FantasyPoints: 172.0,
        FantasyPointsPPR: 172.0,
      };

      const context = createContext(fairbairnStats);
      const overall = PlayerRatingService.calculateOverallRating(
        fairbairnStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(75);
      expect(overall).toBeLessThanOrEqual(90);
    });
  });

  describe('Mid-Tier Kickers', () => {
    it('should give Jason Sanders solid rating for 166.0 fantasy points', () => {
      const sandersStats: PlayerStats = {
        PlayerID: 5,
        SeasonType: 1,
        Season: 2024,
        Team: 'MIA',
        Number: 7,
        Name: 'J.Sanders',
        Position: 'K',
        PositionCategory: 'OFF',
        Played: 17,
        Started: 17,
        FieldGoalsMade: 37,
        FieldGoalsAttempted: 41,
        FieldGoalPercentage: 90.2,
        FieldGoalLongMade: 57,
        FieldGoalsMade0to19: 0,
        FieldGoalsMade20to29: 7,
        FieldGoalsMade30to39: 13,
        FieldGoalsMade40to49: 5,
        FieldGoalsMade50Plus: 12,
        ExtraPointsMade: 26,
        ExtraPointsAttempted: 28,
        FantasyPoints: 166.0,
        FantasyPointsPPR: 166.0,
      };

      const context = createContext(sandersStats);
      const overall = PlayerRatingService.calculateOverallRating(
        sandersStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(65);
      expect(overall).toBeLessThanOrEqual(85);
    });

    it('should give Chase McLaughlin solid rating for 164.0 fantasy points', () => {
      const mclaughlinStats: PlayerStats = {
        PlayerID: 6,
        SeasonType: 1,
        Season: 2024,
        Team: 'TB',
        Number: 4,
        Name: 'C.McLaughlin',
        Position: 'K',
        PositionCategory: 'OFF',
        Played: 17,
        Started: 17,
        FieldGoalsMade: 30,
        FieldGoalsAttempted: 32,
        FieldGoalPercentage: 93.8,
        FieldGoalLongMade: 56,
        FieldGoalsMade0to19: 0,
        FieldGoalsMade20to29: 11,
        FieldGoalsMade30to39: 7,
        FieldGoalsMade40to49: 4,
        FieldGoalsMade50Plus: 8,
        ExtraPointsMade: 54,
        ExtraPointsAttempted: 56,
        FantasyPoints: 164.0,
        FantasyPointsPPR: 164.0,
      };

      const context = createContext(mclaughlinStats);
      const overall = PlayerRatingService.calculateOverallRating(
        mclaughlinStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(65);
      expect(overall).toBeLessThanOrEqual(85);
    });
  });

  describe('Lower-Tier Kickers', () => {
    it('should give Tyler Bass lower rating for 146.0 fantasy points', () => {
      const bassStats: PlayerStats = {
        PlayerID: 9,
        SeasonType: 1,
        Season: 2024,
        Team: 'BUF',
        Number: 2,
        Name: 'T.Bass',
        Position: 'K',
        PositionCategory: 'OFF',
        Played: 17,
        Started: 17,
        FieldGoalsMade: 24,
        FieldGoalsAttempted: 29,
        FieldGoalPercentage: 82.8,
        FieldGoalLongMade: 61,
        FieldGoalsMade0to19: 0,
        FieldGoalsMade20to29: 6,
        FieldGoalsMade30to39: 7,
        FieldGoalsMade40to49: 7,
        FieldGoalsMade50Plus: 4,
        ExtraPointsMade: 59,
        ExtraPointsAttempted: 64,
        FantasyPoints: 146.0,
        FantasyPointsPPR: 146.0,
      };

      const context = createContext(bassStats);
      const overall = PlayerRatingService.calculateOverallRating(
        bassStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(55);
      expect(overall).toBeLessThanOrEqual(75);
    });

    it('should give Justin Tucker lower rating for 143.0 fantasy points', () => {
      const tuckerStats: PlayerStats = {
        PlayerID: 11,
        SeasonType: 1,
        Season: 2024,
        Team: 'FA',
        Number: 9,
        Name: 'J.Tucker',
        Position: 'K',
        PositionCategory: 'OFF',
        Played: 17,
        Started: 17,
        FieldGoalsMade: 22,
        FieldGoalsAttempted: 30,
        FieldGoalPercentage: 73.3,
        FieldGoalLongMade: 56,
        FieldGoalsMade0to19: 0,
        FieldGoalsMade20to29: 4,
        FieldGoalsMade30to39: 7,
        FieldGoalsMade40to49: 5,
        FieldGoalsMade50Plus: 6,
        ExtraPointsMade: 60,
        ExtraPointsAttempted: 62,
        FantasyPoints: 143.0,
        FantasyPointsPPR: 143.0,
      };

      const context = createContext(tuckerStats);
      const overall = PlayerRatingService.calculateOverallRating(
        tuckerStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(55);
      expect(overall).toBeLessThanOrEqual(75);
    });
  });

  describe('Kicker Rating Scale Validation', () => {
    const testCases = [
      {
        fantasyPoints: 192.0,
        expectedMin: 80,
        expectedMax: 99,
        description: 'Elite (Brandon Aubrey)',
      },
      {
        fantasyPoints: 179.0,
        expectedMin: 70,
        expectedMax: 90,
        description: 'High (Cameron Dicker)',
      },
      {
        fantasyPoints: 166.0,
        expectedMin: 60,
        expectedMax: 85,
        description: 'Mid (Jason Sanders)',
      },
      {
        fantasyPoints: 146.0,
        expectedMin: 50,
        expectedMax: 75,
        description: 'Lower (Tyler Bass)',
      },
    ];

    testCases.forEach(
      ({ fantasyPoints, expectedMin, expectedMax, description }) => {
        it(`should give appropriate rating for ${description}`, () => {
          const stats: PlayerStats = {
            PlayerID: 1,
            SeasonType: 1,
            Season: 2024,
            Team: 'TEAM',
            Number: 1,
            Name: 'Test.K',
            Position: 'K',
            PositionCategory: 'OFF',
            Played: 17,
            Started: 17,
            FieldGoalsMade: 25,
            FieldGoalsAttempted: 30,
            FieldGoalPercentage: 83.3,
            FieldGoalLongMade: 50,
            FieldGoalsMade0to19: 0,
            FieldGoalsMade20to29: 5,
            FieldGoalsMade30to39: 8,
            FieldGoalsMade40to49: 7,
            FieldGoalsMade50Plus: 5,
            ExtraPointsMade: 30,
            ExtraPointsAttempted: 30,
            FantasyPoints: fantasyPoints,
            FantasyPointsPPR: fantasyPoints,
          };

          const context = createContext(stats);
          const overall = PlayerRatingService.calculateOverallRating(
            stats,
            context
          );

          expect(overall).toBeGreaterThanOrEqual(expectedMin);
          expect(overall).toBeLessThanOrEqual(expectedMax);
        });
      }
    );
  });

  describe('Kicker-Specific Rating Factors', () => {
    it('should value accuracy and long field goals properly', () => {
      const accurateKicker: PlayerStats = {
        PlayerID: 1,
        SeasonType: 1,
        Season: 2024,
        Team: 'TEAM',
        Number: 1,
        Name: 'Accurate.K',
        Position: 'K',
        PositionCategory: 'OFF',
        Played: 17,
        Started: 17,
        FieldGoalsMade: 35,
        FieldGoalsAttempted: 38,
        FieldGoalPercentage: 92.1,
        FieldGoalLongMade: 58,
        FieldGoalsMade0to19: 0,
        FieldGoalsMade20to29: 8,
        FieldGoalsMade30to39: 10,
        FieldGoalsMade40to49: 8,
        FieldGoalsMade50Plus: 9,
        ExtraPointsMade: 35,
        ExtraPointsAttempted: 35,
        FantasyPoints: 175.0,
        FantasyPointsPPR: 175.0,
      };

      const inaccurateKicker: PlayerStats = {
        PlayerID: 2,
        SeasonType: 1,
        Season: 2024,
        Team: 'TEAM',
        Number: 2,
        Name: 'Inaccurate.K',
        Position: 'K',
        PositionCategory: 'OFF',
        Played: 17,
        Started: 17,
        FieldGoalsMade: 25,
        FieldGoalsAttempted: 38,
        FieldGoalPercentage: 65.8,
        FieldGoalLongMade: 52,
        FieldGoalsMade0to19: 0,
        FieldGoalsMade20to29: 6,
        FieldGoalsMade30to39: 8,
        FieldGoalsMade40to49: 6,
        FieldGoalsMade50Plus: 5,
        ExtraPointsMade: 35,
        ExtraPointsAttempted: 38,
        FantasyPoints: 140.0,
        FantasyPointsPPR: 140.0,
      };

      const accurateContext = createContext(accurateKicker);
      const inaccurateContext = createContext(inaccurateKicker);

      const accurateRating = PlayerRatingService.calculateOverallRating(
        accurateKicker,
        accurateContext
      );
      const inaccurateRating = PlayerRatingService.calculateOverallRating(
        inaccurateKicker,
        inaccurateContext
      );

      // Accurate kicker should have higher rating
      expect(accurateRating).toBeGreaterThan(inaccurateRating);
    });
  });
});

