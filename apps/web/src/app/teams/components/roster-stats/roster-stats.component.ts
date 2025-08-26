import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RosterStats } from '../../../services/team.service';

@Component({
  selector: 'app-roster-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './roster-stats.component.html',
  styleUrls: ['./roster-stats.component.scss'],
})
export class RosterStatsComponent {
  @Input() stats: RosterStats | null = null;
}
