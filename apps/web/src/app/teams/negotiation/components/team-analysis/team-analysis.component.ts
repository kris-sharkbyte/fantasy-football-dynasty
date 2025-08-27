import { Component, input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { NumberFormatService } from '../../../../services/number-format.service';

export interface TeamDepthPlayer {
  overall: number;
  number: string;
  position: string;
  age: number;
}

export interface PlayerMotivation {
  title: string;
  detail: string;
  impact: 'high' | 'medium' | 'low';
}

@Component({
  selector: 'app-team-analysis',
  standalone: true,
  imports: [CommonModule, CardModule],
  templateUrl: './team-analysis.component.html',
  styleUrls: ['./team-analysis.component.scss'],
})
export class TeamAnalysisComponent {
  // Input signals
  teamDepth = input.required<TeamDepthPlayer[]>();
  remainingCap = input.required<number>();
  contractYears = input.required<number[]>();
  baseSalary = input.required<Record<number, number>>();
  signingBonus = input.required<number>();
  playerMotivations = input.required<PlayerMotivation[]>();
  interestLevel = input.required<'high' | 'medium' | 'low'>();

  // Injected services
  private readonly numberFormatService = inject(NumberFormatService);

  // Computed values
  formattedRemainingCap = computed(() => {
    return this.numberFormatService.formatCurrency(this.remainingCap());
  });

  totalValue = computed(() => {
    const baseSalaryTotal = Object.values(this.baseSalary()).reduce(
      (sum, salary) => sum + salary,
      0
    );
    return baseSalaryTotal + this.signingBonus();
  });

  formattedTotalValue = computed(() => {
    return this.numberFormatService.formatCurrency(this.totalValue());
  });

  getCapHit = (year: number): number => {
    const baseSalary = this.baseSalary()[year] || 0;
    const proratedBonus = this.signingBonus() / this.contractYears().length;
    return baseSalary + proratedBonus;
  };

  formattedCapHit = (year: number): string => {
    return this.numberFormatService.formatCurrency(this.getCapHit(year));
  };

  formattedBaseSalary = (year: number): string => {
    return this.numberFormatService.formatCurrency(
      this.baseSalary()[year] || 0
    );
  };

  totalCapHit = computed(() => {
    return this.contractYears().reduce((total, year) => {
      return total + this.getCapHit(year);
    }, 0);
  });

  formattedTotalCapHit = computed(() => {
    return this.numberFormatService.formatCurrency(this.totalCapHit());
  });
}
