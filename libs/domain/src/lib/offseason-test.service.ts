import { Injectable } from '@angular/core';
import {
  League,
  LeagueRules,
  LeaguePhase,
  Position,
  FAWeek,
  FAWeekSettings,
  Team,
  TeamLocation,
} from '@fantasy-football-dynasty/types';

export interface OffseasonTestConfig {
  leagueName: string;
  numberOfTeams: number;
  maxContractYears: number;
  rosterRequirements: Record<Position, number>;
  salaryCap: number;
  faWeekDuration: number; // 4 weeks
}

export interface OffseasonTestResult {
  success: boolean;
  leagueId?: string;
  faWeekIds?: string[];
  message: string;
  details?: {
    teamsCreated: number;
    playersLoaded: number;
    faWeeksCreated: number;
    initialPhase: LeaguePhase;
  };
}

@Injectable({
  providedIn: 'root',
})
export class OffseasonTestService {
  private readonly defaultConfig: OffseasonTestConfig = {
    leagueName: 'Offseason Test League',
    numberOfTeams: 12,
    maxContractYears: 3,
    rosterRequirements: {
      QB: 1,
      RB: 2,
      WR: 3,
      TE: 1,
      DEF: 1,
      K: 1,
    },
    salaryCap: 200000000, // $200M
    faWeekDuration: 4,
  };

