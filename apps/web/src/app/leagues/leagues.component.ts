import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { League } from '@fantasy-football-dynasty/types';
import { LeagueService } from '../services/league.service';
import { LeagueMembershipService } from '../services/league-membership.service';
import { JoinLeagueModalComponent } from './join-league-modal';

@Component({
  selector: 'app-leagues',
  standalone: true,
  imports: [
    RouterLink,
    CommonModule,
    CardModule,
    ButtonModule,
    ChipModule,
    AvatarModule,
    BadgeModule,
    TooltipModule,
    ProgressSpinnerModule,
    MessageModule,
    JoinLeagueModalComponent,
  ],
  templateUrl: './leagues.component.html',
  styleUrls: ['./leagues.component.scss'],
})
export class LeaguesComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly leagueService = inject(LeagueService);
  private readonly leagueMembershipService = inject(LeagueMembershipService);

  // Access the league service signals
  leagues = this.leagueService.userLeagues;
  isLoading = this.leagueService.isLoading;
  error = this.leagueService.error;
  hasLeagues = this.leagueService.hasLeagues;

  // Store permissions for each league
  leaguePermissions = new Map<string, boolean>();

  async ngOnInit(): Promise<void> {
    // Load user leagues when component initializes
    await this.leagueService.loadUserLeagues();
    
    // Load permissions for each league
    await this.loadLeaguePermissions();
  }

  private async loadLeaguePermissions(): Promise<void> {
    const userLeagues = this.leagues();
    for (const league of userLeagues) {
      try {
        const canManage = await this.leagueMembershipService.canManageLeague(league.id);
        this.leaguePermissions.set(league.id, canManage);
      } catch (err) {
        console.error(`Error loading permissions for league ${league.id}:`, err);
        this.leaguePermissions.set(league.id, false);
      }
    }
  }

  canManageLeague(leagueId: string): boolean {
    return this.leaguePermissions.get(leagueId) || false;
  }

  showJoinLeagueModal(): void {
    // This will be called by the template to show the modal
    // The modal component handles its own visibility
  }

  manageLeague(leagueId: string): void {
    this.router.navigate(['/leagues', leagueId]);
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

  navigateToLeague(leagueId: string): void {
    this.router.navigate(['/leagues', leagueId]);
  }

  async refreshLeagues(): Promise<void> {
    await this.leagueService.refresh();
  }

  clearError(): void {
    this.leagueService.clearError();
  }
}
