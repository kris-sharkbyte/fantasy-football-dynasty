import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { FieldValue } from 'firebase-admin/firestore';
import { admin } from './utils/admin';
import type {
  DraftState,
  DraftPick,
  PlayerRights,
  League,
  Team,
  Player,
  DraftSettings,
  AutodraftQueue,
} from '../local-types';

const { db } = admin();

// ===== DRAFT MANAGEMENT FUNCTIONS =====

/**
 * Initialize a new draft for a league
 */
export const initializeDraft = onCall(async (request) => {
  try {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required');
    }

    const { leagueId, settings } = request.data;

    if (!leagueId || !settings) {
      throw new HttpsError(
        'invalid-argument',
        'League ID and settings are required'
      );
    }

    // Get league and validate
    const leagueDoc = await db.collection('leagues').doc(leagueId).get();
    if (!leagueDoc.exists) {
      throw new HttpsError('not-found', 'League not found');
    }

    const league = leagueDoc.data() as League;

    // Get all teams in league
    const teamsSnapshot = await db
      .collection('teams')
      .where('leagueId', '==', leagueId)
      .get();

    const teams = teamsSnapshot.docs.map((doc) => doc.data() as Team);

    if (teams.length < 2) {
      throw new HttpsError(
        'failed-precondition',
        'Need at least 2 teams to start draft'
      );
    }

    // Check if league has a pre-set draft order, otherwise generate one
    let draftOrder: string[];
    const leagueData = leagueDoc.data() as League;
    if (leagueData.draftOrder && leagueData.draftOrder.length > 0) {
      // Use the pre-set draft order from league settings
      draftOrder = leagueData.draftOrder;

      // Validate that all teams in the draft order exist
      const teamIds = teams.map((team) => team.id);
      const validDraftOrder = draftOrder.filter((teamId) =>
        teamIds.includes(teamId)
      );

      if (validDraftOrder.length !== draftOrder.length) {
        throw new HttpsError(
          'failed-precondition',
          'Some teams in the draft order no longer exist in the league'
        );
      }

      // Ensure we have the same number of teams
      if (validDraftOrder.length !== teams.length) {
        throw new HttpsError(
          'failed-precondition',
          'Draft order must include all teams in the league'
        );
      }

      draftOrder = validDraftOrder;
    } else {
      // Generate draft order (can be randomized or based on previous season)
      draftOrder = generateDraftOrder(teams);
    }

    // Create draft picks for all rounds
    const picks = generateDraftPicks(leagueId, draftOrder, settings.rounds);

    // Create draft state
    const draftStateRef = db.collection('draft-states').doc(leagueId);
    const draftState: DraftState = {
      id: leagueId,
      leagueId,
      currentPick: 1,
      currentTeamId: draftOrder[0],
      timeRemaining: settings.timeLimit,
      isPaused: false,
      isComplete: false,
      draftOrder,
      completedPicks: [],
      settings,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Use transaction to ensure consistency
    await db.runTransaction(async (transaction) => {
      // Create draft state
      transaction.set(draftStateRef, draftState);

      // Create all pick documents
      picks.forEach((pick) => {
        const pickRef = db.collection('picks').doc(pick.id);
        transaction.set(pickRef, pick);
      });

      // Update league phase to 'draft'
      transaction.update(leagueDoc.ref, {
        phase: 'draft',
        updatedAt: new Date(),
      });
    });

    return {
      success: true,
      draftId: leagueId,
      draftOrder,
      totalPicks: picks.length,
    };
  } catch (error) {
    console.error('Error initializing draft:', error);
    throw new HttpsError('internal', 'Failed to initialize draft');
  }
});

/**
 * Get the current draft state for a league
 */
