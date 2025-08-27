import { Component, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FreeAgencyService } from '../services/free-agency.service';
import { LeagueService } from '../services/league.service';
import { LeagueHeaderComponent } from '../leagues/components/league-header.component';
import { FAWeekComponent } from './components/fa-week';
import { OpenFAComponent } from './components/open-fa';

@Component({
  selector: 'app-free-agency',
  standalone: true,
  imports: [
    CommonModule,
    LeagueHeaderComponent,
    FAWeekComponent,
    OpenFAComponent,
  ],
  templateUrl: './free-agency.component.html',
  styleUrls: ['./free-agency.component.scss'],
})
export class FreeAgencyComponent {
  private readonly freeAgencyService = inject(FreeAgencyService);
  private readonly leagueService = inject(LeagueService);

  // Computed values
  public isFAWeekPhase = computed(() => this.freeAgencyService.isFAWeekPhase());
  public isOpenFAPhase = computed(() => this.freeAgencyService.isOpenFAPhase());
  public currentWeek = computed(() =>
    this.freeAgencyService.currentWeekNumber()
  );
  public weekStatus = computed(() => this.freeAgencyService.weekStatus());

  constructor() {
    effect(() => {
      const leagueId = this.leagueService.selectedLeagueId();
      if (leagueId) {
        this.freeAgencyService.loadCurrentFAWeek();
      }
    });
  }
}
