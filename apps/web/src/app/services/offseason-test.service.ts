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

export interface TeamBidResult {
  teamId: string;
  teamName: string;
  totalBids: number;
  successfulBids: number;
  failedBids: number;
  pendingBids: number;
  totalSpent: number;
  capSpaceRemaining: number;
  rosterFilled: number;
  rosterTarget: number;
  completionPercentage: number;
  lastBidTime?: Date;
  bidHistory: BidHistory[];
}

export interface BidHistory {
  playerId: string;
  teamId: string;
  leagueId: string;
  playerName: string;
  position: string;
  bidAmount: number;
  contractYears: number;
  status: 'pending' | 'accepted' | 'rejected' | 'shortlisted';
  submittedAt: Date;
  resolvedAt?: Date;
  feedback?: string;
}

export interface LeagueBidSummary {
  totalBids: number;
  successfulBids: number;
  failedBids: number;
  pendingBids: number;
  totalValue: number;
  averageBidAmount: number;
  mostActiveTeam: string;
  mostSuccessfulTeam: string;
  positionDemand: Record<Position, number>;
  weeklyProgress: WeeklyProgress[];
}

export interface WeeklyProgress {
  week: number;
  bidsSubmitted: number;
  bidsResolved: number;
  playersSigned: number;
  totalValue: number;
  averageBidAmount: number;
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
      DL: 0,
      LB: 0,
      DB: 0,
    },
    salaryCap: 200000000, // $200M
    faWeekDuration: 4,
  };

  // Mock data for demonstration
  private mockBids: BidHistory[] = [];
  private mockTeams: Team[] = [];
  private currentWeek = 1;
  private totalPlayers = 0;

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
        tieBreakers: ['guarantees', 'apy', 'length'],
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

    // Store teams for later use in bid tracking
    this.mockTeams = teams;

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
        status: week === 1 ? 'active' : 'completed',
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
      status: 'completed',
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
      {
        city: 'Phoenix',
        state: 'AZ',
        climate: 'warm' as const,
        marketSize: 'large' as const,
      },
      {
        city: 'Atlanta',
        state: 'GA',
        climate: 'warm' as const,
        marketSize: 'large' as const,
      },
      {
        city: 'Baltimore',
        state: 'MD',
        climate: 'temperate' as const,
        marketSize: 'medium' as const,
      },
      {
        city: 'Buffalo',
        state: 'NY',
        climate: 'cold' as const,
        marketSize: 'small' as const,
      },
      {
        city: 'Charlotte',
        state: 'NC',
        climate: 'temperate' as const,
        marketSize: 'medium' as const,
      },
      {
        city: 'Chicago',
        state: 'IL',
        climate: 'cold' as const,
        marketSize: 'large' as const,
      },
      {
        city: 'Cincinnati',
        state: 'OH',
        climate: 'temperate' as const,
        marketSize: 'medium' as const,
      },
      {
        city: 'Cleveland',
        state: 'OH',
        climate: 'cold' as const,
        marketSize: 'medium' as const,
      },
      {
        city: 'Dallas',
        state: 'TX',
        climate: 'warm' as const,
        marketSize: 'large' as const,
      },
      {
        city: 'Denver',
        state: 'CO',
        climate: 'cold' as const,
        marketSize: 'large' as const,
      },
      {
        city: 'Detroit',
        state: 'MI',
        climate: 'cold' as const,
        marketSize: 'large' as const,
      },
      {
        city: 'Green Bay',
        state: 'WI',
        climate: 'cold' as const,
        marketSize: 'small' as const,
      },
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

  /**
   * Simulate team bidding activity
   */
  async simulateTeamBidding(leagueId: string): Promise<void> {
    console.log('[OffseasonTest] Simulating team bidding activity...');

    // Generate mock bids for demonstration
    this.mockBids = this.generateMockBids(leagueId);

    // Simulate bid processing over time
    await this.processMockBids();
  }

  /**
   * Get comprehensive team results
   */
  async getTeamResults(leagueId: string): Promise<TeamBidResult[]> {
    const teams = this.mockTeams.filter((t) => t.leagueId === leagueId);
    const results: TeamBidResult[] = [];

    for (const team of teams) {
      const teamBids = this.mockBids.filter((b) => b.teamId === team.id);

      const result: TeamBidResult = {
        teamId: team.id,
        teamName: team.name,
        totalBids: teamBids.length,
        successfulBids: teamBids.filter((b) => b.status === 'accepted').length,
        failedBids: teamBids.filter((b) => b.status === 'rejected').length,
        pendingBids: teamBids.filter((b) => b.status === 'pending').length,
        totalSpent: teamBids
          .filter((b) => b.status === 'accepted')
          .reduce((sum, bid) => sum + bid.bidAmount, 0),
        capSpaceRemaining:
          team.capSpace -
          teamBids
            .filter((b) => b.status === 'accepted')
            .reduce((sum, bid) => sum + bid.bidAmount, 0),
        rosterFilled: teamBids.filter((b) => b.status === 'accepted').length,
        rosterTarget: 9, // Based on our roster requirements
        completionPercentage: Math.round(
          (teamBids.filter((b) => b.status === 'accepted').length / 9) * 100
        ),
        lastBidTime:
          teamBids.length > 0
            ? new Date(
                Math.max(...teamBids.map((b) => b.submittedAt.getTime()))
              )
            : undefined,
        bidHistory: teamBids.sort(
          (a, b) => b.submittedAt.getTime() - a.submittedAt.getTime()
        ),
      };

      results.push(result);
    }

    return results.sort((a, b) => b.successfulBids - a.successfulBids);
  }

  /**
   * Get league-wide bid summary
   */
  async getLeagueBidSummary(leagueId: string): Promise<LeagueBidSummary> {
    const allBids = this.mockBids.filter((b) => b.leagueId === leagueId);
    const teams = this.mockTeams.filter((t) => t.leagueId === leagueId);

    const totalBids = allBids.length;
    const successfulBids = allBids.filter(
      (b) => b.status === 'accepted'
    ).length;
    const failedBids = allBids.filter((b) => b.status === 'rejected').length;
    const pendingBids = allBids.filter((b) => b.status === 'pending').length;

    const totalValue = allBids
      .filter((b) => b.status === 'accepted')
      .reduce((sum, bid) => sum + bid.bidAmount, 0);

    const averageBidAmount = totalValue / Math.max(successfulBids, 1);

    // Find most active and successful teams
    const teamStats = teams.map((team) => {
      const teamBids = allBids.filter((b) => b.teamId === team.id);
      return {
        teamName: team.name,
        totalBids: teamBids.length,
        successfulBids: teamBids.filter((b) => b.status === 'accepted').length,
      };
    });

    const mostActiveTeam = teamStats.reduce((max, team) =>
      team.totalBids > max.totalBids ? team : max
    ).teamName;

    const mostSuccessfulTeam = teamStats.reduce((max, team) =>
      team.successfulBids > max.successfulBids ? team : max
    ).teamName;

    // Position demand analysis
    const positionDemand: Record<Position, number> = {
      QB: allBids.filter((b) => b.position === 'QB').length,
      RB: allBids.filter((b) => b.position === 'RB').length,
      WR: allBids.filter((b) => b.position === 'WR').length,
      TE: allBids.filter((b) => b.position === 'TE').length,
      DEF: allBids.filter((b) => b.position === 'DEF').length,
      K: allBids.filter((b) => b.position === 'K').length,
      DL: allBids.filter((b) => b.position === 'DL').length,
      LB: allBids.filter((b) => b.position === 'LB').length,
      DB: allBids.filter((b) => b.position === 'DB').length,
    };

    // Weekly progress simulation
    const weeklyProgress: WeeklyProgress[] = [];
    for (let week = 1; week <= 4; week++) {
      const weekBids = allBids.filter((b) => {
        const bidWeek =
          Math.floor(
            (Date.now() - b.submittedAt.getTime()) / (7 * 24 * 60 * 60 * 1000)
          ) + 1;
        return bidWeek === week;
      });

      weeklyProgress.push({
        week,
        bidsSubmitted: weekBids.length,
        bidsResolved: weekBids.filter((b) => b.status !== 'pending').length,
        playersSigned: weekBids.filter((b) => b.status === 'accepted').length,
        totalValue: weekBids
          .filter((b) => b.status === 'accepted')
          .reduce((sum, bid) => sum + bid.bidAmount, 0),
        averageBidAmount:
          weekBids.length > 0
            ? weekBids.reduce((sum, bid) => sum + bid.bidAmount, 0) /
              weekBids.length
            : 0,
      });
    }

    return {
      totalBids,
      successfulBids,
      failedBids,
      pendingBids,
      totalValue,
      averageBidAmount,
      mostActiveTeam,
      mostSuccessfulTeam,
      positionDemand,
      weeklyProgress,
    };
  }

  /**
   * Generate mock bids for demonstration
   */
  private generateMockBids(leagueId: string): BidHistory[] {
    const bids: BidHistory[] = [];
    const teams = this.mockTeams.filter((t) => t.leagueId === leagueId);
    const positions: Position[] = ['QB', 'RB', 'WR', 'TE', 'DEF', 'K'];

    // Generate 3-8 bids per team over 4 weeks
    for (const team of teams) {
      const numBids = Math.floor(Math.random() * 6) + 3; // 3-8 bids

      for (let i = 0; i < numBids; i++) {
        const position =
          positions[Math.floor(Math.random() * positions.length)];
        const bidAmount = Math.floor(Math.random() * 20000000) + 5000000; // $5M - $25M
        const contractYears = Math.floor(Math.random() * 3) + 1; // 1-3 years

        // Simulate bid timing over 4 weeks
        const weekOffset = Math.floor(Math.random() * 4);
        const submittedAt = new Date(
          Date.now() - weekOffset * 7 * 24 * 60 * 60 * 1000
        );

        // Simulate bid resolution
        let status: 'pending' | 'accepted' | 'rejected' | 'shortlisted' =
          'pending';
        let resolvedAt: Date | undefined;
        let feedback: string | undefined;

        if (weekOffset < 3) {
          // Bids from weeks 1-3 are resolved
          const statuses: ('accepted' | 'rejected' | 'shortlisted')[] = [
            'accepted',
            'rejected',
            'shortlisted',
          ];
          status = statuses[Math.floor(Math.random() * statuses.length)];
          resolvedAt = new Date(
            submittedAt.getTime() + 7 * 24 * 60 * 60 * 1000
          );

          if (status === 'rejected') {
            feedback = this.generateRejectionFeedback();
          } else if (status === 'shortlisted') {
            feedback = this.generateShortlistFeedback();
          }
        }

        bids.push({
          playerId: `player-${team.id}-${i}`,
          teamId: team.id,
          leagueId: leagueId,
          playerName: this.generatePlayerName(position),
          position,
          bidAmount,
          contractYears,
          status,
          submittedAt,
          resolvedAt,
          feedback,
        });
      }
    }

    return bids;
  }

  /**
   * Process mock bids to simulate real-time updates
   */
  private async processMockBids(): Promise<void> {
    console.log('[OffseasonTest] Processing mock bids...');

    // Simulate bid processing delays
    for (const bid of this.mockBids.filter((b) => b.status === 'pending')) {
      await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay

      // Simulate bid resolution
      if (Math.random() > 0.7) {
        // 30% chance of resolution
        const statuses: ('accepted' | 'rejected' | 'shortlisted')[] = [
          'accepted',
          'rejected',
          'shortlisted',
        ];
        bid.status = statuses[Math.floor(Math.random() * statuses.length)];
        bid.resolvedAt = new Date();

        if (bid.status === 'rejected') {
          bid.feedback = this.generateRejectionFeedback();
        } else if (bid.status === 'shortlisted') {
          bid.feedback = this.generateShortlistFeedback();
        }
      }
    }
  }

  /**
   * Generate realistic player names
   */
  private generatePlayerName(position: Position): string {
    const firstNames = [
      'James',
      'Michael',
      'David',
      'Robert',
      'John',
      'William',
      'Richard',
      'Joseph',
      'Thomas',
      'Christopher',
    ];
    const lastNames = [
      'Smith',
      'Johnson',
      'Williams',
      'Brown',
      'Jones',
      'Garcia',
      'Miller',
      'Davis',
      'Rodriguez',
      'Martinez',
    ];

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

    return `${firstName} ${lastName}`;
  }

  /**
   * Generate realistic rejection feedback
   */
  private generateRejectionFeedback(): string {
    const feedbacks = [
      'Offer below market value for player of this caliber',
      "Contract length doesn't align with player's career goals",
      "Team's competitive situation not appealing to player",
      'Location/climate preferences not met',
      'Player seeking more guaranteed money',
      "Team's recent performance doesn't match player's ambitions",
    ];

    return feedbacks[Math.floor(Math.random() * feedbacks.length)];
  }

  /**
   * Generate realistic shortlist feedback
   */
  private generateShortlistFeedback(): string {
    const feedbacks = [
      'Player interested but waiting for better offers',
      'Contract terms are close but need minor adjustments',
      'Player considering multiple competitive offers',
      'Waiting to see market development for position',
      'Player wants to evaluate all options before deciding',
    ];

    return feedbacks[Math.floor(Math.random() * feedbacks.length)];
  }

  /**
   * Load players into the league
   */
  async loadPlayers(
    leagueId: string
  ): Promise<{ success: boolean; playerCount: number; message: string }> {
    try {
      // Simulate loading players
      this.totalPlayers = Math.floor(Math.random() * 200) + 100; // 100-300 players

      return {
        success: true,
        playerCount: this.totalPlayers,
        message: `Successfully loaded ${this.totalPlayers} players into the league`,
      };
    } catch (error) {
      return {
        success: false,
        playerCount: 0,
        message: 'Failed to load players',
      };
    }
  }

  /**
   * Get current week status
   */
  getCurrentWeek(): number {
    return this.currentWeek;
  }

  /**
   * Get total players loaded
   */
  getTotalPlayers(): number {
    return this.totalPlayers;
  }

  /**
   * Advance to next week and process bids
   */
  async advanceWeek(leagueId: string): Promise<{
    success: boolean;
    week: number;
    bidsProcessed: number;
    playersSigned: number;
    message: string;
  }> {
    try {
      if (this.currentWeek >= 4) {
        return {
          success: false,
          week: this.currentWeek,
          bidsProcessed: 0,
          playersSigned: 0,
          message: 'Already at Week 4. Use "Simulate Bidding" for Open FA.',
        };
      }

      // Process current week's bids
      const weekBids = this.mockBids.filter((b) => {
        const bidWeek =
          Math.floor(
            (Date.now() - b.submittedAt.getTime()) / (7 * 24 * 60 * 60 * 1000)
          ) + 1;
        return bidWeek === this.currentWeek && b.status === 'pending';
      });

      let bidsProcessed = 0;
      let playersSigned = 0;

      for (const bid of weekBids) {
        // Simulate bid resolution
        const statuses: ('accepted' | 'rejected' | 'shortlisted')[] = [
          'accepted',
          'rejected',
          'shortlisted',
        ];
        bid.status = statuses[Math.floor(Math.random() * statuses.length)];
        bid.resolvedAt = new Date();

        if (bid.status === 'accepted') {
          playersSigned++;
        }

        if (bid.status === 'rejected') {
          bid.feedback = this.generateRejectionFeedback();
        } else if (bid.status === 'shortlisted') {
          bid.feedback = this.generateShortlistFeedback();
        }

        bidsProcessed++;
      }

      this.currentWeek++;

      return {
        success: true,
        week: this.currentWeek,
        bidsProcessed,
        playersSigned,
        message: `Week ${
          this.currentWeek - 1
        } completed. ${bidsProcessed} bids processed, ${playersSigned} players signed.`,
      };
    } catch (error) {
      return {
        success: false,
        week: this.currentWeek,
        bidsProcessed: 0,
        playersSigned: 0,
        message: `Error advancing week: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }
}
