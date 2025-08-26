import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DraftState, Team } from '../../../../../../libs/types/src/lib/types';
import { DraftLayoutService } from '../../services/draft-layout.service';

@Component({
  selector: 'app-draft-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Draft Status Bar -->
    <div
      *ngIf="draftLayoutService.draftState()"
      class="bg-blue-50 dark:bg-blue-900 border-b border-blue-200 dark:border-blue-800"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div class="flex items-center justify-between">
          <!-- Current Pick Info -->
          <div class="flex items-center space-x-6">
            <div>
              <span
                class="text-sm font-medium text-blue-900 dark:text-blue-100"
              >
                Pick {{ draftLayoutService.currentPick() }}
              </span>
              <span class="text-sm text-blue-700 dark:text-blue-300 ml-2">
                Round {{ draftLayoutService.draftStats()?.currentRound }} of
                {{ draftLayoutService.draftStats()?.totalRounds }}
              </span>
            </div>

            <div *ngIf="draftLayoutService.currentTeam()">
              <span
                class="text-sm font-medium text-blue-900 dark:text-blue-100"
              >
                {{ draftLayoutService.currentTeam()?.name }}
              </span>
              <span class="text-sm text-blue-700 dark:text-blue-300 ml-2">
                on the clock
              </span>
            </div>
          </div>

          <!-- Timer and Progress -->
          <div class="flex items-center space-x-6">
            <!-- Timer -->
            <div class="flex items-center space-x-2">
              <div
                class="timer-circle"
                [class.warning]="draftLayoutService.timeRemaining() <= 30"
              >
                <span class="timer-minutes">{{ getMinutes() }}</span>
              </div>
              <span class="text-sm font-mono text-blue-900 dark:text-blue-100">
                {{ draftLayoutService.timeRemainingFormatted() }}
              </span>
            </div>

            <!-- Progress Bar -->
            <div class="w-32">
              <div class="bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div
                  class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  [style.width.%]="
                    draftLayoutService.draftStats()?.progressPercentage || 0
                  "
                ></div>
              </div>
              <div class="text-xs text-blue-700 dark:text-blue-300 mt-1">
                {{ draftLayoutService.draftStats()?.completedPicks }}/{{
                  draftLayoutService.draftStats()?.totalPicks
                }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Draft Footer -->
    <footer
      *ngIf="draftLayoutService.draftState()"
      class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
    >
      <!-- Current Pick Banner -->
      <div
        *ngIf="!draftLayoutService.draftState()?.isComplete"
        class="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
      >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div class="flex items-center space-x-2">
                <div
                  class="w-3 h-3 bg-green-400 rounded-full animate-pulse"
                ></div>
                <span class="font-semibold text-lg">{{
                  draftLayoutService.currentTeam()?.name || 'Unknown Team'
                }}</span>
                <span class="text-blue-100">is on the clock</span>
              </div>
            </div>

            <div
              class="flex items-center space-x-4"
              *ngIf="draftLayoutService.isMyTurn()"
            >
              <div
                class="flex items-center space-x-2 bg-yellow-500 bg-opacity-20 px-3 py-1 rounded-full"
              >
                <span class="text-yellow-300">🔥</span>
                <span class="font-bold text-yellow-200">Your Turn!</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Draft Complete Banner -->
      <div
        *ngIf="draftLayoutService.draftState()?.isComplete"
        class="bg-gradient-to-r from-green-500 to-emerald-600 text-white"
      >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
          <h3 class="text-2xl font-bold mb-2">🎉 Draft Complete!</h3>
          <p class="text-green-100 mb-4">
            The draft has finished. Contract negotiations will begin shortly for
            veteran players.
          </p>
          <button
            (click)="goToNegotiations.emit()"
            class="bg-white text-green-600 px-6 py-2 rounded-lg font-semibold hover:bg-green-50 transition-colors"
          >
            View Contract Negotiations
          </button>
        </div>
      </div>
    </footer>
  `,
  styles: [
    `
      .timer-circle {
        width: 2rem;
        height: 2rem;
        border-radius: 9999px;
        border-width: 2px;
        border-color: var(--primary-color);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }

      .timer-circle.warning {
        border-color: var(--error-color);
        background-color: var(--bg-error-light);
        animation: pulse-warning 1s infinite;
      }

      .timer-minutes {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--primary-color);
      }

      .warning .timer-minutes {
        color: var(--error-color);
      }

      @keyframes pulse-warning {
        0%,
        100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.1);
        }
      }
    `,
  ],
})
export class DraftFooter {
  @Output() goToNegotiations = new EventEmitter<void>();

  constructor(public draftLayoutService: DraftLayoutService) {}

  getMinutes(): number {
    return Math.floor(this.draftLayoutService.timeRemaining() / 60);
  }
}
