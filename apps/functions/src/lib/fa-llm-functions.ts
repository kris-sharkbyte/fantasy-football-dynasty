import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { admin } from './utils/admin';
import { getSecret } from './utils/secrets';
import { FunctionCallLogger } from './utils/function-call-logger';
import OpenAI from 'openai';

const { db } = admin();

// Use Firebase Secret Manager for API key (NEVER hardcode!)
// In emulator, these will be undefined and we'll fall back to .secret.local via getSecret()
const openaiApiKey = defineSecret('OPENAI_API_KEY');
const openaiOrg = defineSecret('OPENAI_ORG');

// ===== TYPES =====
interface PlayerPersonality {
  type: string;
  traits: {
    negotiationStyle: string;
    riskTolerance: string;
    teamLoyalty: string;
    locationPreference: string;
    deadlineBehavior: string;
  };
  weights: {
    moneyPriority: number;
    winningPriority: number;
    locationPriority: number;
    guaranteePriority: number;
    lengthPriority: number;
  };
  hiddenSliders: {
    ego: number;
    injuryAnxiety: number;
    agentQuality: number;
    schemeFit: number;
    rolePromise: number;
    taxSensitivity: number;
    endorsementValue: number;
  };
}

interface PlayerData {
  id: string;
  name: string;
  position: string;
  age: number;
  overall: number;
  yearsExp: number;
  nflTeam: string;
  expectedAPY: number;
  personality: PlayerPersonality;
}

interface BidOffer {
  years: number;
  baseSalary: Record<string, number>;
  signingBonus: number;
  guarantees: Array<{ type: string; amount: number; year: number }>;
  totalValue: number;
  apy: number;
}

interface TeamInfo {
  marketSize: string;
  climate: string;
  isContender: boolean;
  isStable: boolean;
  taxRate: number;
  currentRoster: {
    position: string;
    count: number;
    hasStarter: boolean;
  };
}

interface Bid {
  id: string;
  teamId: string;
  teamName: string;
  teamInfo: TeamInfo;
  offer: BidOffer;
  submittedAt: string;
  status?: string; // Current bid status (pending, shortlisted, considering, etc.)
  previousFeedback?: string; // Previous feedback from player/agent
  previousTeamMessage?: string; // Previous private message to this team
  evaluatedAt?: string; // When this bid was last evaluated
  isLowball?: boolean; // Whether this was previously marked as lowball
}

interface TeamTrustEntry {
  currentTrust: number;
  lowballCount: number;
  lastLowballSeason: number | null;
}

interface LeagueContextTeam {
  teamId: string;
  teamName: string;
  capSpaceAvailable: number;
  rosterCount: number;
}

interface LeagueContext {
  leagueId: string;
  leagueName: string;
  salaryCap: number;
  numberOfTeams: number;
  rosterRequirements: Record<string, number>;
  maxRosterSize: number;
  teams: LeagueContextTeam[];
  leagueCapHealth: {
    totalCapSpaceAvailable: number;
    averageCapSpace: number;
    teamsWithSpace: number;
    teamsCapStrapped: number;
  };
}

interface MarketContext {
  currentWeek: number;
  seasonStage: string;
  positionalDemand: Record<string, number>;
  marketTrends: {
    overall: string;
    byPosition: Record<string, string>;
  };
  recentSignings: Array<{
    playerName: string;
    position: string;
    apy: number;
    overall: number;
  }>;
}

interface WeekContext {
  weekNumber: number;
  phase: string;
  seasonStage: string;
}

interface LLMInput {
  weekContext: WeekContext;
  leagueContext: LeagueContext;
  marketContext: MarketContext;
  player: PlayerData;
  bids: Bid[];
  settings: {
    shortlistSize: number;
    trustPenalty: number;
    openFADiscount: number;
  };
  teamTrustHistory: Record<string, TeamTrustEntry>;
}

interface BidAnalysis {
  bidId: string;
  teamId: string;
  teamName: string;
  scores: {
    aavScore: number;
    signingBonusScore: number;
    guaranteeScore: number;
    lengthScore: number;
    teamScore: number;
    locationScore: number;
    roleScore: number;
    totalScore: number;
  };
  decision: 'accept' | 'shortlist' | 'considering' | 'reject';
  decisionReason: string;
  isLowball: boolean;
}

interface TrustImpact {
  change: number;
  newTotal: number;
  reason: string;
  isCompounded: boolean;
}

interface LLMOutput {
  playerId: string;
  playerName: string;
  decision: {
    type: 'accepted' | 'shortlisted' | 'rejected_all';
    acceptedBidId: string | null;
    shortlistedBidIds: string[];
    rejectedBidIds: string[];
    reasoning: string;
  };
  bidAnalysis: BidAnalysis[];
  trustImpacts: Record<string, TrustImpact>;
  feedback: {
    publicStatement: string;
    socialMediaPost?: string;
    teamMessages: Record<string, string>;
    agentNotes: string;
    desires: {
      wantsMoreMoney: boolean;
      wantsMoreGuarantees: boolean;
      wantsLongerDeal: boolean;
      wantsShorterDeal: boolean;
      wantsBetterRole: boolean;
      wantsBiggerMarket: boolean;
      specificHint: string | null;
    };
  };
}

