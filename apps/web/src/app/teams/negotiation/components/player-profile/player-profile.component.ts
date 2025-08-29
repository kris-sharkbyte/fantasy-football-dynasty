import { Component, input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { SportsPlayer } from '@fantasy-football-dynasty/domain';
import { NumberFormatService } from '../../../../services/number-format.service';

@Component({
  selector: 'app-player-profile',
  standalone: true,
  imports: [CommonModule, CardModule],
  templateUrl: './player-profile.component.html',
  styleUrls: ['./player-profile.component.scss'],
})
export class PlayerProfileComponent {
  // Input signals
  player = input.required<SportsPlayer>();
  playerRating = input.required<number>();
  expectedValue = input.required<number>();
  contractYears = input.required<number>();
  playerTag = input.required<string>();

  // Injected services
  private readonly numberFormatService = inject(NumberFormatService);

  // Computed values
  playerName = computed(() => {
    const player = this.player();
    return player ? `${player.FirstName} ${player.LastName}` : 'Unknown Player';
  });

  positionNumber = computed(() => {
    const player = this.player();
    return `#${player?.Number || '00'} ${player?.Position}`;
  });

  ageCollege = computed(() => {
    const player = this.player();
    return `AGE: ${player?.Age}, COLLEGE: ${player?.College || 'Unknown'}`;
  });

  formattedExpectedValue = computed(() => {
    return this.numberFormatService.formatCurrency(this.expectedValue());
  });

  formattedExpectedValuePerYear = computed(() => {
    return this.numberFormatService.formatCurrency(this.expectedValue());
  });
}
