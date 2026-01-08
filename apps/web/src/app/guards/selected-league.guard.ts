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

  if (!leagueId) {
    console.error(
      'SelectedLeagueGuard: Access denied - No league ID found in route parameters'
    );
    router.navigate(['/leagues']);
    return false;
  }

  const selectedLeagueId = leagueService.selectedLeagueId();

  // If the route leagueId doesn't match the selectedLeagueId, verify membership
  // This handles refresh scenarios where localStorage has a different leagueId
  if (selectedLeagueId !== leagueId) {
    console.log(
      'SelectedLeagueGuard: Route leagueId does not match selectedLeagueId, verifying membership...',
      { routeLeagueId: leagueId, selectedLeagueId }
    );

    // Ensure memberships are loaded
    const existingMemberships = leagueMembershipService.userMemberships();
    if (existingMemberships.length === 0) {
      console.log('No memberships loaded, loading user memberships...');
      await leagueMembershipService.loadUserMemberships();
    }

    // Check if user is a member of the league in the route
    const memberships = leagueMembershipService.userMemberships();
    const isMember = memberships.some(
      (m) => m.leagueId === leagueId && m.isActive
    );

    if (!isMember) {
      console.error('User is not a member of league:', leagueId);
      console.log('Existing memberships:', memberships);
      router.navigate(['/leagues']);
      return false;
    }

    // User is a member, allow access
    // The component will update selectedLeagueId via setSelectedLeagueId, which will persist it
    console.log(
      'SelectedLeagueGuard: User is a member, allowing access. Component will update selectedLeagueId.'
    );
  }

  try {
    // Check route-specific permissions
    const isTeamRoute = state.url.includes('/team');
    const isPlayersRoute = state.url.includes('/players');

    if (isTeamRoute || isPlayersRoute) {
      // For team and players routes, double-check membership (already verified above if mismatch)
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
        router.navigate(['/leagues']);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error in selected league guard:', error);
    router.navigate(['/leagues']);
    return false;
  }
};
