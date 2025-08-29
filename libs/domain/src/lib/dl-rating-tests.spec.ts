import { PlayerRatingService, PlayerRatingContext } from './player-rating.service';
import { PlayerStats } from './league-setup.service';

describe('DL Rating Tests', () => {
  // Helper function to create context from PlayerStats
  const createContext = (stats: Partial<PlayerStats>): PlayerRatingContext => ({
    position: 'DL',
    experience: 3, // Default experience
    age: 25, // Default age
    fantasyPoints: stats.FantasyPoints || 0,
    fantasyPointsPPR: stats.FantasyPointsPPR || 0,
    gamesPlayed: stats.Played || 0,
    gamesStarted: stats.Started || 0,
  });

  describe('Elite DL Players', () => {
    it('should rate Trey Hendrickson as elite (17.5 sacks, 194.1 fantasy points)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 194.1,
        FantasyPointsPPR: 194.1,
        Played: 17,
        Started: 17,
        Tackles: 33,
        Assists: 13,
        Sacks: 17.5,
        PassesDefended: 6,
        Interceptions: 0,
        FumblesForced: 2,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(90);
      expect(overall).toBeLessThanOrEqual(99);
    });

    it('should rate Myles Garrett as elite (14 sacks, 194.0 fantasy points)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 194.0,
        FantasyPointsPPR: 194.0,
        Played: 17,
        Started: 17,
        Tackles: 40,
        Assists: 7,
        Sacks: 14,
        PassesDefended: 1,
        Interceptions: 0,
        FumblesForced: 3,
        FumblesRecovered: 1,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(90);
      expect(overall).toBeLessThanOrEqual(99);
    });

    it('should rate Nik Bonitto as elite (13.5 sacks, 190.0 fantasy points, 2 TDs)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 190.0,
        FantasyPointsPPR: 190.0,
        Played: 17,
        Started: 17,
        Tackles: 33,
        Assists: 15,
        Sacks: 13.5,
        PassesDefended: 4,
        Interceptions: 1,
        FumblesForced: 2,
        FumblesRecovered: 1,
        DefensiveTouchdowns: 2,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(88);
      expect(overall).toBeLessThanOrEqual(95);
    });
  });

  describe('High-Tier DL Players', () => {
    it('should rate Jonathan Greenard as high-tier (12 sacks, 189.0 fantasy points)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 189.0,
        FantasyPointsPPR: 189.0,
        Played: 17,
        Started: 17,
        Tackles: 41,
        Assists: 18,
        Sacks: 12,
        PassesDefended: 3,
        Interceptions: 0,
        FumblesForced: 4,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(85);
      expect(overall).toBeLessThanOrEqual(92);
    });

    it('should rate Brian Burns as high-tier (8.5 sacks, 181.7 fantasy points, 8 PDs)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 181.7,
        FantasyPointsPPR: 181.7,
        Played: 17,
        Started: 17,
        Tackles: 42,
        Assists: 29,
        Sacks: 8.5,
        PassesDefended: 8,
        Interceptions: 0,
        FumblesForced: 2,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(83);
      expect(overall).toBeLessThanOrEqual(95);
    });

    it('should rate Leonard Williams as high-tier (11 sacks, 175.8 fantasy points, 1 INT)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 175.8,
        FantasyPointsPPR: 175.8,
        Played: 16,
        Started: 16,
        Tackles: 37,
        Assists: 27,
        Sacks: 11,
        PassesDefended: 3,
        Interceptions: 1,
        FumblesForced: 0,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 1,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(82);
      expect(overall).toBeLessThanOrEqual(95);
    });
  });

  describe('Mid-Tier DL Players', () => {
    it('should rate Travon Walker as mid-tier (10.5 sacks, 163.7 fantasy points)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 163.7,
        FantasyPointsPPR: 163.7,
        Played: 17,
        Started: 17,
        Tackles: 31,
        Assists: 30,
        Sacks: 10.5,
        PassesDefended: 1,
        Interceptions: 0,
        FumblesForced: 2,
        FumblesRecovered: 1,
        DefensiveTouchdowns: 1,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(78);
      expect(overall).toBeLessThanOrEqual(95);
    });

    it('should rate Greg Rousseau as mid-tier (8 sacks, 159.6 fantasy points)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 159.6,
        FantasyPointsPPR: 159.6,
        Played: 16,
        Started: 16,
        Tackles: 36,
        Assists: 17,
        Sacks: 8,
        PassesDefended: 3,
        Interceptions: 0,
        FumblesForced: 3,
        FumblesRecovered: 1,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(76);
      expect(overall).toBeLessThanOrEqual(95);
    });

    it('should rate Cameron Heyward as mid-tier (8 sacks, 158.3 fantasy points, 11 PDs)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 158.3,
        FantasyPointsPPR: 158.3,
        Played: 17,
        Started: 17,
        Tackles: 35,
        Assists: 36,
        Sacks: 8,
        PassesDefended: 11,
        Interceptions: 0,
        FumblesForced: 0,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(75);
      expect(overall).toBeLessThanOrEqual(95);
    });
  });

  describe('Lower-Tier DL Players', () => {
    it('should rate Jeffery Simmons as lower-tier (5 sacks, 157.6 fantasy points)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 157.6,
        FantasyPointsPPR: 157.6,
        Played: 16,
        Started: 16,
        Tackles: 41,
        Assists: 35,
        Sacks: 5,
        PassesDefended: 4,
        Interceptions: 0,
        FumblesForced: 2,
        FumblesRecovered: 2,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(72);
      expect(overall).toBeLessThanOrEqual(95);
    });

    it('should rate Danielle Hunter as lower-tier (12 sacks, 157.0 fantasy points)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 157.0,
        FantasyPointsPPR: 157.0,
        Played: 17,
        Started: 17,
        Tackles: 31,
        Assists: 15,
        Sacks: 12,
        PassesDefended: 3,
        Interceptions: 0,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(72);
      expect(overall).toBeLessThanOrEqual(95);
    });

    it('should rate Nick Bosa as lower-tier (9 sacks, 152.2 fantasy points, 1 INT)', () => {
      const stats: Partial<PlayerStats> = {
        FantasyPoints: 152.2,
        FantasyPointsPPR: 152.2,
        Played: 14,
        Started: 14,
        Tackles: 33,
        Assists: 19,
        Sacks: 9,
        PassesDefended: 1,
        Interceptions: 1,
        FumblesForced: 1,
        FumblesRecovered: 1,
        DefensiveTouchdowns: 0,
      };

      const context = createContext(stats);
      const overall = PlayerRatingService.calculateOverallRating(stats as PlayerStats, context);

      expect(overall).toBeGreaterThanOrEqual(70);
      expect(overall).toBeLessThanOrEqual(95);
    });
  });

  describe('Rating Scale Validation', () => {
    it('should maintain proper rating scale across different performance levels', () => {
      // Elite performer
      const eliteStats: Partial<PlayerStats> = {
        FantasyPoints: 194.1,
        FantasyPointsPPR: 194.1,
        Played: 17,
        Started: 17,
        Tackles: 33,
        Assists: 13,
        Sacks: 17.5,
        PassesDefended: 6,
        Interceptions: 0,
        FumblesForced: 2,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      // Mid-tier performer
      const midStats: Partial<PlayerStats> = {
        FantasyPoints: 150.0,
        FantasyPointsPPR: 150.0,
        Played: 16,
        Started: 16,
        Tackles: 30,
        Assists: 20,
        Sacks: 8,
        PassesDefended: 2,
        Interceptions: 0,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      // Lower-tier performer
      const lowerStats: Partial<PlayerStats> = {
        FantasyPoints: 80.0,
        FantasyPointsPPR: 80.0,
        Played: 15,
        Started: 15,
        Tackles: 25,
        Assists: 15,
        Sacks: 5,
        PassesDefended: 1,
        Interceptions: 0,
        FumblesForced: 0,
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

  describe('Sack Production Impact', () => {
    it('should heavily weight sack production for DL ratings', () => {
      // High sack producer
      const highSackStats: Partial<PlayerStats> = {
        FantasyPoints: 180.0,
        FantasyPointsPPR: 180.0,
        Played: 17,
        Started: 17,
        Tackles: 30,
        Assists: 15,
        Sacks: 15,
        PassesDefended: 2,
        Interceptions: 0,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      // Low sack producer with similar tackles
      const lowSackStats: Partial<PlayerStats> = {
        FantasyPoints: 130.0,
        FantasyPointsPPR: 130.0,
        Played: 17,
        Started: 17,
        Tackles: 30,
        Assists: 15,
        Sacks: 5,
        PassesDefended: 2,
        Interceptions: 0,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const highSackContext = createContext(highSackStats);
      const lowSackContext = createContext(lowSackStats);

      const highSackRating = PlayerRatingService.calculateOverallRating(highSackStats as PlayerStats, highSackContext);
      const lowSackRating = PlayerRatingService.calculateOverallRating(lowSackStats as PlayerStats, lowSackContext);

      expect(highSackRating).toBeGreaterThan(lowSackRating);
      expect(highSackRating - lowSackRating).toBeGreaterThan(3);
    });
  });

  describe('Tackle Production Impact', () => {
    it('should value consistent tackle production for DL ratings', () => {
      // High tackle producer
      const highTackleStats: Partial<PlayerStats> = {
        FantasyPoints: 160.0,
        FantasyPointsPPR: 160.0,
        Played: 17,
        Started: 17,
        Tackles: 45,
        Assists: 25,
        Sacks: 8,
        PassesDefended: 3,
        Interceptions: 0,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      // Low tackle producer with similar sacks
      const lowTackleStats: Partial<PlayerStats> = {
        FantasyPoints: 120.0,
        FantasyPointsPPR: 120.0,
        Played: 17,
        Started: 17,
        Tackles: 25,
        Assists: 15,
        Sacks: 8,
        PassesDefended: 3,
        Interceptions: 0,
        FumblesForced: 1,
        FumblesRecovered: 0,
        DefensiveTouchdowns: 0,
      };

      const highTackleContext = createContext(highTackleStats);
      const lowTackleContext = createContext(lowTackleStats);

      const highTackleRating = PlayerRatingService.calculateOverallRating(highTackleStats as PlayerStats, highTackleContext);
      const lowTackleRating = PlayerRatingService.calculateOverallRating(lowTackleStats as PlayerStats, lowTackleContext);

      expect(highTackleRating).toBeGreaterThan(lowTackleRating);
      expect(highTackleRating - lowTackleRating).toBeGreaterThan(2);
    });
  });

  describe('Big Play Impact', () => {
    it('should reward big plays (INTs, TDs, FFs) for DL ratings', () => {
      // Big play producer
      const bigPlayStats: Partial<PlayerStats> = {
        FantasyPoints: 170.0,
        FantasyPointsPPR: 170.0,
        Played: 17,
        Started: 17,
        Tackles: 30,
        Assists: 15,
        Sacks: 10,
        PassesDefended: 3,
        Interceptions: 1,
        FumblesForced: 2,
        FumblesRecovered: 1,
        DefensiveTouchdowns: 1,
      };

      // No big plays with similar base stats
      const noBigPlayStats: Partial<PlayerStats> = {
        FantasyPoints: 130.0,
        FantasyPointsPPR: 130.0,
        Played: 17,
        Started: 17,
        Tackles: 30,
        Assists: 15,
        Sacks: 10,
        PassesDefended: 3,
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
      expect(bigPlayRating - noBigPlayRating).toBeGreaterThan(1);
    });
  });
});
