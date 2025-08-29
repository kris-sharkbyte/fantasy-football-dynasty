import { Component, signal, computed, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Contract, Position, Guarantee } from '@fantasy-football-dynasty/types';
import { TeamService } from '../../services/team.service';
import {
  PlayerDataService,
  SleeperPlayer,
} from '../../services/player-data.service';
import {
  ContractMinimumCalculator,
  CapMath,
  ContractValidator,
  PlayerRatingCalculator,
  NegotiationEngine,
  Offer,
  NegotiationResult,
} from '@fantasy-football-dynasty/domain';
import { ThemeService } from '../../services/theme.service';
import { NegotiationService } from '../../services/negotiation.service';
import { NumberFormatService } from '../../services/number-format.service';

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
  selector: 'app-contract-creation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contract-creation.component.html',
  styleUrls: ['./contract-creation.component.scss'],
})
export class ContractCreationComponent {
  @Input() playerId: string = '';
  @Input() teamId: string = '';
  @Input() onSuccess: (contract: Contract) => void = () => {};
  @Input() onCancel: () => void = () => {};
  @Input() salaryCap: number = 200000000; // Default 200M cap
  @Input() existingContracts: Contract[] = []; // For cap calculations

  private readonly playerDataService = inject(PlayerDataService);
  private readonly teamService = inject(TeamService);
  private readonly themeService = inject(ThemeService);
  private readonly negotiationService = inject(NegotiationService);
  public readonly numberFormatService = inject(NumberFormatService);