  /**
   * Create a complete offseason test league
   */
  async createOffseasonTestLeague(
    config: Partial<OffseasonTestConfig> = {}
  ): Promise<OffseasonTestResult> {
    try {
      const testConfig = { ...this.defaultConfig, ...config };

      console.log(
        '[OffseasonTest] Creating test league with config:',
        testConfig
      );

      // 1. Create league with offseason phase
      const league = await this.createTestLeague(testConfig);

      // 2. Create 12 teams with empty rosters
      const teams = await this.createTestTeams(
        league.id,
        testConfig.numberOfTeams
      );

      // 3. Create 4 FA weeks
      const faWeeks = await this.createFAWeeks(
        league.id,
        testConfig.faWeekDuration
      );

      // 4. Set up initial FA week
      await this.activateFirstFAWeek(league.id, faWeeks[0].id);

      console.log('[OffseasonTest] Test league created successfully');

      return {
        success: true,
        leagueId: league.id,
        faWeekIds: faWeeks.map((w) => w.id),
        message: 'Offseason test league created successfully',
        details: {
          teamsCreated: teams.length,
          playersLoaded: 0, // Will be loaded by existing services
          faWeeksCreated: faWeeks.length,
          initialPhase: LeaguePhase.offseason,
        },
      };
    } catch (error) {
      console.error('[OffseasonTest] Error creating test league:', error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Create test league with offseason phase
   */
  private async createTestLeague(config: OffseasonTestConfig): Promise<League> {
    const leagueRules: LeagueRules = {
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
      },
      cap: {
        salaryCap: config.salaryCap,
        minimumSpend: config.salaryCap * 0.8, // 80% minimum spend
        deadMoneyRules: {
          preJune1: true,
          signingBonusAcceleration: true,
        },
      },
      contracts: {
        maxYears: config.maxContractYears,
        maxSigningBonus: config.salaryCap * 0.15, // 15% max bonus
        rookieScale: true,
      },
      draft: {
        mode: 'snake',
        rounds: 7,
        timeLimit: 60,
        snakeOrder: true,
        autodraftDelay: 30,
        rookieAutoContracts: true,
        veteranNegotiationWindow: 24,
      },
      freeAgency: {
        bidRounds: 300, // 5 minutes between rounds
        tieBreakers: ['highest_guarantees', 'highest_apy', 'shorter_length'],
      },
      roster: {
        minPlayers: this.calculateMinPlayers(config.rosterRequirements),
        maxPlayers: 25,
        positionRequirements: config.rosterRequirements,
        allowIR: true,
        allowTaxi: true,
        maxIR: 3,
        maxTaxi: 5,
      },
    };

    // This would integrate with your existing LeagueService
    // For now, return a mock league object
    const league: League = {
      id: `test-league-${Date.now()}`,
      name: config.leagueName,
      description: 'Test league for offseason functionality',
      numberOfTeams: config.numberOfTeams,
      currentYear: new Date().getFullYear(),
      phase: LeaguePhase.offseason,
      status: 'active',
      isPrivate: true,
      joinCode: this.generateJoinCode(),
      rules: leagueRules,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return league;
  }

  /**
   * Create test teams with empty rosters
   */
  private async createTestTeams(
    leagueId: string,
    numberOfTeams: number
  ): Promise<Team[]> {
    const teamNames = [
      'Arizona Cardinals',
      'Atlanta Falcons',
      'Baltimore Ravens',
      'Buffalo Bills',
      'Carolina Panthers',
      'Chicago Bears',
      'Cincinnati Bengals',
      'Cleveland Browns',
      'Dallas Cowboys',
      'Denver Broncos',
      'Detroit Lions',
      'Green Bay Packers',
    ];

    const teams: Team[] = [];

    for (let i = 0; i < numberOfTeams; i++) {
      const team: Team = {
        id: `test-team-${i + 1}`,
        leagueId,
        name: teamNames[i] || `Test Team ${i + 1}`,
        ownerUserId: `test-user-${i + 1}`,
        capSpace: 200000000, // Full cap space
        roster: [], // Empty roster
        location: this.generateTestLocation(i),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      teams.push(team);
    }

    return teams;
  }

  /**
   * Create FA weeks for the offseason
   */
  private async createFAWeeks(
    leagueId: string,
    numberOfWeeks: number
  ): Promise<FAWeek[]> {
    const faWeeks: FAWeek[] = [];
    const startDate = new Date();

    for (let week = 1; week <= numberOfWeeks; week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(startDate.getDate() + (week - 1) * 7);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const faWeek: FAWeek = {
        id: `fa-week-${week}`,
        leagueId,
        weekNumber: week,
        phase: 'FA_WEEK',
        startDate: weekStart,
        endDate: weekEnd,
        status: week === 1 ? 'active' : 'inactive',
        readyTeams: [],
        evaluationResults: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      faWeeks.push(faWeek);
    }

    // Add Open FA phase
    const openFAStart = new Date(startDate);
    openFAStart.setDate(startDate.getDate() + numberOfWeeks * 7);

    const openFA: FAWeek = {
      id: 'open-fa',
      leagueId,
      weekNumber: numberOfWeeks + 1,
      phase: 'OPEN_FA',
      startDate: openFAStart,
      endDate: new Date(openFAStart.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
      status: 'inactive',
      readyTeams: [],
      evaluationResults: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    faWeeks.push(openFA);

    return faWeeks;
  }

  /**
   * Activate the first FA week
   */
  private async activateFirstFAWeek(
    leagueId: string,
    faWeekId: string
  ): Promise<void> {
    console.log(`[OffseasonTest] Activating first FA week: ${faWeekId}`);
    // This would integrate with your existing FreeAgencyService
  }

  /**
   * Calculate minimum players based on roster requirements
   */
  private calculateMinPlayers(requirements: Record<Position, number>): number {
    return Object.values(requirements).reduce((sum, count) => sum + count, 0);
  }

  /**
   * Generate test team locations
   */
  private generateTestLocation(teamIndex: number): TeamLocation {
    const cities = [
      { city: 'Phoenix', state: 'AZ', climate: 'warm', marketSize: 'large' },
      { city: 'Atlanta', state: 'GA', climate: 'warm', marketSize: 'large' },
      {
        city: 'Baltimore',
        state: 'MD',
        climate: 'temperate',
        marketSize: 'medium',
      },
      { city: 'Buffalo', state: 'NY', climate: 'cold', marketSize: 'small' },
      {
        city: 'Charlotte',
        state: 'NC',
        climate: 'temperate',
        marketSize: 'medium',
      },
      { city: 'Chicago', state: 'IL', climate: 'cold', marketSize: 'large' },
      {
        city: 'Cincinnati',
        state: 'OH',
        climate: 'temperate',
        marketSize: 'medium',
      },
      { city: 'Cleveland', state: 'OH', climate: 'cold', marketSize: 'medium' },
      { city: 'Dallas', state: 'TX', climate: 'warm', marketSize: 'large' },
      { city: 'Denver', state: 'CO', climate: 'cold', marketSize: 'large' },
      { city: 'Detroit', state: 'MI', climate: 'cold', marketSize: 'large' },
      { city: 'Green Bay', state: 'WI', climate: 'cold', marketSize: 'small' },
    ];

    const cityData = cities[teamIndex] || cities[0];

    return {
      city: cityData.city,
      state: cityData.state,
      timezone: 'America/New_York', // Default timezone
      marketSize: cityData.marketSize,
      climate: cityData.climate,
      stadiumName: `${cityData.city} Stadium`,
      stadiumCapacity: 65000 + Math.floor(Math.random() * 20000),
      isContender: Math.random() > 0.7, // 30% chance of being contender
      isStable: Math.random() > 0.3, // 70% chance of stable management
      taxRate: this.getTaxRate(cityData.state),
    };
  }

  /**
   * Get tax rate for a state
   */
  private getTaxRate(state: string): number {
    const taxRates: Record<string, number> = {
      TX: 0,
      FL: 0,
      WA: 0,
      NV: 0,
      SD: 0,
      WY: 0,
      TN: 0,
      AZ: 0.025,
      CO: 0.044,
      IL: 0.0495,
      NC: 0.0499,
      GA: 0.0575,
      NY: 0.0685,
      CA: 0.075,
      MD: 0.0575,
      OH: 0.0399,
      MI: 0.0425,
      WI: 0.0765,
      PA: 0.0307,
      MN: 0.098,
      OR: 0.099,
    };

    return taxRates[state] || 0.05; // Default 5%
  }

  /**
   * Generate a unique join code
   */
  private generateJoinCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Run a complete offseason simulation
   */
  async runOffseasonSimulation(leagueId: string): Promise<void> {
    console.log(
      '[OffseasonTest] Starting offseason simulation for league:',
      leagueId
    );

    // This would integrate with your existing services to:
    // 1. Load players into the league
    // 2. Simulate 4 weeks of FA bidding
    // 3. Process player decisions each week
    // 4. Transition to open FA
    // 5. Simulate immediate signings
  }
}

