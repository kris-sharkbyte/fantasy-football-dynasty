import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-players',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './players.component.html',
  styleUrls: ['./players.component.scss'],
})
export class PlayersComponent {
  searchQuery = '';
  selectedPosition = '';
  selectedTeam = '';

  searchPlayers() {
    // TODO: Implement player search
    console.log('Searching for:', this.searchQuery);
  }
}