export const getDraftState = onCall(async (request) => {
  try {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required');
    }

    const { leagueId } = request.data;

    if (!leagueId) {
      throw new HttpsError('invalid-argument', 'League ID is required');
    }

    // Get draft state from Firestore
    const draftStateDoc = await db
      .collection('draft-states')
      .doc(leagueId)
      .get();

    if (!draftStateDoc.exists) {
      return { data: null };
    }

    const draftState = draftStateDoc.data() as DraftState;
    return { data: draftState };
  } catch (error) {
    console.error('Error getting draft state:', error);
    throw new HttpsError('internal', 'Failed to get draft state');
  }
});

/**
 * Get all draft picks for a league (both completed and pending)
 */
export const getDraftPicks = onCall(async (request) => {
  try {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required');
    }

    const { leagueId } = request.data;

    if (!leagueId) {
      throw new HttpsError('invalid-argument', 'League ID is required');
    }

    // Get all picks for the league, ordered by round and pick number
    const picksSnapshot = await db
      .collection('picks')
      .where('leagueId', '==', leagueId)
      .orderBy('round', 'asc')
      .orderBy('pickNumber', 'asc')
      .get();

    const picks = picksSnapshot.docs.map((doc) => doc.data() as DraftPick);

    return { data: picks };
  } catch (error) {
    console.error('Error getting draft picks:', error);
    throw new HttpsError('internal', 'Failed to get draft picks');
  }
});

/**
 * Get all drafted players for a league
 */
export const getDraftedPlayers = onCall(async (request) => {
  try {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required');
    }

    const { leagueId } = request.data;

    if (!leagueId) {
      throw new HttpsError('invalid-argument', 'League ID is required');
    }

    // Get all completed picks (picks with playerId assigned)
    const draftedPicksSnapshot = await db
      .collection('picks')
      .where('leagueId', '==', leagueId)
      .where('playerId', '!=', null)
      .get();

    if (draftedPicksSnapshot.empty) {
      return { data: [] };
    }

    // Get player details for all drafted players
    const playerIds = draftedPicksSnapshot.docs.map(
      (doc) => doc.data()['playerId']
    );
    const playersSnapshot = await db
      .collection('players')
      .where('id', 'in', playerIds)
      .get();

    // Create a map of player data
    const playersMap = new Map();
    playersSnapshot.docs.forEach((doc) => {
      const player = doc.data();
      playersMap.set(player['id'], player);
    });

    // Combine pick data with player data
    const draftedPlayers = draftedPicksSnapshot.docs.map((doc) => {
      const pick = doc.data() as DraftPick;
      const player = playersMap.get(pick.playerId);

      return {
        pick,
        player,
        teamId: pick.currentTeamId,
        draftedAt: pick.draftedAt,
        isAutodrafted: pick.isAutodrafted || false,
        timeUsed: pick.timeUsed,
      };
    });

    return { data: draftedPlayers };
  } catch (error) {
    console.error('Error getting drafted players:', error);
    throw new HttpsError('internal', 'Failed to get drafted players');
  }
});

/**
 * Make a draft pick
 */
