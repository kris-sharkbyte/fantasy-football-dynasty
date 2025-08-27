import { Component, input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { SleeperPlayer } from '../../../../services/player-data.service';
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
  player = input.required<SleeperPlayer>();
  playerRating = input.required<number>();
  expectedValue = input.required<number>();
  contractYears = input.required<number>();
  playerTag = input.required<string>();

  // Injected services
  private readonly numberFormatService = inject(NumberFormatService);

  // Computed values
  playerName = computed(() => {
    const player = this.player();
    return player
      ? `${player.first_name} ${player.last_name}`
      : 'Unknown Player';
  });

  positionNumber = computed(() => {
    const player = this.player();
    return `#${player?.number || '00'} ${player?.position}`;
  });

  ageCollege = computed(() => {
    const player = this.player();
    return `AGE: ${player?.age}, COLLEGE: ${player?.college || 'Unknown'}`;
  });

  formattedExpectedValue = computed(() => {
    return this.numberFormatService.formatCurrency(this.expectedValue());
  });

  formattedExpectedValuePerYear = computed(() => {
    return this.numberFormatService.formatCurrency(this.expectedValue());
  });
}
