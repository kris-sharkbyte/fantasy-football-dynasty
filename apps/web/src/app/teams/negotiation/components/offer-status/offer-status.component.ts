import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';

@Component({
  selector: 'app-offer-status',
  standalone: true,
  imports: [CommonModule, CardModule, ProgressBarModule],
  templateUrl: './offer-status.component.html',
  styleUrls: ['./offer-status.component.scss'],
})
export class OfferStatusComponent {
  // Input signals
  riskPercentage = input.required<number>();

  // Computed values
  riskLevel = computed(() => {
    const percentage = this.riskPercentage();
    if (percentage <= 25) return 'LOW';
    if (percentage <= 60) return 'MEDIUM';
    return 'HIGH';
  });

  riskColor = computed(() => {
    const percentage = this.riskPercentage();
    if (percentage <= 25) return 'low-risk';
    if (percentage <= 60) return 'medium-risk';
    return 'high-risk';
  });

  isLowRisk = computed(() => this.riskPercentage() <= 25);
  isMediumRisk = computed(
    () => this.riskPercentage() > 25 && this.riskPercentage() <= 60
  );
  isHighRisk = computed(() => this.riskPercentage() > 60);
}
