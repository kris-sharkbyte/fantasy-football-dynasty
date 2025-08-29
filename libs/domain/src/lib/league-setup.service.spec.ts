import { describe, it, expect, beforeEach } from 'vitest';
import {
  LeagueSetupService,
  LeagueSetupData,
  LeagueMarketContext,
} from './league-setup.service';
import {
  LeagueRules,
  ScoringRules,
  CapRules,
  ContractRules,
  DraftRules,
  FreeAgencyRules,
  RosterRules,
  Position,
} from '@fantasy-football-dynasty/types';

describe('LeagueSetupService', () => {
  let service: LeagueSetupService;
  let mockLeagueData: LeagueSetupData;

  beforeEach(() => {
    service = new LeagueSetupService();

    mockLeagueData = {
      name: 'Test League',
      description: 'A test fantasy football league',
      numberOfTeams: 12,
      currentYear: 2024,
      isPrivate: false,
      rules: {
        scoring: {
          ppr: 1.0,
          passingYards: 0.04,
          rushingYards: 0.1,
          receivingYards: 0.1,
          passingTouchdown: 4,
          rushingTouchdown: 6,
          receivingTouchdown: 6,
          interception: -2,
          fumble: -2,
          fieldGoal: 3,
          extraPoint: 1,
        } as ScoringRules,
        cap: {
          salaryCap: 200000000,
          minimumSpend: 150000000,
          deadMoneyRules: {
            preJune1: true,
            signingBonusAcceleration: true,
          },
        } as CapRules,
        contracts: {
          maxYears: 5,
          maxSigningBonus: 50000000,
          rookieScale: true,
        } as ContractRules,
        draft: {
          mode: 'snake',
          rounds: 20,
          timeLimit: 60,
          snakeOrder: true,
          autodraftDelay: 30,
          rookieAutoContracts: true,
          veteranNegotiationWindow: 24,
        } as DraftRules,
        freeAgency: {
          bidRounds: 30,
          tieBreakers: ['guarantees', 'apy', 'length'],
        } as FreeAgencyRules,
        roster: {
          minPlayers: 20,
          maxPlayers: 25,
          positionRequirements: {
            QB: 2,
            RB: 4,
            WR: 5,
            TE: 2,
          },
          allowIR: true,
          allowTaxi: true,
          maxIR: 3,
          maxTaxi: 4,
        } as RosterRules,
      },
    };
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(service.initialize()).resolves.not.toThrow();
    });
  });

  describe('league creation', () => {
    it('should create a complete league setup', async () => {
      const result = await service.createLeague(mockLeagueData);

      expect(result.league).toBeDefined();
      expect(result.teams).toBeDefined();
      expect(result.players).toBeDefined();
      expect(result.marketContext).toBeDefined();
    });

    it('should create league with correct properties', async () => {
      const result = await service.createLeague(mockLeagueData);
      const { league } = result;

      expect(league.name).toBe('Test League');
      expect(league.description).toBe('A test fantasy football league');
      expect(league.numberOfTeams).toBe(12);
      expect(league.currentYear).toBe(2024);
      expect(league.isPrivate).toBe(false);
      expect(league.phase).toBe('offseason');
      expect(league.status).toBe('active');
      expect(league.joinCode).toBeDefined();
      expect(league.joinCode.length).toBe(6);
      expect(league.rules).toEqual(mockLeagueData.rules);
      expect(league.createdAt).toBeInstanceOf(Date);
      expect(league.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate unique IDs for league and teams', async () => {
      const result = await service.createLeague(mockLeagueData);

      expect(result.league.id).toBeDefined();
      expect(result.league.id.length).toBeGreaterThan(0);

      const teamIds = result.teams.map((t) => t.id);
      const uniqueTeamIds = new Set(teamIds);
      expect(uniqueTeamIds.size).toBe(12);

      // League ID should be different from team IDs
      expect(teamIds).not.toContain(result.league.id);
    });
  });

  describe('team creation', () => {
    it('should create correct number of teams', async () => {
      const result = await service.createLeague(mockLeagueData);

      expect(result.teams).toHaveLength(12);
    });

    it('should create teams with correct properties', async () => {
      const result = await service.createLeague(mockLeagueData);
      const team = result.teams[0];

      expect(team.leagueId).toBe(result.league.id);
      expect(team.name).toBeDefined();
      expect(team.name.length).toBeGreaterThan(0);
      expect(team.ownerUserId).toBe(''); // Not assigned yet
      expect(team.capSpace).toBe(200000000); // $200M
      expect(team.roster).toEqual([]);
      expect(team.createdAt).toBeInstanceOf(Date);
      expect(team.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate unique team names', async () => {
      const result = await service.createLeague(mockLeagueData);

      const teamNames = result.teams.map((t) => t.name);
      const uniqueNames = new Set(teamNames);
      expect(uniqueNames.size).toBe(12);
    });
  });

  describe('player setup', () => {
    it('should create enhanced players with personalities', async () => {
      const result = await service.createLeague(mockLeagueData);

      expect(result.players.length).toBeGreaterThan(0);

      for (const playerResult of result.players) {
        expect(playerResult.enhancedPlayer.personality).toBeDefined();
        // Check if personality has the expected structure
        const personality = playerResult.enhancedPlayer.personality;
        expect(personality).toBeDefined();
        expect(typeof personality).toBe('object');

        // Log the first player's personality for debugging
        if (playerResult.enhancedPlayer.name === 'Patrick Mahomes') {
          console.log(
            'Patrick Mahomes personality:',
            JSON.stringify(personality, null, 2)
          );
        }

        // Check that personality has the required properties
        expect(personality).toHaveProperty('type');
        expect(personality).toHaveProperty('traits');
        expect(personality).toHaveProperty('weights');
        expect(personality).toHaveProperty('behaviors');
        expect(personality).toHaveProperty('hiddenSliders');
      }
    });

    it('should calculate realistic overall ratings', async () => {
      const result = await service.createLeague(mockLeagueData);

      for (const playerResult of result.players) {
        const overall = playerResult.overall;
        expect(overall).toBeGreaterThanOrEqual(50);
        expect(overall).toBeLessThanOrEqual(99);

        // QBs should generally have higher ratings
        if (playerResult.enhancedPlayer.position === 'QB') {
          expect(overall).toBeGreaterThanOrEqual(65);
        }
      }
    });

    it('should calculate minimum contracts', async () => {
      const result = await service.createLeague(mockLeagueData);

      for (const playerResult of result.players) {
        const contract = playerResult.minimumContract;

        expect(contract.apy).toBeGreaterThan(0);
        expect(contract.guaranteedAmount).toBeGreaterThan(0);
        expect(contract.years).toBeGreaterThanOrEqual(2);
        expect(contract.years).toBeLessThanOrEqual(5);
        expect(contract.signingBonus).toBeGreaterThan(0);

        // Guaranteed amount should be reasonable relative to total value
        const totalValue = contract.apy * contract.years;
        const guaranteeRatio = contract.guaranteedAmount / totalValue;
        expect(guaranteeRatio).toBeGreaterThan(0.5);
        expect(guaranteeRatio).toBeLessThan(0.9);
      }
    });

    it('should apply position multipliers correctly', async () => {
      const result = await service.createLeague(mockLeagueData);

      const qbPlayers = result.players.filter(
        (p) => p.enhancedPlayer.position === 'QB'
      );
      const wrPlayers = result.players.filter(
        (p) => p.enhancedPlayer.position === 'WR'
      );
      const rbPlayers = result.players.filter(
        (p) => p.enhancedPlayer.position === 'RB'
      );

      if (qbPlayers.length > 0 && wrPlayers.length > 0) {
        const qbContract = qbPlayers[0].minimumContract;
        const wrContract = wrPlayers[0].minimumContract;

        // QBs should have higher APY than WRs for similar overall ratings
        // This tests the position multiplier logic (QB = 2.5x, WR = 1.5x)
        // So QB should be at least 1.67x higher than WR (2.5/1.5)
        const ratio = qbContract.apy / wrContract.apy;
        expect(ratio).toBeGreaterThan(1.5); // QB should be at least 1.5x higher

        // Log the actual values for debugging
        console.log(
          `QB (${qbPlayers[0].enhancedPlayer.name}): ${qbContract.apy}, WR (${wrPlayers[0].enhancedPlayer.name}): ${wrContract.apy}`
        );
        console.log(`Ratio: ${ratio}`);
        console.log(
          `QB overall: ${qbPlayers[0].overall}, WR overall: ${wrPlayers[0].overall}`
        );
      }
    });
  });

  describe('market context', () => {
    it('should initialize market context with position scarcity', async () => {
      const result = await service.createLeague(mockLeagueData);
      const { marketContext } = result;

      expect(marketContext.positionScarcity.QB).toBeDefined();
      expect(marketContext.positionScarcity.RB).toBeDefined();
      expect(marketContext.positionScarcity.WR).toBeDefined();
      expect(marketContext.positionScarcity.TE).toBeDefined();

      // Scarcity should be between 0 and 1
      for (const scarcity of Object.values(marketContext.positionScarcity)) {
        expect(scarcity).toBeGreaterThanOrEqual(0);
        expect(scarcity).toBeLessThanOrEqual(1);
      }
    });

    it('should calculate APY percentiles for each position', async () => {
      const result = await service.createLeague(mockLeagueData);
      const { marketContext } = result;

      const positions: Position[] = ['QB', 'RB', 'WR', 'TE'];
      for (const position of positions) {
        if (marketContext.apyPercentiles[position]) {
          const percentiles = marketContext.apyPercentiles[position];
          expect(percentiles.p25).toBeGreaterThan(0);

          // Handle cases where all values might be the same (e.g., only one player of a position)
          if (percentiles.p25 !== percentiles.p90) {
            expect(percentiles.p50).toBeGreaterThanOrEqual(percentiles.p25);
            expect(percentiles.p75).toBeGreaterThanOrEqual(percentiles.p50);
            expect(percentiles.p90).toBeGreaterThanOrEqual(percentiles.p75);
          } else {
            // All percentiles are the same, which is valid for small sample sizes
            expect(percentiles.p25).toBe(percentiles.p90);
          }
        }
      }
    });

    it('should calculate guarantee percentiles for each position', async () => {
      const result = await service.createLeague(mockLeagueData);
      const { marketContext } = result;

      const positions: Position[] = ['QB', 'RB', 'WR', 'TE'];
      for (const position of positions) {
        if (marketContext.guaranteePercentiles[position]) {
          const percentiles = marketContext.guaranteePercentiles[position];
          expect(percentiles.p25).toBeGreaterThan(0);

          // Handle cases where all values might be the same (e.g., only one player of a position)
          if (percentiles.p25 !== percentiles.p90) {
            expect(percentiles.p50).toBeGreaterThanOrEqual(percentiles.p25);
            expect(percentiles.p75).toBeGreaterThanOrEqual(percentiles.p50);
            expect(percentiles.p90).toBeGreaterThanOrEqual(percentiles.p75);
          } else {
            // All percentiles are the same, which is valid for small sample sizes
            expect(percentiles.p25).toBe(percentiles.p90);
          }
        }
      }
    });

    it('should set initial market trends to stable', async () => {
      const result = await service.createLeague(mockLeagueData);
      const { marketContext } = result;

      for (const trend of Object.values(marketContext.marketTrends)) {
        expect(trend).toBe('stable');
      }
    });
  });

  describe('player market context integration', () => {
    it('should update player market context with league data', async () => {
      const result = await service.createLeague(mockLeagueData);

      for (const playerResult of result.players) {
        const { enhancedPlayer } = playerResult;
        const marketContext = enhancedPlayer.personality.marketContext;

        expect(marketContext.supplyPressure).toBeGreaterThan(0);
        expect(marketContext.supplyPressure).toBeLessThanOrEqual(1);
        expect(marketContext.marketTrend).toBe('stable');
        expect(marketContext.apyPercentiles).toBeDefined();
        expect(marketContext.guaranteePercentiles).toBeDefined();
        expect(marketContext.lastUpdated).toBeGreaterThan(0);
      }
    });

    it('should have consistent market data across players of same position', async () => {
      const result = await service.createLeague(mockLeagueData);

      const qbPlayers = result.players.filter(
        (p) => p.enhancedPlayer.position === 'QB'
      );
      if (qbPlayers.length > 1) {
        const firstQB = qbPlayers[0].enhancedPlayer.personality.marketContext;
        const secondQB = qbPlayers[1].enhancedPlayer.personality.marketContext;

        expect(firstQB.supplyPressure).toBe(secondQB.supplyPressure);
        expect(firstQB.marketTrend).toBe(secondQB.marketTrend);
        expect(firstQB.apyPercentiles).toEqual(secondQB.apyPercentiles);
        expect(firstQB.guaranteePercentiles).toEqual(
          secondQB.guaranteePercentiles
        );
      }
    });
  });

  describe('edge cases', () => {
    it('should handle league with minimum teams', async () => {
      const smallLeagueData = { ...mockLeagueData, numberOfTeams: 2 };
      const result = await service.createLeague(smallLeagueData);

      expect(result.teams).toHaveLength(2);
      expect(result.league.numberOfTeams).toBe(2);
    });

    it('should handle league with maximum teams', async () => {
      const largeLeagueData = { ...mockLeagueData, numberOfTeams: 32 };
      const result = await service.createLeague(largeLeagueData);

      expect(result.teams).toHaveLength(32);
      expect(result.league.numberOfTeams).toBe(32);
    });

    it('should handle different years', async () => {
      const futureLeagueData = { ...mockLeagueData, currentYear: 2030 };
      const result = await service.createLeague(futureLeagueData);

      expect(result.league.currentYear).toBe(2030);
    });
  });

  describe('data consistency', () => {
    it('should maintain data relationships', async () => {
      const result = await service.createLeague(mockLeagueData);

      // All teams should reference the same league
      for (const team of result.teams) {
        expect(team.leagueId).toBe(result.league.id);
      }

      // All players should have valid personalities
      for (const playerResult of result.players) {
        expect(playerResult.enhancedPlayer.personality).toBeDefined();
        expect(playerResult.overall).toBeGreaterThan(0);
        expect(playerResult.minimumContract.apy).toBeGreaterThan(0);
      }

      // Market context should have data for all positions
      const positions: Position[] = ['QB', 'RB', 'WR', 'TE'];
      for (const position of positions) {
        expect(result.marketContext.positionScarcity[position]).toBeDefined();
      }
    });
  });
});