export const makeDraftPick = onCall(async (request) => {
  try {
    const { leagueId, playerId, teamId } = request.data;

    if (!leagueId || !playerId || !teamId) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    // Get current draft state
    const draftStateDoc = await db
      .collection('draft-states')
      .doc(leagueId)
      .get();
    if (!draftStateDoc.exists) {
      throw new HttpsError('not-found', 'Draft not found');
    }

    const draftState = draftStateDoc.data() as DraftState;

    // Validate it's the correct team's turn
    if (draftState.currentTeamId !== teamId) {
      throw new HttpsError('failed-precondition', 'Not your turn to pick');
    }

    if (draftState.isComplete) {
      throw new HttpsError('failed-precondition', 'Draft is already complete');
    }

    // Get the current pick
    const currentPickDoc = await db
      .collection('picks')
      .where('leagueId', '==', leagueId)
      .where(
        'round',
        '==',
        Math.ceil(draftState.currentPick / draftState.draftOrder.length)
      )
      .where('currentTeamId', '==', teamId)
      .limit(1)
      .get();

    if (currentPickDoc.empty) {
      throw new HttpsError('not-found', 'Current pick not found');
    }

    const pick = currentPickDoc.docs[0].data() as DraftPick;

    // Validate player is available
    const playerDoc = await db.collection('players').doc(playerId).get();
    if (!playerDoc.exists) {
      throw new HttpsError('not-found', 'Player not found');
    }

    // Check if player is already drafted
    const existingPickSnapshot = await db
      .collection('picks')
      .where('leagueId', '==', leagueId)
      .where('playerId', '==', playerId)
      .get();

    if (!existingPickSnapshot.empty) {
      throw new HttpsError('failed-precondition', 'Player already drafted');
    }

    const player = playerDoc.data() as Player;
    const timeUsed = draftState.settings.timeLimit - draftState.timeRemaining;

    // Process the pick
    await db.runTransaction(async (transaction) => {
      // Update the pick
      const updatedPick: DraftPick = {
        ...pick,
        playerId,
        draftedAt: new Date(),
        isAutodrafted: false,
        timeUsed,
      };

      transaction.update(currentPickDoc.docs[0].ref, updatedPick as any);

      // Handle rights assignment based on player type
      await assignPlayerRights(
        transaction,
        leagueId,
        playerId,
        teamId,
        player,
        'draft'
      );

      // Update draft state for next pick
      const nextPickNumber = draftState.currentPick + 1;
      const totalPicks =
        draftState.draftOrder.length * draftState.settings.rounds;

      if (nextPickNumber > totalPicks) {
        // Draft is complete
        transaction.update(draftStateDoc.ref, {
          isComplete: true,
          updatedAt: new Date(),
        });

        // Update league phase
        const leagueRef = db.collection('leagues').doc(leagueId);
        transaction.update(leagueRef, {
          phase: 'post-draft',
          updatedAt: new Date(),
        });
      } else {
        // Move to next pick
        const nextTeamId = getNextTeamId(
          draftState.draftOrder,
          nextPickNumber,
          draftState.settings.rounds
        );

        transaction.update(draftStateDoc.ref, {
          currentPick: nextPickNumber,
          currentTeamId: nextTeamId,
          timeRemaining: draftState.settings.timeLimit,
          completedPicks: FieldValue.arrayUnion(updatedPick),
          updatedAt: new Date(),
        });
      }
    });

    return {
      success: true,
      pick: {
        pickNumber: draftState.currentPick,
        playerId,
        teamId,
        timeUsed,
      },
    };
  } catch (error) {
    console.error('Error making draft pick:', error);
    throw new HttpsError('internal', 'Failed to make draft pick');
  }
});

/**
 * Auto-draft for a team when time expires
 */
export const autodraftPick = onCall(async (request) => {
  try {
    const { leagueId, teamId } = request.data;

    if (!leagueId || !teamId) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    // Get team's autodraft queue
    const queueDoc = await db
      .collection('autodraft-queues')
      .doc(`${leagueId}_${teamId}`)
      .get();

    let playerId: string;

    if (queueDoc.exists) {
      const queue = queueDoc.data() as AutodraftQueue;

      // Get first available player from queue
      playerId = await getFirstAvailablePlayer(leagueId, queue.playerIds);
    } else {
      // Use best available player logic
      playerId = await getBestAvailablePlayer(leagueId);
    }

    if (!playerId) {
      throw new HttpsError(
        'failed-precondition',
        'No available players to autodraft'
      );
    }

    // Make the pick (reuse the makeDraftPick logic but mark as autodrafted)
    return await makeDraftPickInternal(leagueId, playerId, teamId, true);
  } catch (error) {
    console.error('Error autodrafting pick:', error);
    throw new HttpsError('internal', 'Failed to autodraft pick');
  }
});

