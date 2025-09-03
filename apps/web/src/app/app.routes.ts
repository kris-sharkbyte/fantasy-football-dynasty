import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { GuestGuard } from './guards/guest.guard';
import { selectedLeagueGuard } from './guards/selected-league.guard';
import { AppLayout } from './layout/component/app.layout';
import { WebLayout } from './layout/component/web.layout';
import { DraftLayout } from './layout/component/draft.layout';

export const routes: Routes = [
  {
    path: '',
    component: WebLayout,
    canActivate: [GuestGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./home/home.component').then((m) => m.HomeComponent),
      },
    ],
  },

  {
    path: 'account',
    component: AppLayout,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./account/accountSettings.component').then(
            (m) => m.AccountSettingsComponent
          ),
      },
    ],
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
        path: ':leagueId',
        loadComponent: () =>
          import('./leagues/league-detail/league-detail.component').then(
            (m) => m.LeagueDetailComponent
          ),
        canActivate: [selectedLeagueGuard],
      },
      {
        path: ':leagueId/team',
        loadComponent: () =>
          import('./leagues/team/team.component').then((m) => m.TeamComponent),
        canActivate: [selectedLeagueGuard],
      },
      {
        path: ':leagueId/players',
        loadComponent: () =>
          import('./leagues/players/players.component').then(
            (m) => m.PlayersComponent
          ),
        canActivate: [selectedLeagueGuard],
      },
      {
        path: ':leagueId/team/edit',
        loadComponent: () =>
          import('./leagues/team-edit/team-edit.component').then(
            (m) => m.TeamEditComponent
          ),
        canActivate: [selectedLeagueGuard],
      },
      {
        path: ':leagueId/negotiate/:playerId',
        loadComponent: () =>
          import('./teams/negotiation/negotiation.component').then(
            (m) => m.NegotiationComponent
          ),
        canActivate: [selectedLeagueGuard],
      },
      {
        path: ':leagueId/free-agency',
        loadComponent: () =>
          import('./free-agency/free-agency.component').then(
            (m) => m.FreeAgencyComponent
          ),
        canActivate: [selectedLeagueGuard],
      },
      {
        path: ':leagueId/draft',
        loadComponent: () =>
          import('./draft/draft.component').then((m) => m.DraftComponent),
      },
    ],
  },
  // {
  //   path: 'teams',
  //   loadComponent: () =>
  //     import('./teams/teams.component').then((m) => m.TeamsComponent),
  //   canActivate: [AuthGuard],
  // },
  {
    path: 'players',
    loadComponent: () =>
      import('./players/players.component').then((m) => m.PlayersComponent),
    canActivate: [AuthGuard],
  },

  {
    path: 'draft/:leagueId',
    component: DraftLayout,
    canActivate: [AuthGuard, selectedLeagueGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./draft/draft.component').then((m) => m.DraftComponent),
      },
    ],
  },
  {
    path: 'trades',
    loadComponent: () =>
      import('./trades/trades.component').then((m) => m.TradesComponent),
    canActivate: [AuthGuard],
  },

  {
    path: 'testing',
    component: AppLayout,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'offseason',
        loadComponent: () =>
          import('./testing/offseason-test/offseason-test.component').then(
            (m) => m.OffseasonTestComponent
          ),
      },
    ],
  },

  {
    path: '**',
    redirectTo: '',
  },
];
