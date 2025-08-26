import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DrawerModule } from 'primeng/drawer';
import { DraftPick, Player } from '../../../../../../libs/types/src/lib/types';

@Component({
  selector: 'app-player-selection-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    DrawerModule,
  ],
  template: `
    <p-drawer
      [(visible)]="isOpen"
      position="bottom"
      styleClass="fifty-percent"
      [modal]="false"
      [dismissible]="true"
    >
      <div class="sidebar-header">
        <div class="header-title">
          Select Player - Pick {{ selectedPick?.pickNumber }}
        </div>
      </div>

      <div class="sidebar-content">
        <!-- Search and Filters -->
        <div class="search-filters">
          <span class="p-input-icon-left w-full">
            <i class="pi pi-search"></i>
            <input
              pInputText
              type="text"
              [ngModel]="searchQuery"
              (ngModelChange)="searchQueryChange.emit($event)"
              placeholder="Search players..."
              class="w-full"
            />
          </span>

          <div class="position-filters">
            @for (position of positions; track position) {
            <p-button
              [label]="position"
              [outlined]="position !== selectedPosition"
              [severity]="
                position === selectedPosition ? 'primary' : 'secondary'
              "
              size="small"
              (onClick)="
                positionChange.emit(
                  position === selectedPosition ? '' : position
                )
              "
            ></p-button>
            }
          </div>
        </div>

        <!-- Player List -->
        <div class="player-list">
          @for (player of availablePlayers; track player.id) {
          <div
            class="player-item"
            [class.selected]="selectedPlayer?.id === player.id"
            (click)="playerSelect.emit(player)"
          >
            <div class="player-header">
              <div class="player-name">{{ player.name }}</div>
              <div class="player-actions">
                <p-button
                  [icon]="
                    isInWatchlist(player.id) ? 'pi pi-star-fill' : 'pi pi-star'
                  "
                  [text]="true"
                  [severity]="
                    isInWatchlist(player.id) ? 'success' : 'secondary'
                  "
                  size="small"
                  (onClick)="toggleWatchlist.emit(player)"
                  title="Add to watchlist"
                ></p-button>
                <span class="dev-grade">{{ player.devGrade }}</span>
              </div>
            </div>
            <div class="player-details">
              <span class="position-team"
                >{{ player.position }} - {{ player.nflTeam }}</span
              >
              <span>Age: {{ player.age }} | Overall: {{ player.overall }}</span>
            </div>
          </div>
          }
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="sidebar-actions">
        @if (selectedPlayer && canMakePick) {
        <p-button
          [label]="'Draft ' + selectedPlayer.name"
          severity="primary"
          size="large"
          class="w-full"
          (onClick)="draftPlayer.emit(selectedPlayer)"
        ></p-button>
        } @if (selectedPlayer && !isInWatchlist(selectedPlayer.id)) {
        <p-button
          label="Add to Watchlist"
          severity="secondary"
          size="large"
          class="w-full"
          (onClick)="addToWatchlist.emit(selectedPlayer)"
        ></p-button>
        } @if (selectedPlayer && !canMakePick) {
        <div class="text-center text-gray-600 dark:text-gray-400 text-sm py-2">
          @if (draftState?.isPaused) {
          <div>Draft is paused</div>
          } @else {
          <div>Not your turn</div>
          }
        </div>
        }
      </div>
    </p-drawer>
  `,
  styleUrls: ['./player-selection-sidebar.component.scss'],
})
export class PlayerSelectionSidebarComponent {
  @Input() isOpen: boolean = false;
  @Input() selectedPick: DraftPick | null = null;
  @Input() availablePlayers: Player[] = [];
  @Input() selectedPlayer: Player | null = null;
  @Input() searchQuery: string = '';
  @Input() selectedPosition: string = '';
  @Input() canMakePick: boolean = false;
  @Input() draftState: any = null;
  @Input() isInWatchlist: (playerId: string) => boolean = () => false;

  @Output() close = new EventEmitter<void>();
  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() positionChange = new EventEmitter<string>();
  @Output() playerSelect = new EventEmitter<Player>();
  @Output() draftPlayer = new EventEmitter<Player>();
  @Output() addToWatchlist = new EventEmitter<Player>();
  @Output() toggleWatchlist = new EventEmitter<Player>();

  positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
}
