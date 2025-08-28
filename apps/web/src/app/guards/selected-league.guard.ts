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
    // Set the selected league ID if not already set
    const selectedLeagueId = leagueService.selectedLeagueId();
    if (selectedLeagueId !== leagueId) {
      console.log('Setting selected league ID in guard:', leagueId);
      //   leagueService.setSelectedLeagueId(leagueId);
    }

    console.log('Selected league guard: Selected league ID:', leagueId);

    // Check route-specific permissions
    const isRosterRoute = state.url.includes('/roster');

    if (isRosterRoute) {
      // For roster route, check if user is a member using existing data
      let existingMemberships = leagueMembershipService.userMemberships();

      console.log(
        'Roster route check - Initial memberships:',
        existingMemberships
      );

      // If no memberships loaded yet, load them first
      if (existingMemberships.length === 0) {
        console.log('No memberships loaded yet, loading now...');
        await leagueMembershipService.loadUserMemberships();
        existingMemberships = leagueMembershipService.userMemberships();
        console.log('Memberships after loading:', existingMemberships);
      }

      const isMember = existingMemberships.some(
        (m) => m.leagueId === leagueId && m.isActive
      );
      console.log('Membership check result:', {
        leagueId,
        isMember,
        memberships: existingMemberships,
      });

      if (!isMember) {
        console.error('User is not a member of league:', leagueId);
        console.log('Existing memberships:', existingMemberships);
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
