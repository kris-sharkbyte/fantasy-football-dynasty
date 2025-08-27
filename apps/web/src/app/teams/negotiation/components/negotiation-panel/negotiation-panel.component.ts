import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { NumberFormatService } from '../../../../services/number-format.service';

export interface NegotiationSession {
  reservation: {
    aav: number;
    gtdPct: number;
    years: number;
  };
  askAnchor: {
    aav: number;
    gtdPct: number;
    years: number;
  };
}

export interface NegotiationHistoryItem {
  type: string;
  offer: {
    aav: number;
    gtdPct: number;
    years: number;
  };
  message?: string;
}

@Component({
  selector: 'app-negotiation-panel',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule],
  templateUrl: './negotiation-panel.component.html',
  styleUrls: ['./negotiation-panel.component.scss'],
})
export class NegotiationPanelComponent {
  // Input signals
  isNegotiating = input.required<boolean>();
  currentRound = input.required<number>();
  remainingPatience = input.required<number>();
  negotiationHistory = input.required<NegotiationHistoryItem[]>();
  currentSession = input.required<NegotiationSession | null>();
  isFormValid = input.required<boolean>();

  // Output signals
  startNegotiationClicked = output<void>();
  submitOfferClicked = output<void>();
  endNegotiationClicked = output<void>();

  // Injected services
  private readonly numberFormatService = inject(NumberFormatService);

  // Methods
  onStartNegotiation(): void {
    this.startNegotiationClicked.emit();
  }

  onSubmitOffer(): void {
    this.submitOfferClicked.emit();
  }

  onEndNegotiation(): void {
    this.endNegotiationClicked.emit();
  }

  // Helper methods for formatting
  formatCurrency(value: number): string {
    return this.numberFormatService.formatCurrency(value);
  }

  formatPercentage(value: number): string {
    return this.numberFormatService.formatPercentage(value);
  }
}
