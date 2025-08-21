import { onCall, HttpsError } from 'firebase-functions/v2/https';
import {
  onDocumentCreated,
  onDocumentUpdated,
} from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
initializeApp();

const db = getFirestore();
const auth = getAuth();

// League Management Functions
export const createLeague = onCall(async (request) => {
  try {
    const { name, rules, ownerUserId } = request.data;

    if (!name || !rules || !ownerUserId) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    const leagueRef = db.collection('leagues').doc();
    const league = {
      id: leagueRef.id,
      name,
      rules,
      currentYear: new Date().getFullYear(),
      phase: 'offseason',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await leagueRef.set(league);

    // Create initial team for owner
    const teamRef = db.collection('teams').doc();
    const team = {
      id: teamRef.id,
      leagueId: leagueRef.id,
      name: `${name} - Owner Team`,
      ownerUserId,
      capSpace: rules.cap.salaryCap,
      roster: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await teamRef.set(team);

    return { success: true, leagueId: leagueRef.id, teamId: teamRef.id };
  } catch (error) {
    throw new HttpsError('internal', 'Failed to create league');
  }
});

export const getLeague = onCall(async (request) => {
  try {
    const { leagueId } = request.data;

    if (!leagueId) {
      throw new HttpsError('invalid-argument', 'League ID is required');
    }

    const leagueDoc = await db.collection('leagues').doc(leagueId).get();

    if (!leagueDoc.exists) {
      throw new HttpsError('not-found', 'League not found');
    }

    return { league: leagueDoc.data() };
  } catch (error) {
    throw new HttpsError('internal', 'Failed to get league');
  }
});

// Team Management Functions
export const getTeam = onCall(async (request) => {
  try {
    const { teamId } = request.data;

    if (!teamId) {
      throw new HttpsError('invalid-argument', 'Team ID is required');
    }

    const teamDoc = await db.collection('teams').doc(teamId).get();

    if (!teamDoc.exists) {
      throw new HttpsError('not-found', 'Team not found');
    }

    return { team: teamDoc.data() };
  } catch (error) {
    throw new HttpsError('internal', 'Failed to get team');
  }
});

export const getTeamCapSheet = onCall(async (request) => {
  try {
    const { teamId, year } = request.data;

    if (!teamId || !year) {
      throw new HttpsError('invalid-argument', 'Team ID and year are required');
    }

    // Get team contracts for the year
    const contractsSnapshot = await db
      .collection('contracts')
      .where('teamId', '==', teamId)
      .where('startYear', '<=', year)
      .where('endYear', '>=', year)
      .get();

    const contracts = contractsSnapshot.docs.map((doc) => doc.data());

    // Calculate cap hits
    const capHits = contracts.map((contract) => ({
      contractId: contract.id,
      playerId: contract.playerId,
      capHit: calculateCapHit(contract, year),
    }));

    return {
      capHits,
      totalCapHit: capHits.reduce((sum, hit) => sum + hit.capHit, 0),
    };
  } catch (error) {
    throw new HttpsError('internal', 'Failed to get team cap sheet');
  }
});

// Contract Management Functions
export const createContract = onCall(async (request) => {
  try {
    const {
      playerId,
      teamId,
      startYear,
      endYear,
      baseSalary,
      signingBonus,
      guarantees,
    } = request.data;

    if (!playerId || !teamId || !startYear || !endYear || !baseSalary) {
      throw new HttpsError(
        'invalid-argument',
        'Missing required contract fields'
      );
    }

    const contractRef = db.collection('contracts').doc();
    const contract = {
      id: contractRef.id,
      playerId,
      teamId,
      startYear,
      endYear,
      baseSalary,
      signingBonus: signingBonus || 0,
      guarantees: guarantees || [],
      noTradeClause: false,
      createdAt: new Date(),
    };

    await contractRef.set(contract);

    // Update team cap space
    const teamRef = db.collection('teams').doc(teamId);
    const teamDoc = await teamRef.get();
    const team = teamDoc.data();

    if (team) {
      const capHit = calculateCapHit(contract, startYear);
      await teamRef.update({
        capSpace: team.capSpace - capHit,
        updatedAt: new Date(),
      });
    }

    return { success: true, contractId: contractRef.id };
  } catch (error) {
    throw new HttpsError('internal', 'Failed to create contract');
  }
});

// Player Management Functions
export const searchPlayers = onCall(async (request) => {
  try {
    const { query, position, nflTeam, limit = 50 } = request.data;

    let playersQuery = db.collection('players');

    if (position) {
      playersQuery = playersQuery.where('position', '==', position);
    }

    if (nflTeam) {
      playersQuery = playersQuery.where('nflTeam', '==', nflTeam);
    }

    if (query) {
      // Simple name search - in production, you'd use a search service
      playersQuery = playersQuery
        .where('name', '>=', query)
        .where('name', '<=', query + '\uf8ff');
    }

    const snapshot = await playersQuery.limit(limit).get();
    const players = snapshot.docs.map((doc) => doc.data());

    return { players };
  } catch (error) {
    throw new HttpsError('internal', 'Failed to search players');
  }
});

// Scheduled Functions
export const processWeeklyScoring = onSchedule('0 6 * * 2', async (event) => {
  try {
    // Process scoring every Tuesday at 6 AM
    console.log('Processing weekly scoring...');

    // Get all active leagues
    const leaguesSnapshot = await db.collection('leagues').get();

    for (const leagueDoc of leaguesSnapshot.docs) {
      const league = leagueDoc.data();
      // Process scoring for each league
      await processLeagueScoring(league.id);
    }

    console.log('Weekly scoring processing complete');
  } catch (error) {
    console.error('Error processing weekly scoring:', error);
  }
});

// Helper Functions
function calculateCapHit(contract: any, year: number): number {
  if (year < contract.startYear || year > contract.endYear) {
    return 0;
  }

  const baseSalary = contract.baseSalary[year] || 0;
  const proratedBonus =
    contract.signingBonus > 0
      ? contract.signingBonus /
        Math.min(contract.endYear - contract.startYear + 1, 5)
      : 0;

  return baseSalary + proratedBonus;
}

async function processLeagueScoring(leagueId: string) {
  // Implementation for processing league scoring
  console.log(`Processing scoring for league: ${leagueId}`);
}

// Firestore Triggers
export const onLeagueCreated = onDocumentCreated(
  'leagues/{leagueId}',
  async (event) => {
    const league = event.data?.data();
    console.log(`New league created: ${league?.name}`);

    // Set up initial league structure
    // Create default settings, etc.
  }
);

export const onContractUpdated = onDocumentUpdated(
  'contracts/{contractId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (before && after) {
      console.log(`Contract updated: ${after.id}`);
      // Handle contract updates, cap recalculations, etc.
    }
  }
);
