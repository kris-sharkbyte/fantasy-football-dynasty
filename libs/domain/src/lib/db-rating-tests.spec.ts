import {
  PlayerRatingService,
  PlayerRatingContext,
} from './player-rating.service';
import { PlayerStats } from './league-setup.service';

describe('DB Rating Tests', () => {
  // Helper function to create context from PlayerStats
  const createContext = (stats: Partial<PlayerStats>): PlayerRatingContext => ({
    position: 'DB',
    experience: 3, // Default experience
    age: 25, // Default age
    fantasyPoints: stats.FantasyPoints || 0,
    fantasyPointsPPR: stats.FantasyPointsPPR || 0,
    gamesPlayed: stats.Played || 0,
    gamesStarted: stats.Started || 0,
  });

  describe('Elite DB Players', () => {
    it('should rate Budda Baker as elite (164 tackles, 239.1 fantasy points)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 239.1,
        FantasyPointsPPR: 239.1,
        Played: 17,
        Started: 17,
        Tackles: 95,
        Assists: 69,
        Sacks: 2,
        PassesDefended: 5,
        Interceptions: 0,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(
        stats as PlayerStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(90);
      expect(overall).toBeLessThanOrEqual(99);
    });

    it('should rate Nick Cross as elite (145 tackles, 219.2 fantasy points, 3 INTs)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 219.2,
        FantasyPointsPPR: 219.2,
        Played: 17,
        Started: 17,
        Tackles: 86,
        Assists: 59,
        Sacks: 1,
        PassesDefended: 5,
        Interceptions: 3,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(
        stats as PlayerStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(88);
      expect(overall).toBeLessThanOrEqual(95);
    });

    it('should rate Brian Branch as elite (109 tackles, 213.4 fantasy points, 16 PDs, 4 INTs)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 213.4,
        FantasyPointsPPR: 213.4,
        Played: 16,
        Started: 16,
        Tackles: 79,
        Assists: 30,
        Sacks: 1,
        PassesDefended: 16,
        Interceptions: 4,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(
        stats as PlayerStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(86);
      expect(overall).toBeLessThanOrEqual(93);
    });
  });

  describe('High-Tier DB Players', () => {
    it('should rate Kevin Byard III as high-tier (130 tackles, 205.9 fantasy points, 2 sacks)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 205.9,
        FantasyPointsPPR: 205.9,
        Played: 17,
        Started: 17,
        Tackles: 80,
        Assists: 50,
        Sacks: 2,
        PassesDefended: 7,
        Interceptions: 1,
        FumblesForced: 1,
        FumblesRecovered: 2,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(
        stats as PlayerStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(84);
      expect(overall).toBeLessThanOrEqual(92);
    });

    it('should rate Jessie Bates III as high-tier (102 tackles, 193.4 fantasy points, 10 PDs, 4 INTs, 1 TD)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 193.4,
        FantasyPointsPPR: 193.4,
        Played: 17,
        Started: 17,
        Tackles: 62,
        Assists: 40,
        Sacks: 1,
        PassesDefended: 10,
        Interceptions: 4,
        FumblesForced: 4,
        FumblesRecovered: 1,
        DefensiveTouchdowns: 1,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(
        stats as PlayerStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(82);
      expect(overall).toBeLessThanOrEqual(90);
    });

    it('should rate Julian Love as high-tier (106 tackles, 189.4 fantasy points, 12 PDs, 3 INTs)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 189.4,
        FantasyPointsPPR: 189.4,
        Played: 17,
        Started: 17,
        Tackles: 76,
        Assists: 30,
        Sacks: 0,
        PassesDefended: 12,
        Interceptions: 3,
        FumblesForced: 2,
        FumblesRecovered: 1,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(
        stats as PlayerStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(82);
      expect(overall).toBeLessThanOrEqual(90);
    });
  });

  describe('Mid-Tier DB Players', () => {
    it('should rate Brandon Jones as mid-tier (115 tackles, 188.9 fantasy points, 10 PDs, 3 INTs)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 188.9,
        FantasyPointsPPR: 188.9,
        Played: 16,
        Started: 16,
        Tackles: 79,
        Assists: 36,
        Sacks: 0,
        PassesDefended: 10,
        Interceptions: 3,
        FumblesForced: 1,
        FumblesRecovered: 1,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(
        stats as PlayerStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(80);
      expect(overall).toBeLessThanOrEqual(88);
    });

    it('should rate Kyle Hamilton as mid-tier (107 tackles, 187.1 fantasy points, 9 PDs, 2 sacks)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 187.1,
        FantasyPointsPPR: 187.1,
        Played: 17,
        Started: 17,
        Tackles: 77,
        Assists: 30,
        Sacks: 2,
        PassesDefended: 9,
        Interceptions: 1,
        FumblesForced: 2,
        FumblesRecovered: 1,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(
        stats as PlayerStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(80);
      expect(overall).toBeLessThanOrEqual(88);
    });

    it('should rate Derwin James Jr. as mid-tier (93 tackles, 181.7 fantasy points, 5.5 sacks, 7 PDs)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 181.7,
        FantasyPointsPPR: 181.7,
        Played: 16,
        Started: 16,
        Tackles: 60,
        Assists: 33,
        Sacks: 5.5,
        PassesDefended: 7,
        Interceptions: 1,
        FumblesForced: 0,
        FumblesRecovered: 1,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(
        stats as PlayerStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(80);
      expect(overall).toBeLessThanOrEqual(88);
    });
  });

  describe('Lower-Tier DB Players', () => {
    it('should rate DeShon Elliott as lower-tier (108 tackles, 179.3 fantasy points, 6 PDs)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 179.3,
        FantasyPointsPPR: 179.3,
        Played: 15,
        Started: 15,
        Tackles: 72,
        Assists: 36,
        Sacks: 0,
        PassesDefended: 6,
        Interceptions: 1,
        FumblesForced: 2,
        FumblesRecovered: 3,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(
        stats as PlayerStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(78);
      expect(overall).toBeLessThanOrEqual(86);
    });

    it('should rate Alontae Taylor as lower-tier (89 tackles, 178.3 fantasy points, 16 PDs, 4 sacks)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 178.3,
        FantasyPointsPPR: 178.3,
        Played: 17,
        Started: 17,
        Tackles: 61,
        Assists: 28,
        Sacks: 4,
        PassesDefended: 16,
        Interceptions: 0,
        FumblesForced: 2,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(
        stats as PlayerStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(76);
      expect(overall).toBeLessThanOrEqual(84);
    });

    it('should rate Byron Murphy Jr. as lower-tier (81 tackles, 177.6 fantasy points, 14 PDs, 6 INTs)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 177.6,
        FantasyPointsPPR: 177.6,
        Played: 17,
        Started: 17,
        Tackles: 62,
        Assists: 19,
        Sacks: 0,
        PassesDefended: 14,
        Interceptions: 6,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(
        stats as PlayerStats,
        context
      );

      expect(overall).toBeGreaterThanOrEqual(76);
      expect(overall).toBeLessThanOrEqual(84);
    });
  });

  describe('Rating Scale Validation', () => {
    it('should maintain proper rating scale across different performance levels', () => {
      // Elite performer
      const eliteStats: Partial<PlayerStats> = {
        FantasyPoints: 239.1,
        FantasyPointsPPR: 239.1,
        Played: 17,
        Started: 17,
        Tackles: 95,
        Assists: 69,
        Sacks: 2,
        PassesDefended: 5,
        Interceptions: 0,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      // Mid-tier performer
      const midStats: Partial<PlayerStats> = {
        FantasyPoints: 180.0,
        FantasyPointsPPR: 180.0,
        Played: 17,
        Started: 17,
        Tackles: 70,
        Assists: 45,
        Sacks: 1,
        PassesDefended: 8,
        Interceptions: 2,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      // Lower-tier performer
      const lowerStats: Partial<PlayerStats> = {
        FantasyPoints: 140.0,
        FantasyPointsPPR: 140.0,
        Played: 16,
        Started: 16,
        Tackles: 50,
        Assists: 30,
        Sacks: 0,
        PassesDefended: 5,
        Interceptions: 1,
        FumblesForced: 0,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const eliteContext = createContext(eliteStats);
      const midContext = createContext(midStats);
      const lowerContext = createContext(lowerStats);

      const eliteRating = PlayerRatingService.calculateOverallRating(
        eliteStats as PlayerStats,
        eliteContext
      );
      const midRating = PlayerRatingService.calculateOverallRating(
        midStats as PlayerStats,
        midContext
      );
      const lowerRating = PlayerRatingService.calculateOverallRating(
        lowerStats as PlayerStats,
        lowerContext
      );

      expect(eliteRating).toBeGreaterThan(midRating);
      expect(midRating).toBeGreaterThan(lowerRating);
      expect(eliteRating - midRating).toBeGreaterThan(5);
      expect(midRating - lowerRating).toBeGreaterThan(5);
    });
  });

  describe('Tackle Production Impact', () => {
    it('should heavily weight tackle production for DB ratings', () => {
      // High tackle producer
      const highTackleStats: Partial<PlayerStats> = {
        FantasyPoints: 200.0,
        FantasyPointsPPR: 200.0,
        Played: 17,
        Started: 17,
        Tackles: 90,
        Assists: 60,
        Sacks: 1,
        PassesDefended: 8,
        Interceptions: 2,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      // Low tackle producer with similar coverage stats
      const lowTackleStats: Partial<PlayerStats> = {
        FantasyPoints: 160.0,
        FantasyPointsPPR: 160.0,
        Played: 17,
        Started: 17,
        Tackles: 50,
        Assists: 35,
        Sacks: 1,
        PassesDefended: 8,
        Interceptions: 2,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const highTackleContext = createContext(highTackleStats);
      const lowTackleContext = createContext(lowTackleStats);

      const highTackleRating = PlayerRatingService.calculateOverallRating(
        highTackleStats as PlayerStats,
        highTackleContext
      );
      const lowTackleRating = PlayerRatingService.calculateOverallRating(
        lowTackleStats as PlayerStats,
        lowTackleContext
      );

      expect(highTackleRating).toBeGreaterThan(lowTackleRating);
      expect(highTackleRating - lowTackleRating).toBeGreaterThan(3);
    });
  });

  describe('Pass Coverage Impact', () => {
    it('should heavily value pass coverage (PDs, INTs) for DB ratings', () => {
      // High coverage producer
      const highCoverageStats: Partial<PlayerStats> = {
        FantasyPoints: 200.0,
        FantasyPointsPPR: 200.0,
        Played: 17,
        Started: 17,
        Tackles: 70,
        Assists: 45,
        Sacks: 1,
        PassesDefended: 15,
        Interceptions: 4,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      // Low coverage producer with similar tackles
      const lowCoverageStats: Partial<PlayerStats> = {
        FantasyPoints: 170.0,
        FantasyPointsPPR: 170.0,
        Played: 17,
        Started: 17,
        Tackles: 70,
        Assists: 45,
        Sacks: 1,
        PassesDefended: 5,
        Interceptions: 1,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const highCoverageContext = createContext(highCoverageStats);
      const lowCoverageContext = createContext(lowCoverageStats);

      const highCoverageRating = PlayerRatingService.calculateOverallRating(
        highCoverageStats as PlayerStats,
        highCoverageContext
      );
      const lowCoverageRating = PlayerRatingService.calculateOverallRating(
        lowCoverageStats as PlayerStats,
        lowCoverageContext
      );

      expect(highCoverageRating).toBeGreaterThan(lowCoverageRating);
      expect(highCoverageRating - lowCoverageRating).toBeGreaterThan(3);
    });
  });

  describe('Big Play Impact', () => {
    it('should reward big plays (INTs, TDs, FFs) for DB ratings', () => {
      // Big play producer
      const bigPlayStats: Partial<PlayerStats> = {
        FantasyPoints: 190.0,
        FantasyPointsPPR: 190.0,
        Played: 17,
        Started: 17,
        Tackles: 70,
        Assists: 45,
        Sacks: 1,
        PassesDefended: 10,
        Interceptions: 3,
        FumblesForced: 2,
        FumblesRecovered: 1,
        DefensiveTouchdowns: 1,
      };

      // No big plays with similar base stats
      const noBigPlayStats: Partial<PlayerStats> = {
        FantasyPoints: 160.0,
        FantasyPointsPPR: 160.0,
        Played: 17,
        Started: 17,
        Tackles: 70,
        Assists: 45,
        Sacks: 1,
        PassesDefended: 10,
        Interceptions: 0,
        FumblesForced: 0,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const bigPlayContext = createContext(bigPlayStats);
      const noBigPlayContext = createContext(noBigPlayStats);

      const bigPlayRating = PlayerRatingService.calculateOverallRating(
        bigPlayStats as PlayerStats,
        bigPlayContext
      );
      const noBigPlayRating = PlayerRatingService.calculateOverallRating(
        noBigPlayStats as PlayerStats,
        noBigPlayContext
      );

      expect(bigPlayRating).toBeGreaterThan(noBigPlayRating);
      expect(bigPlayRating - noBigPlayRating).toBeGreaterThan(2);
    });
  });

  describe('Sack Production Impact', () => {
    it('should value sack production for DB ratings', () => {
      // High sack producer
      const highSackStats: Partial<PlayerStats> = {
        FantasyPoints: 180.0,
        FantasyPointsPPR: 180.0,
        Played: 17,
        Started: 17,
        Tackles: 65,
        Assists: 40,
        Sacks: 5,
        PassesDefended: 8,
        Interceptions: 2,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      // Low sack producer with similar tackles
      const lowSackStats: Partial<PlayerStats> = {
        FantasyPoints: 160.0,
        FantasyPointsPPR: 160.0,
        Played: 17,
        Started: 17,
        Tackles: 65,
        Assists: 40,
        Sacks: 0,
        PassesDefended: 8,
        Interceptions: 2,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const highSackContext = createContext(highSackStats);
      const lowSackContext = createContext(lowSackStats);

      const highSackRating = PlayerRatingService.calculateOverallRating(
        highSackStats as PlayerStats,
        highSackContext
      );
      const lowSackRating = PlayerRatingService.calculateOverallRating(
        lowSackStats as PlayerStats,
        lowSackContext
      );

      expect(highSackRating).toBeGreaterThan(lowSackRating);
      expect(highSackRating - lowSackRating).toBeGreaterThan(1);
    });
  });

  describe('Interception Impact', () => {
    it('should heavily reward interceptions for DB ratings', () => {
      // High INT producer
      const highIntStats: Partial<PlayerStats> = {
        FantasyPoints: 180.0,
        FantasyPointsPPR: 180.0,
        Played: 17,
        Started: 17,
        Tackles: 60,
        Assists: 35,
        Sacks: 1,
        PassesDefended: 12,
        Interceptions: 6,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      // Low INT producer with similar tackles
      const lowIntStats: Partial<PlayerStats> = {
        FantasyPoints: 150.0,
        FantasyPointsPPR: 150.0,
        Played: 17,
        Started: 17,
        Tackles: 60,
        Assists: 35,
        Sacks: 1,
        PassesDefended: 12,
        Interceptions: 1,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const highIntContext = createContext(highIntStats);
      const lowIntContext = createContext(lowIntStats);

      const highIntRating = PlayerRatingService.calculateOverallRating(
        highIntStats as PlayerStats,
        highIntContext
      );
      const lowIntRating = PlayerRatingService.calculateOverallRating(
        lowIntStats as PlayerStats,
        lowIntContext
      );

      expect(highIntRating).toBeGreaterThan(lowIntRating);
      expect(highIntRating - lowIntRating).toBeGreaterThan(3);
    });
  });
});