  private _isCreating = signal(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  public isCreating = this._isCreating.asReadonly();
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

  // Computed player personality - updated to use new system
  public playerPersonality = computed(() => {
    const player = this.getPlayerData();
    if (!player) return null;
    // TODO: Use new personality system when integrated
    return {
      riskTolerance: 0.5,
      securityPref: 0.7,
      agentQuality: 0.6,
      loyalty: 0.5,
      moneyVsRole: 0.6,
      teamPriorities: [],
      marketSavvy: 0.5,
    };
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

  /**
   * Get player name for display
   */
  getPlayerName(): string {
    const player = this.playerDataService.getPlayer(this.playerId);
    return player
      ? `${player.first_name} ${player.last_name}`
      : 'Unknown Player';
  }

  /**
   * Get player data for validation
   */
  getPlayerData(): SleeperPlayer | null {
    return this.playerDataService.getPlayer(this.playerId);
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
   * Add a new guarantee
   */
  addGuarantee(): void {
    const years = this.getContractYears();
    this.contractData.guarantees.push({
      type: 'full',
      amount: 0,
      year: years[0],
    });
  }

  /**
   * Remove a guarantee
   */
  removeGuarantee(index: number): void {
    this.contractData.guarantees.splice(index, 1);
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
      playerId: this.playerId,
      teamId: this.teamId,
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
      // Determine if player is a rookie (0 years experience)
      const isRookie = player.years_exp === 0;

      // For rookies, we'd need draft round info - for now, assume round 3 minimum
      const draftRound = isRookie ? 3 : undefined;

      const minimumValidation =
        ContractMinimumCalculator.validateContractMinimum(
          contract as Contract,
          {
            age: player.age,
            position: player.position as Position,
            overall: player.search_rank || 70, // Use search rank as proxy for overall
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
      { id: this.teamId, capSpace: this.salaryCap } as any, // Simplified team object
      contract as Contract,
      this.existingContracts,
      currentYear,
      this.salaryCap
    );

    if (!capImpact.canAfford) {
      errors.push(
        `Contract exceeds salary cap by $${(
          (capImpact.newCapHit - capImpact.remainingCap) /
          1000000
        ).toFixed(1)}M`
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
   * Create the contract
   */
  async createContract(): Promise<void> {
    if (!this.isFormValid()) return;

    try {
      this._isCreating.set(true);
      this._error.set(null);

      // Create contract object
      const contract: Omit<Contract, 'id' | 'createdAt'> = {
        playerId: this.playerId,
        teamId: this.teamId,
        startYear: new Date().getFullYear(),
        endYear: new Date().getFullYear() + this.contractData.years - 1,
        baseSalary: this.contractData.baseSalary,
        signingBonus: this.contractData.signingBonus,
        guarantees: this.contractData.guarantees,
        noTradeClause: this.contractData.noTradeClause,
      };

      // TODO: Save contract to database
      // For now, just call the success callback
      this.onSuccess(contract as Contract);
    } catch (error) {
      console.error('Error creating contract:', error);
      this._error.set(
        error instanceof Error ? error.message : 'Failed to create contract'
      );
    } finally {
      this._isCreating.set(false);
    }
  }

  /**
   * Cancel contract creation
   */
  cancel(): void {
    this.onCancel();
  }

  /**
   * Get expected contract value based on player tier and market
   */
  getExpectedValue(): number {
    const player = this.getPlayerData();
    if (!player) return 8000000; // Default 8M

    // Use calculated OVR rating
    const ovr = this.playerRating();
    const baseValue = ovr * 100000; // 70 OVR = 7M base

    // Apply personality modifiers
    const personality = this.playerPersonality();
    if (personality) {
      const riskModifier = 1 + personality.riskTolerance * 0.2; // Risk-takers want more
      const securityModifier = 1 + personality.securityPref * 0.15; // Security lovers want longer deals
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
   */
  getRiskPercentage(): number {
    const player = this.getPlayerData();
    if (!player) return 50;

    const expectedValue = this.getExpectedValue();
    const offeredValue = this.getTotalValue();
    const difference = Math.abs(expectedValue - offeredValue);
    const percentage = (difference / expectedValue) * 100;

    return Math.min(percentage, 100);
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

    // Generate realistic depth data based on the selected player's position
    const position = player.position;
    const baseOVR = this.playerRating();

    // Create depth players with realistic ratings (slightly lower than starter)
    return [
      {
        overall: Math.max(50, baseOVR - 8), // Backup
        number: String(Math.floor(Math.random() * 99) + 1),
        position: position,
        age: Math.max(22, player.age - 2),
      },
      {
        overall: Math.max(50, baseOVR - 12), // Depth
        number: String(Math.floor(Math.random() * 99) + 1),
        position: position,
        age: Math.max(22, player.age + 1),
      },
      {
        overall: Math.max(50, baseOVR - 15), // Practice squad level
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
   * Get position multiplier for value calculation
   */
  private getPositionMultiplier(position: Position): number {
    switch (position) {
      case 'QB':
        return 1.5;
      case 'RB':
        return 0.8;
      case 'WR':
        return 1.0;
      case 'TE':
        return 0.7;
      case 'K':
        return 0.3;
      case 'DEF':
        return 0.5;
      default:
        return 1.0;
    }
  }

  /**
   * Get experience multiplier for value calculation
   */
  private getExperienceMultiplier(yearsExp: number): number {
    if (yearsExp === 0) return 0.6; // Rookie
    if (yearsExp <= 2) return 0.8; // Young player
    if (yearsExp <= 4) return 1.0; // Prime
    if (yearsExp <= 6) return 0.9; // Veteran
    return 0.7; // Aging veteran
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

    // Scheme fit (always high for most players)
    motivations.push({
      title: 'SCHEME FIT',
      detail: 'MIN: Base 3-4',
      impact: 'high',
    });

    // Team QB status (based on loyalty and money vs role preference)
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

    // Coach record (based on security preference)
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

    // Add role preference if player values it
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

    // Base interest on value ratio
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
    if (!this.playerId || !this.teamId) {
      console.error('Cannot start negotiation: missing playerId or teamId');
      return;
    }

    // Get league rules (for now, use default - will be enhanced later)
    const leagueRules = { maxYears: 5 }; // Default to 5 years

    const session = this.negotiationService.startNegotiation(
      this.playerId,
      this.teamId,
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

    // Convert contract data to offer format
    const offer: Offer = {
      aav: this.getAPY(),
      gtdPct: this.getGuaranteedAmount() / this.getTotalValue(),
      years: this.contractData.years,
      bonusPct: this.contractData.signingBonus / this.getTotalValue(),
      noTradeClause: this.contractData.noTradeClause,
    };

    // Submit offer through negotiation service
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
      // TODO: Create the contract and close negotiation
      this.negotiationService.endNegotiation();
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
      // TODO: Create the contract and close negotiation
      this.negotiationService.endNegotiation();
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
   * Initialize formatted inputs
   */
  ngOnInit(): void {
    // Initialize formatted inputs
    this.formattedSalary = this.getFormattedSalary();
    this.formattedBonus = this.getFormattedBonus();
  }
}
