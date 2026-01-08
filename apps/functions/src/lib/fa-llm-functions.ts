import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { admin } from './utils/admin';
import OpenAI from 'openai';

const { db } = admin();

// Use Firebase Secret Manager for API key (NEVER hardcode!)
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
  decision: 'accept' | 'shortlist' | 'reject';
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
2. Week 1-2: Be picky (85% threshold). Week 3: 70%. Week 4: 60%.
3. Lowball offers (APY < 60% of expectedAPY) should be REJECTED with trust penalty
4. Only ONE offer can be accepted. Shortlist up to 3 offers for next week.
5. Generate realistic, personality-appropriate feedback
6. Check if teams can actually afford their offers (capSpaceAvailable >= offer APY)
7. Consider market conditions (seller vs buyer market based on league cap health)
8. ALWAYS include "isLowball": true/false for EVERY bid in bidAnalysis (true if APY < 60% of expectedAPY)

PRIVACY RULES FOR TEAM MESSAGES (CRITICAL):
- Each teamMessage is a PRIVATE response to ONLY that team
- NEVER mention other teams by name in teamMessages
- NEVER compare offers ("your offer is lower than..." is FORBIDDEN)
- NEVER reveal what other teams offered or their terms
- Only discuss THEIR offer's strengths/weaknesses
- Good: "Your offer is below my expectations" 
- Bad: "Team Alpha offered more money"
- The socialMediaPost is PUBLIC to everyone - keep it vague/fun, no specifics

