import { Component, Input, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeModule } from 'primeng/badge';
import { TagModule } from 'primeng/tag';
import { SportsDataService } from '../../../services/sports-data.service';

export interface PlayerCardData {
  id?: string;
  playerId: number;
  firstName: string;
  lastName: string;
  position: string;
  team?: string;
  overall?: number;
  age?: number;
  experience?: number;
  status?: string;
  photoUrl?: string;
  teamLogoUrl?: string;
}

export interface PlayerCardConfig {
  showOverall?: boolean;
  showAge?: boolean;
  showExperience?: boolean;
  showStatus?: boolean;
  showTeamLogo?: boolean;
  showPlayerPhoto?: boolean;
  size?: 'small' | 'medium' | 'large';
  layout?: 'horizontal' | 'vertical';
  theme?: 'dark' | 'light';
}

@Component({
  selector: 'app-player-card',
  standalone: true,
  imports: [CommonModule, BadgeModule, TagModule],
  template: `
    <div
      class="flex items-center gap-4 p-4 rounded-xl transition-all duration-200 ease-in-out hover:transform hover:-translate-y-1 hover:shadow-lg"
      [ngClass]="cardClasses()"
    >
      <!-- Player Photo Section -->
      @if (config.showPlayerPhoto) {
      <div class="flex-shrink-0 flex justify-center sm:justify-start">
        <!-- Team Logo Background -->
        @if (config.showTeamLogo && playerData.teamLogoUrl) {
        <div class="relative inset-0 opacity-30">
          <img
            [src]="playerData.teamLogoUrl"
            [alt]="playerData.team || 'Team'"
            class="w-25 h-25 object-cover"
          />
        </div>
        }
        <div
          class="relative overflow-hidden bg-gray-600"
          [ngClass]="photoContainerClasses()"
        >
          <!-- Player Photo or Initials -->
          @if (playerData.photoUrl) {
          <img
            [src]="playerData.photoUrl"
            [alt]="playerData.firstName + ' ' + playerData.lastName"
            class="w-full h-full object-cover relative z-10"
            (error)="onPhotoError()"
          />
          } @else {
          <div
            class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-shadow"
          >
            {{ getPlayerInitials() }}
          </div>
          }
        </div>
      </div>
      }

      <!-- Player Info Section -->
      <div class="flex-1 min-w-0">
        <!-- Player Name -->
        <div class="mb-1 leading-tight font-semibold" [ngClass]="nameClasses()">
          {{ playerData.firstName }} {{ playerData.lastName }}
        </div>

        <!-- Team and Position -->
        <div
          class="flex items-center gap-2 mb-2 leading-tight"
          [ngClass]="detailsClasses()"
        >
          @if (playerData.team) {
          <span class="font-medium">{{ playerData.team }}</span>
          } @if (playerData.position) {
          <span class="text-purple-500 font-semibold">{{
            playerData.position
          }}</span>
          }
        </div>

        <!-- Additional Stats -->
        <div
          class="flex flex-wrap items-center justify-center gap-2 mb-2 sm:justify-start sm:gap-4"
          *ngIf="hasStats()"
        >
          @if (config.showOverall && playerData.overall) {
          <span class="flex items-center gap-1.5 text-amber-500">
            <i class="pi pi-star-fill text-xs opacity-70"></i>
            <span [ngClass]="statTextClasses()">{{ playerData.overall }}</span>
          </span>
          } @if (config.showAge && playerData.age) {
          <span class="flex items-center gap-1.5 text-green-500">
            <i class="pi pi-calendar text-xs opacity-70"></i>
            <span [ngClass]="statTextClasses()">{{ playerData.age }}y</span>
          </span>
          } @if (config.showExperience && playerData.experience !== undefined) {
          <span class="flex items-center gap-1.5 text-blue-500">
            <i class="pi pi-clock text-xs opacity-70"></i>
            <span [ngClass]="statTextClasses()"
              >{{ playerData.experience }}y</span
            >
          </span>
          }
        </div>

        <!-- Status Badge -->
        @if (config.showStatus && playerData.status) {
        <div class="flex items-center">
          <p-tag
            [value]="playerData.status"
            [severity]="getStatusSeverity()"
            [rounded]="true"
          />
        </div>
        }
      </div>
    </div>
  `,
})
export class PlayerCardComponent {
  @Input() playerData!: PlayerCardData;
  @Input() config: PlayerCardConfig = {
    showOverall: true,
    showAge: true,
    showExperience: true,
    showStatus: false,
    showTeamLogo: true,
    showPlayerPhoto: true,
    size: 'medium',
    layout: 'horizontal',
    theme: 'dark',
  };

