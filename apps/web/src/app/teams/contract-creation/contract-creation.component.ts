import { Component, signal, computed, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Contract, Position, Guarantee } from '@fantasy-football-dynasty/types';
import { TeamService } from '../../services/team.service';
import { PlayerDataService, SleeperPlayer } from '../../services/player-data.service';
import { ContractMinimumCalculator, CapMath, ContractValidator } from '@fantasy-football-dynasty/domain';
import { ThemeService } from '../../services/theme.service';

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
  styleUrls: ['./contract-creation.component.scss']
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

  // Computed validation
  public contractValidation = computed(() => this.validateContract());

  /**
   * Get player name for display
   */
  getPlayerName(): string {
    const player = this.playerDataService.getPlayer(this.playerId);
    return player ? `${player.first_name} ${player.last_name}` : 'Unknown Player';
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
    
    years.forEach(year => {
      newBaseSalary[year] = this.contractData.baseSalary[year] || 0;
    });
    
    this.contractData.baseSalary = newBaseSalary;
    
    // Update guarantee years if they're out of range
    this.contractData.guarantees = this.contractData.guarantees.filter(
      guarantee => guarantee.year <= this.contractData.years
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
    const baseSalaryTotal = Object.values(this.contractData.baseSalary)
      .reduce((sum, salary) => sum + salary, 0);
    return baseSalaryTotal + this.contractData.signingBonus;
  }

  /**
   * Calculate average per year (APY)
   */
  getAPY(): number {
    return this.contractData.years > 0 ? this.getTotalValue() / this.contractData.years : 0;
  }

  /**
   * Calculate total guaranteed amount
   */
  getGuaranteedAmount(): number {
    return this.contractData.guarantees
      .reduce((sum, guarantee) => sum + guarantee.amount, 0);
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
    const contractErrors = ContractValidator.validateContract(contract as Contract);
    errors.push(...contractErrors);

    // Minimum contract validation
    const player = this.getPlayerData();
    if (player) {
      // Determine if player is a rookie (0 years experience)
      const isRookie = player.years_exp === 0;
      
      // For rookies, we'd need draft round info - for now, assume round 3 minimum
      const draftRound = isRookie ? 3 : undefined;
      
      const minimumValidation = ContractMinimumCalculator.validateContractMinimum(
        contract as Contract,
        {
          age: player.age,
          position: player.position as Position,
          overall: player.search_rank || 70, // Use search rank as proxy for overall
          yearsExp: player.years_exp
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
      errors.push(`Contract exceeds salary cap by $${((capImpact.newCapHit - capImpact.remainingCap) / 1000000).toFixed(1)}M`);
    }

    // Warnings for high-value contracts
    if (this.getTotalValue() > this.salaryCap * 0.15) {
      warnings.push('This contract represents more than 15% of the salary cap');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      minimumRequired: player ? ContractMinimumCalculator.validateContractMinimum(
        contract as Contract,
        {
          age: player.age,
          position: player.position as Position,
          overall: player.search_rank || 70,
          yearsExp: player.years_exp
        },
        this.salaryCap,
        player.years_exp === 0,
        player.years_exp === 0 ? 3 : undefined
      ).minimumRequired : 0,
      capImpact
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
}
