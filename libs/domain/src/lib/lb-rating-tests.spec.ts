import { PlayerRatingService, PlayerRatingContext } from './player-rating.service';
import { PlayerStats } from './league-setup.service';

describe('LB Rating Tests', () => {
  // Helper function to create context from PlayerStats
  const createContext = (stats: Partial<PlayerStats>): PlayerRatingContext => ({
    position: 'LB',
    experience: 3, // Default experience
    age: 25, // Default age
    fantasyPoints: stats.FantasyPoints || 0,
    fantasyPointsPPR: stats.FantasyPointsPPR || 0,
    gamesPlayed: stats.Played || 0,
    gamesStarted: stats.Started || 0,
  });

  describe('Elite LB Players', () => {
    it('should rate Zaire Franklin as elite (173 tackles, 280.5 fantasy points)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 280.5,
        FantasyPointsPPR: 280.5,
        Played: 17,
        Started: 17,
        Tackles: 93,
        Assists: 80,
        Sacks: 3.5,
        PassesDefended: 6,
        Interceptions: 2,
        FumblesForced: 5,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(90);
      expect(overall).toBeLessThanOrEqual(99);
    });

    it('should rate Zack Baun as elite (150 tackles, 258.3 fantasy points)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 258.3,
        FantasyPointsPPR: 258.3,
        Played: 16,
        Started: 16,
        Tackles: 92,
        Assists: 58,
        Sacks: 3.5,
        PassesDefended: 4,
        Interceptions: 1,
        FumblesForced: 5,
        FumblesRecovered: 1,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(88);
      expect(overall).toBeLessThanOrEqual(95);
    });

    it('should rate Robert Spillane as elite (158 tackles, 240.5 fantasy points, 2 INTs)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 240.5,
        FantasyPointsPPR: 240.5,
        Played: 17,
        Started: 17,
        Tackles: 91,
        Assists: 67,
        Sacks: 2,
        PassesDefended: 7,
        Interceptions: 2,
        FumblesForced: 0,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(86);
      expect(overall).toBeLessThanOrEqual(93);
    });
  });

  describe('High-Tier LB Players', () => {
    it('should rate Kaden Elliss as high-tier (150 tackles, 233.6 fantasy points, 5 sacks)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 233.6,
        FantasyPointsPPR: 233.6,
        Played: 17,
        Started: 17,
        Tackles: 84,
        Assists: 66,
        Sacks: 5,
        PassesDefended: 3,
        Interceptions: 1,
        FumblesForced: 1,
        FumblesRecovered: 1,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(84);
      expect(overall).toBeLessThanOrEqual(92);
    });

    it('should rate Jordyn Brooks as high-tier (143 tackles, 228.7 fantasy points)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 228.7,
        FantasyPointsPPR: 228.7,
        Played: 17,
        Started: 17,
        Tackles: 86,
        Assists: 57,
        Sacks: 3,
        PassesDefended: 6,
        Interceptions: 0,
        FumblesForced: 0,
        FumblesRecovered: 2,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(82);
      expect(overall).toBeLessThanOrEqual(90);
    });

    it('should rate Jamien Sherwood as high-tier (154 tackles, 224.8 fantasy points)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 224.8,
        FantasyPointsPPR: 224.8,
        Played: 17,
        Started: 17,
        Tackles: 95,
        Assists: 59,
        Sacks: 2,
        PassesDefended: 3,
        Interceptions: 0,
        FumblesForced: 0,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(82);
      expect(overall).toBeLessThanOrEqual(90);
    });
  });

  describe('Mid-Tier LB Players', () => {
    it('should rate T.J. Edwards as mid-tier (129 tackles, 224.0 fantasy points, 4 sacks)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 224.0,
        FantasyPointsPPR: 224.0,
        Played: 17,
        Started: 17,
        Tackles: 79,
        Assists: 50,
        Sacks: 4,
        PassesDefended: 3,
        Interceptions: 1,
        FumblesForced: 1,
        FumblesRecovered: 2,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(80);
      expect(overall).toBeLessThanOrEqual(88);
    });

    it('should rate Lavonte David as mid-tier (122 tackles, 223.3 fantasy points, 5.5 sacks)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 223.3,
        FantasyPointsPPR: 223.3,
        Played: 17,
        Started: 17,
        Tackles: 76,
        Assists: 46,
        Sacks: 5.5,
        PassesDefended: 6,
        Interceptions: 1,
        FumblesForced: 3,
        FumblesRecovered: 1,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(80);
      expect(overall).toBeLessThanOrEqual(88);
    });

    it('should rate Andrew Van Ginkel as mid-tier (79 tackles, 223.2 fantasy points, 11.5 sacks, 2 TDs)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 223.2,
        FantasyPointsPPR: 223.2,
        Played: 17,
        Started: 17,
        Tackles: 50,
        Assists: 29,
        Sacks: 11.5,
        PassesDefended: 6,
        Interceptions: 2,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 2,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(80);
      expect(overall).toBeLessThanOrEqual(88);
    });
  });

  describe('Lower-Tier LB Players', () => {
    it('should rate Quincy Williams as lower-tier (116 tackles, 220.0 fantasy points, 2 sacks)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 220.0,
        FantasyPointsPPR: 220.0,
        Played: 17,
        Started: 17,
        Tackles: 74,
        Assists: 42,
        Sacks: 2,
        PassesDefended: 4,
        Interceptions: 0,
        FumblesForced: 4,
        FumblesRecovered: 3,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(78);
      expect(overall).toBeLessThanOrEqual(86);
    });

    it('should rate Germaine Pratt as lower-tier (143 tackles, 215.2 fantasy points, 2 INTs)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 215.2,
        FantasyPointsPPR: 215.2,
        Played: 17,
        Started: 17,
        Tackles: 80,
        Assists: 63,
        Sacks: 0,
        PassesDefended: 6,
        Interceptions: 2,
        FumblesForced: 2,
        FumblesRecovered: 2,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(76);
      expect(overall).toBeLessThanOrEqual(84);
    });

    it('should rate Fred Warner as lower-tier (131 tackles, 214.8 fantasy points, 2 INTs, 1 TD)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 214.8,
        FantasyPointsPPR: 214.8,
        Played: 17,
        Started: 17,
        Tackles: 76,
        Assists: 55,
        Sacks: 1,
        PassesDefended: 7,
        Interceptions: 2,
        FumblesForced: 4,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 1,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(76);
      expect(overall).toBeLessThanOrEqual(84);
    });
  });

  describe('Rating Scale Validation', () => {
    it('should maintain proper rating scale across different performance levels', () => {
      // Elite performer
      const eliteStats: Partial<PlayerStats> = {
        FantasyPoints: 280.5,
        FantasyPointsPPR: 280.5,
        Played: 17,
        Started: 17,
        Tackles: 93,
        Assists: 80,
        Sacks: 3.5,
        PassesDefended: 6,
        Interceptions: 2,
        FumblesForced: 5,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      // Mid-tier performer
      const midStats: Partial<PlayerStats> = {
        FantasyPoints: 220.0,
        FantasyPointsPPR: 220.0,
        Played: 17,
        Started: 17,
        Tackles: 70,
        Assists: 50,
        Sacks: 3,
        PassesDefended: 4,
        Interceptions: 1,
        FumblesForced: 2,
        FumblesRecovered: 1,
        DefensiveTouchdowns: 0,
      };

      // Lower-tier performer
      const lowerStats: Partial<PlayerStats> = {
        FantasyPoints: 150.0,
        FantasyPointsPPR: 150.0,
        Played: 16,
        Started: 16,
        Tackles: 50,
        Assists: 35,
        Sacks: 2,
        PassesDefended: 2,
        Interceptions: 0,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const eliteContext = createContext(eliteStats);
      const midContext = createContext(midStats);
      const lowerContext = createContext(lowerStats);

      const eliteRating = PlayerRatingService.calculateOverallRating(eliteStats as PlayerStats, eliteContext);
      const midRating = PlayerRatingService.calculateOverallRating(midStats as PlayerStats, midContext);
      const lowerRating = PlayerRatingService.calculateOverallRating(lowerStats as PlayerStats, lowerContext);

      expect(eliteRating).toBeGreaterThan(midRating);
      expect(midRating).toBeGreaterThan(lowerRating);
      expect(eliteRating - midRating).toBeGreaterThan(5);
      expect(midRating - lowerRating).toBeGreaterThan(5);
    });
  });

  describe('Tackle Production Impact', () => {
    it('should heavily weight tackle production for LB ratings', () => {
      // High tackle producer
      const highTackleStats: Partial<PlayerStats> = {
        FantasyPoints: 250.0,
        FantasyPointsPPR: 250.0,
        Played: 17,
        Started: 17,
        Tackles: 90,
        Assists: 60,
        Sacks: 3,
        PassesDefended: 4,
        Interceptions: 1,
        FumblesForced: 2,
        FumblesRecovered: 1,
        DefensiveTouchdowns: 0,
      };

      // Low tackle producer with similar sacks
      const lowTackleStats: Partial<PlayerStats> = {
        FantasyPoints: 180.0,
        FantasyPointsPPR: 180.0,
        Played: 17,
        Started: 17,
        Tackles: 50,
        Assists: 35,
        Sacks: 3,
        PassesDefended: 4,
        Interceptions: 1,
        FumblesForced: 2,
        FumblesRecovered: 1,
        DefensiveTouchdowns: 0,
      };

      const highTackleContext = createContext(highTackleStats);
      const lowTackleContext = createContext(lowTackleStats);

      const highTackleRating = PlayerRatingService.calculateOverallRating(highTackleStats as PlayerStats, highTackleContext);
      const lowTackleRating = PlayerRatingService.calculateOverallRating(lowTackleStats as PlayerStats, lowTackleContext);

      expect(highTackleRating).toBeGreaterThan(lowTackleRating);
      expect(highTackleRating - lowTackleRating).toBeGreaterThan(3);
    });
  });

  describe('Sack Production Impact', () => {
    it('should value sack production for LB ratings', () => {
      // High sack producer
      const highSackStats: Partial<PlayerStats> = {
        FantasyPoints: 220.0,
        FantasyPointsPPR: 220.0,
        Played: 17,
        Started: 17,
        Tackles: 70,
        Assists: 50,
        Sacks: 10,
        PassesDefended: 4,
        Interceptions: 1,
        FumblesForced: 2,
        FumblesRecovered: 1,
        DefensiveTouchdowns: 0,
      };

      // Low sack producer with similar tackles
      const lowSackStats: Partial<PlayerStats> = {
        FantasyPoints: 200.0,
        FantasyPointsPPR: 200.0,
        Played: 17,
        Started: 17,
        Tackles: 70,
        Assists: 50,
        Sacks: 2,
        PassesDefended: 4,
        Interceptions: 1,
        FumblesForced: 2,
        FumblesRecovered: 1,
        DefensiveTouchdowns: 0,
      };

      const highSackContext = createContext(highSackStats);
      const lowSackContext = createContext(lowSackStats);

      const highSackRating = PlayerRatingService.calculateOverallRating(highSackStats as PlayerStats, highSackContext);
      const lowSackRating = PlayerRatingService.calculateOverallRating(lowSackStats as PlayerStats, lowSackContext);

      expect(highSackRating).toBeGreaterThan(lowSackRating);
      expect(highSackRating - lowSackRating).toBeGreaterThan(2);
    });
  });

  describe('Big Play Impact', () => {
    it('should reward big plays (INTs, TDs, FFs) for LB ratings', () => {
      // Big play producer
      const bigPlayStats: Partial<PlayerStats> = {
        FantasyPoints: 230.0,
        FantasyPointsPPR: 230.0,
        Played: 17,
        Started: 17,
        Tackles: 75,
        Assists: 50,
        Sacks: 4,
        PassesDefended: 5,
        Interceptions: 2,
        FumblesForced: 3,
        FumblesRecovered: 1,
        DefensiveTouchdowns: 1,
      };

      // No big plays with similar base stats
      const noBigPlayStats: Partial<PlayerStats> = {
        FantasyPoints: 200.0,
        FantasyPointsPPR: 200.0,
        Played: 17,
        Started: 17,
        Tackles: 75,
        Assists: 50,
        Sacks: 4,
        PassesDefended: 5,
        Interceptions: 0,
        FumblesForced: 0,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const bigPlayContext = createContext(bigPlayStats);
      const noBigPlayContext = createContext(noBigPlayStats);

      const bigPlayRating = PlayerRatingService.calculateOverallRating(bigPlayStats as PlayerStats, bigPlayContext);
      const noBigPlayRating = PlayerRatingService.calculateOverallRating(noBigPlayStats as PlayerStats, noBigPlayContext);

      expect(bigPlayRating).toBeGreaterThan(noBigPlayRating);
      expect(bigPlayRating - noBigPlayRating).toBeGreaterThan(2);
    });
  });

  describe('Pass Coverage Impact', () => {
    it('should value pass coverage (PDs, INTs) for LB ratings', () => {
      // High coverage producer
      const highCoverageStats: Partial<PlayerStats> = {
        FantasyPoints: 220.0,
        FantasyPointsPPR: 220.0,
        Played: 17,
        Started: 17,
        Tackles: 70,
        Assists: 50,
        Sacks: 3,
        PassesDefended: 8,
        Interceptions: 2,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      // Low coverage producer with similar tackles
      const lowCoverageStats: Partial<PlayerStats> = {
        FantasyPoints: 200.0,
        FantasyPointsPPR: 200.0,
        Played: 17,
        Started: 17,
        Tackles: 70,
        Assists: 50,
        Sacks: 3,
        PassesDefended: 2,
        Interceptions: 0,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const highCoverageContext = createContext(highCoverageStats);
      const lowCoverageContext = createContext(lowCoverageStats);

      const highCoverageRating = PlayerRatingService.calculateOverallRating(highCoverageStats as PlayerStats, highCoverageContext);
      const lowCoverageRating = PlayerRatingService.calculateOverallRating(lowCoverageStats as PlayerStats, lowCoverageContext);

      expect(highCoverageRating).toBeGreaterThan(lowCoverageRating);
      expect(highCoverageRating - lowCoverageRating).toBeGreaterThan(1);
    });
  });
});
