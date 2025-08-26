import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { BadgeModule } from 'primeng/badge';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { LeagueService } from '../../services/league.service';
import { League } from '@fantasy-football-dynasty/types';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-join-league-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    CardModule,
    ChipModule,
    BadgeModule,
    ProgressSpinnerModule,
    MessageModule,
  ],
  providers: [MessageService],
  templateUrl: './join-league-modal.component.html',
  styleUrls: ['./join-league-modal.component.scss'],
})
export class JoinLeagueModalComponent {
  visible: boolean = false;
  isLoading = signal(false);
  searchResults = signal<League[]>([]);
  activeTabIndex = signal(0);

  joinCodeForm: FormGroup;
  searchForm: FormGroup;

  private readonly leagueService = inject(LeagueService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  constructor() {
    this.joinCodeForm = this.fb.group({
      joinCode: [
        '',
        [Validators.required, Validators.minLength(6), Validators.maxLength(6)],
      ],
    });

    this.searchForm = this.fb.group({
      searchTerm: [''],
    });
  }

  show(): void {
    this.visible = true;
    this.resetForms();
  }

  hide(): void {
    this.visible = false;
    this.resetForms();
  }

  private resetForms(): void {
    this.joinCodeForm.reset();
    this.searchForm.reset();
    this.searchResults.set([]);
    this.activeTabIndex.set(0);
  }

  async searchLeagues(): Promise<void> {
    const searchTerm = this.searchForm.get('searchTerm')?.value;
    if (!searchTerm || searchTerm.trim().length < 2) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Search Term Required',
        detail: 'Please enter at least 2 characters to search for leagues.',
      });
      return;
    }

    try {
      this.isLoading.set(true);
      const results = await this.leagueService.searchPublicLeagues(searchTerm);
      this.searchResults.set(results);

      if (results.length === 0) {
        this.messageService.add({
          severity: 'info',
          summary: 'No Results',
          detail: 'No leagues found matching your search term.',
        });
      }
    } catch (error) {
      console.error('Error searching leagues:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Search Failed',
        detail: 'Failed to search for leagues. Please try again.',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  async joinByCode(): Promise<void> {
    if (this.joinCodeForm.invalid) {
      return;
    }

    const joinCode = this.joinCodeForm.get('joinCode')?.value;

    try {
      this.isLoading.set(true);
      const result = await this.leagueService.joinLeagueByCode(joinCode);

      if (result.success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Success!',
          detail: result.message,
        });
        this.hide();
        // Optionally navigate to the league
        // this.router.navigate(['/leagues', result.leagueId]);
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Join Failed',
          detail: result.message,
        });
      }
    } catch (error) {
      console.error('Error joining league:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Join Failed',
        detail: 'Failed to join league. Please try again.',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  async joinPublicLeague(league: League): Promise<void> {
    try {
      this.isLoading.set(true);
      const result = await this.leagueService.joinLeagueByCode(
        league.joinCode || ''
      );

      if (result.success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Success!',
          detail: result.message,
        });
        this.hide();
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Join Failed',
          detail: result.message,
        });
      }
    } catch (error) {
      console.error('Error joining league:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Join Failed',
        detail: 'Failed to join league. Please try again.',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  getPhaseColor(phase: string): string {
    switch (phase.toLowerCase()) {
      case 'offseason':
        return 'secondary';
      case 'drafting':
        return 'warning';
      case 'season':
        return 'success';
      case 'playoffs':
        return 'danger';
      default:
        return 'info';
    }
  }

  getStatusSeverity(
    phase: string
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (phase.toLowerCase()) {
      case 'regular-season':
      case 'preseason':
        return 'success';
      case 'playoffs':
        return 'danger';
      case 'draft':
        return 'warn';
      case 'free-agency':
        return 'info';
      case 'offseason':
        return 'secondary';
      default:
        return 'secondary';
    }
  }
}
