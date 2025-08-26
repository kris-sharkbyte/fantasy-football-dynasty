import { Component, input, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { LeagueService } from '../../services/league.service';
import { League } from '@fantasy-football-dynasty/types';
import { MessageService } from 'primeng/api';

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
  ],
  providers: [MessageService],
  templateUrl: './league-settings.component.html',
  styleUrls: ['./league-settings.component.scss'],
})
export class LeagueSettingsComponent implements OnInit {
  league = input.required<League>();
  
  settingsForm: FormGroup;
  isSaving = signal(false);
  isPrivate = signal(false);
  joinCode = signal<string>('');

  private readonly leagueService = inject(LeagueService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  constructor() {
    this.settingsForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      isPrivate: [false],
    });
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    const league = this.league();
    this.settingsForm.patchValue({
      name: league.name,
      description: league.description || '',
      isPrivate: league.isPrivate,
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
      navigator.clipboard.writeText(this.joinCode()).then(() => {
        this.messageService.add({
          severity: 'success',
          summary: 'Code Copied',
          detail: 'Join code copied to clipboard!',
        });
      }).catch(() => {
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
}
