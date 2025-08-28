import { Component, input, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ProgressBarModule } from 'primeng/progressbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { LeagueService } from '../../services/league.service';
import { League } from '@fantasy-football-dynasty/types';
import { MessageService } from 'primeng/api';
import { DraftSimulationService } from '../../services/draft-simulation.service';

@Component({
  selector: 'app-league-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    TextareaModule,
    CheckboxModule,
    MessageModule,
    ProgressSpinnerModule,
    ProgressBarModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './league-settings.component.html',
  styleUrls: ['./league-settings.component.scss'],
})
export class LeagueSettingsComponent implements OnInit {
  league = input.required<League>();

  settingsForm: FormGroup;
  isSaving = signal(false);
  isPrivate = signal(false);
  joinCode = signal<string>('');
  isRandomizing = signal(false);
  
  // Remove the teams signal since we'll use the cached one from league service
  // teams = signal<any[]>([]);

  private readonly leagueService = inject(LeagueService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly fb = inject(FormBuilder);
  public readonly draftSimulationService = inject(DraftSimulationService);

  // Use cached league teams from the service
  readonly leagueTeams = this.leagueService.leagueTeams;

  constructor() {
    this.settingsForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      isPrivate: [false],
      roster: this.fb.group({
        minPlayers: [
          15,
          [Validators.required, Validators.min(10), Validators.max(20)],
        ],
        maxPlayers: [
          25,
          [Validators.required, Validators.min(20), Validators.max(35)],
        ],
        positionRequirements: this.fb.group({
          QB: [2, [Validators.required, Validators.min(1), Validators.max(5)]],
          RB: [4, [Validators.required, Validators.min(2), Validators.max(8)]],
          WR: [6, [Validators.required, Validators.min(2), Validators.max(10)]],
          TE: [2, [Validators.required, Validators.min(1), Validators.max(4)]],
          K: [1, [Validators.required, Validators.min(1), Validators.max(2)]],
          DEF: [1, [Validators.required, Validators.min(1), Validators.max(2)]],
        }),
        allowIR: [true],
        allowTaxi: [true],
        maxIR: [
          3,
          [Validators.required, Validators.min(0), Validators.max(10)],
        ],
        maxTaxi: [
          4,
          [Validators.required, Validators.min(0), Validators.max(8)],
        ],
      }),
    });
  }

  ngOnInit(): void {
    // Initialize form with league data
    this.settingsForm.patchValue({
      name: this.league().name,
      description: this.league().description,
      isPrivate: this.league().isPrivate,
      roster: this.league().rules.roster,
    });

    this.isPrivate.set(this.league().isPrivate);
    this.joinCode.set(this.league().joinCode);

    // No need to manually load teams - they're loaded automatically when the league is selected
    console.log('League settings component initialized');
  }

  private initializeForm(): void {
    const league = this.league();
    this.settingsForm.patchValue({
      name: league.name,
      description: league.description || '',
      isPrivate: league.isPrivate,
      roster: {
        minPlayers: league.rules.roster?.minPlayers || 15,
        maxPlayers: league.rules.roster?.maxPlayers || 25,
        positionRequirements: {
          QB: league.rules.roster?.positionRequirements?.QB || 2,
          RB: league.rules.roster?.positionRequirements?.RB || 4,
          WR: league.rules.roster?.positionRequirements?.WR || 6,
          TE: league.rules.roster?.positionRequirements?.TE || 2,
          K: league.rules.roster?.positionRequirements?.K || 1,
          DEF: league.rules.roster?.positionRequirements?.DEF || 1,
        },
        allowIR: league.rules.roster?.allowIR ?? true,
        allowTaxi: league.rules.roster?.allowTaxi ?? true,
        maxIR: league.rules.roster?.maxIR || 3,
        maxTaxi: league.rules.roster?.maxTaxi || 4,
      },
    });

    this.isPrivate.set(league.isPrivate);
    this.joinCode.set(league.joinCode || '');
  }

  onPrivacyChange(): void {
    const isPrivate = this.settingsForm.get('isPrivate')?.value;
    this.isPrivate.set(isPrivate);
  }

  async saveSettings(): Promise<void> {
    if (this.settingsForm.invalid) {
      return;
    }

    try {
      this.isSaving.set(true);
      const formData = this.settingsForm.value;

      // Update league settings
      await this.leagueService.updateLeague(this.league().id, {
        name: formData.name,
        description: formData.description,
        isPrivate: formData.isPrivate,
        rules: {
          ...this.league().rules,
          roster: formData.roster,
        },
      });

      this.messageService.add({
        severity: 'success',
        summary: 'Settings Updated',
        detail: 'League settings have been updated successfully.',
      });

      // Refresh the league data
      await this.leagueService.refresh();
    } catch (error) {
      console.error('Error updating league settings:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Update Failed',
        detail: 'Failed to update league settings. Please try again.',
      });
    } finally {
      this.isSaving.set(false);
    }
  }

  copyJoinCode(): void {
    if (this.joinCode()) {
      navigator.clipboard
        .writeText(this.joinCode())
        .then(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Code Copied',
            detail: 'Join code copied to clipboard!',
          });
        })
        .catch(() => {
          this.messageService.add({
            severity: 'error',
            summary: 'Copy Failed',
            detail: 'Failed to copy join code. Please copy manually.',
          });
        });
    }
  }

  generateNewJoinCode(): void {
    // This would need to be implemented in the service
    // For now, just show a message
    this.messageService.add({
      severity: 'info',
      summary: 'New Code',
      detail: 'New join code generation will be implemented soon.',
    });
  }

  /**
   * Get team name by ID
   */
  getTeamName(teamId: string): string {
    const team = this.leagueTeams().find((t) => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  }

  /**
   * Get current draft order
   */
  get draftOrder(): string[] {
    return this.league().draftOrder || [];
  }

  /**
   * Randomize draft order
   */
  async randomizeDraftOrder(): Promise<void> {
    try {
      this.isRandomizing.set(true);
      await this.leagueService.randomizeDraftOrder(this.league().id);

      this.messageService.add({
        severity: 'success',
        summary: 'Draft Order Updated',
        detail: 'Draft order has been randomized successfully.',
      });

      // Refresh the league data
      await this.leagueService.refresh();
    } catch (error) {
      console.error('Error randomizing draft order:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Randomization Failed',
        detail: 'Failed to randomize draft order. Please try again.',
      });
    } finally {
      this.isRandomizing.set(false);
    }
  }

  /**
   * Clear draft order
   */
  async clearDraftOrder(): Promise<void> {
    try {
      await this.leagueService.setDraftOrder(this.league().id, []);

      this.messageService.add({
        severity: 'success',
        summary: 'Draft Order Cleared',
        detail: 'Draft order has been cleared successfully.',
      });

      // Refresh the league data
      await this.leagueService.refresh();
    } catch (error) {
      console.error('Error clearing draft order:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Clear Failed',
        detail: 'Failed to clear draft order. Please try again.',
      });
    }
  }

  /**
   * Simulate draft with confirmation
   */
  simulateDraft(): void {
    this.confirmationService.confirm({
      message:
        'Are you sure you want to simulate the draft? This will automatically fill all team rosters based on league rules and available players.',
      header: 'Confirm Draft Simulation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.executeDraftSimulation();
      },
      reject: () => {
        this.messageService.add({
          severity: 'info',
          summary: 'Simulation Cancelled',
          detail: 'Draft simulation was cancelled.',
        });
      },
    });
  }

  /**
   * Execute the draft simulation
   */
  private async executeDraftSimulation(): Promise<void> {
    try {
      this.messageService.add({
        severity: 'info',
        summary: 'Draft Simulation',
        detail: 'Starting draft simulation...',
      });

      // Call the actual draft simulation service
      await this.draftSimulationService.simulateDraft(this.league().id);

      this.messageService.add({
        severity: 'success',
        summary: 'Draft Simulation',
        detail:
          'Draft simulation completed successfully! Teams now have players.',
      });

      // Refresh the league data to show updated rosters
      // TODO: Add method to refresh league data
    } catch (error) {
      console.error('Draft simulation failed:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Draft Simulation Failed',
        detail:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }
}
