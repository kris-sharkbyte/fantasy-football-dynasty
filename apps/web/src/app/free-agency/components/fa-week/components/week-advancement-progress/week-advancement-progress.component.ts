import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressBarModule } from 'primeng/progressbar';
import { CardModule } from 'primeng/card';
import { FreeAgencyService } from '../../../../../services/free-agency.service';

@Component({
  selector: 'app-week-advancement-progress',
  standalone: true,
  imports: [CommonModule, ProgressBarModule, CardModule],
  template: `
    @if (isAdvancingWeek()) {
    <div class="week-advancement-overlay">
      <div class="progress-container">
        <p-card>
          <ng-template pTemplate="header">
            <div class="progress-header">
              <h2>Advancing to Week {{ nextWeekNumber() }}</h2>
              <p class="progress-subtitle">
                Please wait while we process the week...
              </p>
            </div>
          </ng-template>

          <div class="progress-content">
            <!-- Progress Bar -->
            <div class="progress-bar-container">
              <p-progressBar
                [value]="progressValue()"
                [showValue]="false"
                [mode]="isIndeterminate() ? 'indeterminate' : 'determinate'"
                styleClass="progress-bar"
              ></p-progressBar>
              <div class="progress-text">
                {{ progressText() }}
              </div>
            </div>

            <!-- Progress Steps -->
            <div class="progress-steps">
              <div
                class="progress-step"
                [class.completed]="isStepCompleted('processing')"
                [class.current]="isCurrentStep('processing')"
              >
                <div class="step-icon">
                  @if (isStepCompleted('processing')) {
                  <i class="pi pi-check"></i>
                  } @else if (isCurrentStep('processing')) {
                  <i class="pi pi-spin pi-spinner"></i>
                  } @else {
                  <i class="pi pi-circle"></i>
                  }
                </div>
                <div class="step-text">
                  <div class="step-title">Processing Player Decisions</div>
                  <div class="step-description">
                    Evaluating all pending bids
                  </div>
                </div>
              </div>

              <div
                class="progress-step"
                [class.completed]="isStepCompleted('carryover')"
                [class.current]="isCurrentStep('carryover')"
              >
                <div class="step-icon">
                  @if (isStepCompleted('carryover')) {
                  <i class="pi pi-check"></i>
                  } @else if (isCurrentStep('carryover')) {
                  <i class="pi pi-spin pi-spinner"></i>
                  } @else {
                  <i class="pi pi-circle"></i>
                  }
                </div>
                <div class="step-text">
                  <div class="step-title">Carrying Over Active Bids</div>
                  <div class="step-description">Moving bids to next week</div>
                </div>
              </div>

              <div
                class="progress-step"
                [class.completed]="isStepCompleted('updating')"
                [class.current]="isCurrentStep('updating')"
              >
                <div class="step-icon">
                  @if (isStepCompleted('updating')) {
                  <i class="pi pi-check"></i>
                  } @else if (isCurrentStep('updating')) {
                  <i class="pi pi-spin pi-spinner"></i>
                  } @else {
                  <i class="pi pi-circle"></i>
                  }
                </div>
                <div class="step-text">
                  <div class="step-title">Updating Player Statuses</div>
                  <div class="step-description">Finalizing week results</div>
                </div>
              </div>

              <div
                class="progress-step"
                [class.completed]="isStepCompleted('creating')"
                [class.current]="isCurrentStep('creating')"
              >
                <div class="step-icon">
                  @if (isStepCompleted('creating')) {
                  <i class="pi pi-check"></i>
                  } @else if (isCurrentStep('creating')) {
                  <i class="pi pi-spin pi-spinner"></i>
                  } @else {
                  <i class="pi pi-circle"></i>
                  }
                </div>
                <div class="step-text">
                  <div class="step-title">Creating Next Week</div>
                  <div class="step-description">Setting up new FA week</div>
                </div>
              </div>
            </div>
          </div>
        </p-card>
      </div>
    </div>
    }
  `,
  styles: [
    `
      .week-advancement-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        backdrop-filter: blur(4px);
      }

      .progress-container {
        width: 100%;
        max-width: 600px;
        margin: 0 20px;
      }

      .progress-header {
        text-align: center;
        padding: 20px 0;
      }

      .progress-header h2 {
        margin: 0 0 8px 0;
        color: #2563eb;
        font-size: 1.5rem;
        font-weight: 600;
      }

      .progress-subtitle {
        margin: 0;
        color: #6b7280;
        font-size: 0.9rem;
      }

      .progress-content {
        padding: 20px 0;
      }

      .progress-bar-container {
        margin-bottom: 30px;
      }

      .progress-bar {
        height: 8px;
        border-radius: 4px;
      }

      .progress-text {
        text-align: center;
        margin-top: 10px;
        font-weight: 500;
        color: #374151;
        font-size: 0.9rem;
      }

      .progress-steps {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .progress-step {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;
        transition: all 0.3s ease;
      }

      .progress-step.current {
        background: #eff6ff;
        border: 1px solid #dbeafe;
      }

      .progress-step.completed {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
      }

      .step-icon {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        font-size: 12px;
        flex-shrink: 0;
      }

      .progress-step.current .step-icon {
        background: #3b82f6;
        color: white;
      }

      .progress-step.completed .step-icon {
        background: #10b981;
        color: white;
      }

      .progress-step:not(.current):not(.completed) .step-icon {
        background: #e5e7eb;
        color: #9ca3af;
      }

      .step-text {
        flex: 1;
      }

      .step-title {
        font-weight: 500;
        color: #374151;
        font-size: 0.9rem;
        margin-bottom: 2px;
      }

      .step-description {
        color: #6b7280;
        font-size: 0.8rem;
      }

      /* Dark mode support */
      :host-context(.dark) .week-advancement-overlay {
        background: rgba(0, 0, 0, 0.9);
      }

      :host-context(.dark) .progress-header h2 {
        color: #60a5fa;
      }

      :host-context(.dark) .progress-subtitle {
        color: #9ca3af;
      }

      :host-context(.dark) .progress-text {
        color: #d1d5db;
      }

      :host-context(.dark) .progress-step.current {
        background: #1e3a8a;
        border-color: #3b82f6;
      }

      :host-context(.dark) .progress-step.completed {
        background: #064e3b;
        border-color: #10b981;
      }

      :host-context(.dark) .step-title {
        color: #f3f4f6;
      }

      :host-context(.dark) .step-description {
        color: #9ca3af;
      }
    `,
  ],
})
export class WeekAdvancementProgressComponent {
  private readonly freeAgencyService = inject(FreeAgencyService);

