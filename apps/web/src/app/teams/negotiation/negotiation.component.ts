import {
  Component,
  signal,
  computed,
  inject,
  Input,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { Contract, Position, Guarantee } from '@fantasy-football-dynasty/types';
import { TeamService } from '../../services/team.service';
import { LeagueMembershipService } from '../../services/league-membership.service';
import {
  PlayerDataService,
  SleeperPlayer,
} from '../../services/player-data.service';
import {
  ContractMinimumCalculator,
  CapMath,
  ContractValidator,
  PlayerRatingCalculator,
  PlayerPersonalityGenerator,
  PlayerPersonality,
  NegotiationEngine,
  Offer,
  NegotiationResult,
} from '@fantasy-football-dynasty/domain';
import { ThemeService } from '../../services/theme.service';
import { NegotiationService } from '../../services/negotiation.service';
import { NumberFormatService } from '../../services/number-format.service';
import { LeagueService } from '../../services/league.service';

export interface ContractFormData {
  years: number;
  baseSalary: Record<number, number>;
  signingBonus: number;
  guarantees: Guarantee[];
  noTradeClause: boolean;
}

export interface ContractValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  minimumRequired: number;
  capImpact: {
    canAfford: boolean;
    currentCapHit: number;
    newCapHit: number;
    remainingCap: number;
  };
}

