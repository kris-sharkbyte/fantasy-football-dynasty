import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LeagueService } from '../services/league.service';
import { LeagueMembershipService } from '../services/league-membership.service';

export const selectedLeagueGuard: CanActivateFn = async (route, state) => {
  const leagueService = inject(LeagueService);
  const router = inject(Router);
  const leagueMembershipService = inject(LeagueMembershipService);

  console.log('SelectedLeagueGuard: Checking access for URL:', state.url);
  console.log('SelectedLeagueGuard: Route params:', route.paramMap);

  // Get the league ID from the route parameters
  const leagueId = route.paramMap.get('id') || route.paramMap.get('leagueId');
  const selectedLeagueId = leagueService.selectedLeagueId();

  console.log('SelectedLeagueGuard: League ID from route:', leagueId);
  console.log(
    'SelectedLeagueGuard: Currently selected league ID:',
    selectedLeagueId
  );

  if (!leagueId || selectedLeagueId !== leagueId) {
    console.error(
      'SelectedLeagueGuard: Access denied - No league ID found in route parameters or mismatch'
    );
    console.error(
      'SelectedLeagueGuard: leagueId:',
      leagueId,
      'selectedLeagueId:',
      selectedLeagueId
    );
    router.navigate(['/leagues']);
    return false;
  }

  try {
    // Set the selected league ID if not already set
    const selectedLeagueId = leagueService.selectedLeagueId();
    if (selectedLeagueId !== leagueId) {
      console.log('Setting selected league ID in guard:', leagueId);
      leagueService.setSelectedLeagueId(leagueId);
    }

    console.log('Selected league guard: Selected league ID:', leagueId);

    // Check route-specific permissions
    const isTeamRoute = state.url.includes('/team');
    const isPlayersRoute = state.url.includes('/players');

    if (isTeamRoute || isPlayersRoute) {
      // For team and players routes, check if user is a member
      // First ensure memberships are loaded
      const existingMemberships = leagueMembershipService.userMemberships();
      if (existingMemberships.length === 0) {
        console.log('No memberships loaded, loading user memberships...');
        await leagueMembershipService.loadUserMemberships();
      }

      // Check membership after ensuring data is loaded
      const memberships = leagueMembershipService.userMemberships();
      const isMember = memberships.some(
        (m) => m.leagueId === leagueId && m.isActive
      );

      console.log('Route membership check:', {
        route: isTeamRoute ? 'team' : 'players',
        leagueId,
        isMember,
        membershipsCount: memberships.length,
      });

      if (!isMember) {
        console.error('User is not a member of league:', leagueId);
        console.log('Existing memberships:', memberships);
        router.navigate(['/leagues']);
        return false;
      }
    }

    console.log('Selected league guard: Access granted for league:', leagueId);
    return true;
  } catch (error) {
    console.error('Error in selected league guard:', error);
    router.navigate(['/leagues']);
    return false;
  }
};
