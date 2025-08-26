import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import {
  DraftPick,
  Player,
  Team,
} from '../../../../../../libs/types/src/lib/types';

@Component({
  selector: 'app-draft-board',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <div class="draft-board-container">
      <div class="draft-board-header">
        <h2>Draft Board</h2>
        <div class="draft-info">
          <span>Current Pick: {{ currentPick }}</span>
          @if (isMyTurn) {
          <span class="my-turn">Your Turn!</span>
          }
        </div>
      </div>

      <div class="draft-board-grid">
        @for (round of rounds; track round; let roundIndex = $index) {
        <div class="round-row">
          <div class="round-header">Round {{ round }}</div>
          <div class="picks-container">
            @for (pickIndex of getPickIndicesForRound(round); track pickIndex;
            let teamIndex = $index) { @if (getPickForRoundAndPosition(round,
            pickIndex)) {
            <div
              class="pick-cell"
              [class.current-pick]="
                getPickForRoundAndPosition(round, pickIndex)?.pickNumber ===
                currentPick
              "
            >
              <!-- Pick Number Display -->
              <div class="pick-number-display">
                {{ round }}.{{ pickIndex + 1 }}
              </div>

              <!-- Team Assignment Section -->
              @if (!getPickForRoundAndPosition(round, pickIndex)?.currentTeamId)
              {
              <div class="team-claim-section">
                <p-button
                  label="CLAIM TEAM"
                  (onClick)="
                    claimTeam.emit(
                      getPickForRoundAndPosition(round, pickIndex)?.id || ''
                    )
                  "
                  size="small"
                  severity="success"
                  class="claim-button"
                ></p-button>
              </div>
              } @else {
              <!-- Team Name -->
              <div class="team-name">
                {{
                  getTeamName(
                    getPickForRoundAndPosition(round, pickIndex)
                      ?.currentTeamId || ''
                  )
                }}
              </div>

              <!-- Player Info or Pick Number -->
              @if (getPickForRoundAndPosition(round, pickIndex)?.playerId) { @if
              (getPlayerById(getPickForRoundAndPosition(round,
              pickIndex)?.playerId || '')) {
              <div
                class="player-info"
                [class]="
                  getPositionBgClass(
                    getPlayerById(
                      getPickForRoundAndPosition(round, pickIndex)?.playerId ||
                        ''
                    )?.position || ''
                  )
                "
              >
                <div class="player-name">
                  {{
                    getPlayerById(
                      getPickForRoundAndPosition(round, pickIndex)?.playerId ||
                        ''
                    )?.name
                  }}
                </div>
                <div class="player-position">
                  {{
                    getPlayerById(
                      getPickForRoundAndPosition(round, pickIndex)?.playerId ||
                        ''
                    )?.position
                  }}
                  -
                  {{
                    getPlayerById(
                      getPickForRoundAndPosition(round, pickIndex)?.playerId ||
                        ''
                    )?.nflTeam
                  }}
                </div>
              </div>
              } } @else {
              <div class="pick-number">
                #{{ getPickForRoundAndPosition(round, pickIndex)?.pickNumber }}
              </div>
              }

              <!-- Current Pick Indicator -->
              @if (getPickForRoundAndPosition(round, pickIndex)?.pickNumber ===
              currentPick && !getPickForRoundAndPosition(round,
              pickIndex)?.playerId) {
              <div class="on-clock">
                <div class="clock-indicator">⏰</div>
                <div class="clock-text">ON CLOCK</div>
              </div>
              }

              <!-- Navigation Arrow -->
              @if (!getPickForRoundAndPosition(round, pickIndex)?.playerId) {
              <p-button
                [icon]="
                  getArrowIcon(
                    getPickForRoundAndPosition(round, pickIndex)!,
                    roundIndex,
                    teamIndex
                  )
                "
                [class]="
                  getArrowClass(
                    getPickForRoundAndPosition(round, pickIndex)!,
                    roundIndex,
                    teamIndex
                  )
                "
                (onClick)="
                  openPlayerSelection.emit(
                    getPickForRoundAndPosition(round, pickIndex)!
                  )
                "
                [disabled]="
                  !canMakePick ||
                  getPickForRoundAndPosition(round, pickIndex)?.pickNumber !==
                    currentPick
                "
                size="small"
                rounded
                [text]="true"
                [severity]="
                  getArrowSeverity(
                    getPickForRoundAndPosition(round, pickIndex)!,
                    roundIndex,
                    teamIndex
                  )
                "
              ></p-button>
              } }
            </div>
            } @else {
            <!-- Empty pick slot if no pick exists yet -->
            <div class="pick-cell empty-pick">
              <div class="pick-number-display">
                {{ round }}.{{ pickIndex + 1 }}
              </div>
              <div class="empty-slot">No Pick</div>
            </div>
            } }
          </div>
        </div>
        }
      </div>
    </div>
  `,
  styleUrls: ['./draft-board.component.scss'],
})
export class DraftBoardComponent {
  @Input() teams: Team[] = [];
  @Input() draftPicks: DraftPick[] = [];
  @Input() availablePlayers: Player[] = [];
  @Input() currentPick: number = 1;
  @Input() isMyTurn: boolean = false;
  @Input() currentUserTeamId: string | null = null;
  @Input() canMakePick: boolean = false;
  @Input() numberOfTeams: number = 0;
  @Input() totalRounds: number = 25; // Default to 25 rounds

  @Output() openPlayerSelection = new EventEmitter<DraftPick>();
  @Output() claimTeam = new EventEmitter<string>();

  get rounds(): number[] {
    // Use the totalRounds input or calculate based on available draft picks
    if (this.totalRounds > 0) {
      return Array.from({ length: this.totalRounds }, (_, i) => i + 1);
    }

    if (this.draftPicks.length > 0) {
      const maxRound = Math.max(...this.draftPicks.map((pick) => pick.round));
      return Array.from({ length: maxRound }, (_, i) => i + 1);
    }

    return [];
  }

  getPicksForRound(round: number): DraftPick[] {
    return this.draftPicks.filter((pick) => pick.round === round);
  }

  getPickIndicesForRound(round: number): number[] {
    const picksInRound = this.draftPicks.filter((pick) => pick.round === round);
    return Array.from({ length: this.numberOfTeams }, (_, i) => i);
  }

  getPickForRoundAndPosition(
    round: number,
    position: number
  ): DraftPick | null {
    const picksInRound = this.draftPicks.filter((pick) => pick.round === round);
    return picksInRound[position] || null;
  }

  getTeamName(teamId: string): string {
    const team = this.teams.find((t) => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  }

  getPlayerById(playerId: string): Player | null {
    return this.availablePlayers.find((p) => p.id === playerId) || null;
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