WEEK 4 SPECIAL RULE (CRITICAL):
- Week 4 is the FINAL DECISION WEEK - no more shortlisting allowed!
- If ANY offer scores above 60% threshold, the player MUST accept the HIGHEST scoring one
- If multiple offers are tied (within 0.02 of each other), pick one randomly
- Only reject_all if NO offers meet the 60% threshold
- Week 4 decision.type should NEVER be "shortlisted" - only "accepted" or "rejected_all"

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
      "decision": "accept" | "shortlist" | "reject",
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
    try {
      const { leagueId, weekNumber } = request.data;

      if (!leagueId || weekNumber === undefined) {
        throw new HttpsError('invalid-argument', 'Missing leagueId or weekNumber');
      }

      // Get API key - works for both emulator and production
      const apiKey = openaiApiKey.value() || process.env['OPENAI_API_KEY'];
      const organization = openaiOrg.value() || process.env['OPENAI_ORG'];

      if (!apiKey) {
        throw new HttpsError(
          'failed-precondition',
          'OPENAI_API_KEY not configured. Set it via Firebase Secret Manager or .secret.local file.'
        );
      }

      const openai = new OpenAI({ apiKey, organization: organization || undefined });

      console.log(`[FA-LLM] Starting evaluation for league ${leagueId}, week ${weekNumber}`);

      // 1. Gather all pending bids for this week
      const bidsSnapshot = await db
        .collection('faBids')
        .where('leagueId', '==', leagueId)
        .where('weekNumber', '==', weekNumber)
        .where('status', '==', 'pending')
        .get();

      if (bidsSnapshot.empty) {
        return { success: true, message: 'No pending bids to evaluate', decisions: [] };
      }

      console.log(`[FA-LLM] Found ${bidsSnapshot.docs.length} pending bids`);

      // 2. Group bids by player
      const bidsByPlayer = groupBidsByPlayer(bidsSnapshot.docs);
      const playerIds = Object.keys(bidsByPlayer);
      console.log(`[FA-LLM] Processing ${playerIds.length} players with bids`);

      // 3. Build league and market context
      const leagueContext = await buildLeagueContext(leagueId);
      const marketContext = await buildMarketContext(leagueId, weekNumber);
      const teamTrustHistory = await getTeamTrustHistory(leagueId);

      // 4. Process each player
      const results: LLMOutput[] = [];
      const processingLog: Array<{ playerId: string; playerName: string; status: string; error?: string }> = [];

      // Process in batches of 3 for rate limiting
      for (let i = 0; i < playerIds.length; i += 3) {
        const batch = playerIds.slice(i, i + 3);
        console.log(`[FA-LLM] Processing batch ${Math.floor(i / 3) + 1}: ${batch.join(', ')}`);

        const batchResults = await Promise.all(
          batch.map(async (playerId) => {
            try {
              const result = await evaluatePlayerWithLLM(
                openai,
                leagueContext,
                marketContext,
                weekNumber,
                bidsByPlayer[playerId],
                teamTrustHistory
              );
              processingLog.push({ playerId, playerName: result.playerName, status: 'success' });
              return result;
            } catch (error) {
              console.error(`[FA-LLM] Error processing player ${playerId}:`, error);
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

        results.push(...(batchResults.filter((r): r is LLMOutput => r !== null)));
      }

      // 5. Process results and update Firestore
      const updateResults = await processDecisions(leagueId, weekNumber, results);

      // 6. Return detailed results
      return {
        success: true,
        leagueId,
        weekNumber,
        playersProcessed: results.length,
        decisions: results,
        processingLog,
        updateResults,
      };
    } catch (error) {
      console.error('[FA-LLM] Fatal error:', error);
      throw new HttpsError(
        'internal',
        `Failed to process FA week evaluation: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

// ===== HELPER FUNCTIONS =====

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
  const teamsSnapshot = await db.collection('teams').where('leagueId', '==', leagueId).get();

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
    rosterRequirements: league['rules']?.['roster']?.['positionRequirements'] || {
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

async function buildMarketContext(leagueId: string, weekNumber: number): Promise<MarketContext> {
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
    seasonStage: weekNumber <= 2 ? 'EarlyFA' : weekNumber <= 4 ? 'MidFA' : 'Camp',
    positionalDemand,
    marketTrends: {
      overall: 'stable',
      byPosition: { QB: 'stable', RB: 'falling', WR: 'stable', TE: 'rising' },
    },
    recentSignings,
  };
}

async function getTeamTrustHistory(leagueId: string): Promise<Record<string, TeamTrustEntry>> {
  const trustSnapshot = await db.collection('teamTrust').where('leagueId', '==', leagueId).get();

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
  const playerId = String(firstBidData['playerId'] || ''); // Convert to string and handle undefined/null
  const leagueId = String(firstBidData['leagueId'] || ''); // Convert to string

  if (!playerId || playerId === 'undefined' || playerId === 'null' || !leagueId || leagueId === 'undefined' || leagueId === 'null') {
    throw new Error(`Missing or invalid playerId or leagueId in bid data. playerId: ${playerId}, leagueId: ${leagueId}, bidId: ${bidDocs[0].id}`);
  }

  // Get full player data from leagues/{leagueId}/players subcollection
  const playerDoc = await db.collection('leagues').doc(leagueId).collection('players').doc(playerId).get();
  const playerData = playerDoc.data();

  if (!playerData) {
    throw new Error(`Player ${playerId} not found in league ${leagueId}`);
  }

  // Build player object with personality
  const player: PlayerData = {
    id: playerId,
    name: playerData['name'] || 'Unknown Player',
    position: playerData['position'] || 'WR',
    age: playerData['age'] || 25,
    overall: playerData['overall'] || 75,
    yearsExp: playerData['yearsExp'] || 3,
    nflTeam: playerData['nflTeam'] || 'FA',
    expectedAPY: calculateExpectedAPY(playerData['overall'] || 75, playerData['position'] || 'WR'),
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
            count: teamData?.['roster']?.filter((p: { position: string }) => p.position === player.position)?.length || 0,
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
        submittedAt: bidData['submittedAt']?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    })
  );

  // Build LLM input
  const llmInput: LLMInput = {
    weekContext: {
      weekNumber,
      phase: weekNumber <= 4 ? 'FA_WEEK' : 'OPEN_FA',
      seasonStage: weekNumber <= 2 ? 'EarlyFA' : weekNumber <= 4 ? 'MidFA' : 'Camp',
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

  console.log(`[FA-LLM] Calling OpenAI for player ${player.name} with ${bids.length} bids`);

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

  console.log(`[FA-LLM] Received response for player ${player.name}`);

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

  console.log(`[FA-LLM] Processing ${decisions.length} decisions for league ${leagueId}, week ${weekNumber}`);

  for (const decision of decisions) {
    try {
      console.log(`[FA-LLM] Processing decision for player ${decision.playerId}:`, {
        acceptedBidId: decision.decision.acceptedBidId,
        shortlistedCount: decision.decision.shortlistedBidIds.length,
        rejectedCount: decision.decision.rejectedBidIds.length,
      });

      // Update accepted bid
      if (decision.decision.acceptedBidId) {
        const bidRef = db.collection('faBids').doc(decision.decision.acceptedBidId);
        const acceptedBidAnalysis = decision.bidAnalysis.find((b) => b.bidId === decision.decision.acceptedBidId);
        const acceptedTeamId = acceptedBidAnalysis?.teamId || '';
        
        batch.update(bidRef, {
          status: 'accepted',
          evaluatedAt: new Date(),
          feedback: decision.feedback.publicStatement,
          teamMessage: decision.feedback.teamMessages[acceptedTeamId] || decision.feedback.publicStatement,
        });
        updated++;
        console.log(`[FA-LLM] Updated bid ${decision.decision.acceptedBidId} to accepted`);

        // Update player status (players are stored in leagues/{leagueId}/players subcollection)
        const playerRef = db.collection('leagues').doc(leagueId).collection('players').doc(String(decision.playerId));
        const playerDoc = await playerRef.get();
        if (playerDoc.exists) {
          batch.update(playerRef, {
            status: 'signed',
            signedTeamId: decision.bidAnalysis.find((b) => b.bidId === decision.decision.acceptedBidId)?.teamId,
            lastUpdated: new Date(),
          });
        } else {
          console.warn(`[FA-LLM] Player document not found: ${decision.playerId} in league ${leagueId}`);
        }
      }

      // Update shortlisted bids
      for (const bidId of decision.decision.shortlistedBidIds) {
        const bidRef = db.collection('faBids').doc(bidId);
        const bidAnalysis = decision.bidAnalysis.find((b) => b.bidId === bidId);
        const teamId = bidAnalysis?.teamId || '';
        batch.update(bidRef, {
          status: 'shortlisted',
          evaluatedAt: new Date(),
          feedback: decision.feedback.publicStatement,
          teamMessage: decision.feedback.teamMessages[teamId] || 'Considering your offer...',
        });
        updated++;
        console.log(`[FA-LLM] Updated bid ${bidId} to shortlisted`);
      }

      // Update rejected bids
      for (const bidId of decision.decision.rejectedBidIds) {
        const bidRef = db.collection('faBids').doc(bidId);
        const bidAnalysis = decision.bidAnalysis.find((b) => b.bidId === bidId);
        const teamId = bidAnalysis?.teamId || '';
        batch.update(bidRef, {
          status: 'rejected',
          evaluatedAt: new Date(),
          feedback: decision.feedback.publicStatement,
          teamMessage: decision.feedback.teamMessages[teamId] || 'Offer did not meet expectations.',
          isLowball: bidAnalysis?.isLowball || false,
        });
        updated++;
        console.log(`[FA-LLM] Updated bid ${bidId} to rejected`);
      }

      // Save social media post if present
      if (decision.feedback.socialMediaPost) {
        const playerDoc = await db.collection('leagues').doc(leagueId).collection('players').doc(String(decision.playerId)).get();
        const playerData = playerDoc.data();
        
        const socialMediaRef = db.collection('leagues').doc(leagueId).collection('socialMediaPosts').doc();
        batch.set(socialMediaRef, {
          playerId: String(decision.playerId),
          playerName: decision.playerName || playerData?.['name'] || 'Unknown Player',
          position: playerData?.['position'] || '',
          post: decision.feedback.socialMediaPost,
          postedAt: new Date(),
          weekNumber,
          context: 'free-agency',
        });
        console.log(`[FA-LLM] Saved social media post for player ${decision.playerId}`);
      }

      // Update trust history for lowball offers
      for (const [teamId, impact] of Object.entries(decision.trustImpacts)) {
        if (impact.change < 0) {
          const trustRef = db.collection('teamTrust').doc(`${leagueId}_${teamId}`);
          batch.set(
            trustRef,
            {
              leagueId,
              teamId,
              currentTrust: impact.newTotal,
              lowballCount: (await trustRef.get()).data()?.['lowballCount'] || 0 + 1,
              lastLowballSeason: new Date().getFullYear(),
              updatedAt: new Date(),
            },
            { merge: true }
          );
        }
      }
    } catch (error) {
      errors.push(`Error processing decision for player ${decision.playerId}: ${error}`);
    }
  }

  try {
    console.log(`[FA-LLM] Committing batch with ${updated} updates...`);
    await batch.commit();
    console.log(`[FA-LLM] Batch committed successfully. Updated ${updated} bids.`);
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
          baseSalary: { '2024': Math.round(expectedAPY * 0.9), '2025': Math.round(expectedAPY * 1.0), '2026': Math.round(expectedAPY * 1.1) },
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
          baseSalary: { '2024': Math.round(expectedAPY * 0.8), '2025': Math.round(expectedAPY * 0.9) },
          signingBonus: Math.round(expectedAPY * 0.4),
          guarantees: [{ type: 'full', amount: Math.round(expectedAPY * 1.1), year: 2024 }],
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
        teamInfo: { marketSize: 'large', climate: 'cold', isContender: true, isStable: true, taxRate: 0.08, currentRoster: { position: 'WR', count: 2, hasStarter: false } },
        offer: { years: 3, baseSalary: { '2024': Math.round(expectedAPY * 1.0), '2025': Math.round(expectedAPY * 1.1), '2026': Math.round(expectedAPY * 1.2) }, signingBonus: Math.round(expectedAPY * 0.7), guarantees: [{ type: 'full', amount: Math.round(expectedAPY * 2.0), year: 2024 }], totalValue: Math.round(expectedAPY * 4.0), apy: Math.round(expectedAPY * 1.3) },
        submittedAt: timestamp,
      },
      {
        id: 'bid_test_2',
        teamId: 'team_2',
        teamName: 'Team Beta',
        teamInfo: { marketSize: 'medium', climate: 'warm', isContender: true, isStable: true, taxRate: 0, currentRoster: { position: 'WR', count: 2, hasStarter: false } },
        offer: { years: 4, baseSalary: { '2024': Math.round(expectedAPY * 0.95), '2025': Math.round(expectedAPY * 1.0), '2026': Math.round(expectedAPY * 1.05), '2027': Math.round(expectedAPY * 1.1) }, signingBonus: Math.round(expectedAPY * 0.8), guarantees: [{ type: 'full', amount: Math.round(expectedAPY * 2.5), year: 2024 }], totalValue: Math.round(expectedAPY * 4.9), apy: Math.round(expectedAPY * 1.22) },
        submittedAt: timestamp,
      },
      {
        id: 'bid_test_3',
        teamId: 'team_3',
        teamName: 'Team Gamma',
        teamInfo: { marketSize: 'large', climate: 'warm', isContender: false, isStable: true, taxRate: 0, currentRoster: { position: 'WR', count: 1, hasStarter: false } },
        offer: { years: 3, baseSalary: { '2024': Math.round(expectedAPY * 1.05), '2025': Math.round(expectedAPY * 1.1), '2026': Math.round(expectedAPY * 1.15) }, signingBonus: Math.round(expectedAPY * 0.5), guarantees: [{ type: 'full', amount: Math.round(expectedAPY * 1.8), year: 2024 }], totalValue: Math.round(expectedAPY * 3.8), apy: Math.round(expectedAPY * 1.27) },
        submittedAt: timestamp,
      },
    ],
    all_lowball: [
      {
        id: 'bid_test_1',
        teamId: 'team_1',
        teamName: 'Team Alpha',
        teamInfo: { marketSize: 'large', climate: 'cold', isContender: true, isStable: true, taxRate: 0.08, currentRoster: { position: 'WR', count: 2, hasStarter: false } },
        offer: { years: 2, baseSalary: { '2024': Math.round(expectedAPY * 0.4), '2025': Math.round(expectedAPY * 0.45) }, signingBonus: Math.round(expectedAPY * 0.1), guarantees: [], totalValue: Math.round(expectedAPY * 0.95), apy: Math.round(expectedAPY * 0.48) },
        submittedAt: timestamp,
      },
      {
        id: 'bid_test_2',
        teamId: 'team_2',
        teamName: 'Team Beta',
        teamInfo: { marketSize: 'medium', climate: 'warm', isContender: false, isStable: true, taxRate: 0, currentRoster: { position: 'WR', count: 2, hasStarter: false } },
        offer: { years: 1, baseSalary: { '2024': Math.round(expectedAPY * 0.35) }, signingBonus: Math.round(expectedAPY * 0.05), guarantees: [], totalValue: Math.round(expectedAPY * 0.4), apy: Math.round(expectedAPY * 0.4) },
        submittedAt: timestamp,
      },
    ],
    single_bid: [
      {
        id: 'bid_test_1',
        teamId: 'team_1',
        teamName: 'Team Alpha',
        teamInfo: { marketSize: 'large', climate: 'cold', isContender: true, isStable: true, taxRate: 0.08, currentRoster: { position: 'WR', count: 2, hasStarter: false } },
        offer: { years: 3, baseSalary: { '2024': Math.round(expectedAPY * 0.95), '2025': Math.round(expectedAPY * 1.0), '2026': Math.round(expectedAPY * 1.05) }, signingBonus: Math.round(expectedAPY * 0.5), guarantees: [{ type: 'full', amount: Math.round(expectedAPY * 1.5), year: 2024 }], totalValue: Math.round(expectedAPY * 3.5), apy: Math.round(expectedAPY * 1.17) },
        submittedAt: timestamp,
      },
    ],
    starter_conflict: [
      {
        id: 'bid_test_1',
        teamId: 'team_1',
        teamName: 'Team Alpha (HAS STARTER)',
        teamInfo: { marketSize: 'large', climate: 'cold', isContender: true, isStable: true, taxRate: 0.08, currentRoster: { position: 'WR', count: 3, hasStarter: true } },
        offer: { years: 3, baseSalary: { '2024': Math.round(expectedAPY * 1.1), '2025': Math.round(expectedAPY * 1.2), '2026': Math.round(expectedAPY * 1.3) }, signingBonus: Math.round(expectedAPY * 0.8), guarantees: [{ type: 'full', amount: Math.round(expectedAPY * 2.2), year: 2024 }], totalValue: Math.round(expectedAPY * 4.4), apy: Math.round(expectedAPY * 1.47) },
        submittedAt: timestamp,
      },
      {
        id: 'bid_test_2',
        teamId: 'team_2',
        teamName: 'Team Beta (No Starter)',
        teamInfo: { marketSize: 'medium', climate: 'warm', isContender: false, isStable: true, taxRate: 0, currentRoster: { position: 'WR', count: 1, hasStarter: false } },
        offer: { years: 3, baseSalary: { '2024': Math.round(expectedAPY * 0.9), '2025': Math.round(expectedAPY * 0.95), '2026': Math.round(expectedAPY * 1.0) }, signingBonus: Math.round(expectedAPY * 0.4), guarantees: [{ type: 'full', amount: Math.round(expectedAPY * 1.3), year: 2024 }], totalValue: Math.round(expectedAPY * 3.25), apy: Math.round(expectedAPY * 1.08) },
        submittedAt: timestamp,
      },
    ],
    trust_issues: [
      {
        id: 'bid_test_1',
        teamId: 'team_1',
        teamName: 'Team Alpha (BAD TRUST)',
        teamInfo: { marketSize: 'large', climate: 'cold', isContender: true, isStable: true, taxRate: 0.08, currentRoster: { position: 'WR', count: 2, hasStarter: false } },
        offer: { years: 3, baseSalary: { '2024': Math.round(expectedAPY * 1.15), '2025': Math.round(expectedAPY * 1.25), '2026': Math.round(expectedAPY * 1.35) }, signingBonus: Math.round(expectedAPY * 0.9), guarantees: [{ type: 'full', amount: Math.round(expectedAPY * 2.5), year: 2024 }], totalValue: Math.round(expectedAPY * 4.65), apy: Math.round(expectedAPY * 1.55) },
        submittedAt: timestamp,
      },
      {
        id: 'bid_test_2',
        teamId: 'team_2',
        teamName: 'Team Beta (Good Trust)',
        teamInfo: { marketSize: 'medium', climate: 'warm', isContender: false, isStable: true, taxRate: 0, currentRoster: { position: 'WR', count: 2, hasStarter: false } },
        offer: { years: 3, baseSalary: { '2024': Math.round(expectedAPY * 0.85), '2025': Math.round(expectedAPY * 0.9), '2026': Math.round(expectedAPY * 0.95) }, signingBonus: Math.round(expectedAPY * 0.3), guarantees: [{ type: 'full', amount: Math.round(expectedAPY * 1.1), year: 2024 }], totalValue: Math.round(expectedAPY * 3.0), apy: Math.round(expectedAPY * 1.0) },
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
    const apiKey = openaiApiKey.value() || process.env['OPENAI_API_KEY'];
    const organization = openaiOrg.value() || process.env['OPENAI_ORG'];

    // Debug logging
    console.log('[FA-LLM-TEST] API Key found:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NONE');

    if (!apiKey) {
      throw new HttpsError(
        'failed-precondition',
        'OPENAI_API_KEY not configured. Set it via Firebase Secret Manager or .secret.local file.'
      );
    }

    const openai = new OpenAI({ apiKey, organization: organization || undefined });

    // Extract parameters from request
    const weekNumber = request.data.weekNumber || 2;
    const personalityType = request.data.personalityType || 'money_motivated';
    const playerOverall = request.data.playerOverall || 88;
    const bidScenario = request.data.bidScenario || 'mixed';

    const expectedAPY = playerOverall * 200000; // $200k per overall point for WR
    const personality = getPersonalityPreset(personalityType);
    const bids = generateBids(bidScenario, expectedAPY);
    const trustHistory = getTrustHistory(bidScenario);

    console.log(`[FA-LLM-TEST] Week: ${weekNumber}, Personality: ${personalityType}, Overall: ${playerOverall}, Scenario: ${bidScenario}`);

    const testInput: LLMInput = {
      weekContext: {
        weekNumber,
        phase: 'FA_WEEK',
        seasonStage: weekNumber <= 2 ? 'EarlyFA' : weekNumber <= 4 ? 'MidFA' : 'Camp',
      },
      leagueContext: {
        leagueId: 'test_league',
        leagueName: 'Test Dynasty League',
        salaryCap: 200000000,
        numberOfTeams: 12,
        rosterRequirements: { QB: 1, RB: 2, WR: 3, TE: 1, K: 1, DEF: 1 },
        maxRosterSize: 26,
        teams: [
          { teamId: 'team_1', teamName: 'Team Alpha', capSpaceAvailable: 45000000, rosterCount: 22 },
          { teamId: 'team_2', teamName: 'Team Beta', capSpaceAvailable: 28000000, rosterCount: 24 },
          { teamId: 'team_3', teamName: 'Team Gamma', capSpaceAvailable: 62000000, rosterCount: 20 },
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
        seasonStage: weekNumber <= 2 ? 'EarlyFA' : weekNumber <= 4 ? 'MidFA' : 'Camp',
        positionalDemand: { QB: 0.6, RB: 0.5, WR: 0.7, TE: 0.4, K: 0.2, DEF: 0.3 },
        marketTrends: {
          overall: 'stable',
          byPosition: { QB: 'stable', RB: 'falling', WR: 'rising', TE: 'stable' },
        },
        recentSignings: [
          { playerName: "Ja'Marr Chase", position: 'WR', apy: 28000000, overall: 96 },
          { playerName: 'CeeDee Lamb', position: 'WR', apy: 26500000, overall: 94 },
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

