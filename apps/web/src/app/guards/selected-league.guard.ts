import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LeagueService } from '../services/league.service';
import { LeagueMembershipService } from '../services/league-membership.service';

export const selectedLeagueGuard: CanActivateFn = async (route, state) => {
  const leagueService = inject(LeagueService);
  const router = inject(Router);
  const leagueMembershipService = inject(LeagueMembershipService);

  // Get the league ID from the route parameters
  const leagueId = route.paramMap.get('id') || route.paramMap.get('leagueId');

  if (!leagueId) {
    console.error('No league ID found in route parameters');
    router.navigate(['/leagues']);
    return false;
  }

  try {
    // Verify the user has access to this league
    const canViewAllTeams = await leagueMembershipService.hasLeaguePermission(
      leagueId,
      'canViewAllTeams'
    );
    if (!canViewAllTeams) {
      console.error('User does not have access to league:', leagueId);
      router.navigate(['/leagues']);
      return false;
    }

    // Check if the selected league matches the route league ID
    const selectedLeagueId = leagueService.selectedLeagueId();
    console.log('Selected league guard: Selected league ID:', selectedLeagueId);
    if (selectedLeagueId !== leagueId) {
      console.log(
        'Selected league guard: Route league ID does not match selected league:',
        {
          routeLeagueId: leagueId,
          selectedLeagueId,
        }
      );
      router.navigate(['/leagues']);
      return false;
    }

    console.log('Selected league guard: Access granted for league:', leagueId);
    return true;
  } catch (error) {
    console.error('Error in selected league guard:', error);
    router.navigate(['/leagues']);
    return false;
  }
};
