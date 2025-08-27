import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { NumberFormatService } from '../../../../services/number-format.service';

export interface ContractFormData {
  years: number;
  baseSalary: Record<number, number>;
  signingBonus: number;
}

export type ContractInputMode = 'individual' | 'total';

@Component({
  selector: 'app-contract-inputs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
  ],
  templateUrl: './contract-inputs.component.html',
  styleUrls: ['./contract-inputs.component.scss'],
})
export class ContractInputsComponent {
  // Input signals
  contractData = input.required<ContractFormData>();
  formattedSalary = input.required<string>();
  formattedBonus = input.required<string>();
  mode = input<ContractInputMode>('individual'); // Default to individual mode

  // Output signals
  yearsChanged = output<number>();
  salaryChanged = output<number>();
  bonusChanged = output<number>();

  // Injected services
  private readonly numberFormatService = inject(NumberFormatService);

  // Methods
  onYearsChange(years: number): void {
    this.yearsChanged.emit(years);
  }

  onSalaryChange(amount: number): void {
    this.salaryChanged.emit(amount);
  }

  onBonusChange(amount: number): void {
    this.bonusChanged.emit(amount);
  }

  incrementSalary(amount: number): void {
    let currentSalary: number;

    if (this.mode() === 'total') {
      // For total mode, sum all years
      currentSalary = Object.values(this.contractData().baseSalary).reduce(
        (sum, salary) => sum + salary,
        0
      );
    } else {
      // For individual mode, use year 1
      currentSalary = this.contractData().baseSalary[1] || 0;
    }

    const newSalary = currentSalary + amount;
    this.onSalaryChange(newSalary);
  }

  decrementSalary(amount: number): void {
    let currentSalary: number;

    if (this.mode() === 'total') {
      // For total mode, sum all years
      currentSalary = Object.values(this.contractData().baseSalary).reduce(
        (sum, salary) => sum + salary,
        0
      );
    } else {
      // For individual mode, use year 1
      currentSalary = this.contractData().baseSalary[1] || 0;
    }

    const newSalary = Math.max(0, currentSalary - amount);
    this.onSalaryChange(newSalary);
  }

  incrementBonus(amount: number): void {
    const currentBonus = this.contractData().signingBonus || 0;
    const newBonus = currentBonus + amount;
    this.onBonusChange(newBonus);
  }

  decrementBonus(amount: number): void {
    const currentBonus = this.contractData().signingBonus || 0;
    const newBonus = Math.max(0, currentBonus - amount);
    this.onBonusChange(newBonus);
  }

  /**
   * Get current salary value based on mode
   */
  getCurrentSalaryValue(): number {
    if (this.mode() === 'total') {
      // For total mode, return sum of all years
      return Object.values(this.contractData().baseSalary).reduce(
        (sum, salary) => sum + salary,
        0
      );
    } else {
      // For individual mode, return year 1
      return this.contractData().baseSalary[1] || 0;
    }
  }
}
