import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Team } from '@fantasy-football-dynasty/types';

@Component({
  selector: 'app-team-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './team-header.component.html',
  styleUrls: ['./team-header.component.scss'],
})
export class TeamHeaderComponent {
  @Input() team: Team | null = null;
  @Input() isDraftActive = false;
  @Output() startDraft = new EventEmitter<void>();
  @Output() openPlayerSearch = new EventEmitter<void>();

  onStartDraft(): void {
    this.startDraft.emit();
  }

  onOpenPlayerSearch(): void {
    this.openPlayerSearch.emit();
  }
}
