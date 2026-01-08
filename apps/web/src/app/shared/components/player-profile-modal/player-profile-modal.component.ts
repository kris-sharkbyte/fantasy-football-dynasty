import { Component, input, output, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TabsModule } from 'primeng/tabs';
import { NumberFormatService } from '../../../services/number-format.service';
import { SportsPlayer, EnhancedSportsPlayer } from '@fantasy-football-dynasty/types';

// Flexible player type that can be either SportsPlayer or EnhancedSportsPlayer
type PlayerData = SportsPlayer | EnhancedSportsPlayer | any;

@Component({
  selector: 'app-player-profile-modal',
  standalone: true,
  imports: [CommonModule, DialogModule, CardModule, TagModule, TabsModule],
  templateUrl: './player-profile-modal.component.html',
  styleUrls: ['./player-profile-modal.component.scss'],
})
export class PlayerProfileModalComponent {
  private readonly numberFormatService = inject(NumberFormatService);

  // Inputs
  visible = input.required<boolean>();
  player = input<PlayerData | null>(null);
  overall = input<number | null>(null);
  expectedValue = input<number | null>(null);
  personality = input<any | null>(null); // PlayerPersonality if available

  // Outputs
  visibleChange = output<boolean>();

  // Regular property for p-dialog (doesn't support signals yet)
  // This is bound with [(visible)] in the template
  dialogVisible = false;

  constructor() {
    // Sync input signal to regular property for p-dialog
    effect(() => {
      this.dialogVisible = this.visible();
    });
    
    // Sync property changes back to output
    effect(() => {
      if (!this.dialogVisible) {
        this.visibleChange.emit(false);
      }
    });
  }

  // Computed values
  playerName = computed(() => {
    const p = this.player();
    if (!p) return 'Unknown Player';
    if (p.FirstName && p.LastName) {
      return `${p.FirstName} ${p.LastName}`;
    }
    if (p.name) return p.name;
    return 'Unknown Player';
  });

  position = computed(() => {
    const p = this.player();
    return p?.Position || p?.position || 'N/A';
  });

  age = computed(() => {
    const p = this.player();
    return p?.Age || p?.age || null;
  });

  college = computed(() => {
    const p = this.player();
    return p?.College || p?.college || 'Unknown';
  });

  experience = computed(() => {
    const p = this.player();
    return p?.Experience || p?.experience || p?.yearsExp || 0;
  });

  team = computed(() => {
    const p = this.player();
    return p?.Team || p?.team || p?.nflTeam || 'FA';
  });

  playerNumber = computed(() => {
    const p = this.player();
    return p?.Number || p?.number || null;
  });

  height = computed(() => {
    const p = this.player();
    return p?.Height || p?.height || null;
  });

  weight = computed(() => {
    const p = this.player();
    return p?.Weight || p?.weight || null;
  });

  photoUrl = computed(() => {
    const p = this.player();
    return p?.PhotoUrl || p?.photoUrl || null;
  });

  personalityType = computed(() => {
    const pers = this.personality();
    return pers?.type || null;
  });

  personalityDescription = computed(() => {
    const type = this.personalityType();
    const descriptions: Record<string, string> = {
      money_motivated: '💰 Money Motivated - Prioritizes salary & guarantees',
      competitor: '🏆 Competitor - Wants to win championships',
      loyalty_first: '🏠 Loyalty First - Values stability & trust',
      balanced: '⚖️ Balanced - Considers all factors equally',
      location_seeker: '🌴 Location Seeker - Prioritizes market & weather',
      high_ego: '😤 High Ego - Demands respect & top dollar',
    };
    return descriptions[type || ''] || 'Unknown personality';
  });

  formattedExpectedValue = computed(() => {
    const value = this.expectedValue();
    return value ? this.numberFormatService.formatCurrency(value) : 'N/A';
  });

  formattedAPY = computed(() => {
    const value = this.expectedValue();
    return value ? this.numberFormatService.formatCurrency(value) : 'N/A';
  });
}