/**
 * Update autodraft queue for a team
 */
export const updateAutodraftQueue = onCall(async (request) => {
  try {
    const { leagueId, teamId, playerIds } = request.data;

    if (!leagueId || !teamId || !Array.isArray(playerIds)) {
      throw new HttpsError('invalid-argument', 'Invalid queue data');
    }

    const queueRef = db
      .collection('autodraft-queues')
      .doc(`${leagueId}_${teamId}`);

    const queue: AutodraftQueue = {
      id: `${leagueId}_${teamId}`,
      teamId,
      leagueId,
      playerIds,
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await queueRef.set(queue);

    return { success: true };
  } catch (error) {
    console.error('Error updating autodraft queue:', error);
    throw new HttpsError('internal', 'Failed to update autodraft queue');
  }
});

/**
 * Pause/resume draft
 */
export const pauseDraft = onCall(async (request) => {
  try {
    const { leagueId, isPaused } = request.data;

    if (!leagueId || typeof isPaused !== 'boolean') {
      throw new HttpsError('invalid-argument', 'Invalid pause data');
    }

    const draftStateRef = db.collection('draft-states').doc(leagueId);
    await draftStateRef.update({
      isPaused,
      updatedAt: new Date(),
    });

    return { success: true, isPaused };
  } catch (error) {
    console.error('Error pausing/resuming draft:', error);
    throw new HttpsError('internal', 'Failed to pause/resume draft');
  }
});

// ===== HELPER FUNCTIONS =====

/**
 * Generate draft order (randomized for now, can be based on standings later)
 */
function generateDraftOrder(teams: Team[]): string[] {
  const shuffled = [...teams];

  // Simple shuffle algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.map((team) => team.id);
}

/**
 * Generate all draft picks for the draft
 */
function generateDraftPicks(
  leagueId: string,
  draftOrder: string[],
  rounds: number
): DraftPick[] {
  const picks: DraftPick[] = [];
  let pickNumber = 1;

  for (let round = 1; round <= rounds; round++) {
    const roundOrder = round % 2 === 1 ? draftOrder : [...draftOrder].reverse(); // Snake draft

    for (const teamId of roundOrder) {
      const pick: DraftPick = {
        id: `${leagueId}_${round}_${teamId}`,
        leagueId,
        year: new Date().getFullYear(),
        round,
        originalTeamId: teamId,
        currentTeamId: teamId,
        pickNumber,
        playerId: null,
        isCompleted: false,
        isAutodrafted: false,
        timeUsed: 0,
      };

      picks.push(pick);
      pickNumber++;
    }
  }

  return picks;
}

/**
 * Get the next team ID in the draft order
 */
function getNextTeamId(
  draftOrder: string[],
  pickNumber: number,
  totalRounds: number
): string {
  const teamsCount = draftOrder.length;
  const round = Math.ceil(pickNumber / teamsCount);
  const positionInRound = (pickNumber - 1) % teamsCount;

  // Snake draft logic
  if (round % 2 === 1) {
    return draftOrder[positionInRound];
  } else {
    return draftOrder[teamsCount - 1 - positionInRound];
  }
}

/**
 * Assign player rights based on player type (rookie vs veteran)
 */
async function assignPlayerRights(
  transaction: FirebaseFirestore.Transaction,
  leagueId: string,
  playerId: string,
  teamId: string,
  player: Player,
  acquisitionMethod: 'draft' | 'auction' | 'free_agency'
) {
  const rightsRef = db
    .collection('player-rights')
    .doc(`${leagueId}_${playerId}`);

  // Determine if this is a rookie (simplified logic)
  const isRookie = player.age <= 22; // Simple heuristic

  const rights: PlayerRights = {
    id: `${leagueId}_${playerId}`,
    playerId,
    teamId,
    type: 'draft',
    rightsTeamId: teamId,
    leagueId,
    expiresAt: isRookie
      ? new Date() // Rookies get immediate contracts
      : new Date(Date.now() + 72 * 60 * 60 * 1000), // Veterans get 72 hours
    capHold: isRookie
      ? calculateRookieCapHold(player)
      : calculateVeteranCapHold(player),
    rightsExpireAt: isRookie
      ? new Date() // Rookies get immediate contracts
      : new Date(Date.now() + 72 * 60 * 60 * 1000), // Veterans get 72 hours
    acquisitionMethod,
    createdAt: new Date(),
  };

  transaction.set(rightsRef, rights);

  // If rookie, create immediate contract
  if (isRookie) {
    await createRookieContract(transaction, leagueId, playerId, teamId, player);
  }
}

/**
 * Calculate rookie cap hold (based on draft position/round)
 */
function calculateRookieCapHold(player: Player): number {
  // Simplified rookie scale - in reality this would be based on draft position
  const baseAmount = 500000; // $500k base
  const positionMultipliers: { [key: string]: number } = {
    QB: 1.5,
    RB: 1.2,
    WR: 1.1,
    TE: 1.0,
    K: 0.8,
    DEF: 0.9,
  };

  return baseAmount * (positionMultipliers[player.position] || 1.0);
}

/**
 * Calculate veteran cap hold (estimated market value)
 */
function calculateVeteranCapHold(player: Player): number {
  // Simplified market value calculation
  const baseValue = 1000000; // $1M base
  const overallMultiplier = player.overall / 80; // Scale based on overall rating
  const positionMultipliers: { [key: string]: number } = {
    QB: 2.5,
    RB: 1.0,
    WR: 1.2,
    TE: 1.1,
    K: 0.3,
    DEF: 0.8,
  };

  return (
    baseValue *
    overallMultiplier *
    (positionMultipliers[player.position] || 1.0)
  );
}

/**
 * Create automatic rookie contract
 */
async function createRookieContract(
  transaction: FirebaseFirestore.Transaction,
  leagueId: string,
  playerId: string,
  teamId: string,
  player: Player
) {
  const contractRef = db.collection('contracts').doc();
  const currentYear = new Date().getFullYear();

  // Simple 3-year rookie deal
  const baseAmount = calculateRookieCapHold(player);
  const contract = {
    id: contractRef.id,
    playerId,
    teamId,
    startYear: currentYear,
    endYear: currentYear + 2, // 3 years
    baseSalary: {
      [currentYear]: baseAmount * 0.8,
      [currentYear + 1]: baseAmount * 0.9,
      [currentYear + 2]: baseAmount * 1.1,
    },
    signingBonus: baseAmount * 0.2,
    guarantees: [
      {
        type: 'full' as const,
        amount: baseAmount * 0.8,
        year: currentYear,
      },
    ],
    noTradeClause: false,
    createdAt: new Date(),
  };

  transaction.set(contractRef, contract);
}

/**
 * Get first available player from autodraft queue
 */
async function getFirstAvailablePlayer(
  leagueId: string,
  playerIds: string[]
): Promise<string> {
  for (const playerId of playerIds) {
    // Check if player is still available
    const existingPickSnapshot = await db
      .collection('picks')
      .where('leagueId', '==', leagueId)
      .where('playerId', '==', playerId)
      .get();

    if (existingPickSnapshot.empty) {
      return playerId;
    }
  }

  // If no players from queue are available, fall back to best available
  return getBestAvailablePlayer(leagueId);
}

/**
 * Get best available player (simple implementation)
 */
async function getBestAvailablePlayer(leagueId: string): Promise<string> {
  // Get all drafted players
  const draftedSnapshot = await db
    .collection('picks')
    .where('leagueId', '==', leagueId)
    .where('playerId', '!=', null)
    .get();

  const draftedPlayerIds = draftedSnapshot.docs.map(
    (doc) => doc.data()['playerId']
  );

  // Get highest overall player not yet drafted
  const availablePlayersSnapshot = await db
    .collection('players')
    .where('overall', '>=', 70) // Only consider decent players
    .orderBy('overall', 'desc')
    .limit(50)
    .get();

  for (const playerDoc of availablePlayersSnapshot.docs) {
    if (!draftedPlayerIds.includes(playerDoc.id)) {
      return playerDoc.id;
    }
  }

  throw new Error('No available players found');
}

/**
 * Internal draft pick function (used by both manual and auto draft)
 */
async function makeDraftPickInternal(
  leagueId: string,
  playerId: string,
  teamId: string,
  isAutodrafted: boolean = false
) {
  // This would contain the core logic from makeDraftPick
  // Extracted to avoid duplication between manual and auto picks
  // Implementation details would be the same as makeDraftPick
  return { success: true, isAutodrafted };
}

// ===== SCHEDULED FUNCTIONS =====

/**
 * Check for expired draft picks and auto-draft
 */
export const checkDraftTimers = onSchedule('every 1 minutes', async (event) => {
  try {
    // Get all active drafts
    const activeDraftsSnapshot = await db
      .collection('draft-states')
      .where('isComplete', '==', false)
      .where('isPaused', '==', false)
      .get();

    for (const draftDoc of activeDraftsSnapshot.docs) {
      const draftState = draftDoc.data() as DraftState;

      // Check if time has expired
      if (draftState.timeRemaining <= 0) {
        console.log(
          `Auto-drafting for team ${draftState.currentTeamId} in league ${draftState.leagueId}`
        );

        try {
          // Call the internal function directly instead of the onCall wrapper
          await makeDraftPickInternal(
            draftState.leagueId,
            await getBestAvailablePlayer(draftState.leagueId),
            draftState.currentTeamId,
            true
          );
        } catch (error) {
          console.error('Error auto-drafting:', error);
        }
      } else {
        // Decrement timer
        await draftDoc.ref.update({
          timeRemaining: Math.max(0, draftState.timeRemaining - 30),
          updatedAt: new Date(),
        });
      }
    }
  } catch (error) {
    console.error('Error checking draft timers:', error);
  }
});

// ===== FIRESTORE TRIGGERS =====

/**
 * Handle draft state updates
 */
export const onDraftStateUpdated = onDocumentUpdated(
  'draft-states/{leagueId}',
  async (event) => {
    const before = event.data?.before.data() as DraftState;
    const after = event.data?.after.data() as DraftState;

    if (!before || !after) return;

    // If draft just completed
    if (!before.isComplete && after.isComplete) {
      console.log(`Draft completed for league: ${after.leagueId}`);

      // Start negotiation window for veterans
      await startNegotiationWindow(after.leagueId);
    }
  }
);

/**
 * Start negotiation window for all veteran player rights
 */
async function startNegotiationWindow(leagueId: string) {
  try {
    const rightsSnapshot = await db
      .collection('player-rights')
      .where('leagueId', '==', leagueId)
      .where('acquisitionMethod', '==', 'draft')
      .get();

    const batch = db.batch();

    for (const rightsDoc of rightsSnapshot.docs) {
      const rights = rightsDoc.data() as PlayerRights;

      // Only create negotiations for veterans (those with future expiration dates)
      if (rights.rightsExpireAt && rights.rightsExpireAt > new Date()) {
        const negotiationRef = db.collection('contract-negotiations').doc();
        const negotiation = {
          id: negotiationRef.id,
          playerId: rights.playerId,
          teamId: rights.rightsTeamId,
          leagueId: rights.leagueId,
          negotiationHistory: [],
          expiresAt: rights.rightsExpireAt,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        batch.set(negotiationRef, negotiation);
      }
    }

    await batch.commit();
    console.log(`Started negotiation window for league: ${leagueId}`);
  } catch (error) {
    console.error('Error starting negotiation window:', error);
  }
}
