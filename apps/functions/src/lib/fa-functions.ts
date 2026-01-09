import { onCall, HttpsError } from 'firebase-functions/v2/https';
import {
  onDocumentCreated,
  onDocumentUpdated,
} from 'firebase-functions/v2/firestore';
import { admin } from './utils/admin';
import { FAWeekManager, OpenFAManager } from './domain';

const { db } = admin();

// ===== ESSENTIAL SERVER-SIDE LOGIC ONLY =====

/**
 * Process FA week evaluation with complex business logic
 * This is the only function that truly needs server-side processing
 */
export const processFAWeekEvaluation = onCall(async (request) => {
  try {
    const { leagueId, weekNumber } = request.data;

    if (!leagueId || !weekNumber) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    // Get all pending bids for the week
    const bidsSnapshot = await db
      .collection('faBids')
      .where('leagueId', '==', leagueId)
      .where('weekNumber', '==', weekNumber)
      .where('status', '==', 'pending')
      .get();

    if (bidsSnapshot.empty) {
      return { success: true, message: 'No pending bids to evaluate' };
    }

    // Group bids by player for evaluation
    const bidsByPlayer: Record<string, any[]> = {};
    bidsSnapshot.docs.forEach((doc) => {
      const bid = doc.data();
      const playerId = bid['playerId'];
      if (!bidsByPlayer[playerId]) {
        bidsByPlayer[playerId] = [];
      }
      bidsByPlayer[playerId].push(bid);
    });

    // Process each player's bids using domain logic
    const results = [];
    for (const [playerId, bids] of Object.entries(bidsByPlayer)) {
      const result = await processPlayerBidsWithDomainLogic(playerId, bids);
      results.push(result);
    }

    return {
      success: true,
      processedPlayers: results.length,
      message: `Week ${weekNumber} evaluation completed for league ${leagueId}`,
    };
  } catch (error) {
    console.error('Error processing FA week evaluation:', error);
    throw new HttpsError('internal', 'Failed to process week evaluation');
  }
});

/**
 * Process bids for a specific player using domain logic
 */
async function processPlayerBidsWithDomainLogic(
  playerId: string,
  bids: any[]
): Promise<any> {
  try {
    // Get player data for evaluation
    const playerDoc = await db.collection('players').doc(playerId).get();
    if (!playerDoc.exists) {
      throw new Error(`Player ${playerId} not found`);
    }

    const player = playerDoc.data();

    // TODO: Use FAWeekManager.processFAWeekEvaluation for complex logic
    // For now, use simple sorting logic
    const sortedBids = bids.sort((a, b) => {
      const aValue = a.offer.totalValue || 0;
      const bValue = b.offer.totalValue || 0;
      return bValue - aValue;
    });

    const bestBid = sortedBids[0];
    const otherBids = sortedBids.slice(1);

    // Accept best bid
    await db.collection('faBids').doc(bestBid['id']).update({
      status: 'accepted',
      evaluatedAt: new Date(),
      feedback: 'This offer meets my expectations!',
    });

    // Reject other bids
    for (const bid of otherBids) {
      await db.collection('faBids').doc(bid['id']).update({
        status: 'rejected',
        evaluatedAt: new Date(),
        feedback: 'A better offer was accepted.',
      });
    }

    // Update player status
    await db.collection('players').doc(playerId).update({
      status: 'signed',
      lastUpdated: new Date(),
    });

    // TODO: Create actual contract record

    return {
      playerId,
      acceptedBidId: bestBid['id'],
      rejectedBids: otherBids.length,
    };
  } catch (error) {
    console.error('Error processing player bids:', error);
    throw error;
  }
}

// ===== FIRESTORE TRIGGERS FOR REAL-TIME UPDATES =====

/**
 * Trigger when FA bid is created - handle real-time updates
 */
export const onFABidCreated = onDocumentCreated(
  'faBids/{bidId}',
  async (event) => {
    const bidId = event.params.bidId;
    const bid = event.data?.data();
    const leagueId = bid?.['leagueId'];
    const leaguePlayerId = bid?.['leaguePlayerId'];

    // Update player status to 'bidding' using leaguePlayerId in leagues/{leagueId}/players
    if (leagueId && leaguePlayerId) {
      try {
        const playerRef = db
          .collection('leagues')
          .doc(leagueId)
          .collection('players')
          .doc(leaguePlayerId);

        await playerRef.update({
          status: 'bidding',
          lastUpdated: new Date(),
        });
      } catch (error) {
        console.error(
          `[onFABidCreated] Error updating player status for ${leaguePlayerId} in league ${leagueId}:`,
          error
        );
        // Don't throw - this is a non-critical update
      }
    } else {
      console.warn(
        `[onFABidCreated] Missing leagueId or leaguePlayerId in bid ${bidId}. leagueId: ${leagueId}, leaguePlayerId: ${leaguePlayerId}`
      );
    }
  }
);

/**
 * Trigger when FA bid is updated - handle status changes
 */
export const onFABidUpdated = onDocumentUpdated(
  'faBids/{bidId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (before && after && before['status'] !== after['status']) {
      // Handle status changes
      if (after['status'] === 'accepted') {
        // TODO: Create contract, update team roster, etc.
      } else if (
        after['status'] === 'rejected' ||
        after['status'] === 'cancelled'
      ) {
        // Update player status back to available if no more bids
        // Use leaguePlayerId to update player in leagues/{leagueId}/players
        const leagueId = after['leagueId'];
        const leaguePlayerId = after['leaguePlayerId'];

        if (leagueId && leaguePlayerId) {
          try {
            const remainingBids = await db
              .collection('faBids')
              .where('leagueId', '==', leagueId)
              .where('leaguePlayerId', '==', leaguePlayerId)
              .where('status', 'in', ['pending', 'evaluating'])
              .get();

            if (remainingBids.empty) {
              const playerRef = db
                .collection('leagues')
                .doc(leagueId)
                .collection('players')
                .doc(leaguePlayerId);

              await playerRef.update({
                status: 'available',
                lastUpdated: new Date(),
              });
            }
          } catch (error) {
            console.error(
              `[onFABidUpdated] Error updating player status for ${leaguePlayerId} in league ${leagueId}:`,
              error
            );
          }
        } else {
          console.warn(
            `[onFABidUpdated] Missing leagueId or leaguePlayerId in bid ${after['id']}. leagueId: ${leagueId}, leaguePlayerId: ${leaguePlayerId}`
          );
        }
      }
    }
  }
);

/**
 * Trigger when FA week is created - set up initial state
 */
export const onFAWeekCreated = onDocumentCreated(
  'faWeeks/{faWeekId}',
  async (event) => {
    // Additional setup logic can go here
    // e.g., notify teams, set up timers, etc.
  }
);
