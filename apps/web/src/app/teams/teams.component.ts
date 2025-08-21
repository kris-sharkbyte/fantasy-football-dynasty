import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './teams.component.html',
  styleUrls: ['./teams.component.scss'],
})
export class TeamsComponent {
  teams = [
    {
      id: '1',
      name: 'My Team',
      owner: 'John Doe',
      capSpace: 50000000,
      totalCapHit: 150000000,
      players: 25,
    },
  ];

  viewTeam(teamId: string) {
    // TODO: Navigate to team detail view
    console.log('View team:', teamId);
  }
}