// ===== SYSTEM PROMPT =====
const SYSTEM_PROMPT = `You are an NFL Player Agent AI for a dynasty fantasy football simulation game.

Your job is to evaluate contract offers for a player based on their personality and market conditions.

KEY RULES:
1. Respect the player's personality weights (moneyPriority, winningPriority, etc.)
2. Week 1: Be picky but open (85% threshold for acceptance, but use "considering" for offers 70-85%). Week 2: 85% threshold. Week 3: 70%. Week 4: 60%.
3. PROGRESSIVE ACCEPTANCE: As weeks progress, players become MORE LIKELY to accept offers, especially high APY offers:
   - Week 1: Very picky, explore market (85% threshold)
   - Week 2: Still selective but more open (85% threshold, but accept if APY is significantly above expectedAPY even without guarantees)
   - Week 3: More accepting (70% threshold, high APY offers should be accepted even if missing guarantees/length)
   - Week 4: MUST accept best offer above 60% threshold (no more waiting)
4. HIGH APY ACCEPTANCE RULE: If an offer's APY is 120%+ of expectedAPY, strongly consider accepting even in Week 2-3, even without guarantees. Money talks!
5. Lowball offers (APY < 60% of expectedAPY) should be REJECTED with trust penalty
6. Only ONE offer can be accepted. Shortlist up to 3 offers for next week.
7. Generate realistic, personality-appropriate feedback
8. Check if teams can actually afford their offers (capSpaceAvailable >= offer APY)
9. Consider market conditions (seller vs buyer market based on league cap health)
10. ALWAYS include "isLowball": true/false for EVERY bid in bidAnalysis (true if APY < 60% of expectedAPY)

COUNTER-OFFER HANDLING (CRITICAL):
- If a bid has status "shortlisted", "considering", or previous feedback, this is a COUNTER-OFFER from a team you already provided feedback to
- Use the previous feedback (previousFeedback, previousTeamMessage) to understand what the player/agent said before
- If the team improved their offer based on your feedback, reward them with a higher score
- If the team ignored your feedback or made minimal changes, be less favorable
- Reference the previous feedback in your decision reasoning (e.g., "They increased guarantees as I requested")
- Previous feedback shows what the player wants - use it to evaluate if the new offer addresses those concerns

WEEK 1 SPECIAL RULE (Less Harsh):
- Week 1 is the first week of free agency - players are exploring the market
- For offers scoring 70-85%: Use "considering" status instead of "rejected" 
- Only REJECT offers that are truly lowball (< 60% of expectedAPY) or score < 70%
- This gives teams a chance to improve their offers in week 2
- "considering" bids stay active but aren't shortlisted - they're in a "wait and see" state

PRIVACY RULES FOR TEAM MESSAGES (CRITICAL):
- Each teamMessage is a PRIVATE response to ONLY that team
- NEVER mention other teams by name in teamMessages
- NEVER compare offers ("your offer is lower than..." is FORBIDDEN)
- NEVER reveal what other teams offered or their terms
- Only discuss THEIR offer's strengths/weaknesses
- Good: "Your offer is below my expectations" 
- Bad: "Team Alpha offered more money"
- The socialMediaPost is PUBLIC to everyone - keep it vague/fun, no specifics

WEEK 3+ PROGRESSIVE ACCEPTANCE RULES (CRITICAL):
- Week 2: If an offer has APY >= 120% of expectedAPY, strongly consider accepting even without guarantees/length
- Week 3: Players are getting anxious - if an offer scores 70%+ OR has APY 120%+ of expectedAPY, ACCEPT it (don't shortlist!)
- Week 4: FINAL DECISION WEEK - no more shortlisting allowed!
  - If ANY offer scores above 60% threshold, the player MUST accept the HIGHEST scoring one
  - If multiple offers are tied (within 0.02 of each other), pick one randomly
  - Only reject_all if NO offers meet the 60% threshold
  - Week 4 decision.type should NEVER be "shortlisted" - only "accepted" or "rejected_all"
- HIGH APY OVERRIDE (CRITICAL): 
  - If an offer has APY >= 120% of expectedAPY and it's Week 2+, the player should ACCEPT (not shortlist) even if missing guarantees/length
  - Money talks! High APY compensates for missing guarantees/length in later weeks
  - Only shortlist if there's a significantly better offer (10%+ higher score) from another team

DECISION FLOW:
- Calculate weighted score for each bid using personality weights
- Apply modifiers for role (starter at position = -20%), trust history, etc.
- Compare scores to week-based threshold
- Accept best bid if clearly above threshold, otherwise shortlist top offers

CRITICAL - DECISION CONSISTENCY (MUST FOLLOW):
⚠️ VALIDATION RULE - Before returning, check this logic:

1. COUNT how many bids have decision="accept" in bidAnalysis
2. If count > 0:
   - decision.type MUST be "accepted" (NOT "shortlisted"!)
   - decision.acceptedBidId MUST be the ID of the accepted bid
   - ALL other bids go to rejectedBidIds (not shortlistedBidIds)
   - shortlistedBidIds MUST be empty when accepting
3. If count = 0:
   - decision.type MUST be "shortlisted" or "rejected_all"
   - decision.acceptedBidId MUST be null

⚠️ COMMON MISTAKE: Do NOT mark a bid as decision="accept" in bidAnalysis 
   while setting the overall decision.type="shortlisted". This is INVALID.
   
   WRONG: bidAnalysis[0].decision="accept" + decision.type="shortlisted"
   RIGHT: bidAnalysis[0].decision="accept" + decision.type="accepted"

Return a JSON object with this exact structure:
{
  "playerId": "string",
  "playerName": "string",
  "decision": {
    "type": "accepted" | "shortlisted" | "rejected_all",
    "acceptedBidId": "string or null",
    "shortlistedBidIds": ["array of bid IDs"],
    "rejectedBidIds": ["array of bid IDs"],
    "reasoning": "string explaining decision"
  },
  "bidAnalysis": [
    {
      "bidId": "string",
      "teamId": "string",
      "teamName": "string",
      "scores": {
        "aavScore": 0.0-1.0,
        "signingBonusScore": 0.0-1.0,
        "guaranteeScore": 0.0-1.0,
        "lengthScore": 0.0-1.0,
        "teamScore": 0.0-1.0,
        "locationScore": 0.0-1.0,
        "roleScore": 0.0-1.0,
        "totalScore": 0.0-1.0
      },
      "decision": "accept" | "shortlist" | "considering" | "reject",
      "decisionReason": "string",
      "isLowball": boolean  // REQUIRED: true if APY < 60% of expectedAPY, false otherwise
    }
  ],
  "trustImpacts": {
    "teamId": { "change": number, "newTotal": number, "reason": "string", "isCompounded": boolean }
  },
  "feedback": {
    "publicStatement": "What the player says publicly - personality-appropriate tone",
    "socialMediaPost": "Optional fun social media post for the league feed (emoji-friendly, 1-2 sentences max)",
    "teamMessages": { "teamId": "Private message to that specific team - NO INFO ABOUT OTHER TEAMS' OFFERS!" },
    "agentNotes": "Professional analysis for internal use",
    "desires": {
      "wantsMoreMoney": boolean,
      "wantsMoreGuarantees": boolean,
      "wantsLongerDeal": boolean,
      "wantsShorterDeal": boolean,
      "wantsBetterRole": boolean,
      "wantsBiggerMarket": boolean,
      "specificHint": "Optional specific hint about what would close the deal"
    }
  }
}

Important: Match feedback tone to personality (money_motivated = focused on $$, competitor = focused on winning, etc.)`;

