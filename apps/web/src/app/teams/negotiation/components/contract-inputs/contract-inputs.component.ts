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
    const currentSalary = this.contractData().baseSalary[1] || 0;
    const newSalary = currentSalary + amount;
    this.onSalaryChange(newSalary);
  }

  decrementSalary(amount: number): void {
    const currentSalary = this.contractData().baseSalary[1] || 0;
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
}
