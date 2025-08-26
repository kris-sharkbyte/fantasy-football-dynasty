import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Team } from '@fantasy-football-dynasty/types';

@Component({
  selector: 'app-team-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './team-sidebar.component.html',
  styleUrls: ['./team-sidebar.component.scss'],
})
export class TeamSidebarComponent {
  @Input() teams: Team[] = [];
  @Input() selectedTeam: Team | null = null;
  @Output() teamSelected = new EventEmitter<Team>();

  selectTeam(team: Team): void {
    this.teamSelected.emit(team);
  }
}