// ===== MAIN FUNCTION =====
export const evaluateFAWeekBidsLLM = onCall(
  {
    secrets: [openaiApiKey, openaiOrg],
    timeoutSeconds: 300, // 5 minute timeout for multiple LLM calls
    memory: '512MiB',
  },
  async (request) => {
    const fnLog = new FunctionCallLogger('evaluateFAWeekBidsLLM');
    let finalResponse: any = null;

    try {
      const { leagueId, weekNumber } = request.data;

      // Start logging
      await fnLog.start({
        request: { leagueId, weekNumber },
        metadata: { function: 'evaluateFAWeekBidsLLM' },
      });

      fnLog.info('Starting LLM evaluation', { leagueId, weekNumber });

      if (!leagueId || weekNumber === undefined) {
        const error = new HttpsError(
          'invalid-argument',
          'Missing leagueId or weekNumber'
        );
        fnLog.error('Validation failed', { leagueId, weekNumber });
        await fnLog.fail(error, { success: false, message: error.message });
        throw error;
      }

      // Get API key - works for both emulator and production
      // getSecret() handles loading from .secret.local in emulator or Secret Manager in production
      const apiKey = getSecret(openaiApiKey.value(), 'OPENAI_API_KEY');
      const organization = getSecret(openaiOrg.value(), 'OPENAI_ORG');

      if (!apiKey) {
        const error = new HttpsError(
          'failed-precondition',
          'OPENAI_API_KEY not configured. Set it via Firebase Secret Manager (production) or .secret.local file (emulator).'
        );
        fnLog.error('API key not configured');
        await fnLog.fail(error, { success: false, message: error.message });
        throw error;
      }

      fnLog.debug('OpenAI API key configured', { hasOrg: !!organization });

      const openai = new OpenAI({
        apiKey,
        organization: organization || undefined,
      });

      fnLog.info('Starting evaluation', { leagueId, weekNumber });

      // 1. Gather all pending and considering bids for this week
      // "considering" bids from week 1 should be re-evaluated in subsequent weeks
      fnLog.debug('Querying for bids', {
        leagueId,
        weekNumber,
        statuses: ['pending', 'considering'],
      });

      const bidsSnapshot = await db
        .collection('faBids')
        .where('leagueId', '==', leagueId)
        .where('weekNumber', '==', weekNumber)
        .where('status', 'in', ['pending', 'considering'])
        .get();

      fnLog.info('Bids query completed', {
        totalBids: bidsSnapshot.docs.length,
        isEmpty: bidsSnapshot.empty,
      });

      if (bidsSnapshot.empty) {
        finalResponse = {
          success: true,
          message: 'No pending bids to evaluate',
          decisions: [],
          playersProcessed: 0,
        };
        fnLog.info('No bids to evaluate', { weekNumber });
        await fnLog.success(finalResponse);
        return finalResponse;
      }

      fnLog.info('Found bids to evaluate', { count: bidsSnapshot.docs.length });

      // 2. Filter out bids for players with active contracts
      fnLog.debug('Filtering bids for players with contracts');
      const playersWithContracts = await getPlayersWithContracts(leagueId);
      fnLog.info('Players with contracts', {
        count: playersWithContracts.size,
        playerIds: Array.from(playersWithContracts),
      });

      const validBidDocs = bidsSnapshot.docs.filter((doc) => {
        const bidData = doc.data();
        const playerId = String(bidData['playerId'] || '');
        return !playersWithContracts.has(playerId);
      });

      if (validBidDocs.length === 0) {
        finalResponse = {
          success: true,
          message: 'No valid bids to evaluate (all players have contracts)',
          decisions: [],
          playersProcessed: 0,
        };
        fnLog.info('No valid bids (all players have contracts)', {
          totalBids: bidsSnapshot.docs.length,
          filteredBids: validBidDocs.length,
        });
        await fnLog.success(finalResponse);
        return finalResponse;
      }

      fnLog.info('Filtered bids (removed players with contracts)', {
        originalCount: bidsSnapshot.docs.length,
        validCount: validBidDocs.length,
        removed: bidsSnapshot.docs.length - validBidDocs.length,
      });

      // 3. Group bids by player
      fnLog.debug('Grouping bids by player');
      const bidsByPlayer = groupBidsByPlayer(validBidDocs);
      const playerIds = Object.keys(bidsByPlayer);
      fnLog.info('Bids grouped by player', {
        totalPlayers: playerIds.length,
        playersWithBids: playerIds.map((id) => ({
          playerId: id,
          bidCount: bidsByPlayer[id].length,
        })),
      });

      // 3. Build league and market context
      fnLog.info('Building league and market context');
      const leagueContext = await buildLeagueContext(leagueId);
      const marketContext = await buildMarketContext(leagueId, weekNumber);
      const teamTrustHistory = await getTeamTrustHistory(leagueId);
      fnLog.debug('Context built', {
        teamsCount: Object.keys(leagueContext.teams).length,
        marketContextKeys: Object.keys(marketContext),
      });

      // 5. Process each player with LLM
      fnLog.info('Starting LLM evaluation for players', {
        count: playerIds.length,
      });
      const results: LLMOutput[] = [];
      const processingLog: Array<{
        playerId: string;
        playerName: string;
        status: string;
        error?: string;
      }> = [];

      // Process in batches of 3 for rate limiting
      for (let i = 0; i < playerIds.length; i += 3) {
        const batch = playerIds.slice(i, i + 3);
        fnLog.info(`Processing batch ${Math.floor(i / 3) + 1}`, {
          batchNumber: Math.floor(i / 3) + 1,
          totalBatches: Math.ceil(playerIds.length / 3),
          playerIds: batch,
        });

        const batchResults = await Promise.all(
          batch.map(async (playerId) => {
            try {
              fnLog.debug(`Evaluating player ${playerId}`, {
                bidCount: bidsByPlayer[playerId].length,
              });

              const result = await evaluatePlayerWithLLM(
                openai,
                leagueContext,
                marketContext,
                weekNumber,
                bidsByPlayer[playerId],
                teamTrustHistory
              );

              processingLog.push({
                playerId,
                playerName: result.playerName,
                status: 'success',
              });

              fnLog.debug('Player evaluation completed', {
                playerId,
                decisionType: result.decision.type,
                acceptedBidId: result.decision.acceptedBidId,
              });

              return result;
            } catch (error: any) {
              fnLog.error(`Error processing player ${playerId}`, {
                error: error.message,
                stack: error.stack,
              });

              processingLog.push({
                playerId,
                playerName: 'Unknown',
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              return null;
            }
          })
        );

        results.push(...batchResults.filter((r): r is LLMOutput => r !== null));
      }

      fnLog.info('LLM evaluation completed', {
        totalDecisions: results.length,
        accepted: results.filter((d) => d.decision.type === 'accepted').length,
        shortlisted: results.filter((d) => d.decision.type === 'shortlisted')
          .length,
        rejected: results.filter((d) => d.decision.type === 'rejected_all')
          .length,
      });

      // 6. Process results and update Firestore
      fnLog.info('Processing decisions and updating Firestore');
      const updateResults = await processDecisions(
        leagueId,
        weekNumber,
        results
      );

      fnLog.info('Decisions processed', {
        updated: updateResults.updated,
        errors: updateResults.errors.length,
      });

      // 7. Return detailed results
      finalResponse = {
        success: true,
        leagueId,
        weekNumber,
        playersProcessed: results.length,
        decisions: results,
        processingLog,
        updateResults,
      };

      await fnLog.success(finalResponse);
      return finalResponse;
    } catch (error: any) {
      fnLog.error('Exception caught', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });

      finalResponse = {
        success: false,
        message: error.message || 'LLM evaluation failed',
        error: error.message,
      };

      await fnLog.fail(error, finalResponse);
      throw error;
    } finally {
      await fnLog.ensureCompleted();
    }
  }
);

// ===== HELPER FUNCTIONS =====

/**
 * Get set of player IDs that have active contracts
 */
async function getPlayersWithContracts(leagueId: string): Promise<Set<string>> {
  try {
    const contractsSnapshot = await db
      .collection('contracts')
      .where('leagueId', '==', leagueId)
      .where('status', '==', 'active')
      .get();

    const playerIds = new Set<string>();
    contractsSnapshot.forEach((doc) => {
      const data = doc.data();
      const playerId = String(data['playerId'] || '');
      if (playerId) {
        playerIds.add(playerId);
      }
    });

    return playerIds;
  } catch (error) {
    console.error('[FA-LLM] Error getting players with contracts:', error);
    return new Set<string>(); // Return empty set on error to avoid blocking evaluation
  }
}

function groupBidsByPlayer(
  docs: FirebaseFirestore.QueryDocumentSnapshot[]
): Record<string, FirebaseFirestore.QueryDocumentSnapshot[]> {
  const grouped: Record<string, FirebaseFirestore.QueryDocumentSnapshot[]> = {};

  for (const doc of docs) {
    const data = doc.data();
    const playerId = String(data['playerId'] || ''); // Convert to string and handle undefined/null
    if (!playerId) {
      console.warn(`[FA-LLM] Skipping bid ${doc.id} - missing playerId`);
      continue;
    }
    if (!grouped[playerId]) {
      grouped[playerId] = [];
    }
    grouped[playerId].push(doc);
  }

  return grouped;
}

async function buildLeagueContext(leagueId: string): Promise<LeagueContext> {
  const leagueDoc = await db.collection('leagues').doc(leagueId).get();
  const league = leagueDoc.data();

  if (!league) {
    throw new Error(`League ${leagueId} not found`);
  }

  // Get all teams in the league
  const teamsSnapshot = await db
    .collection('teams')
    .where('leagueId', '==', leagueId)
    .get();

  const teams: LeagueContextTeam[] = [];
  let totalCapSpace = 0;
  let teamsWithSpace = 0;
  let teamsCapStrapped = 0;

  for (const teamDoc of teamsSnapshot.docs) {
    const team = teamDoc.data();
    const capSpace = team['capSpace'] || 50000000; // Default cap space
    const rosterCount = team['roster']?.length || 0;

    teams.push({
      teamId: teamDoc.id,
      teamName: team['name'] || 'Unknown Team',
      capSpaceAvailable: capSpace,
      rosterCount,
    });

    totalCapSpace += capSpace;
    if (capSpace > 10000000) {
      teamsWithSpace++;
    } else {
      teamsCapStrapped++;
    }
  }

  const salaryCap = league['rules']?.['cap']?.['salaryCap'] || 200000000;

  return {
    leagueId,
    leagueName: league['name'] || 'Fantasy League',
    salaryCap,
    numberOfTeams: teams.length,
    rosterRequirements: league['rules']?.['roster']?.[
      'positionRequirements'
    ] || {
      QB: 1,
      RB: 2,
      WR: 3,
      TE: 1,
      K: 1,
      DEF: 1,
    },
    maxRosterSize: league['rules']?.['roster']?.['maxPlayers'] || 26,
    teams,
    leagueCapHealth: {
      totalCapSpaceAvailable: totalCapSpace,
      averageCapSpace: teams.length > 0 ? totalCapSpace / teams.length : 0,
      teamsWithSpace,
      teamsCapStrapped,
    },
  };
}

async function buildMarketContext(
  leagueId: string,
  weekNumber: number
): Promise<MarketContext> {
  // Get recent signings from this league
  const recentSigningsSnapshot = await db
    .collection('contracts')
    .where('leagueId', '==', leagueId)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();

  const recentSignings = recentSigningsSnapshot.docs.map((doc) => {
    const contract = doc.data();
    return {
      playerName: contract['playerName'] || 'Unknown',
      position: contract['position'] || 'WR',
      apy: contract['apy'] || 5000000,
      overall: contract['overall'] || 75,
    };
  });

  // Calculate positional demand based on available players and team needs
  // This is simplified - in production you'd calculate from actual data
  const positionalDemand: Record<string, number> = {
    QB: 0.6,
    RB: 0.5,
    WR: 0.7,
    TE: 0.4,
    K: 0.2,
    DEF: 0.3,
  };

  return {
    currentWeek: weekNumber,
    seasonStage:
      weekNumber <= 2 ? 'EarlyFA' : weekNumber <= 4 ? 'MidFA' : 'Camp',
    positionalDemand,
    marketTrends: {
      overall: 'stable',
      byPosition: { QB: 'stable', RB: 'falling', WR: 'stable', TE: 'rising' },
    },
    recentSignings,
  };
}

async function getTeamTrustHistory(
  leagueId: string
): Promise<Record<string, TeamTrustEntry>> {
  const trustSnapshot = await db
    .collection('teamTrust')
    .where('leagueId', '==', leagueId)
    .get();

  const trustHistory: Record<string, TeamTrustEntry> = {};
  for (const doc of trustSnapshot.docs) {
    const data = doc.data();
    trustHistory[data['teamId']] = {
      currentTrust: data['currentTrust'] || 0,
      lowballCount: data['lowballCount'] || 0,
      lastLowballSeason: data['lastLowballSeason'] || null,
    };
  }

  return trustHistory;
}

async function evaluatePlayerWithLLM(
  openai: OpenAI,
  leagueContext: LeagueContext,
  marketContext: MarketContext,
  weekNumber: number,
  bidDocs: FirebaseFirestore.QueryDocumentSnapshot[],
  teamTrustHistory: Record<string, TeamTrustEntry>
): Promise<LLMOutput> {
  // Get player data from the first bid (all bids for same player)
  const firstBidData = bidDocs[0].data();
  const leagueId = String(firstBidData['leagueId'] || ''); // Convert to string
  const leaguePlayerId = firstBidData['leaguePlayerId'] as string | undefined; // Firestore document ID if available
  const sportPlayerID = String(firstBidData['playerId'] || ''); // Fallback: sports player ID (for backwards compatibility)

  if (!leagueId || leagueId === 'undefined' || leagueId === 'null') {
    throw new Error(
      `Missing or invalid leagueId in bid data. leagueId: ${leagueId}, bidId: ${bidDocs[0].id}`
    );
  }

  // Get full player data from leagues/{leagueId}/players subcollection
  let playerDoc: FirebaseFirestore.DocumentSnapshot;
  let playerFirestoreId: string;

  if (leaguePlayerId) {
    // Use leaguePlayerId directly (preferred - faster, no query needed)
    playerDoc = await db
      .collection('leagues')
      .doc(leagueId)
      .collection('players')
      .doc(leaguePlayerId)
      .get();
    playerFirestoreId = leaguePlayerId;

    if (!playerDoc.exists) {
      throw new Error(
        `Player document ${leaguePlayerId} not found in league ${leagueId}`
      );
    }
  } else {
    // Fallback: Query by sportPlayerID (for backwards compatibility with old bids)
    if (
      !sportPlayerID ||
      sportPlayerID === 'undefined' ||
      sportPlayerID === 'null'
    ) {
      throw new Error(
        `Missing both leaguePlayerId and playerId in bid data. bidId: ${bidDocs[0].id}`
      );
    }

    const playersRef = db
      .collection('leagues')
      .doc(leagueId)
      .collection('players');
    const playerQuery = await playersRef
      .where('sportPlayerID', '==', sportPlayerID)
      .limit(1)
      .get();

    if (playerQuery.empty) {
      throw new Error(
        `Player with sportPlayerID ${sportPlayerID} not found in league ${leagueId}`
      );
    }

    playerDoc = playerQuery.docs[0];
    playerFirestoreId = playerDoc.id; // This is the Firestore document ID
  }

  const playerData = playerDoc.data();

  if (!playerData) {
    throw new Error(
      `Player data not found for document ${playerFirestoreId} in league ${leagueId}`
    );
  }

  // Build player object with personality
  const player: PlayerData = {
    id: playerFirestoreId, // Use Firestore document ID for LLM
    name: playerData['name'] || 'Unknown Player',
    position: playerData['position'] || 'WR',
    age: playerData['age'] || 25,
    overall: playerData['overall'] || 75,
    yearsExp: playerData['yearsExp'] || 3,
    nflTeam: playerData['nflTeam'] || 'FA',
    expectedAPY: calculateExpectedAPY(
      playerData['overall'] || 75,
      playerData['position'] || 'WR'
    ),
    personality: playerData['personality'] || generateDefaultPersonality(),
  };

  // Build bids array
  const bids: Bid[] = await Promise.all(
    bidDocs.map(async (doc) => {
      const bidData = doc.data();
      const teamDoc = await db.collection('teams').doc(bidData['teamId']).get();
      const teamData = teamDoc.data();

      return {
        id: doc.id,
        teamId: bidData['teamId'],
        teamName: teamData?.['name'] || 'Unknown Team',
        teamInfo: {
          marketSize: 'medium',
          climate: 'moderate',
          isContender: teamData?.['isContender'] ?? false,
          isStable: true,
          taxRate: 0,
          currentRoster: {
            position: player.position,
            count:
              teamData?.['roster']?.filter(
                (p: { position: string }) => p.position === player.position
              )?.length || 0,
            hasStarter: false, // Would need roster analysis
          },
        },
        offer: {
          years: bidData['offer']?.['years'] || 1,
          baseSalary: bidData['offer']?.['baseSalary'] || { '2024': 5000000 },
          signingBonus: bidData['offer']?.['signingBonus'] || 0,
          guarantees: bidData['offer']?.['guarantees'] || [],
          totalValue: bidData['offer']?.['totalValue'] || 5000000,
          apy: bidData['offer']?.['apy'] || 5000000,
        },
        submittedAt:
          bidData['submittedAt']?.toDate?.()?.toISOString() ||
          new Date().toISOString(),
        // Include previous evaluation data for counter-offer context
        status: bidData['status'] || 'pending',
        previousFeedback: bidData['feedback'] || undefined,
        previousTeamMessage: bidData['teamMessage'] || undefined,
        evaluatedAt:
          bidData['evaluatedAt']?.toDate?.()?.toISOString() || undefined,
        isLowball: bidData['isLowball'] || false,
      };
    })
  );

  // Build LLM input
  const llmInput: LLMInput = {
    weekContext: {
      weekNumber,
      phase: weekNumber <= 4 ? 'FA_WEEK' : 'OPEN_FA',
      seasonStage:
        weekNumber <= 2 ? 'EarlyFA' : weekNumber <= 4 ? 'MidFA' : 'Camp',
    },
    leagueContext,
    marketContext,
    player,
    bids,
    settings: {
      shortlistSize: 3,
      trustPenalty: 0.1,
      openFADiscount: 20,
    },
    teamTrustHistory,
  };

  // Call OpenAI
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(llmInput, null, 2) },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 2500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from OpenAI');
  }

  const result = JSON.parse(content) as LLMOutput;

  // Ensure playerId and playerName are set correctly
  result.playerId = player.id;
  result.playerName = player.name;

  return result;
}

