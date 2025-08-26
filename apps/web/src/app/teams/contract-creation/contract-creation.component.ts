import { Component, signal, computed, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Contract, Position, Guarantee } from '@fantasy-football-dynasty/types';
import { TeamService } from '../../services/team.service';
import { PlayerDataService, SleeperPlayer } from '../../services/player-data.service';

export interface ContractFormData {
  years: number;
  baseSalary: Record<number, number>;
  signingBonus: number;
  guarantees: Guarantee[];
  noTradeClause: boolean;
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

  private readonly playerDataService = inject(PlayerDataService);
  private readonly teamService = inject(TeamService);

  private _isCreating = signal(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  public isCreating = this._isCreating.asReadonly();
  public error = this._error.asReadonly();

  // Contract form data
  contractData: ContractFormData = {
    years: 1,
    baseSalary: { 1: 0 },
    signingBonus: 0,
    guarantees: [],
    noTradeClause: false,
  };

  /**
   * Get player name for display
   */
  getPlayerName(): string {
    const player = this.playerDataService.getPlayer(this.playerId);
    return player ? `${player.first_name} ${player.last_name}` : 'Unknown Player';
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
   * Check if form is valid
   */
  isFormValid(): boolean {
    // Check if all required fields are filled
    const hasBaseSalary = Object.values(this.contractData.baseSalary)
      .every(salary => salary > 0);
    
    return this.contractData.years > 0 && hasBaseSalary;
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
