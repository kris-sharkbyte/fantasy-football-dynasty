import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import {
  Position,
  RosterSlot,
  Contract,
} from '@fantasy-football-dynasty/types';
import {
  LeagueMembershipService,
  LeagueMember,
} from '../../services/league-membership.service';
import {
  PlayerDataService,
  SleeperPlayer,
} from '../../services/player-data.service';
import { LeagueService } from '../../services/league.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { LeagueHeaderComponent } from '../components/league-header.component';

@Component({
  selector: 'app-my-roster',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    DialogModule,
    MessageModule,
    ProgressSpinnerModule,
    LeagueHeaderComponent,
  ],
  templateUrl: './my-roster.component.html',
  styleUrls: ['./my-roster.component.scss'],
})
export class MyRosterComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly leagueMembershipService = inject(LeagueMembershipService);
  private readonly playerDataService = inject(PlayerDataService);
  private readonly leagueService = inject(LeagueService);
  private readonly router = inject(Router);

  // Component state

  private _isLoading = signal(true);
  private _error = signal<string | null>(null);
  private _selectedPlayer = signal<SleeperPlayer | null>(null);

  // Public signals
  public leagueId = this.leagueService.selectedLeagueId;
  public myMember = signal<LeagueMember | null>(null);
  public isLoading = this._isLoading.asReadonly();
  public error = this._error.asReadonly();
  public selectedPlayer = this._selectedPlayer.asReadonly();

  // PrimeNG compatible properties (not signals)
  public showContractModal = false;

  // Computed values
  public league = computed(() => this.leagueService.selectedLeague());
  public hasPlayers = computed(() => this.playerDataService.hasPlayers());
  public rosterWithPlayers = computed(() => {
    const member = this.myMember();
    if (!member?.roster || !this.hasPlayers()) return [];

    return member.roster.map((slot: RosterSlot) => {
      const player = this.playerDataService.getPlayer(slot.playerId);
      return {
        ...slot,
        player,
        playerName: player
          ? `${player.first_name} ${player.last_name}`
          : 'Unknown Player',
        team: player?.team || 'FA',
        age: player?.age || 0,
        yearsExp: player?.years_exp || 0,
      };
    });
  });

  // Contract creation properties
  public salaryCap = 200000000; // Default 200M cap
  public existingContracts: Contract[] = []; // TODO: Load from service

  async ngOnInit(): Promise<void> {
    try {
      this._isLoading.set(true);
      this._error.set(null);

      // Get league ID from route
      const leagueId = this.leagueId();
      console.log('League ID:', leagueId);
      if (!leagueId) {
        throw new Error('No league ID provided');
      }

      // Set selected league
      this.leagueService.setSelectedLeagueId(leagueId);

      // Load players if not already loaded
      if (!this.playerDataService.hasPlayers()) {
        await this.playerDataService.loadPlayers();
      }

      // Get current user's membership for this league
      await this.loadMyMembership(leagueId);

      // Load league rules for salary cap
      await this.loadLeagueRules(leagueId);
    } catch (error) {
      console.error('Error initializing MyRosterComponent:', error);
      this._error.set(
        error instanceof Error ? error.message : 'Failed to load roster'
      );
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load current user's membership for the specified league
   */
  private async loadMyMembership(leagueId: string): Promise<void> {
    // Use existing memberships data instead of making a new service call
    const existingMemberships = this.leagueMembershipService.userMemberships();
    let myMembership = existingMemberships.find(
      (m) => m.leagueId === leagueId && m.isActive
    );

    // If not found in existing memberships, they should have been loaded by the guard
    if (!myMembership) {
      console.error('League membership not found in existing data:', {
        leagueId,
        existingMemberships: existingMemberships.map((m) => ({
          leagueId: m.leagueId,
          isActive: m.isActive,
        })),
      });
      throw new Error('League membership not found');
    }

    this.myMember.set(myMembership);
  }

  /**
   * Load league rules to get salary cap information
   */
  private async loadLeagueRules(leagueId: string): Promise<void> {
    try {
      const league = this.leagueService.selectedLeague();
      if (league?.rules?.cap?.salaryCap) {
        this.salaryCap = league.rules.cap.salaryCap;
      }
    } catch (error) {
      console.error('Error loading league rules:', error);
      // Keep default salary cap
    }
  }

  /**
   * Open contract creation modal for a player
   */
  openContractModal(player: SleeperPlayer): void {
    this._selectedPlayer.set(player);
    this.showContractModal = true;
  }

  /**
   * Close contract creation modal
   */
  closeContractModal(): void {
    this.showContractModal = false;
    this._selectedPlayer.set(null);
  }

  /**
   * Navigate to negotiation page for a specific player
   */
  openContractCreationModal(player: SleeperPlayer): void {
    const leagueId = this.route.snapshot.paramMap.get('id');
    if (leagueId) {
      this.router.navigate([
        '/leagues',
        leagueId,
        'negotiate',
        player.player_id,
      ]);
    }
  }

  /**
   * Get position display name
   */
  getPositionDisplayName(position: Position): string {
    return position;
  }

  /**
   * Get status severity for tag
   */
  getStatusSeverity(status: string): string {
    switch (status) {
      case 'active':
        return 'success';
      case 'bench':
        return 'warning';
      case 'ir':
        return 'danger';
      case 'taxi':
        return 'info';
      default:
        return 'secondary';
    }
  }

  /**
   * Get status display name
   */
  getStatusDisplayName(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  goToContractCreation(player: SleeperPlayer): void {
    this.router.navigate([
      '/leagues',
      this.leagueId(),
      'negotiate',
      player.player_id,
    ]);
  }
}