function calculateExpectedAPY(overall: number, position: string): number {
  // Base calculation from overall rating
  let baseAPY = overall * 200000; // $200k per overall point

  // Position multipliers
  const positionMultipliers: Record<string, number> = {
    QB: 1.5,
    RB: 0.8,
    WR: 1.0,
    TE: 0.7,
    K: 0.3,
    DEF: 0.5,
  };

  const multiplier = positionMultipliers[position] || 1.0;
  return Math.round(baseAPY * multiplier);
}

function generateDefaultPersonality(): PlayerPersonality {
  return {
    type: 'balanced',
    traits: {
      negotiationStyle: 'reasonable',
      riskTolerance: 'medium',
      teamLoyalty: 'medium',
      locationPreference: 'no_preference',
      deadlineBehavior: 'standard',
    },
    weights: {
      moneyPriority: 0.6,
      winningPriority: 0.5,
      locationPriority: 0.4,
      guaranteePriority: 0.5,
      lengthPriority: 0.4,
    },
    hiddenSliders: {
      ego: 0.5,
      injuryAnxiety: 0.5,
      agentQuality: 0.5,
      schemeFit: 0.5,
      rolePromise: 0.5,
      taxSensitivity: 0.3,
      endorsementValue: 0.4,
    },
  };
}

