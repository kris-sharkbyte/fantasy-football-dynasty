import {
  PlayerRatingService,
  PlayerRatingContext,
} from './player-rating.service';
import { PlayerStats } from './league-setup.service';

describe('TE Rating Tests - Real 2024 NFL Data', () => {
  // Helper function to create PlayerRatingContext from PlayerStats
  function createContext(stats: PlayerStats): PlayerRatingContext {
    return {
      position: stats.Position || 'TE',
      experience: 2024 - (stats.PlayerID || 2020), // Rough experience calculation
      age: 25, // Default age for testing
      fantasyPoints: stats.FantasyPoints || 0,
      fantasyPointsPPR: stats.FantasyPointsPPR || stats.FantasyPoints || 0,
      gamesPlayed: stats.Played || 0,
      gamesStarted: stats.Started || 0,
    };
  }

  describe('Elite TEs', () => {
    it('should give Travis Kelce elite rating for 98.4 fantasy points', () => {
      const kelceStats: PlayerStats = {
        PlayerID: 202,
        SeasonType: 1,
        Season: 2024,
        Team: 'KC',
        Number: 87,
        Name: 'T.Kelce',
        Position: 'TE',
        PositionCategory: 'OFF',
        Played: 16,
        Started: 16,
        ReceivingTargets: 133,
        Receptions: 97,
        ReceivingYards: 823,
        ReceivingTouchdowns: 3,
        ReceivingYardsPerReception: 8.5,
        ReceivingLong: 38,
        RushingAttempts: 1,
        RushingYards: 1,
        RushingTouchdowns: 0,
        FumblesLost: 1,
        FantasyPoints: 98.4,
        FantasyPointsPPR: 98.4,
      };

      const context = createContext(kelceStats);
      const overall = PlayerRatingService.calculateOverallRating(
        kelceStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(85);
      expect(overall).toBeLessThanOrEqual(99);
    });

    it('should give Mark Andrews elite rating for 133.8 fantasy points', () => {
      const andrewsStats: PlayerStats = {
        PlayerID: 207,
        SeasonType: 1,
        Season: 2024,
        Team: 'BAL',
        Number: 89,
        Name: 'M.Andrews',
        Position: 'TE',
        PositionCategory: 'OFF',
        Played: 17,
        Started: 17,
        ReceivingTargets: 69,
        Receptions: 55,
        ReceivingYards: 673,
        ReceivingTouchdowns: 11,
        ReceivingYardsPerReception: 12.2,
        ReceivingLong: 67,
        RushingAttempts: 4,
        RushingYards: 5,
        RushingTouchdowns: 0,
        FumblesLost: 0,
        FantasyPoints: 133.8,
        FantasyPointsPPR: 133.8,
      };

      const context = createContext(andrewsStats);
      const overall = PlayerRatingService.calculateOverallRating(
        andrewsStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(90);
      expect(overall).toBeLessThanOrEqual(99);
    });

    it('should give Brock Bowers elite rating for 150.7 fantasy points', () => {
      const bowersStats: PlayerStats = {
        PlayerID: 210,
        SeasonType: 1,
        Season: 2024,
        Team: 'LV',
        Number: 85,
        Name: 'B.Bowers',
        Position: 'TE',
        PositionCategory: 'OFF',
        Played: 17,
        Started: 17,
        ReceivingTargets: 153,
        Receptions: 112,
        ReceivingYards: 1194,
        ReceivingTouchdowns: 5,
        ReceivingYardsPerReception: 10.7,
        ReceivingLong: 57,
        RushingAttempts: 5,
        RushingYards: 13,
        RushingTouchdowns: 0,
        FumblesLost: 0,
        FantasyPoints: 150.7,
        FantasyPointsPPR: 150.7,
      };

      const context = createContext(bowersStats);
      const overall = PlayerRatingService.calculateOverallRating(
        bowersStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(90);
      expect(overall).toBeLessThanOrEqual(99);
    });
  });

  describe('High-Tier TEs', () => {
    it('should give Trey McBride high rating for 138.8 fantasy points', () => {
      const mcbrideStats: PlayerStats = {
        PlayerID: 209,
        SeasonType: 1,
        Season: 2024,
        Team: 'ARI',
        Number: 85,
        Name: 'T.McBride',
        Position: 'TE',
        PositionCategory: 'OFF',
        Played: 16,
        Started: 16,
        ReceivingTargets: 147,
        Receptions: 111,
        ReceivingYards: 1146,
        ReceivingTouchdowns: 2,
        ReceivingYardsPerReception: 10.3,
        ReceivingLong: 37,
        RushingAttempts: 1,
        RushingYards: 2,
        RushingTouchdowns: 1,
        FumblesLost: 0,
        FantasyPoints: 138.8,
        FantasyPointsPPR: 138.8,
      };

      const context = createContext(mcbrideStats);
      const overall = PlayerRatingService.calculateOverallRating(
        mcbrideStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(80);
      expect(overall).toBeLessThanOrEqual(95);
    });

    it('should give Sam LaPorta high rating for 114.6 fantasy points', () => {
      const laportaStats: PlayerStats = {
        PlayerID: 206,
        SeasonType: 1,
        Season: 2024,
        Team: 'DET',
        Number: 87,
        Name: 'S.LaPorta',
        Position: 'TE',
        PositionCategory: 'OFF',
        Played: 16,
        Started: 16,
        ReceivingTargets: 83,
        Receptions: 60,
        ReceivingYards: 726,
        ReceivingTouchdowns: 7,
        ReceivingYardsPerReception: 12.1,
        ReceivingLong: 52,
        RushingAttempts: 0,
        RushingYards: 0,
        RushingTouchdowns: 0,
        FumblesLost: 0,
        FantasyPoints: 114.6,
        FantasyPointsPPR: 114.6,
      };

      const context = createContext(laportaStats);
      const overall = PlayerRatingService.calculateOverallRating(
        laportaStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(75);
      expect(overall).toBeLessThanOrEqual(90);
    });
  });

  describe('Mid-Tier TEs', () => {
    it('should give Dalton Kincaid solid rating for 56.8 fantasy points', () => {
      const kincaidStats: PlayerStats = {
        PlayerID: 184,
        SeasonType: 1,
        Season: 2024,
        Team: 'BUF',
        Number: 86,
        Name: 'D.Kincaid',
        Position: 'TE',
        PositionCategory: 'OFF',
        Played: 13,
        Started: 13,
        ReceivingTargets: 75,
        Receptions: 44,
        ReceivingYards: 448,
        ReceivingTouchdowns: 2,
        ReceivingYardsPerReception: 10.2,
        ReceivingLong: 29,
        RushingAttempts: 0,
        RushingYards: 0,
        RushingTouchdowns: 0,
        FumblesLost: 0,
        FantasyPoints: 56.8,
        FantasyPointsPPR: 56.8,
      };

      const context = createContext(kincaidStats);
      const overall = PlayerRatingService.calculateOverallRating(
        kincaidStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(60);
      expect(overall).toBeLessThanOrEqual(80);
    });

    it('should give Dallas Goedert solid rating for 61.6 fantasy points', () => {
      const goedertStats: PlayerStats = {
        PlayerID: 186,
        SeasonType: 1,
        Season: 2024,
        Team: 'PHI',
        Number: 88,
        Name: 'D.Goedert',
        Position: 'TE',
        PositionCategory: 'OFF',
        Played: 10,
        Started: 10,
        ReceivingTargets: 52,
        Receptions: 42,
        ReceivingYards: 496,
        ReceivingTouchdowns: 2,
        ReceivingYardsPerReception: 11.8,
        ReceivingLong: 61,
        RushingAttempts: 0,
        RushingYards: 0,
        RushingTouchdowns: 0,
        FumblesLost: 0,
        FantasyPoints: 61.6,
        FantasyPointsPPR: 61.6,
      };

      const context = createContext(goedertStats);
      const overall = PlayerRatingService.calculateOverallRating(
        goedertStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(60);
      expect(overall).toBeLessThanOrEqual(80);
    });
  });

  describe('Lower-Tier TEs', () => {
    it('should give Luke Musgrave lower rating for 4.5 fantasy points', () => {
      const musgraveStats: PlayerStats = {
        PlayerID: 124,
        SeasonType: 1,
        Season: 2024,
        Team: 'GB',
        Number: 88,
        Name: 'L.Musgrave',
        Position: 'TE',
        PositionCategory: 'OFF',
        Played: 7,
        Started: 7,
        ReceivingTargets: 10,
        Receptions: 7,
        ReceivingYards: 45,
        ReceivingTouchdowns: 0,
        ReceivingYardsPerReception: 6.4,
        ReceivingLong: 19,
        RushingAttempts: 0,
        RushingYards: 0,
        RushingTouchdowns: 0,
        FumblesLost: 0,
        FantasyPoints: 4.5,
        FantasyPointsPPR: 4.5,
      };

      const context = createContext(musgraveStats);
      const overall = PlayerRatingService.calculateOverallRating(
        musgraveStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(40);
      expect(overall).toBeLessThanOrEqual(65);
    });
  });

  describe('TE Rating Scale Validation', () => {
    const testCases = [
      {
        fantasyPoints: 150.7,
        expectedMin: 85,
        expectedMax: 99,
        description: 'Elite (Brock Bowers)',
      },
      {
        fantasyPoints: 98.4,
        expectedMin: 80,
        expectedMax: 95,
        description: 'High (Travis Kelce)',
      },
      {
        fantasyPoints: 56.8,
        expectedMin: 55,
        expectedMax: 80,
        description: 'Mid (Dalton Kincaid)',
      },
      {
        fantasyPoints: 4.5,
        expectedMin: 35,
        expectedMax: 65,
        description: 'Lower (Luke Musgrave)',
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
            Number: 88,
            Name: 'Test.TE',
            Position: 'TE',
            PositionCategory: 'OFF',
            Played: 16,
            Started: 16,
            ReceivingTargets: 50,
            Receptions: 30,
            ReceivingYards: 300,
            ReceivingTouchdowns: 2,
            ReceivingYardsPerReception: 10.0,
            ReceivingLong: 25,
            RushingAttempts: 0,
            RushingYards: 0,
            RushingTouchdowns: 0,
            FumblesLost: 0,
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

  describe('TE-Specific Rating Factors', () => {
    it('should value receiving ability properly', () => {
      const receivingTE: PlayerStats = {
        PlayerID: 1,
        SeasonType: 1,
        Season: 2024,
        Team: 'TEAM',
        Number: 88,
        Name: 'Receiving.TE',
        Position: 'TE',
        PositionCategory: 'OFF',
        Played: 16,
        Started: 16,
        ReceivingTargets: 100,
        Receptions: 70,
        ReceivingYards: 800,
        ReceivingTouchdowns: 8,
        ReceivingYardsPerReception: 11.4,
        ReceivingLong: 40,
        RushingAttempts: 0,
        RushingYards: 0,
        RushingTouchdowns: 0,
        FumblesLost: 0,
        FantasyPoints: 120.0,
        FantasyPointsPPR: 120.0,
      };

      const blockingTE: PlayerStats = {
        PlayerID: 2,
        SeasonType: 1,
        Season: 2024,
        Team: 'TEAM',
        Number: 89,
        Name: 'Blocking.TE',
        Position: 'TE',
        PositionCategory: 'OFF',
        Played: 16,
        Started: 16,
        ReceivingTargets: 20,
        Receptions: 15,
        ReceivingYards: 150,
        ReceivingTouchdowns: 1,
        ReceivingYardsPerReception: 10.0,
        ReceivingLong: 20,
        RushingAttempts: 0,
        RushingYards: 0,
        RushingTouchdowns: 0,
        FumblesLost: 0,
        FantasyPoints: 25.0,
        FantasyPointsPPR: 25.0,
      };

      const receivingContext = createContext(receivingTE);
      const blockingContext = createContext(blockingTE);

      const receivingRating = PlayerRatingService.calculateOverallRating(
        receivingTE,
        receivingContext
      );
      const blockingRating = PlayerRatingService.calculateOverallRating(
        blockingTE,
        blockingContext
      );

      // Receiving TE should have higher rating
      expect(receivingRating).toBeGreaterThan(blockingRating);
    });
  });
});

