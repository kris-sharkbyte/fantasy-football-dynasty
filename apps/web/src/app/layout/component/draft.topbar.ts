import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { League, DraftState } from '../../../../../../libs/types/src/lib/types';
import { DraftLayoutService } from '../../services/draft-layout.service';
import { LeagueService } from '../../services/league.service';

@Component({
  selector: 'app-draft-topbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header
      class="bg-surface-0 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Left: Back button and League Info -->
          <div class="flex items-center space-x-4">
            <!-- Back Button -->
            <button
              (click)="goBack()"
              class="p-2 rounded-md text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              title="Back to League"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <!-- League Name and Draft Info -->
            <div>
              <h1
                class="text-lg font-semibold text-surface-900 dark:text-surface-0"
              >
                {{ draftLayoutService.league()?.name || 'Draft Room' }}
              </h1>
              <p class="text-sm text-surface-500 dark:text-surface-400">
                {{ getDraftInfo() }}
              </p>
            </div>
          </div>

          <!-- Center: Start Draft Button -->
          <div class="flex-1 flex justify-center">
            <!-- Start Draft - show when no draft state or draft is paused -->
            <button
              *ngIf="
                !draftLayoutService.draftState() ||
                (!draftLayoutService.draftState()?.isComplete &&
                  draftLayoutService.draftState()?.isPaused)
              "
              (click)="startDraft.emit()"
              class="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center space-x-2"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>START DRAFT</span>
            </button>

            <!-- Pause Draft - show when draft is active -->
            <button
              *ngIf="
                draftLayoutService.draftState() &&
                !draftLayoutService.draftState()?.isComplete &&
                !draftLayoutService.draftState()?.isPaused
              "
              (click)="pauseDraft.emit()"
              class="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center space-x-2"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>PAUSE DRAFT</span>
            </button>

            <!-- Draft Complete -->
            <div
              *ngIf="draftLayoutService.draftState()?.isComplete"
              class="flex items-center space-x-2 text-surface-600 dark:text-surface-400"
            >
              <svg
                class="w-5 h-5 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
              <span class="font-medium">Draft Complete</span>
            </div>
          </div>

          <!-- Right: Action Icons -->
          <div class="flex items-center space-x-3">
            <!-- Notification Icon -->
            <button
              class="p-2 rounded-md text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors relative"
              title="Notifications"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 17h5l-5-5V9a6 6 0 10-12 0v3l-5 5h5m7 0v1a3 3 0 01-6 0v-1m6 0H9"
                />
              </svg>
              <!-- Notification dot -->
              <div
                class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"
              ></div>
            </button>

            <!-- Sound Toggle Icon -->
            <button
              class="p-2 rounded-md text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              title="Toggle Sound"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M6.343 6.343L4.929 4.929m0 14.142l1.414-1.414M12 3v6m0 6v6"
                />
              </svg>
            </button>

            <!-- Settings/More Icon -->
            <button
              class="p-2 rounded-md text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              title="Settings"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>

            <!-- Fullscreen Toggle -->
            <button
              class="p-2 rounded-md text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              title="Toggle Fullscreen"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [
    `
      .transition-colors {
        transition: background-color 0.2s ease, color 0.2s ease;
      }
    `,
  ],
})
export class DraftTopbar {
  @Output() startDraft = new EventEmitter<void>();
  @Output() pauseDraft = new EventEmitter<void>();

  constructor(
    public draftLayoutService: DraftLayoutService,
    private leagueService: LeagueService,
    private router: Router
  ) {}

  goBack() {
    const selectedLeagueId = this.leagueService.selectedLeagueId();
    if (selectedLeagueId) {
      this.router.navigate(['/leagues', selectedLeagueId]);
    } else {
      // Fallback to leagues list if no specific league is selected
      this.router.navigate(['/leagues']);
    }
  }

  getDraftInfo(): string {
    const league = this.draftLayoutService.league();
    if (!league?.rules?.draft) {
      return '2 Min Per Pick • 15 Rounds • Invite Leaguemates';
    }

    const draft = league.rules.draft;
    const timeLimit = Math.floor(draft.timeLimit / 60); // Convert seconds to minutes
    const mode =
      draft.mode === 'snake'
        ? 'Standard Snake'
        : draft.mode === 'auction'
        ? 'Auction'
        : 'Linear';

    return `${timeLimit} Min Per Pick • ${draft.rounds} Rounds • ${mode}`;
  }

  getDraftStatus(): string {
    const draftState = this.draftLayoutService.draftState();
    if (!draftState) return 'Not Started';
    if (draftState.isComplete) return 'Complete';
    if (draftState.isPaused) return 'Paused';
    return 'Active';
  }
}
