import { describe, it, expect } from 'vitest';
import {
  FAWeekManager,
  Player,
  FABid,
  MarketContext,
  FAWeekSettings,
  Position,
} from './domain';

describe('FA Comprehensive Scenarios', () => {
  // Test data setup
  const createPlayer = (
    id: number,
    name: string,
    position: string,
    overall: number,
    age: number = 28
  ): Player => ({
    id: id.toString(),
    name,
    position,
    overall,
    age,
    devGrade: 'B',
    traits: [],
    nflTeam: 'FA',
    contract: null,
  });

  const createBid = (
    id: string,
    teamId: string,
    years: 1 | 2 | 3,
    baseSalary: Record<number, number>,
    signingBonus: number,
    guarantees: Array<{
      type: 'full' | 'injury-only';
      amount: number;
      year: number;
    }> = []
  ): FABid => ({
    id,
    leagueId: 'test-league',
    teamId,
    playerId: 1,
    position: 'QB' as Position,
    weekNumber: 1,
    offer: {
      years,
      baseSalary,
      signingBonus,
      guarantees,
      contractType: 'standard',
      totalValue:
        Object.values(baseSalary).reduce((sum, salary) => sum + salary, 0) +
        signingBonus,
      apy:
        (Object.values(baseSalary).reduce((sum, salary) => sum + salary, 0) +
          signingBonus) /
        years,
    },
    status: 'pending',
    submittedAt: new Date(),
  });

  const createMarketContext = (
    week: number,
    positionalDemand: number = 0.5
  ): MarketContext => ({
    currentWeek: week,
    positionalDemand,
    leagueCap: 200000000,
    averageTeamCap: 180000000,
    marketPressure: 0.5,
  });

  const defaultSettings: FAWeekSettings = {
    shortlistSize: 3,
    maxBidsPerTeam: 5,
    bidDeadlineHours: 24,
    openFADiscount: 20,
  };

  describe('Positional Depth Scenarios', () => {
    it('should favor QB bid when team has no starting QB vs team with established starter', () => {
      // Create a high-quality QB
      const qb = createPlayer(1, 'Elite QB', 'QB', 85, 26);

      // Team A: No starting QB (desperate)
      const teamABid = createBid(
        'bid1',
        'teamA',
        3,
        { 2024: 15000000, 2025: 16000000, 2026: 17000000 },
        5000000
      );

      // Team B: Has established starting QB (less desperate)
      const teamBBid = createBid(
        'bid2',
        'teamB',
        3,
        { 2024: 15000000, 2025: 16000000, 2026: 17000000 },
        5000000
      );

      const marketContext = createMarketContext(1, 0.8); // High QB demand
      const bids = [teamABid, teamBBid];

      const result = FAWeekManager.evaluatePlayerBids(
        qb,
        bids,
        marketContext,
        defaultSettings
      );

      // Team A should win due to positional need
      expect(result.acceptedBidId).toBe('bid1');
      expect(result.decisionReason).toBe('accepted');
    });

    it('should favor higher offer when both teams have starting QBs but one offers significantly more', () => {
      const qb = createPlayer(1, 'Good QB', 'QB', 78, 28);

      // Team A: Has starting QB, offers market rate
      const teamABid = createBid(
        'bid1',
        'teamA',
        2,
        { 2024: 12000000, 2025: 13000000 },
        2000000
      );

      // Team B: Has starting QB, offers premium (20% more)
      const teamBBid = createBid(
        'bid2',
        'teamB',
        2,
        { 2024: 15000000, 2025: 16000000 },
        4000000
      );

      const marketContext = createMarketContext(2, 0.6);
      const bids = [teamABid, teamBBid];

      const result = FAWeekManager.evaluatePlayerBids(
        qb,
        bids,
        marketContext,
        defaultSettings
      );

      // Team B should win due to higher offer
      expect(result.acceptedBidId).toBe('bid2');
    });

    it('should handle RB depth scenarios - starter vs backup role', () => {
      const rb = createPlayer(2, 'Elite RB', 'RB', 82, 25);

      // Team A: No starting RB (desperate)
      const teamABid = createBid(
        'bid1',
        'teamA',
        3,
        { 2024: 8000000, 2025: 8500000, 2026: 9000000 },
        3000000
      );

      // Team B: Has starting RB, wants depth
      const teamBBid = createBid(
        'bid2',
        'teamB',
        2,
        { 2024: 6000000, 2025: 6500000 },
        1000000
      );

      const marketContext = createMarketContext(1, 0.7);
      const bids = [teamABid, teamBBid];

      const result = FAWeekManager.evaluatePlayerBids(
        rb,
        bids,
        marketContext,
        defaultSettings
      );

      // Team A should win due to starting opportunity
      expect(result.acceptedBidId).toBe('bid1');
    });

    it('should handle WR depth scenarios - WR1 vs WR3 role', () => {
      const wr = createPlayer(3, 'Good WR', 'WR', 79, 27);

      // Team A: Needs WR1 (desperate)
      const teamABid = createBid(
        'bid1',
        'teamA',
        3,
        { 2024: 10000000, 2025: 11000000, 2026: 12000000 },
        4000000
      );

      // Team B: Wants WR3 depth
      const teamBBid = createBid(
        'bid2',
        'teamB',
        2,
        { 2024: 7000000, 2025: 7500000 },
        1500000
      );

      const marketContext = createMarketContext(1, 0.6);
      const bids = [teamABid, teamBBid];

      const result = FAWeekManager.evaluatePlayerBids(
        wr,
        bids,
        marketContext,
        defaultSettings
      );

      // Team A should win due to better role
      expect(result.acceptedBidId).toBe('bid1');
    });
  });

  describe('Contract Structure Scenarios', () => {
    it('should favor contract with better guarantees over higher APY', () => {
      const player = createPlayer(4, 'Veteran Player', 'WR', 76, 30);

      // Team A: Higher APY, no guarantees
      const teamABid = createBid(
        'bid1',
        'teamA',
        2,
        { 2024: 12000000, 2025: 13000000 },
        2000000,
        []
      );

      // Team B: Lower APY but with guarantees
      const teamBBid = createBid(
        'bid2',
        'teamB',
        2,
        { 2024: 10000000, 2025: 11000000 },
        1000000,
        [
          { type: 'full', amount: 8000000, year: 1 },
          { type: 'injury-only', amount: 4000000, year: 2 },
        ]
      );

      const marketContext = createMarketContext(2, 0.5);
      const bids = [teamABid, teamBBid];

      const result = FAWeekManager.evaluatePlayerBids(
        player,
        bids,
        marketContext,
        defaultSettings
      );

      // Team B should win due to security of guarantees
      expect(result.acceptedBidId).toBe('bid2');
    });

    it('should favor longer contracts for younger players', () => {
      const youngPlayer = createPlayer(5, 'Young Star', 'RB', 80, 23);

      // Team A: 1-year prove-it deal
      const teamABid = createBid(
        'bid1',
        'teamA',
        1,
        { 2024: 8000000 },
        1000000
      );

      // Team B: 3-year security deal
      const teamBBid = createBid(
        'bid2',
        'teamB',
        3,
        { 2024: 7000000, 2025: 7500000, 2026: 8000000 },
        3000000
      );

      const marketContext = createMarketContext(1, 0.6);
      const bids = [teamABid, teamBBid];

      const result = FAWeekManager.evaluatePlayerBids(
        youngPlayer,
        bids,
        marketContext,
        defaultSettings
      );

      // Team B should win due to security for young player
      expect(result.acceptedBidId).toBe('bid2');
    });

    it('should favor shorter contracts for older players', () => {
      const veteranPlayer = createPlayer(6, 'Veteran', 'WR', 75, 32);

      // Team A: 3-year deal (too long for veteran)
      const teamABid = createBid(
        'bid1',
        'teamA',
        3,
        { 2024: 6000000, 2025: 6500000, 2026: 7000000 },
        2000000
      );

      // Team B: 1-year deal (perfect for veteran)
      const teamBBid = createBid(
        'bid2',
        'teamB',
        1,
        { 2024: 7000000 },
        1500000
      );

      const marketContext = createMarketContext(1, 0.5);
      const bids = [teamABid, teamBBid];

      const result = FAWeekManager.evaluatePlayerBids(
        veteranPlayer,
        bids,
        marketContext,
        defaultSettings
      );

      // Team B should win due to appropriate contract length
      expect(result.acceptedBidId).toBe('bid2');
    });
  });

  describe('Multiple Teams Scenarios', () => {
    it('should handle 5 teams bidding on same player with different strategies', () => {
      const player = createPlayer(7, 'Hot FA', 'WR', 81, 26);

      const bids = [
        // Team 1: High APY, no guarantees
        createBid(
          'bid1',
          'team1',
          2,
          { 2024: 15000000, 2025: 16000000 },
          2000000
        ),

        // Team 2: Medium APY, good guarantees
        createBid(
          'bid2',
          'team2',
          3,
          { 2024: 12000000, 2025: 13000000, 2026: 14000000 },
          3000000,
          [{ type: 'full', amount: 10000000, year: 1 }]
        ),

        // Team 3: Low APY, great guarantees
        createBid(
          'bid3',
          'team3',
          2,
          { 2024: 10000000, 2025: 11000000 },
          1000000,
          [
            { type: 'full', amount: 15000000, year: 1 },
            { type: 'injury-only', amount: 5000000, year: 2 },
          ]
        ),

        // Team 4: High signing bonus, medium APY
        createBid(
          'bid4',
          'team4',
          2,
          { 2024: 13000000, 2025: 14000000 },
          6000000
        ),

        // Team 5: Lowball offer
        createBid('bid5', 'team5', 1, { 2024: 5000000 }, 500000),
      ];

      const marketContext = createMarketContext(1, 0.8);
      const result = FAWeekManager.evaluatePlayerBids(
        player,
        bids,
        marketContext,
        defaultSettings
      );

      // Should accept the best offer (likely Team 1 with high APY)
      expect(result.acceptedBidId).toBe('bid1');
      expect(result.rejectedBidIds).toContain('bid5'); // Lowball should be rejected
    });

    it('should shortlist top 3 when no offer meets threshold', () => {
      const player = createPlayer(8, 'Picky Player', 'QB', 90, 28);

      const bids = [
        createBid(
          'bid1',
          'team1',
          2,
          { 2024: 20000000, 2025: 21000000 },
          5000000
        ),
        createBid(
          'bid2',
          'team2',
          2,
          { 2024: 19000000, 2025: 20000000 },
          4000000
        ),
        createBid(
          'bid3',
          'team3',
          3,
          { 2024: 18000000, 2025: 19000000, 2026: 20000000 },
          6000000
        ),
        createBid(
          'bid4',
          'team4',
          2,
          { 2024: 17000000, 2025: 18000000 },
          3000000
        ),
        createBid('bid5', 'team5', 1, { 2024: 16000000 }, 2000000),
      ];

      const marketContext = createMarketContext(1, 0.9);
      const result = FAWeekManager.evaluatePlayerBids(
        player,
        bids,
        marketContext,
        defaultSettings
      );

      // Should shortlist top 3, reject others
      expect(result.acceptedBidId).toBeUndefined();
      expect(result.shortlistedBidIds).toHaveLength(3);
      expect(result.shortlistedBidIds).toContain('bid1');
      expect(result.shortlistedBidIds).toContain('bid2');
      expect(result.shortlistedBidIds).toContain('bid3');
    });
  });

  describe('Week Progression Scenarios', () => {
    it('should be more lenient in later weeks for single bids', () => {
      const player = createPlayer(9, 'Desperate Player', 'RB', 75, 29);

      // Same bid in different weeks
      const bid = createBid(
        'bid1',
        'team1',
        2,
        { 2024: 6000000, 2025: 6500000 },
        1000000
      );

      // Week 1: Should shortlist (too picky)
      const week1Context = createMarketContext(1, 0.6);
      const week1Result = FAWeekManager.evaluatePlayerBids(
        player,
        [bid],
        week1Context,
        defaultSettings
      );

      // Week 4: Should accept (more desperate)
      const week4Context = createMarketContext(4, 0.6);
      const week4Result = FAWeekManager.evaluatePlayerBids(
        player,
        [bid],
        week4Context,
        defaultSettings
      );

      expect(week1Result.decisionReason).toBe('shortlisted');
      expect(week4Result.decisionReason).toBe('accepted');
    });

    it('should maintain competitive thresholds for multiple bids even in later weeks', () => {
      const player = createPlayer(10, 'Competitive Player', 'WR', 80, 27);

      const bids = [
        createBid(
          'bid1',
          'team1',
          2,
          { 2024: 10000000, 2025: 11000000 },
          2000000
        ),
        createBid(
          'bid2',
          'team2',
          2,
          { 2024: 10500000, 2025: 11500000 },
          2500000
        ),
      ];

      // Week 1: Should shortlist (competitive)
      const week1Context = createMarketContext(1, 0.7);
      const week1Result = FAWeekManager.evaluatePlayerBids(
        player,
        bids,
        week1Context,
        defaultSettings
      );

      // Week 4: Should still shortlist (multiple bidders maintain competition)
      const week4Context = createMarketContext(4, 0.7);
      const week4Result = FAWeekManager.evaluatePlayerBids(
        player,
        bids,
        week4Context,
        defaultSettings
      );

      expect(week1Result.decisionReason).toBe('shortlisted');
      expect(week4Result.decisionReason).toBe('shortlisted');
    });
  });

  describe('Lowball Detection Scenarios', () => {
    it('should reject lowball offers immediately', () => {
      const player = createPlayer(11, 'Good Player', 'TE', 78, 26);

      const bids = [
        // Reasonable offer
        createBid(
          'bid1',
          'team1',
          2,
          { 2024: 8000000, 2025: 8500000 },
          2000000
        ),

        // Lowball offer (40% of expected value)
        createBid('bid2', 'team2', 1, { 2024: 3000000 }, 500000),
      ];

      const marketContext = createMarketContext(1, 0.6);
      const result = FAWeekManager.evaluatePlayerBids(
        player,
        bids,
        marketContext,
        defaultSettings
      );

      // Should accept reasonable offer, reject lowball
      expect(result.acceptedBidId).toBe('bid1');
      expect(result.rejectedBidIds).toContain('bid2');
      expect(result.decisionReason).toBe('accepted');
    });

    it('should reject offers with no bonuses and low APY', () => {
      const player = createPlayer(12, 'Solid Player', 'CB', 76, 28);

      const bids = [
        // Good offer with guarantees
        createBid(
          'bid1',
          'team1',
          2,
          { 2024: 10000000, 2025: 11000000 },
          3000000,
          [{ type: 'full', amount: 8000000, year: 1 }]
        ),

        // Low offer with no bonuses (should be lowball)
        createBid('bid2', 'team2', 2, { 2024: 5000000, 2025: 5500000 }, 0, []),
      ];

      const marketContext = createMarketContext(1, 0.5);
      const result = FAWeekManager.evaluatePlayerBids(
        player,
        bids,
        marketContext,
        defaultSettings
      );

      // Should accept good offer, reject lowball
      expect(result.acceptedBidId).toBe('bid1');
      expect(result.rejectedBidIds).toContain('bid2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty bid array', () => {
      const player = createPlayer(13, 'Lonely Player', 'K', 70, 30);
      const marketContext = createMarketContext(1, 0.3);

      const result = FAWeekManager.evaluatePlayerBids(
        player,
        [],
        marketContext,
        defaultSettings
      );

      expect(result.acceptedBidId).toBeUndefined();
      expect(result.shortlistedBidIds).toHaveLength(0);
      expect(result.rejectedBidIds).toHaveLength(0);
    });

    it('should handle identical bids with tiebreakers', () => {
      const player = createPlayer(14, 'Popular Player', 'WR', 82, 26);

      const bids = [
        createBid(
          'bid1',
          'team1',
          2,
          { 2024: 10000000, 2025: 11000000 },
          2000000
        ),
        createBid(
          'bid2',
          'team2',
          2,
          { 2024: 10000000, 2025: 11000000 },
          2000000
        ),
        createBid(
          'bid3',
          'team3',
          2,
          { 2024: 10000000, 2025: 11000000 },
          2000000
        ),
      ];

      const marketContext = createMarketContext(1, 0.7);
      const result = FAWeekManager.evaluatePlayerBids(
        player,
        bids,
        marketContext,
        defaultSettings
      );

      // Should accept one bid (tiebreaker by bid ID)
      expect(result.acceptedBidId).toBeDefined();
      expect(result.shortlistedBidIds).toHaveLength(2);
    });
  });
});
