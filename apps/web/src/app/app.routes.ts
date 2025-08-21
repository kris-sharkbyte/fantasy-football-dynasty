import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { AppLayout } from './layout/component/app.layout';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./home/home.component').then((m) => m.HomeComponent),
  },

  {
    path: 'leagues',
    component: AppLayout,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./leagues/leagues.component').then((m) => m.LeaguesComponent),
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./leagues/create-league/create-league.component').then(
            (m) => m.CreateLeagueComponent
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./leagues/league-detail/league-detail.component').then(
            (m) => m.LeagueDetailComponent
          ),
      },
    ],
  },
  {
    path: 'teams',
    loadComponent: () =>
      import('./teams/teams.component').then((m) => m.TeamsComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'players',
    loadComponent: () =>
      import('./players/players.component').then((m) => m.PlayersComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'free-agency',
    loadComponent: () =>
      import('./free-agency/free-agency.component').then(
        (m) => m.FreeAgencyComponent
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'draft',
    loadComponent: () =>
      import('./draft/draft.component').then((m) => m.DraftComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'trades',
    loadComponent: () =>
      import('./trades/trades.component').then((m) => m.TradesComponent),
    canActivate: [AuthGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