@Component({
  selector: 'app-negotiation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    SelectButtonModule,
    ProgressBarModule,
    MessageModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './negotiation.component.html',
  styleUrls: ['./negotiation.component.scss'],
})
export class NegotiationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly playerDataService = inject(PlayerDataService);
  private readonly teamService = inject(TeamService);
  private readonly leagueService = inject(LeagueService);
  private readonly themeService = inject(ThemeService);
  private readonly negotiationService = inject(NegotiationService);
  public readonly numberFormatService = inject(NumberFormatService);
  private readonly leagueMembershipService = inject(LeagueMembershipService);

  // Route parameters
  private _playerId = signal<string>('');
  private _teamId = signal<string>('');

  // Component state
  private _isLoading = signal(true);
  private _error = signal<string | null>(null);

  // Public readonly signals
  public playerId = this._playerId.asReadonly();
  public teamId = this._teamId.asReadonly();
  public leagueId = this.leagueService.selectedLeagueId;
  public isLoading = this._isLoading.asReadonly();
  public error = this._error.asReadonly();
  public currentTheme = this.themeService.currentTheme;
  public isDarkMode = this.themeService.isDarkMode;

  // Contract form data
  contractData: ContractFormData = {
    years: 1,
    baseSalary: { 1: 0 },
    signingBonus: 0,
    guarantees: [],
    noTradeClause: false,
  };

  // Formatted display values for inputs
  formattedSalary: string = '';
  formattedBonus: string = '';

  // Computed validation
  public contractValidation = computed(() => this.validateContract());

  // Computed player personality
  public playerPersonality = computed(() => {
    const player = this.getPlayerData();
    if (!player) return null;
    return PlayerPersonalityGenerator.generatePersonality(player);
  });

  // Computed player rating
  public playerRating = computed(() => {
    const player = this.getPlayerData();
    if (!player) return 70;
    return PlayerRatingCalculator.calculatePlayerOVR(player);
  });

  // Negotiation-related signals
  public isNegotiating = this.negotiationService.isNegotiating;
  public currentRound = this.negotiationService.currentRound;
  public remainingPatience = this.negotiationService.remainingPatience;
  public negotiationHistory = this.negotiationService.negotiationHistory;
  public currentSession = this.negotiationService.currentSession;

  // League settings
  public salaryCap = 200000000; // Default 200M cap
  public existingContracts: Contract[] = []; // TODO: Load from service

  async ngOnInit(): Promise<void> {
    try {
      this._isLoading.set(true);
      this._error.set(null);

      // Get route parameters
      const params = this.route.snapshot.paramMap;
      const playerId = params.get('playerId');
      const leagueId = this.leagueId();

      if (!playerId || !leagueId) {
        throw new Error('Missing required route parameters');
      }

      this._playerId.set(playerId);

      // Get teamId from league membership
      const memberships = this.leagueMembershipService.userMemberships();
      const myMembership = memberships.find(
        (m) => m.leagueId === leagueId && m.isActive
      );

      if (!myMembership?.teamId) {
        throw new Error('Team not found for current user');
      }

      this._teamId.set(myMembership.teamId);

      // Load players if not already loaded
      if (!this.playerDataService.hasPlayers()) {
        await this.playerDataService.loadPlayers();
      }

      // Verify player exists
      const player = this.playerDataService.getPlayer(playerId);
      if (!player) {
        throw new Error('Player not found');
      }

      // Initialize formatted inputs
      this.formattedSalary = this.getFormattedSalary();
      this.formattedBonus = this.getFormattedBonus();
    } catch (error) {
      console.error('Error initializing NegotiationComponent:', error);
      this._error.set(
        error instanceof Error ? error.message : 'Failed to load negotiation'
      );
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Get player name for display
   */
  getPlayerName(): string {
    const player = this.playerDataService.getPlayer(this.playerId());
    return player
      ? `${player.first_name} ${player.last_name}`
      : 'Unknown Player';
  }

  /**
   * Get player data for validation
   */
  getPlayerData(): SleeperPlayer | null {
    return this.playerDataService.getPlayer(this.playerId());
  }

  /**
   * Get contract years array
   */
  getContractYears(): number[] {
    return Array.from({ length: this.contractData.years }, (_, i) => i + 1);
  }

  /**
   * Update base salary years when contract length changes
   */
  updateBaseSalaryYears(): void {
    const years = this.getContractYears();
    const newBaseSalary: Record<number, number> = {};

    years.forEach((year) => {
      newBaseSalary[year] = this.contractData.baseSalary[year] || 0;
    });

    this.contractData.baseSalary = newBaseSalary;

    // Update guarantee years if they're out of range
    this.contractData.guarantees = this.contractData.guarantees.filter(
      (guarantee) => guarantee.year <= this.contractData.years
    );
  }

  /**
   * Calculate total contract value
   */
  getTotalValue(): number {
    const baseSalaryTotal = Object.values(this.contractData.baseSalary).reduce(
      (sum, salary) => sum + salary,
      0
    );
    return baseSalaryTotal + this.contractData.signingBonus;
  }

  /**
   * Calculate average per year (APY)
   */
  getAPY(): number {
    return this.contractData.years > 0
      ? this.getTotalValue() / this.contractData.years
      : 0;
  }

  /**
   * Calculate total guaranteed amount
   */
  getGuaranteedAmount(): number {
    return this.contractData.guarantees.reduce(
      (sum, guarantee) => sum + guarantee.amount,
      0
    );
  }

  /**
   * Validate the contract comprehensively
   */
  private validateContract(): ContractValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Create a contract object for validation
    const contract: Omit<Contract, 'id' | 'createdAt'> = {
      playerId: this.playerId(),
      teamId: this.teamId(),
      startYear: new Date().getFullYear(),
      endYear: new Date().getFullYear() + this.contractData.years - 1,
      baseSalary: this.contractData.baseSalary,
      signingBonus: this.contractData.signingBonus,
      guarantees: this.contractData.guarantees,
      noTradeClause: this.contractData.noTradeClause,
    };

    // Basic contract validation
    const contractErrors = ContractValidator.validateContract(
      contract as Contract
    );
    errors.push(...contractErrors);

    // Minimum contract validation
    const player = this.getPlayerData();
    if (player) {
      const isRookie = player.years_exp === 0;
      const draftRound = isRookie ? 3 : undefined;

      const minimumValidation =
        ContractMinimumCalculator.validateContractMinimum(
          contract as Contract,
          {
            age: player.age,
            position: player.position as Position,
            overall: player.search_rank || 70,
            yearsExp: player.years_exp,
          },
          this.salaryCap,
          isRookie,
          draftRound
        );

      if (!minimumValidation.isValid) {
        errors.push(minimumValidation.message);
      }
    }

    // Cap space validation
    const currentYear = new Date().getFullYear();
    const capImpact = CapMath.canAffordContractByYear(
      { id: this.teamId(), capSpace: this.salaryCap } as any,
      contract as Contract,
      this.existingContracts,
      currentYear,
      this.salaryCap
    );

    if (!capImpact.canAfford) {
      errors.push(
        `Contract exceeds salary cap by ${this.numberFormatService.formatCurrency(
          capImpact.newCapHit - capImpact.remainingCap
        )}`
      );
    }

    // Warnings for high-value contracts
    if (this.getTotalValue() > this.salaryCap * 0.15) {
      warnings.push('This contract represents more than 15% of the salary cap');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      minimumRequired: player
        ? ContractMinimumCalculator.validateContractMinimum(
            contract as Contract,
            {
              age: player.age,
              position: player.position as Position,
              overall: player.search_rank || 70,
              yearsExp: player.years_exp,
            },
            this.salaryCap,
            player.years_exp === 0,
            player.years_exp === 0 ? 3 : undefined
          ).minimumRequired
        : 0,
      capImpact,
    };
  }

  /**
   * Check if form is valid
   */
  isFormValid(): boolean {
    const validation = this.contractValidation();
    return validation.isValid;
  }

  /**
   * Get expected contract value based on player tier and market
   */
  getExpectedValue(): number {
    const player = this.getPlayerData();
    if (!player) return 8000000; // Default 8M

    const ovr = this.playerRating();
    const baseValue = ovr * 100000; // 70 OVR = 7M base

    const personality = this.playerPersonality();
    if (personality) {
      const riskModifier = 1 + personality.riskTolerance * 0.2;
      const securityModifier = 1 + personality.securityPref * 0.15;
      return Math.round(baseValue * riskModifier * securityModifier);
    }

    return Math.round(baseValue);
  }

  /**
   * Get player tag based on age and experience
   */
  getPlayerTag(): string {
    const player = this.getPlayerData();
    if (!player) return 'UNKNOWN';

    if (player.years_exp === 0) return 'ROOKIE';
    if (player.age <= 25) return 'YOUNG STAR';
    if (player.age <= 28) return 'BRIDGE PLAYER';
    if (player.age <= 32) return 'VETERAN';
    return 'AGING VETERAN';
  }

  /**
   * Get risk percentage for the offer
   * Returns 0-100 where 0 = low risk (green), 100 = high risk (red)
   */
  getRiskPercentage(): number {
    const player = this.getPlayerData();
    if (!player) return 50;

    const expectedValue = this.getExpectedValue();
    const offeredValue = this.getTotalValue();
    
    // If no expected value, return medium risk
    if (expectedValue === 0) return 50;
    
    // Calculate how close the offer is to expected value (0-100%)
    const ratio = offeredValue / expectedValue;
    
    if (ratio >= 1.0) {
      // Offer is at or above expected value - low risk
      return Math.max(0, 100 - Math.min(100, (ratio - 1.0) * 200));
    } else {
      // Offer is below expected value - higher risk the further below
      return Math.min(100, (1.0 - ratio) * 100);
    }
  }

  /**
   * Get risk level text (LOW, MEDIUM, HIGH)
   */
  getRiskLevel(): string {
    const riskPercentage = this.getRiskPercentage();
    
    if (riskPercentage <= 25) return 'LOW';
    if (riskPercentage <= 60) return 'MEDIUM';
    return 'HIGH';
  }

  /**
   * Get risk color class for styling
   */
  getRiskColor(): string {
    const riskPercentage = this.getRiskPercentage();
    
    if (riskPercentage <= 25) return 'low-risk';
    if (riskPercentage <= 60) return 'medium-risk';
    return 'high-risk';
  }

  /**
   * Get team depth for the same position
   */
  getTeamDepth(): Array<{
    overall: number;
    number: string;
    position: string;
    age: number;
  }> {
    const player = this.getPlayerData();
    if (!player) return [];

    const position = player.position;
    const baseOVR = this.playerRating();

    return [
      {
        overall: Math.max(50, baseOVR - 8),
        number: String(Math.floor(Math.random() * 99) + 1),
        position: position,
        age: Math.max(22, player.age - 2),
      },
      {
        overall: Math.max(50, baseOVR - 12),
        number: String(Math.floor(Math.random() * 99) + 1),
        position: position,
        age: Math.max(22, player.age + 1),
      },
      {
        overall: Math.max(50, baseOVR - 15),
        number: String(Math.floor(Math.random() * 99) + 1),
        position: position,
        age: Math.max(22, player.age - 1),
      },
    ];
  }

  /**
   * Get remaining cap space
   */
  getRemainingCap(): number {
    const validation = this.contractValidation();
    if (validation.capImpact) {
      return validation.capImpact.remainingCap;
    }
    return this.salaryCap;
  }

  /**
   * Get cap hit for a specific year
   */
  getCapHit(year: number): number {
    const baseSalary = this.contractData.baseSalary[year] || 0;
    const proratedBonus =
      this.contractData.signingBonus / this.contractData.years;
    return baseSalary + proratedBonus;
  }

  /**
   * Get total cap hit across all years
   */
  getTotalCapHit(): number {
    return this.getContractYears().reduce((total, year) => {
      return total + this.getCapHit(year);
    }, 0);
  }

  /**
   * Get player motivations based on personality
   */
  getPlayerMotivations(): Array<{
    title: string;
    detail: string;
    impact: 'high' | 'medium' | 'low';
  }> {
    const personality = this.playerPersonality();
    if (!personality) return this.getDefaultMotivations();

    const motivations: Array<{
      title: string;
      detail: string;
      impact: 'high' | 'medium' | 'low';
    }> = [];

    motivations.push({
      title: 'SCHEME FIT',
      detail: 'MIN: Base 3-4',
      impact: 'high',
    });

    if (personality.moneyVsRole > 0.6) {
      motivations.push({
        title: 'TEAM HAS FRANCHISE QB',
        detail: 'No Players Have Tag',
        impact: 'low',
      });
    } else {
      motivations.push({
        title: 'TEAM HAS FRANCHISE QB',
        detail: 'No Players Have Tag',
        impact: 'medium',
      });
    }

    if (personality.securityPref > 0.7) {
      motivations.push({
        title: 'HEAD COACH HISTORIC RECORD',
        detail: 'Career Win Percentage: 50%',
        impact: 'high',
      });
    } else {
      motivations.push({
        title: 'HEAD COACH HISTORIC RECORD',
        detail: 'Career Win Percentage: 50%',
        impact: 'medium',
      });
    }

    if (personality.moneyVsRole < 0.5) {
      motivations.push({
        title: 'STARTING ROLE GUARANTEE',
        detail: 'Wants playing time commitment',
        impact: 'high',
      });
    }

    return motivations;
  }

  /**
   * Get default motivations when personality is not available
   */
  private getDefaultMotivations(): Array<{
    title: string;
    detail: string;
    impact: 'high' | 'medium' | 'low';
  }> {
    return [
      {
        title: 'SCHEME FIT',
        detail: 'MIN: Base 3-4',
        impact: 'high',
      },
      {
        title: 'TEAM HAS FRANCHISE QB',
        detail: 'No Players Have Tag',
        impact: 'medium',
      },
      {
        title: 'HEAD COACH HISTORIC RECORD',
        detail: 'Career Win Percentage: 50%',
        impact: 'medium',
      },
    ];
  }

  /**
   * Get interest level based on personality and offer
   */
  getInterestLevel(): 'high' | 'medium' | 'low' {
    const personality = this.playerPersonality();
    if (!personality) return 'medium';

    const expectedValue = this.getExpectedValue();
    const offeredValue = this.getTotalValue();
    const valueRatio = offeredValue / expectedValue;

    if (valueRatio >= 1.1) return 'high';
    if (valueRatio >= 0.9) return 'medium';
    return 'low';
  }

  // ============================================================================
  // NEGOTIATION METHODS
  // ============================================================================

  /**
   * Start a negotiation session for the current player
   */
  startNegotiation(): void {
    if (!this.playerId() || !this.teamId()) {
      console.error('Cannot start negotiation: missing playerId or teamId');
      return;
    }

    const leagueRules = { maxYears: 5 };

    const session = this.negotiationService.startNegotiation(
      this.playerId(),
      this.teamId(),
      leagueRules
    );
    if (session) {
      console.log('Negotiation started:', session);
    }
  }

  /**
   * Submit the current contract offer for negotiation
   */
  submitOffer(): void {
    if (!this.isNegotiating()) {
      console.error('No active negotiation session');
      return;
    }

    const offer: Offer = {
      aav: this.getAPY(),
      gtdPct: this.getGuaranteedAmount() / this.getTotalValue(),
      years: this.contractData.years,
      bonusPct: this.contractData.signingBonus / this.getTotalValue(),
      noTradeClause: this.contractData.noTradeClause,
    };

    const result = this.negotiationService.submitOffer(offer);
    if (result) {
      this.handleNegotiationResult(result);
    }
  }

  /**
   * Handle the result of a submitted offer
   */
  private handleNegotiationResult(result: NegotiationResult): void {
    if (result.accepted) {
      console.log('Offer accepted!', result.message);
      this.negotiationService.endNegotiation();
      // TODO: Create the contract and redirect
    } else if (result.counter) {
      console.log('Counter received:', result.counter);
      // TODO: Show counter offer to user
    } else {
      console.log('Offer rejected:', result.message);
    }
  }

  /**
   * Accept a counter-offer from the player
   */
  acceptCounter(counter: Offer): void {
    const success = this.negotiationService.acceptCounter(counter);
    if (success) {
      console.log('Counter accepted!');
      this.negotiationService.endNegotiation();
      // TODO: Create the contract and redirect
    }
  }

  /**
   * Decline a counter-offer
   */
  declineCounter(): void {
    this.negotiationService.declineCounter();
    console.log('Counter declined');
  }

  /**
   * End the current negotiation
   */
  endNegotiation(): void {
    this.negotiationService.endNegotiation();
  }

  /**
   * Get the player's reservation value (minimum acceptable)
   */
  getPlayerReservation(): {
    aav: number;
    gtdPct: number;
    years: number;
  } | null {
    const session = this.currentSession();
    return session?.reservation || null;
  }

  /**
   * Get the player's ask anchor (opening position)
   */
  getPlayerAskAnchor(): { aav: number; gtdPct: number; years: number } | null {
    const session = this.currentSession();
    return session?.askAnchor || null;
  }

  /**
   * Check if current offer is close to player's reservation
   */
  isOfferCloseToReservation(): boolean {
    const reservation = this.getPlayerReservation();
    if (!reservation) return false;

    const currentAPY = this.getAPY();
    const currentGtdPct = this.getGuaranteedAmount() / this.getTotalValue();

    const aavRatio = currentAPY / reservation.aav;
    const gtdRatio = currentGtdPct / reservation.gtdPct;

    return aavRatio >= 0.9 && gtdRatio >= 0.85;
  }

  // ============================================================================
  // FORMATTED INPUT HANDLING
  // ============================================================================

  /**
   * Update salary when formatted input changes
   */
  onSalaryInputChange(formattedValue: string): void {
    const numericValue = this.numberFormatService.parseCurrency(formattedValue);
    this.contractData.baseSalary[1] = numericValue;
    this.formattedSalary = formattedValue;
  }

  /**
   * Update bonus when formatted input changes
   */
  onBonusInputChange(formattedValue: string): void {
    const numericValue = this.numberFormatService.parseCurrency(formattedValue);
    this.contractData.signingBonus = numericValue;
    this.formattedBonus = formattedValue;
  }

  /**
   * Get formatted salary for display
   */
  getFormattedSalary(): string {
    return this.numberFormatService.formatCurrencyShort(
      this.contractData.baseSalary[1] || 0
    );
  }

  /**
   * Get formatted bonus for display
   */
  getFormattedBonus(): string {
    return this.numberFormatService.formatCurrencyShort(
      this.contractData.signingBonus || 0
    );
  }

  /**
   * Increment salary by specified amount
   */
  incrementSalary(amount: number): void {
    const currentSalary = this.contractData.baseSalary[1] || 0;
    const newSalary = currentSalary + amount;
    this.contractData.baseSalary[1] = newSalary;
    this.formattedSalary = this.numberFormatService.formatCurrencyShort(newSalary);
  }

  /**
   * Decrement salary by specified amount
   */
  decrementSalary(amount: number): void {
    const currentSalary = this.contractData.baseSalary[1] || 0;
    const newSalary = Math.max(0, currentSalary - amount);
    this.contractData.baseSalary[1] = newSalary;
    this.formattedSalary = this.numberFormatService.formatCurrencyShort(newSalary);
  }

  /**
   * Increment bonus by specified amount
   */
  incrementBonus(amount: number): void {
    const currentBonus = this.contractData.signingBonus || 0;
    const newBonus = currentBonus + amount;
    this.contractData.signingBonus = newBonus;
    this.formattedBonus = this.numberFormatService.formatCurrencyShort(newBonus);
  }

  /**
   * Decrement bonus by specified amount
   */
  decrementBonus(amount: number): void {
    const currentBonus = this.contractData.signingBonus || 0;
    const newBonus = Math.max(0, currentBonus - amount);
    this.contractData.signingBonus = newBonus;
    this.formattedBonus = this.numberFormatService.formatCurrencyShort(newBonus);
  }

  /**
   * Go back to roster
   */
  goBack(): void {
    this.router.navigate(['/leagues', this.leagueId(), 'roster']);
  }
}
