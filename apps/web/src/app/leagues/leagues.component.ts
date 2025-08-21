import { Component, signal, computed } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';

interface League {
  id: string;
  name: string;
  teams: number;
  phase: string;
  currentYear: number;
  description?: string;
  owner?: string;
  status?: 'active' | 'inactive' | 'drafting' | 'season';
}

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
    TooltipModule
  ],
  templateUrl: './leagues.component.html',
  styleUrls: ['./leagues.component.scss'],
})
export class LeaguesComponent {
  constructor(private router: Router) {}

  leagues = signal<League[]>([
    {
      id: '1',
      name: 'My Dynasty League',
      teams: 12,
      phase: 'offseason',
      currentYear: 2024,
      description: 'A competitive dynasty league with deep rosters',
      owner: 'John Doe',
      status: 'active'
    },
    {
      id: '2',
      name: 'Fantasy Champions',
      teams: 10,
      phase: 'drafting',
      currentYear: 2024,
      description: 'Fast-paced dynasty league with weekly prizes',
      owner: 'Jane Smith',
      status: 'drafting'
    }
  ]);

  getPhaseColor(phase: string): string {
    switch (phase.toLowerCase()) {
      case 'offseason': return 'secondary';
      case 'drafting': return 'warning';
      case 'season': return 'success';
      case 'playoffs': return 'danger';
      default: return 'info';
    }
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'danger';
      case 'drafting': return 'warn';
      case 'season': return 'info';
      default: return 'secondary';
    }
  }

  navigateToLeague(leagueId: string): void {
    this.router.navigate(['/leagues', leagueId]);
  }

  // League creation is now handled via router navigation to /leagues/create
}
