import {
  League,
  Team,
  Player,
  Contract,
  LeagueRules,
  ScoringRules,
  CapRules,
  Position,
  User,
  UserRole,
} from '@fantasy-football-dynasty/types';

export class TestFixtures {
  static createLeague(overrides: Partial<League> = {}): League {
    return {
      id: 'league-1',
      name: 'Test Dynasty League',
      rules: this.createLeagueRules(),
      currentYear: 2024,
      phase: 'offseason',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    };
  }

  static createLeagueRules(overrides: Partial<LeagueRules> = {}): LeagueRules {
    return {
      scoring: this.createScoringRules(),
      cap: this.createCapRules(),
      contracts: {
        maxYears: 7,
        maxSigningBonus: 50000000,
        rookieScale: true,
      },
      draft: {
        rounds: 5,
        timeLimit: 60,
        snakeOrder: true,
      },
      freeAgency: {
        bidRounds: 30,
        tieBreakers: ['guarantees', 'apy', 'length', 'random'],
      },
      roster: {
        minPlayers: 15,
        maxPlayers: 25,
        positionRequirements: {
          QB: 2,
          RB: 4,
          WR: 6,
          TE: 2,
          K: 1,
          DEF: 1,
        },
        allowIR: true,
        allowTaxi: true,
        maxIR: 3,
        maxTaxi: 4,
      },
      ...overrides,
    };
  }

  static createScoringRules(
    overrides: Partial<ScoringRules> = {}
  ): ScoringRules {
    return {
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
      ...overrides,
    };
  }

  static createCapRules(overrides: Partial<CapRules> = {}): CapRules {
    return {
      salaryCap: 200000000,
      minimumSpend: 180000000,
      deadMoneyRules: {
        preJune1: true,
        signingBonusAcceleration: true,
      },
      ...overrides,
    };
  }

  static createTeam(overrides: Partial<Team> = {}): Team {
    return {
      id: 'team-1',
      leagueId: 'league-1',
      name: 'Test Team',
      ownerUserId: 'user-1',
      capSpace: 50000000,
      roster: [],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    };
  }

  static createPlayer(overrides: Partial<Player> = {}): Player {
    return {
      id: 'player-1',
      name: 'Test Player',
      nflTeam: 'KC',
      position: 'QB',
      age: 25,
      devGrade: 'A',
      overall: 85,
      traits: {
        speed: 80,
        strength: 70,
        agility: 75,
        awareness: 85,
        injury: 90,
        schemeFit: ['West Coast', 'Spread'],
      },
      stats: [],
      ...overrides,
    };
  }

  static createContract(overrides: Partial<Contract> = {}): Contract {
    return {
      id: 'contract-1',
      playerId: 'player-1',
      teamId: 'team-1',
      startYear: 2024,
      endYear: 2027,
      baseSalary: {
        2024: 5000000,
        2025: 6000000,
        2026: 7000000,
        2027: 8000000,
      },
      signingBonus: 10000000,
      guarantees: [
        { type: 'full', amount: 15000000, year: 2024 },
        { type: 'full', amount: 5000000, year: 2025 },
      ],
      noTradeClause: false,
      createdAt: new Date('2024-01-01'),
      ...overrides,
    };
  }

  static createUser(overrides: Partial<User> = {}): User {
    return {
      id: 'user-1',
      authProviderId: 'auth-1',
      displayName: 'Test User',
      email: 'test@example.com',
      roles: ['owner'],
      createdAt: new Date('2024-01-01'),
      ...overrides,
    };
  }

  static createQBPlayer(
    name: string,
    nflTeam: string,
    overall: number = 80
  ): Player {
    return this.createPlayer({
      name,
      nflTeam,
      position: 'QB',
      overall,
      traits: {
        speed: 70 + Math.floor(Math.random() * 20),
        strength: 60 + Math.floor(Math.random() * 20),
        agility: 70 + Math.floor(Math.random() * 20),
        awareness: 80 + Math.floor(Math.random() * 20),
        injury: 80 + Math.floor(Math.random() * 20),
        schemeFit: ['West Coast', 'Spread'],
      },
    });
  }

  static createRBPlayer(
    name: string,
    nflTeam: string,
    overall: number = 80
  ): Player {
    return this.createPlayer({
      name,
      nflTeam,
      position: 'RB',
      overall,
      traits: {
        speed: 80 + Math.floor(Math.random() * 20),
        strength: 70 + Math.floor(Math.random() * 20),
        agility: 80 + Math.floor(Math.random() * 20),
        awareness: 70 + Math.floor(Math.random() * 20),
        injury: 75 + Math.floor(Math.random() * 20),
        schemeFit: ['Zone Blocking', 'Power'],
      },
    });
  }

  static createWRPlayer(
    name: string,
    nflTeam: string,
    overall: number = 80
  ): Player {
    return this.createPlayer({
      name,
      nflTeam,
      position: 'WR',
      overall,
      traits: {
        speed: 85 + Math.floor(Math.random() * 15),
        strength: 60 + Math.floor(Math.random() * 20),
        agility: 85 + Math.floor(Math.random() * 15),
        awareness: 75 + Math.floor(Math.random() * 20),
        injury: 80 + Math.floor(Math.random() * 20),
        schemeFit: ['Air Raid', 'West Coast'],
      },
    });
  }

  static createRookieContract(
    playerId: string,
    teamId: string,
    startYear: number
  ): Contract {
    const baseSalary = 1000000; // Rookie minimum
    return this.createContract({
      playerId,
      teamId,
      startYear,
      endYear: startYear + 3,
      baseSalary: {
        [startYear]: baseSalary,
        [startYear + 1]: baseSalary + 100000,
        [startYear + 2]: baseSalary + 200000,
        [startYear + 3]: baseSalary + 300000,
      },
      signingBonus: 2000000,
      guarantees: [{ type: 'full', amount: 4000000, year: startYear }],
    });
  }
}

export class MockData {
  static createMockLeague(): League {
    return TestFixtures.createLeague();
  }

  static createMockTeams(count: number = 12): Team[] {
    return Array.from({ length: count }, (_, i) =>
      TestFixtures.createTeam({
        id: `team-${i + 1}`,
        name: `Team ${i + 1}`,
        capSpace: 50000000 + i * 1000000,
      })
    );
  }

  static createMockPlayers(count: number = 100): Player[] {
    const positions: Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
    const teams = [
      'KC',
      'BUF',
      'CIN',
      'BAL',
      'PIT',
      'CLE',
      'HOU',
      'IND',
      'JAX',
      'TEN',
    ];

    return Array.from({ length: count }, (_, i) => {
      const position = positions[i % positions.length];
      const nflTeam = teams[i % teams.length];
      const overall = 70 + Math.floor(Math.random() * 30);

      return TestFixtures.createPlayer({
        id: `player-${i + 1}`,
        name: `Player ${i + 1}`,
        nflTeam,
        position,
        overall,
        age: 22 + Math.floor(Math.random() * 15),
      });
    });
  }
}
