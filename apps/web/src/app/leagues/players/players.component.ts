import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';

import { LeagueService } from '../../services/league.service';
import {
  PlayersTableComponent,
  PlayersTableConfig,
  PlayerAction,
} from '../../shared/components/players-table/players-table.component';

@Component({
  selector: 'app-players',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    ProgressSpinnerModule,
    MessageModule,
    PlayersTableComponent,
  ],
  templateUrl: './players.component.html',
  styleUrls: ['./players.component.scss'],
})
export class PlayersComponent implements OnInit {
  isLoading = signal(true);
  leagueId = signal<string | null>(null);
  players = signal<any[]>([]);

  private readonly leagueService = inject(LeagueService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Computed values
  currentLeague = computed(() => this.leagueService.selectedLeague());
  currentUserTeam = computed(() => this.leagueService.currentUserTeam());

  // Players table configuration with dynamic actions based on league phase
  playersTableConfig = computed((): PlayersTableConfig => {
    const league = this.currentLeague();
    const currentTeam = this.currentUserTeam();

    const actions: PlayerAction[] = [];

    if (league) {
      // Add actions based on league phase
      if (league.phase === 'free-agency') {
        // Free agency actions
        actions.push({
          label: 'Bid',
          icon: 'pi pi-dollar',
          severity: 'success',
          action: (player: any) => this.onBidPlayer(player),
          visible: (player: any) => this.isPlayerAvailable(player),
        });

        actions.push({
          label: 'Sign',
          icon: 'pi pi-check',
          severity: 'primary',
          action: (player: any) => this.onSignPlayer(player),
          visible: (player: any) => this.isPlayerAvailable(player),
        });
      } else if (league.phase === 'regular-season') {
        // Regular season actions
        actions.push({
          label: 'Sign',
          icon: 'pi pi-check',
          severity: 'primary',
          action: (player: any) => this.onSignPlayer(player),
          visible: (player: any) => this.isPlayerAvailable(player),
        });
      }

      // Add trade action for players on teams (including current user's team)
      actions.push({
        label: 'Trade',
        icon: 'pi pi-exchange',
        severity: 'info',
        action: (player: any) => this.onTradePlayer(player),
        visible: (player: any) => this.isPlayerOnTeam(player),
      });
    }

    return {
      title: 'All Players',
      subtitle: `${this.players().length} Players Available`,
      emptyMessage: 'No players found',
      showFilters: true,
      showSearch: true,
      showPagination: true,
      pageSize: 25,
      mode: 'default',
      actions,
      leagueId: this.leagueId() || undefined,
      getPlayers: () => this.players(),
    };
  });

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.leagueId.set(params['leagueId']);
      this.loadPlayersData();
    });
  }

  private async loadPlayersData(): Promise<void> {
    try {
      this.isLoading.set(true);

      if (!this.leagueId()) {
        throw new Error('No league ID provided');
      }

      // Load league players
      const leagueId = this.leagueId();
      if (leagueId) {
        const players = await this.leagueService.getLeaguePlayers(leagueId);
        this.players.set(players);
      }
    } catch (error) {
      console.error('Error loading players data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Check if player is available (not on any team)
  private isPlayerAvailable(player: any): boolean {
    return !player.teamId || player.teamId === 'FA';
  }

  // Check if player is on a team (including current user's team)
  private isPlayerOnTeam(player: any): boolean {
    return player.teamId && player.teamId !== 'FA';
  }

  // Action handlers
  onBidPlayer(player: any): void {
    console.log('Bidding on player:', player);
    // Navigate to free agency bidding
    this.router.navigate(['/leagues', this.leagueId(), 'free-agency'], {
      queryParams: { playerId: player.id },
    });
  }

  onSignPlayer(player: any): void {
    console.log('Signing player:', player);
    // Navigate to contract creation
    this.router.navigate(['/teams/contract-creation'], {
      queryParams: {
        leagueId: this.leagueId(),
        playerId: player.id,
      },
    });
  }

  onTradePlayer(player: any): void {
    console.log('Trading player:', player);
    // Navigate to trade negotiation
    this.router.navigate(['/leagues', this.leagueId(), 'negotiate', player.id]);
  }
}
