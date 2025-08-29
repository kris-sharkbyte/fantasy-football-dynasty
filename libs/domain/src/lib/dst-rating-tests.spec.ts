import {
  PlayerRatingService,
  PlayerRatingContext,
} from './player-rating.service';
import { PlayerStats } from './league-setup.service';

describe('Defense & Special Teams Rating Tests - Real 2024 NFL Data', () => {
  // Helper function to create PlayerRatingContext from PlayerStats
  function createContext(stats: PlayerStats): PlayerRatingContext {
    return {
      position: stats.Position || 'DEF',
      experience: 2024 - (stats.PlayerID || 2020), // Rough experience calculation
      age: 25, // Default age for testing
      fantasyPoints: stats.FantasyPoints || 0,
      fantasyPointsPPR: stats.FantasyPointsPPR || stats.FantasyPoints || 0,
      gamesPlayed: stats.Played || 0,
      gamesStarted: stats.Started || 0,
    };
  }

  describe('Elite Defenses', () => {
    it('should give Denver Broncos elite rating for 179.0 fantasy points', () => {
      const broncosStats: PlayerStats = {
        PlayerID: 1,
        SeasonType: 1,
        Season: 2024,
        Team: 'DEN',
        Number: 0,
        Name: 'Denver Broncos',
        Position: 'DEF',
        PositionCategory: 'DEF',
        Played: 17,
        Started: 17,
        Sacks: 63,
        Interceptions: 15,
        FumblesRecovered: 9,
        FumblesForced: 12,
        DefensiveTouchdowns: 5,
        Safeties: 2,
        SpecialTeamsTouchdowns: 0,
        FantasyPoints: 179.0,
        FantasyPointsPPR: 179.0,
      };

      const context = createContext(broncosStats);
      const overall = PlayerRatingService.calculateOverallRating(
        broncosStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(85);
      expect(overall).toBeLessThanOrEqual(99);
    });

    it('should give Minnesota Vikings elite rating for 162.0 fantasy points', () => {
      const vikingsStats: PlayerStats = {
        PlayerID: 2,
        SeasonType: 1,
        Season: 2024,
        Team: 'MIN',
        Number: 0,
        Name: 'Minnesota Vikings',
        Position: 'DEF',
        PositionCategory: 'DEF',
        Played: 17,
        Started: 17,
        Sacks: 49,
        Interceptions: 24,
        FumblesRecovered: 9,
        FumblesForced: 10,
        DefensiveTouchdowns: 3,
        Safeties: 0,
        SpecialTeamsTouchdowns: 0,
        FantasyPoints: 162.0,
        FantasyPointsPPR: 162.0,
      };

      const context = createContext(vikingsStats);
      const overall = PlayerRatingService.calculateOverallRating(
        vikingsStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(80);
      expect(overall).toBeLessThanOrEqual(95);
    });
  });

  describe('High-Tier Defenses', () => {
    it('should give Green Bay Packers high rating for 148.0 fantasy points', () => {
      const packersStats: PlayerStats = {
        PlayerID: 3,
        SeasonType: 1,
        Season: 2024,
        Team: 'GB',
        Number: 0,
        Name: 'Green Bay Packers',
        Position: 'DEF',
        PositionCategory: 'DEF',
        Played: 17,
        Started: 17,
        Sacks: 45,
        Interceptions: 17,
        FumblesRecovered: 14,
        FumblesForced: 15,
        DefensiveTouchdowns: 1,
        Safeties: 0,
        SpecialTeamsTouchdowns: 0,
        FantasyPoints: 148.0,
        FantasyPointsPPR: 148.0,
      };

      const context = createContext(packersStats);
      const overall = PlayerRatingService.calculateOverallRating(
        packersStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(75);
      expect(overall).toBeLessThanOrEqual(90);
    });

    it('should give Pittsburgh Steelers high rating for 146.0 fantasy points', () => {
      const steelersStats: PlayerStats = {
        PlayerID: 4,
        SeasonType: 1,
        Season: 2024,
        Team: 'PIT',
        Number: 0,
        Name: 'Pittsburgh Steelers',
        Position: 'DEF',
        PositionCategory: 'DEF',
        Played: 17,
        Started: 17,
        Sacks: 40,
        Interceptions: 17,
        FumblesRecovered: 16,
        FumblesForced: 18,
        DefensiveTouchdowns: 1,
        Safeties: 0,
        SpecialTeamsTouchdowns: 1,
        FantasyPoints: 146.0,
        FantasyPointsPPR: 146.0,
      };

      const context = createContext(steelersStats);
      const overall = PlayerRatingService.calculateOverallRating(
        steelersStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(75);
      expect(overall).toBeLessThanOrEqual(90);
    });
  });

  describe('Mid-Tier Defenses', () => {
    it('should give Houston Texans solid rating for 139.0 fantasy points', () => {
      const texansStats: PlayerStats = {
        PlayerID: 5,
        SeasonType: 1,
        Season: 2024,
        Team: 'HOU',
        Number: 0,
        Name: 'Houston Texans',
        Position: 'DEF',
        PositionCategory: 'DEF',
        Played: 17,
        Started: 17,
        Sacks: 49,
        Interceptions: 19,
        FumblesRecovered: 9,
        FumblesForced: 10,
        DefensiveTouchdowns: 3,
        Safeties: 1,
        SpecialTeamsTouchdowns: 0,
        FantasyPoints: 139.0,
        FantasyPointsPPR: 139.0,
      };

      const context = createContext(texansStats);
      const overall = PlayerRatingService.calculateOverallRating(
        texansStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(65);
      expect(overall).toBeLessThanOrEqual(85);
    });

    it('should give Seattle Seahawks solid rating for 136.0 fantasy points', () => {
      const seahawksStats: PlayerStats = {
        PlayerID: 6,
        SeasonType: 1,
        Season: 2024,
        Team: 'SEA',
        Number: 0,
        Name: 'Seattle Seahawks',
        Position: 'DEF',
        PositionCategory: 'DEF',
        Played: 17,
        Started: 17,
        Sacks: 45,
        Interceptions: 13,
        FumblesRecovered: 5,
        FumblesForced: 14,
        DefensiveTouchdowns: 4,
        Safeties: 1,
        SpecialTeamsTouchdowns: 1,
        FantasyPoints: 136.0,
        FantasyPointsPPR: 136.0,
      };

      const context = createContext(seahawksStats);
      const overall = PlayerRatingService.calculateOverallRating(
        seahawksStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(65);
      expect(overall).toBeLessThanOrEqual(85);
    });
  });

  describe('Lower-Tier Defenses', () => {
    it('should give Carolina Panthers lower rating for 41.0 fantasy points', () => {
      const panthersStats: PlayerStats = {
        PlayerID: 32,
        SeasonType: 1,
        Season: 2024,
        Team: 'CAR',
        Number: 0,
        Name: 'Carolina Panthers',
        Position: 'DEF',
        PositionCategory: 'DEF',
        Played: 17,
        Started: 17,
        Sacks: 32,
        Interceptions: 9,
        FumblesRecovered: 8,
        FumblesForced: 8,
        DefensiveTouchdowns: 0,
        Safeties: 0,
        SpecialTeamsTouchdowns: 0,
        FantasyPoints: 41.0,
        FantasyPointsPPR: 41.0,
      };

      const context = createContext(panthersStats);
      const overall = PlayerRatingService.calculateOverallRating(
        panthersStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(45);
      expect(overall).toBeLessThanOrEqual(70);
    });

    it('should give New England Patriots lower rating for 63.0 fantasy points', () => {
      const patriotsStats: PlayerStats = {
        PlayerID: 31,
        SeasonType: 1,
        Season: 2024,
        Team: 'NE',
        Number: 0,
        Name: 'New England Patriots',
        Position: 'DEF',
        PositionCategory: 'DEF',
        Played: 17,
        Started: 17,
        Sacks: 28,
        Interceptions: 7,
        FumblesRecovered: 5,
        FumblesForced: 9,
        DefensiveTouchdowns: 1,
        Safeties: 0,
        SpecialTeamsTouchdowns: 0,
        FantasyPoints: 63.0,
        FantasyPointsPPR: 63.0,
      };

      const context = createContext(patriotsStats);
      const overall = PlayerRatingService.calculateOverallRating(
        patriotsStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(50);
      expect(overall).toBeLessThanOrEqual(75);
    });
  });

  describe('DST Rating Scale Validation', () => {
    const testCases = [
      {
        fantasyPoints: 179.0,
        expectedMin: 80,
        expectedMax: 99,
        description: 'Elite (Denver Broncos)',
      },
      {
        fantasyPoints: 148.0,
        expectedMin: 70,
        expectedMax: 90,
        description: 'High (Green Bay Packers)',
      },
      {
        fantasyPoints: 139.0,
        expectedMin: 60,
        expectedMax: 85,
        description: 'Mid (Houston Texans)',
      },
      {
        fantasyPoints: 63.0,
        expectedMin: 45,
        expectedMax: 75,
        description: 'Lower (New England Patriots)',
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
            Number: 0,
            Name: 'Test Defense',
            Position: 'DEF',
            PositionCategory: 'DEF',
            Played: 17,
            Started: 17,
            Sacks: 35,
            Interceptions: 12,
            FumblesRecovered: 8,
            FumblesForced: 10,
            DefensiveTouchdowns: 2,
            Safeties: 1,
            SpecialTeamsTouchdowns: 0,
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

  describe('DST-Specific Rating Factors', () => {
    it('should value turnovers and defensive TDs properly', () => {
      const turnoverDefense: PlayerStats = {
        PlayerID: 1,
        SeasonType: 1,
        Season: 2024,
        Team: 'TEAM',
        Number: 0,
        Name: 'Turnover Defense',
        Position: 'DEF',
        PositionCategory: 'DEF',
        Played: 17,
        Started: 17,
        Sacks: 40,
        Interceptions: 20,
        FumblesRecovered: 12,
        FumblesForced: 15,
        DefensiveTouchdowns: 4,
        Safeties: 2,
        SpecialTeamsTouchdowns: 1,
        FantasyPoints: 160.0,
        FantasyPointsPPR: 160.0,
      };

      const sackDefense: PlayerStats = {
        PlayerID: 2,
        SeasonType: 1,
        Season: 2024,
        Team: 'TEAM',
        Number: 0,
        Name: 'Sack Defense',
        Position: 'DEF',
        PositionCategory: 'DEF',
        Played: 17,
        Started: 17,
        Sacks: 60,
        Interceptions: 8,
        FumblesRecovered: 5,
        FumblesForced: 8,
        DefensiveTouchdowns: 1,
        Safeties: 0,
        SpecialTeamsTouchdowns: 0,
        FantasyPoints: 120.0,
        FantasyPointsPPR: 120.0,
      };

      const turnoverContext = createContext(turnoverDefense);
      const sackContext = createContext(sackDefense);

      const turnoverRating = PlayerRatingService.calculateOverallRating(
        turnoverDefense,
        turnoverContext
      );
      const sackRating = PlayerRatingService.calculateOverallRating(
        sackDefense,
        sackContext
      );

      // Turnover-heavy defense should have higher rating
      expect(turnoverRating).toBeGreaterThan(sackRating);
    });
  });
});

