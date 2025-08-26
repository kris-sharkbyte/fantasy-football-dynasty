import {
  Component,
  Input,
  Output,
  EventEmitter,
  input,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DraftPick, Player } from '@fantasy-football-dynasty/types';
import { DraftLayoutService } from '../../../services/draft-layout.service';

@Component({
  selector: 'app-player-selection',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule],
  templateUrl: './player-selection.component.html',
  styleUrls: ['./player-selection.component.scss'],
})
export class PlayerSelectionComponent {
  draftLayoutService = inject(DraftLayoutService);
  @Input() selectedPick: DraftPick | null = null;
  @Input() availablePlayers: Player[] = [];
  @Input() selectedPlayer: Player | null = null;
  @Input() searchQuery: string = '';
  @Input() selectedPosition: string = '';
  @Input() canMakePick: boolean = false;
  @Input() draftState: any = null;
  @Input() isInWatchlist: (playerId: string) => boolean = () => false;

  @Output() close = new EventEmitter<void>();
  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() positionChange = new EventEmitter<string>();
  @Output() playerSelect = new EventEmitter<Player>();
  @Output() draftPlayer = new EventEmitter<Player>();
  @Output() addToWatchlist = new EventEmitter<Player>();
  @Output() toggleWatchlist = new EventEmitter<Player>();

  showPlayerList = this.draftLayoutService.showPlayerList;

  togglePlayerList() {
    console.log('togglePlayerList');
    this.draftLayoutService.togglePlayerList();
  }

  positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
}