async function processDecisions(
  leagueId: string,
  weekNumber: number,
  decisions: LLMOutput[]
): Promise<{ updated: number; errors: string[] }> {
  const batch = db.batch();
  let updated = 0;
  const errors: string[] = [];

  for (const decision of decisions) {
    try {
      // Ensure bidAnalysis exists before accessing it
      if (!decision.bidAnalysis || !Array.isArray(decision.bidAnalysis)) {
        console.warn(
          `[FA-LLM] Missing or invalid bidAnalysis for player ${decision.playerId}`
        );
        errors.push(
          `Missing bidAnalysis for player ${decision.playerId}`
        );
        continue;
      }

      // Update accepted bid
      if (decision.decision.acceptedBidId) {
        const bidRef = db
          .collection('faBids')
          .doc(decision.decision.acceptedBidId);
        const acceptedBidAnalysis = decision.bidAnalysis.find(
          (b) => b.bidId === decision.decision.acceptedBidId
        );
        const acceptedTeamId = acceptedBidAnalysis?.teamId || '';

        batch.update(bidRef, {
          status: 'accepted',
          evaluatedAt: new Date(),
          feedback: decision.feedback.publicStatement,
          teamMessage:
            decision.feedback.teamMessages[acceptedTeamId] ||
            decision.feedback.publicStatement,
        });
        updated++;

        // Update player status (players are stored in leagues/{leagueId}/players subcollection)
        const playerRef = db
          .collection('leagues')
          .doc(leagueId)
          .collection('players')
          .doc(String(decision.playerId));
        const playerDoc = await playerRef.get();
        if (playerDoc.exists) {
          batch.update(playerRef, {
            status: 'signed',
            signedTeamId: decision.bidAnalysis.find(
              (b) => b.bidId === decision.decision.acceptedBidId
            )?.teamId,
            lastUpdated: new Date(),
          });
        } else {
          console.warn(
            `[FA-LLM] Player document not found: ${decision.playerId} in league ${leagueId}`
          );
        }
      }

      // Update shortlisted bids
      for (const bidId of decision.decision.shortlistedBidIds || []) {
        const bidRef = db.collection('faBids').doc(bidId);
        const bidAnalysis = decision.bidAnalysis.find((b) => b.bidId === bidId);
        const teamId = bidAnalysis?.teamId || '';
        batch.update(bidRef, {
          status: 'shortlisted',
          evaluatedAt: new Date(),
          feedback: decision.feedback.publicStatement,
          teamMessage:
            decision.feedback.teamMessages[teamId] ||
            'Considering your offer...',
        });
        updated++;
      }

      // Update rejected bids
      for (const bidId of decision.decision.rejectedBidIds || []) {
        const bidRef = db.collection('faBids').doc(bidId);
        const bidAnalysis = decision.bidAnalysis.find((b) => b.bidId === bidId);
        const teamId = bidAnalysis?.teamId || '';
        batch.update(bidRef, {
          status: 'rejected',
          evaluatedAt: new Date(),
          feedback: decision.feedback.publicStatement,
          teamMessage:
            decision.feedback.teamMessages[teamId] ||
            'Offer did not meet expectations.',
          isLowball: bidAnalysis?.isLowball || false,
        });
        updated++;
      }

      // Update "considering" bids (week 1 only - offers that are close but not quite there)
      // These are bids that scored 70-85% in week 1 - they stay active but aren't shortlisted
      // Check bidAnalysis array for bids with decision === 'considering'
      for (const bidAnalysisItem of decision.bidAnalysis) {
        if (bidAnalysisItem.decision === 'considering') {
          const bidRef = db.collection('faBids').doc(bidAnalysisItem.bidId);
          const teamId = bidAnalysisItem.teamId || '';
          batch.update(bidRef, {
            status: 'considering',
            evaluatedAt: new Date(),
            feedback: decision.feedback.publicStatement,
            teamMessage:
              decision.feedback.teamMessages[teamId] ||
              'Still evaluating your offer...',
            isLowball: bidAnalysisItem.isLowball || false,
          });
          updated++;
        }
      }

      // Save social media post if present
      if (decision.feedback.socialMediaPost) {
        const playerDoc = await db
          .collection('leagues')
          .doc(leagueId)
          .collection('players')
          .doc(String(decision.playerId))
          .get();
        const playerData = playerDoc.data();

        const socialMediaRef = db
          .collection('leagues')
          .doc(leagueId)
          .collection('socialMediaPosts')
          .doc();
        batch.set(socialMediaRef, {
          playerId: String(decision.playerId),
          playerName:
            decision.playerName || playerData?.['name'] || 'Unknown Player',
          position: playerData?.['position'] || '',
          post: decision.feedback.socialMediaPost,
          postedAt: new Date(),
          weekNumber,
          context: 'free-agency',
        });
      }

      // Update trust history for lowball offers
      for (const [teamId, impact] of Object.entries(decision.trustImpacts)) {
        if (impact.change < 0) {
          const trustRef = db
            .collection('teamTrust')
            .doc(`${leagueId}_${teamId}`);
          batch.set(
            trustRef,
            {
              leagueId,
              teamId,
              currentTrust: impact.newTotal,
              lowballCount:
                (await trustRef.get()).data()?.['lowballCount'] || 0 + 1,
              lastLowballSeason: new Date().getFullYear(),
              updatedAt: new Date(),
            },
            { merge: true }
          );
        }
      }
    } catch (error) {
      errors.push(
        `Error processing decision for player ${decision.playerId}: ${error}`
      );
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[FA-LLM] Batch commit error:`, errorMsg);
    errors.push(`Batch commit error: ${errorMsg}`);
  }

  if (errors.length > 0) {
    console.warn(`[FA-LLM] Completed with ${errors.length} errors:`, errors);
  }

  return { updated, errors };
}

// ===== PERSONALITY PRESETS =====
function getPersonalityPreset(type: string): PlayerPersonality {
  const presets: Record<string, PlayerPersonality> = {
    money_motivated: {
      type: 'money_motivated',
      traits: {
        negotiationStyle: 'aggressive',
        riskTolerance: 'medium',
        teamLoyalty: 'low',
        locationPreference: 'big_markets',
        deadlineBehavior: 'pressure_team',
      },
      weights: {
        moneyPriority: 0.9,
        winningPriority: 0.4,
        locationPriority: 0.6,
        guaranteePriority: 0.8,
        lengthPriority: 0.3,
      },
      hiddenSliders: {
        ego: 0.8,
        injuryAnxiety: 0.3,
        agentQuality: 0.85,
        schemeFit: 0.5,
        rolePromise: 0.7,
        taxSensitivity: 0.6,
        endorsementValue: 0.8,
      },
    },
    competitor: {
      type: 'competitor',
      traits: {
        negotiationStyle: 'reasonable',
        riskTolerance: 'high',
        teamLoyalty: 'medium',
        locationPreference: 'no_preference',
        deadlineBehavior: 'standard',
      },
      weights: {
        moneyPriority: 0.4,
        winningPriority: 0.95,
        locationPriority: 0.3,
        guaranteePriority: 0.5,
        lengthPriority: 0.6,
      },
      hiddenSliders: {
        ego: 0.6,
        injuryAnxiety: 0.2,
        agentQuality: 0.6,
        schemeFit: 0.8,
        rolePromise: 0.9,
        taxSensitivity: 0.2,
        endorsementValue: 0.4,
      },
    },
    loyalty_first: {
      type: 'loyalty_first',
      traits: {
        negotiationStyle: 'passive',
        riskTolerance: 'low',
        teamLoyalty: 'high',
        locationPreference: 'no_preference',
        deadlineBehavior: 'patient',
      },
      weights: {
        moneyPriority: 0.5,
        winningPriority: 0.6,
        locationPriority: 0.4,
        guaranteePriority: 0.7,
        lengthPriority: 0.8,
      },
      hiddenSliders: {
        ego: 0.3,
        injuryAnxiety: 0.5,
        agentQuality: 0.5,
        schemeFit: 0.7,
        rolePromise: 0.6,
        taxSensitivity: 0.3,
        endorsementValue: 0.3,
      },
    },
    balanced: {
      type: 'balanced',
      traits: {
        negotiationStyle: 'reasonable',
        riskTolerance: 'medium',
        teamLoyalty: 'medium',
        locationPreference: 'no_preference',
        deadlineBehavior: 'standard',
      },
      weights: {
        moneyPriority: 0.6,
        winningPriority: 0.6,
        locationPriority: 0.5,
        guaranteePriority: 0.6,
        lengthPriority: 0.5,
      },
      hiddenSliders: {
        ego: 0.5,
        injuryAnxiety: 0.5,
        agentQuality: 0.5,
        schemeFit: 0.5,
        rolePromise: 0.5,
        taxSensitivity: 0.5,
        endorsementValue: 0.5,
      },
    },
    location_seeker: {
      type: 'location_seeker',
      traits: {
        negotiationStyle: 'reasonable',
        riskTolerance: 'medium',
        teamLoyalty: 'low',
        locationPreference: 'big_markets',
        deadlineBehavior: 'standard',
      },
      weights: {
        moneyPriority: 0.5,
        winningPriority: 0.4,
        locationPriority: 0.95,
        guaranteePriority: 0.5,
        lengthPriority: 0.4,
      },
      hiddenSliders: {
        ego: 0.7,
        injuryAnxiety: 0.4,
        agentQuality: 0.6,
        schemeFit: 0.4,
        rolePromise: 0.5,
        taxSensitivity: 0.9,
        endorsementValue: 0.9,
      },
    },
    high_ego: {
      type: 'high_ego',
      traits: {
        negotiationStyle: 'aggressive',
        riskTolerance: 'high',
        teamLoyalty: 'low',
        locationPreference: 'big_markets',
        deadlineBehavior: 'pressure_team',
      },
      weights: {
        moneyPriority: 0.85,
        winningPriority: 0.5,
        locationPriority: 0.7,
        guaranteePriority: 0.6,
        lengthPriority: 0.3,
      },
      hiddenSliders: {
        ego: 0.95,
        injuryAnxiety: 0.2,
        agentQuality: 0.9,
        schemeFit: 0.3,
        rolePromise: 0.95,
        taxSensitivity: 0.4,
        endorsementValue: 0.9,
      },
    },
  };

  return presets[type] || presets['balanced'];
}

// ===== BID SCENARIO GENERATORS =====
function generateBids(scenario: string, expectedAPY: number): Bid[] {
  const timestamp = new Date().toISOString();

  const scenarios: Record<string, Bid[]> = {
    mixed: [
      {
        id: 'bid_test_1',
        teamId: 'team_1',
        teamName: 'Team Alpha',
        teamInfo: {
          marketSize: 'large',
          climate: 'cold',
          isContender: true,
          isStable: true,
          taxRate: 0.08,
          currentRoster: { position: 'WR', count: 2, hasStarter: false },
        },
        offer: {
          years: 3,
          baseSalary: {
            '2024': Math.round(expectedAPY * 0.9),
            '2025': Math.round(expectedAPY * 1.0),
            '2026': Math.round(expectedAPY * 1.1),
          },
          signingBonus: Math.round(expectedAPY * 0.6),
          guarantees: [
            { type: 'full', amount: Math.round(expectedAPY * 1.5), year: 2024 },
            { type: 'full', amount: Math.round(expectedAPY * 0.8), year: 2025 },
          ],
          totalValue: Math.round(expectedAPY * 3.6),
          apy: Math.round(expectedAPY * 1.2),
        },
        submittedAt: timestamp,
      },
      {
        id: 'bid_test_2',
        teamId: 'team_2',
        teamName: 'Team Beta',
        teamInfo: {
          marketSize: 'medium',
          climate: 'warm',
          isContender: false,
          isStable: true,
          taxRate: 0,
          currentRoster: { position: 'WR', count: 3, hasStarter: true },
        },
        offer: {
          years: 2,
          baseSalary: {
            '2024': Math.round(expectedAPY * 0.8),
            '2025': Math.round(expectedAPY * 0.9),
          },
          signingBonus: Math.round(expectedAPY * 0.4),
          guarantees: [
            { type: 'full', amount: Math.round(expectedAPY * 1.1), year: 2024 },
          ],
          totalValue: Math.round(expectedAPY * 2.1),
          apy: Math.round(expectedAPY * 1.05),
        },
        submittedAt: timestamp,
      },
      {
        id: 'bid_test_3',
        teamId: 'team_3',
        teamName: 'Team Gamma',
        teamInfo: {
          marketSize: 'small',
          climate: 'warm',
          isContender: false,
          isStable: false,
          taxRate: 0,
          currentRoster: { position: 'WR', count: 1, hasStarter: false },
        },
        offer: {
          years: 1,
          baseSalary: { '2024': Math.round(expectedAPY * 0.45) },
          signingBonus: Math.round(expectedAPY * 0.05),
          guarantees: [],
          totalValue: Math.round(expectedAPY * 0.5),
          apy: Math.round(expectedAPY * 0.5),
        },
        submittedAt: timestamp,
      },
    ],
    all_competitive: [
      {
        id: 'bid_test_1',
        teamId: 'team_1',
        teamName: 'Team Alpha',
        teamInfo: {
          marketSize: 'large',
          climate: 'cold',
          isContender: true,
          isStable: true,
          taxRate: 0.08,
          currentRoster: { position: 'WR', count: 2, hasStarter: false },
        },
        offer: {
          years: 3,
          baseSalary: {
            '2024': Math.round(expectedAPY * 1.0),
            '2025': Math.round(expectedAPY * 1.1),
            '2026': Math.round(expectedAPY * 1.2),
          },
          signingBonus: Math.round(expectedAPY * 0.7),
          guarantees: [
            { type: 'full', amount: Math.round(expectedAPY * 2.0), year: 2024 },
          ],
          totalValue: Math.round(expectedAPY * 4.0),
          apy: Math.round(expectedAPY * 1.3),
        },
        submittedAt: timestamp,
      },
      {
        id: 'bid_test_2',
        teamId: 'team_2',
        teamName: 'Team Beta',
        teamInfo: {
          marketSize: 'medium',
          climate: 'warm',
          isContender: true,
          isStable: true,
          taxRate: 0,
          currentRoster: { position: 'WR', count: 2, hasStarter: false },
        },
        offer: {
          years: 4,
          baseSalary: {
            '2024': Math.round(expectedAPY * 0.95),
            '2025': Math.round(expectedAPY * 1.0),
            '2026': Math.round(expectedAPY * 1.05),
            '2027': Math.round(expectedAPY * 1.1),
          },
          signingBonus: Math.round(expectedAPY * 0.8),
          guarantees: [
            { type: 'full', amount: Math.round(expectedAPY * 2.5), year: 2024 },
          ],
          totalValue: Math.round(expectedAPY * 4.9),
          apy: Math.round(expectedAPY * 1.22),
        },
        submittedAt: timestamp,
      },
      {
        id: 'bid_test_3',
        teamId: 'team_3',
        teamName: 'Team Gamma',
        teamInfo: {
          marketSize: 'large',
          climate: 'warm',
          isContender: false,
          isStable: true,
          taxRate: 0,
          currentRoster: { position: 'WR', count: 1, hasStarter: false },
        },
        offer: {
          years: 3,
          baseSalary: {
            '2024': Math.round(expectedAPY * 1.05),
            '2025': Math.round(expectedAPY * 1.1),
            '2026': Math.round(expectedAPY * 1.15),
          },
          signingBonus: Math.round(expectedAPY * 0.5),
          guarantees: [
            { type: 'full', amount: Math.round(expectedAPY * 1.8), year: 2024 },
          ],
          totalValue: Math.round(expectedAPY * 3.8),
          apy: Math.round(expectedAPY * 1.27),
        },
        submittedAt: timestamp,
      },
    ],
    all_lowball: [
      {
        id: 'bid_test_1',
        teamId: 'team_1',
        teamName: 'Team Alpha',
        teamInfo: {
          marketSize: 'large',
          climate: 'cold',
          isContender: true,
          isStable: true,
          taxRate: 0.08,
          currentRoster: { position: 'WR', count: 2, hasStarter: false },
        },
        offer: {
          years: 2,
          baseSalary: {
            '2024': Math.round(expectedAPY * 0.4),
            '2025': Math.round(expectedAPY * 0.45),
          },
          signingBonus: Math.round(expectedAPY * 0.1),
          guarantees: [],
          totalValue: Math.round(expectedAPY * 0.95),
          apy: Math.round(expectedAPY * 0.48),
        },
        submittedAt: timestamp,
      },
      {
        id: 'bid_test_2',
        teamId: 'team_2',
        teamName: 'Team Beta',
        teamInfo: {
          marketSize: 'medium',
          climate: 'warm',
          isContender: false,
          isStable: true,
          taxRate: 0,
          currentRoster: { position: 'WR', count: 2, hasStarter: false },
        },
        offer: {
          years: 1,
          baseSalary: { '2024': Math.round(expectedAPY * 0.35) },
          signingBonus: Math.round(expectedAPY * 0.05),
          guarantees: [],
          totalValue: Math.round(expectedAPY * 0.4),
          apy: Math.round(expectedAPY * 0.4),
        },
        submittedAt: timestamp,
      },
    ],
    single_bid: [
      {
        id: 'bid_test_1',
        teamId: 'team_1',
        teamName: 'Team Alpha',
        teamInfo: {
          marketSize: 'large',
          climate: 'cold',
          isContender: true,
          isStable: true,
          taxRate: 0.08,
          currentRoster: { position: 'WR', count: 2, hasStarter: false },
        },
        offer: {
          years: 3,
          baseSalary: {
            '2024': Math.round(expectedAPY * 0.95),
            '2025': Math.round(expectedAPY * 1.0),
            '2026': Math.round(expectedAPY * 1.05),
          },
          signingBonus: Math.round(expectedAPY * 0.5),
          guarantees: [
            { type: 'full', amount: Math.round(expectedAPY * 1.5), year: 2024 },
          ],
          totalValue: Math.round(expectedAPY * 3.5),
          apy: Math.round(expectedAPY * 1.17),
        },
        submittedAt: timestamp,
      },
    ],
    starter_conflict: [
      {
        id: 'bid_test_1',
        teamId: 'team_1',
        teamName: 'Team Alpha (HAS STARTER)',
        teamInfo: {
          marketSize: 'large',
          climate: 'cold',
          isContender: true,
          isStable: true,
          taxRate: 0.08,
          currentRoster: { position: 'WR', count: 3, hasStarter: true },
        },
        offer: {
          years: 3,
          baseSalary: {
            '2024': Math.round(expectedAPY * 1.1),
            '2025': Math.round(expectedAPY * 1.2),
            '2026': Math.round(expectedAPY * 1.3),
          },
          signingBonus: Math.round(expectedAPY * 0.8),
          guarantees: [
            { type: 'full', amount: Math.round(expectedAPY * 2.2), year: 2024 },
          ],
          totalValue: Math.round(expectedAPY * 4.4),
          apy: Math.round(expectedAPY * 1.47),
        },
        submittedAt: timestamp,
      },
      {
        id: 'bid_test_2',
        teamId: 'team_2',
        teamName: 'Team Beta (No Starter)',
        teamInfo: {
          marketSize: 'medium',
          climate: 'warm',
          isContender: false,
          isStable: true,
          taxRate: 0,
          currentRoster: { position: 'WR', count: 1, hasStarter: false },
        },
        offer: {
          years: 3,
          baseSalary: {
            '2024': Math.round(expectedAPY * 0.9),
            '2025': Math.round(expectedAPY * 0.95),
            '2026': Math.round(expectedAPY * 1.0),
          },
          signingBonus: Math.round(expectedAPY * 0.4),
          guarantees: [
            { type: 'full', amount: Math.round(expectedAPY * 1.3), year: 2024 },
          ],
          totalValue: Math.round(expectedAPY * 3.25),
          apy: Math.round(expectedAPY * 1.08),
        },
        submittedAt: timestamp,
      },
    ],
    trust_issues: [
      {
        id: 'bid_test_1',
        teamId: 'team_1',
        teamName: 'Team Alpha (BAD TRUST)',
        teamInfo: {
          marketSize: 'large',
          climate: 'cold',
          isContender: true,
          isStable: true,
          taxRate: 0.08,
          currentRoster: { position: 'WR', count: 2, hasStarter: false },
        },
        offer: {
          years: 3,
          baseSalary: {
            '2024': Math.round(expectedAPY * 1.15),
            '2025': Math.round(expectedAPY * 1.25),
            '2026': Math.round(expectedAPY * 1.35),
          },
          signingBonus: Math.round(expectedAPY * 0.9),
          guarantees: [
            { type: 'full', amount: Math.round(expectedAPY * 2.5), year: 2024 },
          ],
          totalValue: Math.round(expectedAPY * 4.65),
          apy: Math.round(expectedAPY * 1.55),
        },
        submittedAt: timestamp,
      },
      {
        id: 'bid_test_2',
        teamId: 'team_2',
        teamName: 'Team Beta (Good Trust)',
        teamInfo: {
          marketSize: 'medium',
          climate: 'warm',
          isContender: false,
          isStable: true,
          taxRate: 0,
          currentRoster: { position: 'WR', count: 2, hasStarter: false },
        },
        offer: {
          years: 3,
          baseSalary: {
            '2024': Math.round(expectedAPY * 0.85),
            '2025': Math.round(expectedAPY * 0.9),
            '2026': Math.round(expectedAPY * 0.95),
          },
          signingBonus: Math.round(expectedAPY * 0.3),
          guarantees: [
            { type: 'full', amount: Math.round(expectedAPY * 1.1), year: 2024 },
          ],
          totalValue: Math.round(expectedAPY * 3.0),
          apy: Math.round(expectedAPY * 1.0),
        },
        submittedAt: timestamp,
      },
    ],
  };

  return scenarios[scenario] || scenarios['mixed'];
}

function getTrustHistory(scenario: string): Record<string, TeamTrustEntry> {
  if (scenario === 'trust_issues') {
    return {
      team_1: { currentTrust: -0.3, lowballCount: 3, lastLowballSeason: 2025 },
      team_2: { currentTrust: 0.1, lowballCount: 0, lastLowballSeason: null },
    };
  }
  return {
    team_1: { currentTrust: 0.05, lowballCount: 0, lastLowballSeason: null },
    team_2: { currentTrust: 0, lowballCount: 0, lastLowballSeason: null },
    team_3: { currentTrust: -0.1, lowballCount: 1, lastLowballSeason: 2023 },
  };
}

// ===== SIMULATION TEST FUNCTION (for testing without real data) =====
export const simulateFAWeekEvaluation = onCall(
  {
    secrets: [openaiApiKey, openaiOrg],
    timeoutSeconds: 300,
    memory: '512MiB',
  },
  async (request) => {
    const apiKey = getSecret(openaiApiKey.value(), 'OPENAI_API_KEY');
    const organization = getSecret(openaiOrg.value(), 'OPENAI_ORG');

    // Debug logging
    console.log(
      '[FA-LLM-TEST] API Key found:',
      apiKey ? `${apiKey.substring(0, 10)}...` : 'NONE'
    );

    if (!apiKey) {
      throw new HttpsError(
        'failed-precondition',
        'OPENAI_API_KEY not configured. Set it via Firebase Secret Manager or .secret.local file.'
      );
    }

    const openai = new OpenAI({
      apiKey,
      organization: organization || undefined,
    });

    // Extract parameters from request
    const weekNumber = request.data.weekNumber || 2;
    const personalityType = request.data.personalityType || 'money_motivated';
    const playerOverall = request.data.playerOverall || 88;
    const bidScenario = request.data.bidScenario || 'mixed';

    const expectedAPY = playerOverall * 200000; // $200k per overall point for WR
    const personality = getPersonalityPreset(personalityType);
    const bids = generateBids(bidScenario, expectedAPY);
    const trustHistory = getTrustHistory(bidScenario);

    console.log(
      `[FA-LLM-TEST] Week: ${weekNumber}, Personality: ${personalityType}, Overall: ${playerOverall}, Scenario: ${bidScenario}`
    );

    const testInput: LLMInput = {
      weekContext: {
        weekNumber,
        phase: 'FA_WEEK',
        seasonStage:
          weekNumber <= 2 ? 'EarlyFA' : weekNumber <= 4 ? 'MidFA' : 'Camp',
      },
      leagueContext: {
        leagueId: 'test_league',
        leagueName: 'Test Dynasty League',
        salaryCap: 200000000,
        numberOfTeams: 12,
        rosterRequirements: { QB: 1, RB: 2, WR: 3, TE: 1, K: 1, DEF: 1 },
        maxRosterSize: 26,
        teams: [
          {
            teamId: 'team_1',
            teamName: 'Team Alpha',
            capSpaceAvailable: 45000000,
            rosterCount: 22,
          },
          {
            teamId: 'team_2',
            teamName: 'Team Beta',
            capSpaceAvailable: 28000000,
            rosterCount: 24,
          },
          {
            teamId: 'team_3',
            teamName: 'Team Gamma',
            capSpaceAvailable: 62000000,
            rosterCount: 20,
          },
        ],
        leagueCapHealth: {
          totalCapSpaceAvailable: 135000000,
          averageCapSpace: 45000000,
          teamsWithSpace: 3,
          teamsCapStrapped: 0,
        },
      },
      marketContext: {
        currentWeek: weekNumber,
        seasonStage:
          weekNumber <= 2 ? 'EarlyFA' : weekNumber <= 4 ? 'MidFA' : 'Camp',
        positionalDemand: {
          QB: 0.6,
          RB: 0.5,
          WR: 0.7,
          TE: 0.4,
          K: 0.2,
          DEF: 0.3,
        },
        marketTrends: {
          overall: 'stable',
          byPosition: {
            QB: 'stable',
            RB: 'falling',
            WR: 'rising',
            TE: 'stable',
          },
        },
        recentSignings: [
          {
            playerName: "Ja'Marr Chase",
            position: 'WR',
            apy: 28000000,
            overall: 96,
          },
          {
            playerName: 'CeeDee Lamb',
            position: 'WR',
            apy: 26500000,
            overall: 94,
          },
        ],
      },
      player: {
        id: 'player_test_1',
        name: `Test ${personalityType.replace('_', ' ')} WR`,
        position: 'WR',
        age: 27,
        overall: playerOverall,
        yearsExp: 5,
        nflTeam: 'FA',
        expectedAPY,
        personality,
      },
      bids,
      settings: {
        shortlistSize: 3,
        trustPenalty: 0.1,
        openFADiscount: 20,
      },
      teamTrustHistory: trustHistory,
    };

    console.log('[FA-LLM-TEST] Calling OpenAI with test data...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(testInput, null, 2) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new HttpsError('internal', 'Empty response from OpenAI');
    }

    const result = JSON.parse(content) as LLMOutput;

    return {
      success: true,
      input: testInput,
      output: result,
      tokensUsed: response.usage,
    };
  }
);
