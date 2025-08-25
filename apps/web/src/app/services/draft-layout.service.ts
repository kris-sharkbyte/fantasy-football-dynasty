import { Injectable, signal } from '@angular/core';
import {
  DraftState,
  League,
  Team,
} from '../../../../../libs/types/src/lib/types';

@Injectable({
  providedIn: 'root',
})
export class DraftLayoutService {
  // Shared state for the draft layout components
  league = signal<League | null>(null);
  draftState = signal<DraftState | null>(null);
  isConnected = signal<boolean>(false);
  showDraftBoard = signal<boolean>(true);
  showPlayerList = signal<boolean>(true);
  currentPick = signal<number>(1);
  timeRemaining = signal<number>(0);
  timeRemainingFormatted = signal<string>('0:00');
  draftStats = signal<any>(null);
  currentTeam = signal<Team | null>(null);
  isMyTurn = signal<boolean>(false);

  // Methods to update state
  updateLeague(league: League | null) {
    this.league.set(league);
  }

  updateDraftState(draftState: DraftState | null) {
    this.draftState.set(draftState);
  }

  updateConnectionStatus(isConnected: boolean) {
    this.isConnected.set(isConnected);
  }

  updateCurrentPick(pick: number) {
    this.currentPick.set(pick);
  }

  updateTimeRemaining(time: number, formatted: string) {
    this.timeRemaining.set(time);
    this.timeRemainingFormatted.set(formatted);
  }

  updateDraftStats(stats: any) {
    this.draftStats.set(stats);
  }

  updateCurrentTeam(team: Team | null) {
    this.currentTeam.set(team);
  }

  updateIsMyTurn(isMyTurn: boolean) {
    this.isMyTurn.set(isMyTurn);
  }

  toggleDraftBoard() {
    this.showDraftBoard.update((current) => !current);
  }

  togglePlayerList() {
    this.showPlayerList.update((current) => !current);
  }
}
