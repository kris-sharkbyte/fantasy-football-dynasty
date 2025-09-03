import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';

import { LeagueService } from '../../services/league.service';
import {
  PlayersTableComponent,
  PlayersTableConfig,
} from '../../shared/components/players-table/players-table.component';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TabsModule,
    ProgressSpinnerModule,
    MessageModule,
    PlayersTableComponent,
  ],
  templateUrl: './team.component.html',
  styleUrls: ['./team.component.scss'],
})
export class TeamComponent implements OnInit {
  isLoading = signal(true);
  leagueId = signal<string | null>(null);
  teamId = signal<string | null>(null);
  players = signal<any[]>([]);

  private readonly leagueService = inject(LeagueService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Computed values
  currentTeam = computed(() => {
    const teams = this.leagueService.leagueTeams();
    const teamId = this.teamId();
    return teams.find((team) => team.id === teamId) || null;
  });

  currentUserTeam = computed(() => this.leagueService.currentUserTeam());

  rosterPlayers = computed(() => {
    const team = this.currentTeam();
    const allPlayers = this.players();

    console.log('Team roster data:', {
      team: team,
      roster: team?.roster,
      rosterLength: team?.roster?.length,
      allPlayersLength: allPlayers.length,
      samplePlayer: allPlayers[0],
    });

    if (!team?.roster || team.roster.length === 0) {
      console.log('No roster data found for team');
      return [];
    }

    if (!allPlayers.length) {
      console.log('No league players loaded yet');
      return [];
    }

    // Filter to only show roster players and enhance with roster data
    const rosterPlayers = allPlayers
      .filter((player: any) => {
        const isOnRoster = team.roster.some(
          (rosterSlot) => rosterSlot.playerId === player.playerId
        );
        if (isOnRoster) {
          console.log(
            'Found roster player:',
            player.name,
            'ID:',
            player.playerId
          );
        }
        return isOnRoster;
      })
      .map((player: any) => {
        // Find the roster slot for this player to get additional info
        const rosterSlot = team.roster.find(
          (slot) => slot.playerId === player.playerId
        );
        return {
          ...player,
          rosterStatus: rosterSlot?.status || 'active',
          rosterPosition: rosterSlot?.position || player.position,
          rosterId: rosterSlot?.id,
        };
      });

    console.log(
      'Filtered roster players:',
      rosterPlayers.length,
      rosterPlayers
    );
    return rosterPlayers;
  });

  // Players table configuration
  playersTableConfig = computed(
    (): PlayersTableConfig => ({
      title: 'Team Roster',
      subtitle: `${this.rosterPlayers().length} Players`,
      emptyMessage: 'No players on roster',
      showFilters: true,
      showSearch: true,
      showPagination: true,
      pageSize: 25,
      mode: 'default',
      actions: [],
      leagueId: this.leagueId() || undefined,
      getPlayers: () => this.rosterPlayers(),
    })
  );

  ngOnInit(): void {
    this.loadTeamData();
  }

  private async loadTeamData(): Promise<void> {
    try {
      this.isLoading.set(true);

      if (!this.leagueId()) {
        throw new Error('No league ID provided');
      }

      // Get current user's team for this league
      const currentUserTeam = this.leagueService.currentUserTeam();
      if (!currentUserTeam) {
        throw new Error('No team found for current user');
      }

      this.teamId.set(currentUserTeam.teamId);

      // Load league players only if we need them for roster display
      const leagueId = this.leagueId();
      if (leagueId) {
        const players = await this.leagueService.getLeaguePlayers(leagueId);
        this.players.set(players);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  onEditTeam(): void {
    this.router.navigate(['/leagues', this.leagueId(), 'team', 'edit']);
  }

  get teamName(): string {
    return this.currentUserTeam()?.teamName || 'My Team';
  }

  get marketSizeLabel(): string {
    const team = this.currentTeam();
    if (!team?.location) return 'Not Set';

    const size = team.location.marketSize;
    return size.charAt(0).toUpperCase() + size.slice(1) + ' Market';
  }

  get climateLabel(): string {
    const team = this.currentTeam();
    if (!team?.location) return 'Not Set';

    const climate = team.location.climate;
    switch (climate) {
      case 'cold':
        return 'Cold Weather';
      case 'temperate':
        return 'Temperate';
      case 'warm':
        return 'Warm Weather';
      default:
        return climate;
    }
  }

  get taxRateLabel(): string {
    const team = this.currentTeam();
    if (!team?.location) return 'Not Set';

    const taxRate = team.location.taxRate;
    if (taxRate === 0) {
      return 'No State Income Tax';
    }
    return `${(taxRate * 100).toFixed(2)}% State Tax`;
  }
}
