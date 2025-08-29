import {
  PlayerRatingService,
  PlayerRatingContext,
} from './player-rating.service';
import { PlayerStats } from './league-setup.service';

describe('League Creation Rating Test', () => {
  // Helper function to create context from PlayerStats
  const createContext = (stats: Partial<PlayerStats>): PlayerRatingContext => ({
    position: 'QB',
    experience: 8, // Mahomes has 8 years experience
    age: 28, // Mahomes is 28
    fantasyPoints: stats.FantasyPoints || 0,
    fantasyPointsPPR: stats.FantasyPointsPPR || 0,
    gamesPlayed: stats.Played || 0,
    gamesStarted: stats.Started || 0,
  });

  it('should give Mahomes a proper elite rating (not 65)', () => {
    // Mahomes 2024 stats: 4,183 passing yards, 26 TDs, 14 INTs
    const mahomesStats: Partial<PlayerStats> = {
      FantasyPoints: 320.0, // Estimated fantasy points for Mahomes
      FantasyPointsPPR: 320.0,
      Played: 17,
      Started: 17,
      PassingAttempts: 565,
      PassingCompletions: 388,
      PassingYards: 4183,
      PassingTouchdowns: 26,
      PassingInterceptions: 14,
      RushingAttempts: 75,
      RushingYards: 389,
      RushingTouchdowns: 2,
    };

    const context = createContext(mahomesStats);
    const overall = PlayerRatingService.calculateOverallRating(
      mahomesStats as PlayerStats,
      context
    );

    // Mahomes should be elite, not 65
    expect(overall).toBeGreaterThan(85);
    expect(overall).toBeLessThanOrEqual(99);

    console.log(`Mahomes overall rating: ${overall}`);
  });

  it('should give Brock Bowers a proper TE rating (not 55)', () => {
    // Brock Bowers 2024 stats: 65 receptions, 714 yards, 6 TDs
    const bowersStats: Partial<PlayerStats> = {
      FantasyPoints: 180.0, // Estimated fantasy points for Bowers
      FantasyPointsPPR: 245.0, // With PPR
      Played: 17,
      Started: 17,
      ReceivingTargets: 95,
      Receptions: 65,
      ReceivingYards: 714,
      ReceivingTouchdowns: 6,
    };

    const context: PlayerRatingContext = {
      position: 'TE',
      experience: 1, // Rookie
      age: 21, // Young
      fantasyPoints: bowersStats.FantasyPoints || 0,
      fantasyPointsPPR: bowersStats.FantasyPointsPPR || 0,
      gamesPlayed: bowersStats.Played || 0,
      gamesStarted: bowersStats.Started || 0,
    };

    const overall = PlayerRatingService.calculateOverallRating(
      bowersStats as PlayerStats,
      context
    );

    // Bowers should be much higher than 55
    expect(overall).toBeGreaterThan(80);
    expect(overall).toBeLessThanOrEqual(95);

    console.log(`Brock Bowers overall rating: ${overall}`);
  });
});