  // Signals from service
  isAdvancingWeek = this.freeAgencyService.isAdvancingWeek;
  weekAdvancementProgress = this.freeAgencyService.weekAdvancementProgress;
  currentWeekNumber = this.freeAgencyService.currentWeekNumber;

  // Computed values
  nextWeekNumber = computed(() => this.currentWeekNumber() + 1);

  progressValue = computed(() => {
    const progress = this.weekAdvancementProgress();
    if (!progress) return 0;

    if (progress.includes('Processing player decisions')) return 25;
    if (progress.includes('Carrying over active bids')) return 50;
    if (progress.includes('Updating player statuses')) return 75;
    if (progress.includes('Creating next week')) return 90;
    if (progress.includes('Week advancement complete')) return 100;

    return 0;
  });

  isIndeterminate = computed(() => {
    const progress = this.weekAdvancementProgress();
    return !progress || progress.includes('Week advancement complete');
  });

  progressText = computed(() => {
    const progress = this.weekAdvancementProgress();
    if (!progress) return 'Initializing...';
    return progress;
  });

  isStepCompleted(step: string): boolean {
    const progress = this.weekAdvancementProgress();
    if (!progress) return false;

    switch (step) {
      case 'processing':
        return (
          progress.includes('Carrying over active bids') ||
          progress.includes('Updating player statuses') ||
          progress.includes('Creating next week') ||
          progress.includes('Week advancement complete')
        );
      case 'carryover':
        return (
          progress.includes('Updating player statuses') ||
          progress.includes('Creating next week') ||
          progress.includes('Week advancement complete')
        );
      case 'updating':
        return (
          progress.includes('Creating next week') ||
          progress.includes('Week advancement complete')
        );
      case 'creating':
        return progress.includes('Week advancement complete');
      default:
        return false;
    }
  }

  isCurrentStep(step: string): boolean {
    const progress = this.weekAdvancementProgress();
    if (!progress) return step === 'processing';

    switch (step) {
      case 'processing':
        return progress.includes('Processing player decisions');
      case 'carryover':
        return progress.includes('Carrying over active bids');
      case 'updating':
        return progress.includes('Updating player statuses');
      case 'creating':
        return progress.includes('Creating next week');
      default:
        return false;
    }
  }
}