  private sportsDataService = inject(SportsDataService);

  // Computed classes for dynamic styling
  cardClasses = computed(() => {
    const baseClasses =
      'flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ease-in-out hover:transform hover:-translate-y-1 hover:shadow-lg';
    const responsiveClasses =
      'flex-col text-center sm:flex-row sm:text-left sm:items-center';
    const sizeClasses = this.getSizeClasses();
    const themeClasses = this.getThemeClasses();
    const mobileClasses =
      'sm:hover:transform sm:hover:-translate-y-1 sm:hover:shadow-lg';

    return `${baseClasses} ${responsiveClasses} ${sizeClasses} ${themeClasses} ${mobileClasses}`;
  });

  photoContainerClasses = computed(() => {
    const baseClasses = 'relative overflow-hidden rounded-full bg-gray-600';
    const sizeClasses = this.getPhotoSizeClasses();
    const responsiveClasses = 'mb-2 sm:mb-0';
    const teamBgClasses =
      this.config.showTeamLogo && this.playerData.teamLogoUrl
        ? 'with-team-bg'
        : '';

    return `${baseClasses} ${sizeClasses} ${responsiveClasses} ${teamBgClasses}`;
  });

  nameClasses = computed(() => {
    const sizeClasses = this.getTextSizeClasses();
    return `mb-1 leading-tight font-semibold ${sizeClasses}`;
  });

  detailsClasses = computed(() => {
    const sizeClasses = this.getTextSizeClasses();
    return `flex items-center gap-2 mb-2 leading-tight ${sizeClasses}`;
  });

  statTextClasses = computed(() => {
    return this.getTextSizeClasses();
  });

  hasStats(): boolean {
    return !!(
      this.config.showOverall ||
      this.config.showAge ||
      this.config.showExperience
    );
  }

  getPlayerInitials(): string {
    const first = this.playerData.firstName?.charAt(0) || '';
    const last = this.playerData.lastName?.charAt(0) || '';
    return (first + last).toUpperCase();
  }

  getStatusSeverity(): 'success' | 'warning' | 'danger' | 'info' {
    const status = this.playerData.status?.toLowerCase();
    switch (status) {
      case 'active':
      case 'signed':
        return 'success';
      case 'injured':
      case 'suspended':
        return 'warning';
      case 'retired':
      case 'cut':
        return 'danger';
      default:
        return 'info';
    }
  }

  onPhotoError(): void {
    // Handle photo loading error - could emit event or set fallback
    console.warn(
      `Failed to load photo for ${this.playerData.firstName} ${this.playerData.lastName}`
    );
  }

  // Helper methods for dynamic classes
  private getSizeClasses(): string {
    switch (this.config.size) {
      case 'small':
        return 'p-2 gap-2 sm:p-3 sm:gap-3';
      case 'large':
        return 'p-3 gap-3 sm:p-4 sm:gap-4 md:p-5 md:gap-5 lg:p-6 lg:gap-5';
      default: // medium
        return 'p-3 gap-3 sm:p-4 sm:gap-4 md:p-4 md:gap-4 lg:p-4 lg:gap-4';
    }
  }

  private getLayoutClasses(): string {
    switch (this.config.layout) {
      case 'vertical':
        return 'flex-col text-center';
      default: // horizontal
        return 'flex-row';
    }
  }

  private getThemeClasses(): string {
    switch (this.config.theme) {
      case 'light':
        return 'bg-white text-gray-900 border border-gray-200 shadow-sm';
      default: // dark
        return 'bg-gray-800 text-white shadow-md';
    }
  }

  private getPhotoSizeClasses(): string {
    switch (this.config.size) {
      case 'small':
        return 'w-10 h-10 sm:w-10 sm:h-10';
      case 'large':
        return 'w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 lg:w-20 lg:h-20';
      default: // medium
        return 'w-12 h-12 sm:w-14 sm:h-14 md:w-14 md:h-14 lg:w-14 lg:h-14';
    }
  }

  private getTextSizeClasses(): string {
    switch (this.config.size) {
      case 'small':
        return 'text-xs sm:text-sm';
      case 'large':
        return 'text-sm sm:text-base md:text-lg lg:text-xl';
      default: // medium
        return 'text-sm sm:text-base md:text-base lg:text-base';
    }
  }
}
