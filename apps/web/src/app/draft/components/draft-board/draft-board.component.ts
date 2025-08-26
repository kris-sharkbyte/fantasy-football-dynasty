import { Component, Output, EventEmitter, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DraftPick, Player, Team } from '@fantasy-football-dynasty/types';

@Component({
  selector: 'app-draft-board',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './draft-board.component.html',
  styleUrls: ['./draft-board.component.scss'],
})
export class DraftBoardComponent {
  // Signal-based inputs (Angular 17+ modern approach)
  teams = input<Team[]>([]);
  draftOrder = input<string[]>([]); // team IDs in draft order
  draftPicks = input<DraftPick[]>([]);
  availablePlayers = input<Player[]>([]);
  currentPick = input<number>(1);
  isMyTurn = input<boolean>(false);
  currentUserTeamId = input<string | null>(null);
  canMakePick = input<boolean>(false);
  numberOfTeams = input<number>(0);
  totalRounds = input<number>(25);

  @Output() openPlayerSelection = new EventEmitter<DraftPick>();
  @Output() claimTeam = new EventEmitter<string>();

  // Simple computed properties for template loops
  get teamIndices(): number[] {
    return Array.from({ length: this.numberOfTeams() }, (_, i) => i);
  }

  get rounds(): number[] {
    return Array.from({ length: this.totalRounds() }, (_, i) => i + 1);
  }

  getTeamById(teamIndex: number): Team | null {
    // If draft order is set, use it; otherwise fall back to teams array order
    if (this.draftOrder().length > 0) {
      if (teamIndex < this.draftOrder().length) {
        const teamId = this.draftOrder()[teamIndex];
        return this.teams().find((team) => team.id === teamId) || null;
      }
    } else {
      // Fallback to teams array order
      if (teamIndex < this.teams().length) {
        return this.teams()[teamIndex];
      }
    }
    return null;
  }

  getPickForTeamAndRound(teamIndex: number, round: number): DraftPick | null {
    // Calculate the pick number based on snake draft logic
    const pickNumber = this.calculatePickNumber(teamIndex, round);
    return (
      this.draftPicks().find((pick) => pick.pickNumber === pickNumber) || null
    );
  }

  getPickPositionInRound(teamIndex: number, round: number): number {
    // Calculate the position within the round (1-based)
    const isSnakeRound = round % 2 === 0; // Even rounds are snake (reverse)
    if (isSnakeRound) {
      return this.numberOfTeams() - teamIndex;
    } else {
      return teamIndex + 1;
    }
  }

  calculatePickNumber(teamIndex: number, round: number): number {
    const isSnakeRound = round % 2 === 0; // Even rounds are snake (reverse)
    let positionInRound: number;

    if (isSnakeRound) {
      positionInRound = this.numberOfTeams() - teamIndex;
    } else {
      positionInRound = teamIndex + 1;
    }

    return (round - 1) * this.numberOfTeams() + positionInRound;
  }

  getCellClasses(pick: DraftPick): string {
    let classes = '';

    // Add position-based classes if player is drafted
    if (pick.playerId) {
      const player = this.getPlayerById(pick.playerId);
      if (player) {
        classes += ` ${player.position.toLowerCase()}`;
        classes += ' drafted';
      }
    }

    // Add current pick indicator
    if (pick.pickNumber === this.currentPick()) {
      classes += ' current-pick';
    }

    return classes.trim();
  }

  getDirectionClass(roundIndex: number, teamPosition: number): string {
    const isSnakeRound = roundIndex % 2 === 1; // Even rounds (0-indexed) are snake

    if (isSnakeRound) {
      return 'left';
    } else {
      return 'right';
    }
  }

  getDirectionImage(roundIndex: number, teamPosition: number): string {
    const isSnakeRound = roundIndex % 2 === 1; // Even rounds (0-indexed) are snake

    if (isSnakeRound) {
      return 'https://sleepercdn.com/images/v2/ui/icon_arrow_right.png';
    } else {
      return 'https://sleepercdn.com/images/v2/ui/icon_arrow_right_dark_2.png';
    }
  }

  getDirectionAlt(roundIndex: number, teamPosition: number): string {
    const isSnakeRound = roundIndex % 2 === 1; // Even rounds (0-indexed) are snake

    if (isSnakeRound) {
      return 'arrow left';
    } else {
      return 'arrow right';
    }
  }

  getPlayerById(playerId: string): Player | null {
    return this.availablePlayers().find((p) => p.id === playerId) || null;
  }

  getPlayerAvatar(playerId: string): string {
    // You can implement player avatar logic here
    // For now, return a placeholder or default avatar
    return 'https://sleepercdn.com/content/nfl/players/thumb/default.jpg';
  }

  onCellClick(pick: DraftPick): void {
    if (pick.pickNumber === this.currentPick() && this.canMakePick()) {
      this.openPlayerSelection.emit(pick);
    }
  }

  // Legacy methods for backward compatibility
  getPicksForRound(round: number): DraftPick[] {
    return this.draftPicks().filter((pick) => pick.round === round);
  }

  getPickIndicesForRound(round: number): number[] {
    const picksInRound = this.draftPicks().filter(
      (pick) => pick.round === round
    );
    return Array.from({ length: this.numberOfTeams() }, (_, i) => i);
  }

  getPickForRoundAndPosition(
    round: number,
    position: number
  ): DraftPick | null {
    const picksInRound = this.draftPicks().filter(
      (pick) => pick.round === round
    );
    return picksInRound[position] || null;
  }

  getTeamName(teamId: string): string {
    const team = this.teams().find((t) => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  }

  getPositionBgClass(position: string): string {
    const bgColors: Record<string, string> = {
      QB: 'bg-red-100 dark:bg-red-900',
      RB: 'bg-green-100 dark:bg-green-900',
      WR: 'bg-blue-100 dark:bg-blue-900',
      TE: 'bg-yellow-100 dark:bg-yellow-900',
      K: 'bg-purple-100 dark:bg-purple-900',
      DEF: 'bg-gray-100 dark:bg-gray-900',
    };
    return bgColors[position] || 'bg-gray-100 dark:bg-gray-900';
  }

  getArrowClass(
    pick: DraftPick,
    roundIndex: number,
    pickIndex: number
  ): string {
    const isSnakeRound = roundIndex % 2 === 1; // Even rounds (0-indexed) are snake
    return isSnakeRound ? 'arrow-left' : 'arrow-right';
  }

  getArrowIcon(pick: DraftPick, roundIndex: number, pickIndex: number): string {
    const isSnakeRound = roundIndex % 2 === 1;
    return isSnakeRound ? 'pi pi-arrow-left' : 'pi pi-arrow-right';
  }

  getArrowSeverity(
    pick: DraftPick,
    roundIndex: number,
    pickIndex: number
  ): 'danger' | 'success' {
    const isSnakeRound = roundIndex % 2 === 1;
    return isSnakeRound ? 'danger' : 'success';
  }
}
