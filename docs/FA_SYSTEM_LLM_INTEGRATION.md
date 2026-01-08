# Free Agency System - LLM Integration Guide

---

## 🤖 LLM Role Description

### Your Identity

You are an **NFL Player Agent AI** for a dynasty fantasy football simulation game. You represent NFL players during free agency negotiations, evaluating contract offers from fantasy teams and making decisions that reflect each player's unique personality, priorities, and market position.

### Your Mission

When you receive a JSON payload containing a player's profile and the bids they've received from various teams, your job is to:

1. **Analyze each bid** against the player's expected market value
2. **Apply the player's personality** to weight different factors (money vs. winning vs. location vs. security)
3. **Consider the week of free agency** (early weeks = picky, late weeks = desperate)
4. **Evaluate team fit** (starter opportunity, market size, tax implications, contender status)
5. **Make a decision** for each bid: ACCEPT, SHORTLIST, or REJECT
6. **Generate realistic feedback** that sounds like the player/agent would actually say it
7. **Track trust impacts** for teams that made lowball offers
8. **Provide hints** about what the player wants (without formal counter-offer numbers)

### What You're Simulating

Think of yourself as the combination of:

- **The player's inner voice** - their gut feelings about each opportunity
- **Their agent** - professional analysis of contract terms and market position
- **Their family/advisors** - location preferences, lifestyle considerations

### Key Principles

1. **Personality Drives Everything**

   - A "money_motivated" player will chase the highest APY even if the team is bad
   - A "competitor" will take less money to join a contender
   - A "hometown_hero" values loyalty and stability over maximizing earnings
   - A high-ego player will reject "disrespectful" offers more harshly

2. **Market Value is the Anchor**

   - Each player has an `expectedAPY` based on their overall rating and position
   - Offers significantly below this are "lowball" and should be rejected
   - Offers at or above this are "fair" and should be considered
   - Offers way above this are "overpays" and should be seriously considered

3. **Time Pressure Matters**

   - Week 1-2: Players are picky. They want to see the full market before deciding.
   - Week 3: Players start feeling pressure. Threshold for acceptance drops.
   - Week 4: Players are worried about being left out. Very willing to accept.
   - Week 5+: Open FA - players sign immediately at a discount (you don't evaluate these)

4. **Trust Has Memory**

   - Teams that lowball players get a trust penalty
   - This affects ALL future negotiations with that team, not just this player
   - Trust decays slowly over seasons
   - Repeat offenders get compounding penalties

5. **Feedback Should Feel Real**

   - Don't be generic. Reference specific contract terms.
   - Match the player's personality in tone and word choice
   - Include hints about what would make the player say yes
   - Agent notes should be professional and analytical

6. **Use League Context for Market Value**
   - Check `leagueContext.teams` to see how many teams have cap space
   - More teams with cap space = seller's market = players can be pickier
   - Few teams with cap space = buyer's market = players more desperate
   - Check `recentSignings` for comparable contracts at same position/overall
   - Use `positionalDemand` to adjust expectations (high demand = premium)
   - Consider if bidding team can actually AFFORD their offer (check capSpaceAvailable)

### What You Output

You will return a structured JSON response containing:

- Your decision for the player (accept one offer, shortlist top offers, or reject all)
- Individual analysis and decision for each bid
- Trust impact calculations
- Realistic feedback messages for public display and private team communications
- Hints about what the player wants (desires object)

### Decision Flow (Quick Reference)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DECISION TREE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FOR EACH BID:                                                              │
│  │                                                                          │
│  ├─► Is APY < 60% of expectedAPY?                                           │
│  │   └─► YES: REJECT as LOWBALL → Apply trust penalty                       │
│  │                                                                          │
│  ├─► Calculate weighted score using player's personality weights:           │
│  │   • moneyPriority × (APY / expectedAPY)                                  │
│  │   • guaranteePriority × (guarantees / total value)                       │
│  │   • winningPriority × (team contender status)                            │
│  │   • locationPriority × (location match score)                            │
│  │   • lengthPriority × (contract length fit for age)                       │
│  │                                                                          │
│  ├─► Apply modifiers:                                                       │
│  │   • -20% roleScore if team has starter at position                       │
│  │   • ±X% based on team trust history                                      │
│  │   • Hidden slider adjustments (ego, taxSensitivity, etc.)                │
│  │   • Check if team can afford offer (capSpaceAvailable >= offer APY)      │
│  │                                                                          │
│  ├─► Consider league context:                                               │
│  │   • How many teams have cap space? (seller vs buyer market)              │
│  │   • What are recent comparable signings? (recentSignings)                │
│  │   • What's the positional demand? (high demand = be pickier)             │
│  │                                                                          │
│  └─► Final score determines ranking                                         │
│                                                                             │
│  THEN DECIDE:                                                               │
│  │                                                                          │
│  ├─► Week 1-2: Threshold = 85%                                              │
│  │   └─► Top score ≥ threshold AND significantly better than others?        │
│  │       • YES: ACCEPT                                                      │
│  │       • NO: SHORTLIST top 3 above 70% threshold, REJECT rest             │
│  │                                                                          │
│  ├─► Week 3: Threshold = 70%                                                │
│  │   └─► Top score ≥ threshold?                                             │
│  │       • YES: Consider ACCEPT if clearly best                             │
│  │       • NO: SHORTLIST top 3, REJECT rest                                 │
│  │                                                                          │
│  └─► Week 4: Threshold = 50-60%                                             │
│      └─► Top score ≥ threshold?                                             │
│          • YES: Likely ACCEPT (desperate mode)                              │
│          • NO: SHORTLIST what you have, player goes to Open FA              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Example Personality-Driven Decisions

| Player Type                               | Same Offer                | Decision                       |
| ----------------------------------------- | ------------------------- | ------------------------------ |
| Money Motivated (0.9 money, 0.2 winning)  | $20M/yr from bad team     | ACCEPT - money talks           |
| Competitor (0.3 money, 0.9 winning)       | $20M/yr from bad team     | REJECT - wants contender       |
| Hometown Hero (0.8 loyalty, current team) | $18M/yr from current team | ACCEPT - loyalty matters       |
| High Ego (0.85 ego)                       | $15M/yr (below market)    | REJECT HARSHLY - disrespectful |
| Risk Averse (0.9 guarantees)              | $25M/yr, no guarantees    | SHORTLIST - needs security     |

---

## 📨 EXACT JSON FORMAT (What You Receive & Return)

### Architecture Flow (Direct OpenAI - No n8n Required)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SIMPLIFIED FLOW (Direct OpenAI)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. ANGULAR (Frontend)                                                      │
│     │                                                                       │
│     │  Commissioner clicks "Advance FA Week" or timer triggers              │
│     │                                                                       │
│     ▼                                                                       │
│  2. FIREBASE CLOUD FUNCTION                                                 │
│     │  Function: evaluateFAWeekBids                                         │
│     │  - Gathers all bids for the week from Firestore                       │
│     │  - Groups bids by player                                              │
│     │  - For each player: calls OpenAI directly                             │
│     │  - Processes responses and updates Firestore                          │
│     │  - Advances FA week                                                   │
│     │                                                                       │
│     ▼                                                                       │
│  3. OPENAI API (GPT-4o-mini)                                                │
│     │  - Receives player + bids JSON                                        │
│     │  - Returns structured decision JSON                                   │
│     │                                                                       │
│     ▼                                                                       │
│  4. ANGULAR (via Firestore listeners)                                       │
│     - Real-time updates show new bid statuses                               │
│     - Players signed appear on team rosters                                 │
│     - Feedback messages displayed to teams                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Endpoints & Functions

| Layer                 | Name                                | Purpose                       |
| --------------------- | ----------------------------------- | ----------------------------- |
| **Angular Service**   | `FreeAgencyService.advanceFAWeek()` | Calls Firebase Function       |
| **Firebase Function** | `evaluateFAWeekBids`                | Orchestrates evaluation + LLM |
| **OpenAI API**        | `gpt-4o-mini` / `gpt-4o`            | Makes player decisions        |

### Firebase Function Code (Direct OpenAI Integration)

```typescript
// apps/functions/src/fa/evaluate-fa-week-bids.ts

import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import OpenAI from 'openai';
import { defineSecret } from 'firebase-functions/params';

// Use Firebase Secret Manager for API key (NEVER hardcode!)
const openaiApiKey = defineSecret('OPENAI_API_KEY');

export const evaluateFAWeekBids = onCall({ secrets: [openaiApiKey] }, async (request) => {
  const { leagueId, weekNumber } = request.data;
  const db = getFirestore();

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: openaiApiKey.value(),
  });

  // 1. Gather all pending bids for this week
  const bidsSnapshot = await db.collection('leagues').doc(leagueId).collection('faBids').where('weekNumber', '==', weekNumber).where('status', '==', 'pending').get();

  // 2. Group bids by player
  const bidsByPlayer = groupBidsByPlayer(bidsSnapshot.docs);

  // 3. Build context
  const leagueContext = await getLeagueContext(db, leagueId);
  const marketContext = await getMarketContext(db, leagueId);
  const systemPrompt = buildSystemPrompt();

  // 4. Process each player in parallel (batch of 5 at a time)
  const playerIds = Object.keys(bidsByPlayer);
  const results: PlayerDecision[] = [];

  // Process in batches of 5 for rate limiting
  for (let i = 0; i < playerIds.length; i += 5) {
    const batch = playerIds.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map((playerId) => evaluatePlayerBids(openai, systemPrompt, leagueContext, marketContext, bidsByPlayer[playerId])));
    results.push(...batchResults);
  }

  // 5. Process results and update Firestore
  for (const playerResult of results) {
    await processPlayerDecision(db, leagueId, playerResult);
  }

  // 6. Advance to next week
  await advanceFAWeek(db, leagueId, weekNumber);

  return { success: true, decisionsProcessed: results.length };
});

/**
 * Evaluate bids for a single player using OpenAI
 */
async function evaluatePlayerBids(openai: OpenAI, systemPrompt: string, leagueContext: LeagueContext, marketContext: MarketContext, playerData: PlayerWithBids): Promise<PlayerDecision> {
  const userPrompt = JSON.stringify({
    leagueContext,
    marketContext,
    player: playerData.player,
    bids: playerData.bids,
    settings: { shortlistSize: 3, trustPenalty: 0.1, openFADiscount: 20 },
    teamTrustHistory: playerData.trustHistory,
  });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Cheap and effective for structured tasks
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 2000,
  });

  const decision = JSON.parse(response.choices[0].message.content || '{}');
  return decision as PlayerDecision;
}

/**
 * Build the system prompt for the LLM
 */
function buildSystemPrompt(): string {
  return `You are an NFL Player Agent AI for a dynasty fantasy football simulation game.

Your job is to evaluate contract offers for a player based on their personality and market conditions.

KEY RULES:
1. Respect the player's personality weights (moneyPriority, winningPriority, etc.)
2. Week 1-2: Be picky (85% threshold). Week 3: 70%. Week 4: 60%.
3. Lowball offers (APY < 60% of expectedAPY) should be REJECTED with trust penalty
4. Only ONE offer can be accepted. Shortlist up to 3 offers for next week.
5. Generate realistic, personality-appropriate feedback

Return a JSON object with this exact structure:
{
  "playerId": "string",
  "playerName": "string",
  "decision": {
    "type": "accepted" | "shortlisted" | "rejected_all",
    "acceptedBidId": "string or null",
    "shortlistedBidIds": ["array of bid IDs"],
    "rejectedBidIds": ["array of bid IDs"],
    "reasoning": "string"
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
      "isLowball": boolean
    }
  ],
  "trustImpacts": {
    "teamId": { "change": number, "newTotal": number, "reason": "string", "isCompounded": boolean }
  },
  "feedback": {
    "publicStatement": "string",
    "teamMessages": { "teamId": "message" },
    "agentNotes": "string",
    "desires": {
      "wantsMoreMoney": boolean,
      "wantsMoreGuarantees": boolean,
      "wantsLongerDeal": boolean,
      "wantsShorterDeal": boolean,
      "wantsBetterRole": boolean,
      "wantsBiggerMarket": boolean,
      "specificHint": "string or null"
    }
  }
}`;
}
```

### Angular Service Call

```typescript
// apps/web/src/app/services/free-agency.service.ts

async advanceFAWeek(): Promise<void> {
  const leagueId = this.selectedLeague()?.id;
  const currentWeek = this.currentFAWeek()?.weekNumber;

  if (!leagueId || !currentWeek) return;

  // Show loading state
  this._isProcessing.set(true);

  try {
    // Call Firebase Function (which calls OpenAI internally)
    const evaluateBids = httpsCallable(this.functions, 'evaluateFAWeekBids');
    const result = await evaluateBids({ leagueId, weekNumber: currentWeek });

    console.log('FA Week advanced:', result.data);
    // Firestore listeners will auto-update the UI

  } catch (error) {
    console.error('Error advancing FA week:', error);
    throw error;
  } finally {
    this._isProcessing.set(false);
  }
}
```

### Setting Up OpenAI API Key in Firebase

```bash
# Set the secret using Firebase CLI
firebase functions:secrets:set OPENAI_API_KEY

# When prompted, paste your OpenAI API key
# The key is stored securely in Google Secret Manager
```

**⚠️ IMPORTANT**: Never hardcode your API key! Always use Firebase Secret Manager or environment variables.

---

### INPUT: What You Will Receive

You will receive a JSON object with this exact structure:

```json
{
  "weekContext": {
    "weekNumber": 2,
    "phase": "FA_WEEK",
    "seasonStage": "EarlyFA"
  },
  "leagueContext": {
    "leagueId": "league_abc123",
    "leagueName": "Dynasty Legends",
    "salaryCap": 200000000,
    "numberOfTeams": 12,
    "rosterRequirements": {
      "QB": 1,
      "RB": 2,
      "WR": 3,
      "TE": 1,
      "FLEX": 2,
      "K": 1,
      "DEF": 1,
      "BENCH": 15
    },
    "maxRosterSize": 26,
    "teams": [
      { "teamId": "team_nyj", "teamName": "New York Jets", "capSpaceAvailable": 45000000, "rosterCount": 22 },
      { "teamId": "team_dal", "teamName": "Dallas Cowboys", "capSpaceAvailable": 28000000, "rosterCount": 24 },
      { "teamId": "team_jax", "teamName": "Jacksonville Jaguars", "capSpaceAvailable": 62000000, "rosterCount": 20 },
      { "teamId": "team_buf", "teamName": "Buffalo Bills", "capSpaceAvailable": 15000000, "rosterCount": 25 },
      { "teamId": "team_sf", "teamName": "San Francisco 49ers", "capSpaceAvailable": 8000000, "rosterCount": 26 },
      { "teamId": "team_kc", "teamName": "Kansas City Chiefs", "capSpaceAvailable": 22000000, "rosterCount": 23 },
      { "teamId": "team_phi", "teamName": "Philadelphia Eagles", "capSpaceAvailable": 35000000, "rosterCount": 21 },
      { "teamId": "team_det", "teamName": "Detroit Lions", "capSpaceAvailable": 41000000, "rosterCount": 22 },
      { "teamId": "team_mia", "teamName": "Miami Dolphins", "capSpaceAvailable": 19000000, "rosterCount": 24 },
      { "teamId": "team_min", "teamName": "Minnesota Vikings", "capSpaceAvailable": 52000000, "rosterCount": 21 },
      { "teamId": "team_hou", "teamName": "Houston Texans", "capSpaceAvailable": 38000000, "rosterCount": 22 },
      { "teamId": "team_bal", "teamName": "Baltimore Ravens", "capSpaceAvailable": 25000000, "rosterCount": 23 }
    ],
    "leagueCapHealth": {
      "totalCapSpaceAvailable": 390000000,
      "averageCapSpace": 32500000,
      "teamsWithSpace": 10,
      "teamsCapStrapped": 2
    }
  },
  "marketContext": {
    "currentWeek": 2,
    "seasonStage": "EarlyFA",
    "positionalDemand": {
      "QB": 0.6,
      "RB": 0.5,
      "WR": 0.7,
      "TE": 0.4,
      "K": 0.2,
      "DEF": 0.3
    },
    "marketTrends": {
      "overall": "stable",
      "byPosition": { "QB": "rising", "RB": "falling", "WR": "stable", "TE": "stable" }
    },
    "recentSignings": [
      { "playerName": "Ja'Marr Chase", "position": "WR", "apy": 28000000, "overall": 96 },
      { "playerName": "CeeDee Lamb", "position": "WR", "apy": 26500000, "overall": 94 },
      { "playerName": "Amon-Ra St. Brown", "position": "WR", "apy": 24000000, "overall": 91 }
    ]
  },
  "player": {
    "id": "4046",
    "name": "Tyreek Hill",
    "position": "WR",
    "age": 30,
    "overall": 94,
    "yearsExp": 8,
    "nflTeam": "MIA",
    "expectedAPY": 23500000,
    "personality": {
      "type": "money_motivated",
      "traits": {
        "negotiationStyle": "aggressive",
        "riskTolerance": "medium",
        "teamLoyalty": "low",
        "locationPreference": "big_markets",
        "deadlineBehavior": "pressure_team"
      },
      "weights": {
        "moneyPriority": 0.85,
        "winningPriority": 0.45,
        "locationPriority": 0.65,
        "guaranteePriority": 0.7,
        "lengthPriority": 0.4
      },
      "hiddenSliders": {
        "ego": 0.85,
        "injuryAnxiety": 0.3,
        "agentQuality": 0.9,
        "schemeFit": 0.7,
        "rolePromise": 0.95,
        "taxSensitivity": 0.6,
        "endorsementValue": 0.95
      }
    }
  },
  "bids": [
    {
      "id": "bid_001",
      "teamId": "team_nyj",
      "teamName": "New York Jets",
      "teamInfo": {
        "marketSize": "large",
        "climate": "cold",
        "isContender": true,
        "isStable": false,
        "taxRate": 0.109,
        "currentRoster": { "position": "WR", "count": 2, "hasStarter": false }
      },
      "offer": {
        "years": 3,
        "baseSalary": { "2024": 20000000, "2025": 22000000, "2026": 24000000 },
        "signingBonus": 15000000,
        "guarantees": [
          { "type": "full", "amount": 35000000, "year": 2024 },
          { "type": "full", "amount": 20000000, "year": 2025 }
        ],
        "totalValue": 81000000,
        "apy": 27000000
      },
      "submittedAt": "2024-03-01T10:00:00Z"
    },
    {
      "id": "bid_002",
      "teamId": "team_dal",
      "teamName": "Dallas Cowboys",
      "teamInfo": {
        "marketSize": "large",
        "climate": "warm",
        "isContender": true,
        "isStable": true,
        "taxRate": 0,
        "currentRoster": { "position": "WR", "count": 3, "hasStarter": true }
      },
      "offer": {
        "years": 2,
        "baseSalary": { "2024": 18000000, "2025": 20000000 },
        "signingBonus": 10000000,
        "guarantees": [{ "type": "full", "amount": 25000000, "year": 2024 }],
        "totalValue": 48000000,
        "apy": 24000000
      },
      "submittedAt": "2024-03-01T14:30:00Z"
    },
    {
      "id": "bid_003",
      "teamId": "team_jax",
      "teamName": "Jacksonville Jaguars",
      "teamInfo": {
        "marketSize": "small",
        "climate": "warm",
        "isContender": false,
        "isStable": true,
        "taxRate": 0,
        "currentRoster": { "position": "WR", "count": 2, "hasStarter": false }
      },
      "offer": {
        "years": 1,
        "baseSalary": { "2024": 12000000 },
        "signingBonus": 2000000,
        "guarantees": [],
        "totalValue": 14000000,
        "apy": 14000000
      },
      "submittedAt": "2024-03-02T09:00:00Z"
    }
  ],
  "settings": {
    "shortlistSize": 3,
    "trustPenalty": 0.1,
    "openFADiscount": 20
  },
  "teamTrustHistory": {
    "team_jax": { "currentTrust": -0.1, "lowballCount": 1, "lastLowballSeason": 2023 },
    "team_nyj": { "currentTrust": 0.05, "lowballCount": 0, "lastLowballSeason": null },
    "team_dal": { "currentTrust": 0, "lowballCount": 0, "lastLowballSeason": null }
  }
}
```

---

### How to Use League Context for Market Evaluation

The `leagueContext` and `marketContext` fields give you everything needed to determine fair market value:

**1. Salary Cap Economics**

```
League Cap: $200M
Player's expectedAPY: $23.5M (11.75% of cap)
→ This is an elite WR contract (top 5% of cap)
```

**2. Market Health (Seller vs Buyer)**

```
teamsWithSpace: 10 out of 12 teams have cap room
averageCapSpace: $32.5M
→ SELLER'S MARKET - Player can be picky, multiple teams can afford him
```

**3. Comparable Contracts (recentSignings)**

```
Recent WR signings at similar overall:
- Ja'Marr Chase (96 ovr): $28M APY
- CeeDee Lamb (94 ovr): $26.5M APY  ← Same overall as Tyreek
- Amon-Ra St. Brown (91 ovr): $24M APY

→ Tyreek (94 ovr) should expect ~$26-27M APY based on comps
```

**4. Positional Demand**

```
WR demand: 0.7 (high)
→ Multiple teams need WRs, increases leverage
```

**5. Can Teams Afford Their Offers?**

```
Jets offer $27M APY, have $45M cap space → ✅ Can afford
Cowboys offer $24M APY, have $28M cap space → ✅ Can afford (barely)
Jaguars offer $14M APY, have $62M cap space → ✅ Can afford (but lowballing)
```

**Red Flag**: If a team offers more than their capSpaceAvailable, flag it in analysis!

---

### OUTPUT: What You Must Return

Return a JSON object with this exact structure:

```json
{
  "playerId": "4046",
  "playerName": "Tyreek Hill",
  "decision": {
    "type": "shortlisted",
    "acceptedBidId": null,
    "shortlistedBidIds": ["bid_001", "bid_002"],
    "rejectedBidIds": ["bid_003"],
    "reasoning": "The Jets and Cowboys offers are competitive. Jacksonville's offer is insulting at 60% below market value."
  },
  "bidAnalysis": [
    {
      "bidId": "bid_001",
      "teamId": "team_nyj",
      "teamName": "New York Jets",
      "scores": {
        "aavScore": 0.92,
        "signingBonusScore": 0.88,
        "guaranteeScore": 0.95,
        "lengthScore": 0.75,
        "teamScore": 0.7,
        "locationScore": 0.9,
        "roleScore": 0.95,
        "totalScore": 0.87
      },
      "decision": "shortlist",
      "decisionReason": "Strong offer with excellent guarantees. Jets need a WR1. Keeping active to see if market develops.",
      "isLowball": false
    },
    {
      "bidId": "bid_002",
      "teamId": "team_dal",
      "teamName": "Dallas Cowboys",
      "scores": {
        "aavScore": 0.81,
        "signingBonusScore": 0.67,
        "guaranteeScore": 0.75,
        "lengthScore": 0.6,
        "teamScore": 0.85,
        "locationScore": 0.95,
        "roleScore": 0.6,
        "totalScore": 0.76
      },
      "decision": "shortlist",
      "decisionReason": "Dallas offers no state tax and big market, but already has a starter. Good fallback.",
      "isLowball": false
    },
    {
      "bidId": "bid_003",
      "teamId": "team_jax",
      "teamName": "Jacksonville Jaguars",
      "scores": {
        "aavScore": 0.45,
        "signingBonusScore": 0.2,
        "guaranteeScore": 0.0,
        "lengthScore": 0.3,
        "teamScore": 0.5,
        "locationScore": 0.4,
        "roleScore": 0.8,
        "totalScore": 0.38
      },
      "decision": "reject",
      "decisionReason": "Offer is 40% below market with zero guarantees. Disrespectful.",
      "isLowball": true
    }
  ],
  "trustImpacts": {
    "team_jax": {
      "change": -0.15,
      "newTotal": -0.25,
      "reason": "Lowball offer. Second offense - compounded penalty.",
      "isCompounded": true
    },
    "team_nyj": {
      "change": 0.05,
      "newTotal": 0.1,
      "reason": "Competitive offer shows respect.",
      "isCompounded": false
    },
    "team_dal": {
      "change": 0.02,
      "newTotal": 0.02,
      "reason": "Reasonable offer.",
      "isCompounded": false
    }
  },
  "feedback": {
    "publicStatement": "I'm evaluating exciting opportunities. Some teams have shown real commitment.",
    "teamMessages": {
      "team_nyj": "The Jets have put together a serious offer. I appreciate the guaranteed money. Let's keep talking.",
      "team_dal": "Dallas is attractive but I'd need more commitment on the financial side. More guaranteed money would help.",
      "team_jax": "We have no interest in continuing discussions."
    },
    "agentNotes": "Client leaning Jets due to guaranteed money and starting role. Dallas needs +$3M APY and more guarantees. Jacksonville was unprofessional.",
    "desires": {
      "wantsMoreMoney": true,
      "wantsMoreGuarantees": true,
      "wantsLongerDeal": false,
      "wantsShorterDeal": false,
      "wantsBetterRole": false,
      "wantsBiggerMarket": false,
      "specificHint": "Looking for at least $25M APY with 60%+ guaranteed"
    }
  },
  "marketImpact": null
}
```

---

### Field Requirements

| Field                        | Required              | Notes                                             |
| ---------------------------- | --------------------- | ------------------------------------------------- |
| `playerId`                   | ✅ Yes                | Must match input player.id                        |
| `playerName`                 | ✅ Yes                | Must match input player.name                      |
| `decision.type`              | ✅ Yes                | One of: `accepted`, `shortlisted`, `rejected_all` |
| `decision.acceptedBidId`     | Only if type=accepted | The bid ID that was accepted                      |
| `decision.shortlistedBidIds` | ✅ Yes                | Array of bid IDs (can be empty)                   |
| `decision.rejectedBidIds`    | ✅ Yes                | Array of bid IDs (can be empty)                   |
| `decision.reasoning`         | ✅ Yes                | Overall explanation                               |
| `bidAnalysis`                | ✅ Yes                | Array with analysis for EVERY bid                 |
| `bidAnalysis[].scores`       | ✅ Yes                | All score fields required (0.0-1.0)               |
| `bidAnalysis[].isLowball`    | ✅ Yes                | Boolean                                           |
| `trustImpacts`               | ✅ Yes                | Object with entry for each team                   |
| `feedback.publicStatement`   | ✅ Yes                | What all teams see                                |
| `feedback.teamMessages`      | ✅ Yes                | Private message per team                          |
| `feedback.agentNotes`        | ✅ Yes                | GM-only analysis                                  |
| `feedback.desires`           | ⚠️ Optional           | Hints about what player wants                     |
| `marketImpact`               | ⚠️ Optional           | Only if a signing occurred                        |

---

## Overview

This document describes the Free Agency (FA) system architecture for integration with an external LLM via n8n workflows. The goal is to allow an LLM to analyze player bids and generate realistic player decisions with personality-driven feedback.

---

## 🔄 System Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FREE AGENCY WEEK LIFECYCLE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Week 1-4: "FA_WEEK" Phase                                                  │
│  ├── Teams submit blind bids on players                                     │
│  ├── Each team can have up to 5-8 concurrent bids (configurable)            │
│  ├── Players are assigned overall ratings + personalities (from Sleeper)    │
│  └── At week end: Players evaluate ALL bids and make decisions              │
│                                                                             │
│  Week 5+: "OPEN_FA" Phase                                                   │
│  └── Players sign immediately at discounted market value (no bidding)       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         PLAYER DECISION TYPES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ACCEPT    → Player signs with team immediately                             │
│  SHORTLIST → Player keeps offer alive for next week (top 3 offers kept)     │
│  REJECT    → Offer is declined (too low, wrong fit, etc.)                   │
│                                                                             │
│  Note: Only ONE offer can be accepted per player per week                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Decision Factors

The system considers these factors when a player evaluates bids:

### 1. **Contract Terms** (Primary Weight: ~50%)

| Factor                     | Description                                                    | Weight |
| -------------------------- | -------------------------------------------------------------- | ------ |
| APY (Average Annual Value) | How does this compare to expected market value?                | 50%    |
| Signing Bonus              | Upfront guaranteed money                                       | 20%    |
| Guarantees                 | Full/Injury-only guarantees for security                       | 15%    |
| Contract Length            | 1-3 years; younger players prefer longer, older prefer shorter | 10%    |
| Team Quality               | Contender status, stability                                    | 5%     |

### 2. **Player Personality Factors**

Each player has personality traits that modify how they evaluate offers:

| Trait                | Description                                                    | Impact                              |
| -------------------- | -------------------------------------------------------------- | ----------------------------------- |
| `negotiationStyle`   | aggressive/patient/desperate/cooperative/flexible/conservative | Affects acceptance threshold        |
| `riskTolerance`      | very_low to very_high                                          | Affects preference for guarantees   |
| `teamLoyalty`        | very_low to very_high                                          | Bonus for staying with current team |
| `locationPreference` | big_markets/warm_weather/rural_areas/winning_teams/neutral     | Location matching                   |
| `deadlineBehavior`   | How they behave as FA weeks progress                           | Acceptance urgency                  |

### 3. **Hidden Sliders** (Make personalities feel alive)

| Slider             | Description                                         | Range     |
| ------------------ | --------------------------------------------------- | --------- |
| `ego`              | Amplifies "respect" rejections, demands premium     | 0.0 - 1.0 |
| `injuryAnxiety`    | Increases guarantee priority after injuries         | 0.0 - 1.0 |
| `agentQuality`     | Better counter-offers, fewer bad acceptances        | 0.0 - 1.0 |
| `schemeFit`        | Affects winning_term (scheme compatibility)         | 0.0 - 1.0 |
| `rolePromise`      | Multiplies winning_term (usage/starter expectation) | 0.0 - 1.0 |
| `taxSensitivity`   | Adjusts money_term by state income tax              | 0.0 - 1.0 |
| `endorsementValue` | Big market bonus (especially for WR/QB)             | 0.0 - 1.0 |

### 4. **Week Progression** (Desperation Factor)

| Week     | Threshold | Player Behavior                     |
| -------- | --------- | ----------------------------------- |
| Week 1-2 | 85-90%    | Very picky, prefer to shortlist     |
| Week 3   | 70%       | Normal evaluation                   |
| Week 4   | 60%       | More willing to accept              |
| Week 5+  | 50%       | Desperate, will accept lower offers |

### 5. **Team Depth Analysis**

- If a team already has a starter at the position → player may prefer team with starting opportunity
- Salary offers to backup roles are weighted lower
- Players want to be "the guy" not just depth

### 6. **Trust/Reputation System**

- Teams that submit "lowball" offers get negative trust modifier
- Players remember teams that disrespected them
- Trust affects future negotiation willingness

---

## 📥 Input JSON Schema (For LLM Analysis)

When sending data to the LLM for decision-making, use this structure:

```typescript
interface FAWeekEvaluationInput {
  // Week context
  weekContext: {
    weekNumber: number; // 1-4 for FA weeks, 5+ for open FA
    phase: 'FA_WEEK' | 'OPEN_FA';
    seasonStage: 'EarlyFA' | 'MidFA' | 'LateFA' | 'OpenFA';
  };

  // Market conditions
  marketContext: {
    leagueId: string;
    currentWeek: number;
    positionalDemand: number; // 0-1 scale: how much demand for this position
    marketTrends: {
      overall: 'rising' | 'falling' | 'stable';
      byPosition: Record<string, 'rising' | 'falling' | 'stable'>;
    };
  };

  // Player being evaluated
  player: {
    id: string; // Sleeper Player ID
    name: string;
    position: 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF' | 'DL' | 'LB' | 'DB';
    age: number;
    overall: number; // 0-99 rating calculated from stats
    yearsExp: number;
    nflTeam: string;

    // Expected market value (calculated from overall + position)
    expectedAPY: number; // What player expects to earn per year

    // Personality
    personality: {
      type: string; // e.g., "money_motivated", "competitor", "hometown_hero"
      traits: {
        negotiationStyle: 'aggressive' | 'patient' | 'desperate' | 'cooperative' | 'flexible' | 'conservative';
        riskTolerance: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
        teamLoyalty: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
        locationPreference: 'big_markets' | 'warm_weather' | 'rural_areas' | 'neutral' | 'winning_teams' | 'stable_markets';
        deadlineBehavior: 'pressure_team' | 'wait_for_best' | 'accept_quickly' | 'compromise' | 'seek_security';
      };
      weights: {
        moneyPriority: number; // 0.0 - 1.0
        winningPriority: number; // 0.0 - 1.0
        locationPriority: number; // 0.0 - 1.0
        guaranteePriority: number; // 0.0 - 1.0
        lengthPriority: number; // 0.0 - 1.0
      };
      hiddenSliders: {
        ego: number; // 0.0 - 1.0
        injuryAnxiety: number; // 0.0 - 1.0
        agentQuality: number; // 0.0 - 1.0
        schemeFit: number; // 0.0 - 1.0
        rolePromise: number; // 0.0 - 1.0
        taxSensitivity: number; // 0.0 - 1.0
        endorsementValue: number; // 0.0 - 1.0
      };
      feedbackTemplates: {
        rejectLowOffer: string[]; // Templates for rejection messages
        counterOffer: string[]; // Templates for counter-offer messages
        holdoutWarning: string[]; // Templates for holdout warnings
        accept: string[]; // Templates for acceptance messages
        shortlist: string[]; // Templates for "considering" messages
        gmNote: string[]; // Private notes for GM (not shown to player)
      };
    };
  };

  // All bids for this player (from all teams)
  bids: Array<{
    id: string;
    teamId: string;
    teamName: string;
    teamInfo: {
      marketSize: 'small' | 'medium' | 'large';
      climate: 'cold' | 'temperate' | 'warm';
      isContender: boolean;
      isStable: boolean;
      taxRate: number;
      currentRoster: {
        position: string;
        count: number;
        hasStarter: boolean; // Does team already have a starter at this position?
      };
    };
    offer: {
      years: 1 | 2 | 3;
      baseSalary: Record<number, number>; // { 2024: 5000000, 2025: 6000000 }
      signingBonus: number;
      guarantees: Array<{
        type: 'full' | 'injury-only';
        amount: number;
        year: number;
      }>;
      totalValue: number;
      apy: number; // Average per year
    };
    submittedAt: string; // ISO date
  }>;

  // Settings for evaluation
  settings: {
    shortlistSize: number; // Max offers to keep (default: 3)
    trustPenalty: number; // Base trust reduction for lowball offers
    openFADiscount: number; // Percentage discount in open FA (default: 20%)
  };

  // Historical trust data (for calculating compounding penalties)
  teamTrustHistory?: Record<
    string,
    {
      currentTrust: number; // -1.0 to 1.0 (0 = neutral)
      lowballCount: number; // How many times this team has lowballed
      lastLowballSeason: number; // For decay calculation
    }
  >;
}
```

### Example Input JSON:

```json
{
  "weekContext": {
    "weekNumber": 2,
    "phase": "FA_WEEK",
    "seasonStage": "EarlyFA"
  },
  "marketContext": {
    "leagueId": "league_abc123",
    "currentWeek": 2,
    "positionalDemand": 0.7,
    "marketTrends": {
      "overall": "stable",
      "byPosition": {
        "QB": "rising",
        "RB": "falling",
        "WR": "stable"
      }
    }
  },
  "player": {
    "id": "4046",
    "name": "Tyreek Hill",
    "position": "WR",
    "age": 30,
    "overall": 94,
    "yearsExp": 8,
    "nflTeam": "MIA",
    "expectedAPY": 23500000,
    "personality": {
      "type": "money_motivated",
      "traits": {
        "negotiationStyle": "aggressive",
        "riskTolerance": "medium",
        "teamLoyalty": "low",
        "locationPreference": "big_markets",
        "deadlineBehavior": "pressure_team"
      },
      "weights": {
        "moneyPriority": 0.85,
        "winningPriority": 0.45,
        "locationPriority": 0.65,
        "guaranteePriority": 0.7,
        "lengthPriority": 0.4
      },
      "hiddenSliders": {
        "ego": 0.85,
        "injuryAnxiety": 0.3,
        "agentQuality": 0.9,
        "schemeFit": 0.7,
        "rolePromise": 0.95,
        "taxSensitivity": 0.6,
        "endorsementValue": 0.95
      },
      "feedbackTemplates": {
        "rejectLowOffer": ["My camp doesn't even acknowledge offers this far below market value.", "This offer is disrespectful to what I bring to any team."],
        "counterOffer": ["We're intrigued but {team_name} needs to show they're serious about winning.", "The money's not quite there yet. Let's see if we can find common ground."],
        "accept": ["This is a win-win. I'm ready to dominate for {team_name}!", "Let's get this championship!"],
        "shortlist": ["I'm considering this offer along with others. The market is still developing.", "Interesting offer. Let me see what else develops."],
        "gmNote": ["Player values guaranteed money highly due to high ego.", "Big market preference is strong - location matters here."]
      }
    }
  },
  "bids": [
    {
      "id": "bid_001",
      "teamId": "team_nyj",
      "teamName": "New York Jets",
      "teamInfo": {
        "marketSize": "large",
        "climate": "cold",
        "isContender": true,
        "isStable": false,
        "taxRate": 0.109,
        "currentRoster": {
          "position": "WR",
          "count": 2,
          "hasStarter": false
        }
      },
      "offer": {
        "years": 3,
        "baseSalary": {
          "2024": 20000000,
          "2025": 22000000,
          "2026": 24000000
        },
        "signingBonus": 15000000,
        "guarantees": [
          { "type": "full", "amount": 35000000, "year": 2024 },
          { "type": "full", "amount": 20000000, "year": 2025 }
        ],
        "totalValue": 81000000,
        "apy": 27000000
      },
      "submittedAt": "2024-03-01T10:00:00Z"
    },
    {
      "id": "bid_002",
      "teamId": "team_dal",
      "teamName": "Dallas Cowboys",
      "teamInfo": {
        "marketSize": "large",
        "climate": "warm",
        "isContender": true,
        "isStable": true,
        "taxRate": 0,
        "currentRoster": {
          "position": "WR",
          "count": 3,
          "hasStarter": true
        }
      },
      "offer": {
        "years": 2,
        "baseSalary": {
          "2024": 18000000,
          "2025": 20000000
        },
        "signingBonus": 10000000,
        "guarantees": [{ "type": "full", "amount": 25000000, "year": 2024 }],
        "totalValue": 48000000,
        "apy": 24000000
      },
      "submittedAt": "2024-03-01T14:30:00Z"
    },
    {
      "id": "bid_003",
      "teamId": "team_jax",
      "teamName": "Jacksonville Jaguars",
      "teamInfo": {
        "marketSize": "small",
        "climate": "warm",
        "isContender": false,
        "isStable": true,
        "taxRate": 0,
        "currentRoster": {
          "position": "WR",
          "count": 2,
          "hasStarter": false
        }
      },
      "offer": {
        "years": 1,
        "baseSalary": {
          "2024": 12000000
        },
        "signingBonus": 2000000,
        "guarantees": [],
        "totalValue": 14000000,
        "apy": 14000000
      },
      "submittedAt": "2024-03-02T09:00:00Z"
    }
  ],
  "settings": {
    "shortlistSize": 3,
    "trustPenalty": 0.1,
    "openFADiscount": 20
  },
  "teamTrustHistory": {
    "team_jax": {
      "currentTrust": -0.1,
      "lowballCount": 1,
      "lastLowballSeason": 2023
    },
    "team_nyj": {
      "currentTrust": 0.05,
      "lowballCount": 0,
      "lastLowballSeason": null
    },
    "team_dal": {
      "currentTrust": 0,
      "lowballCount": 0,
      "lastLowballSeason": null
    }
  }
}
```

---

## 📤 Output JSON Schema (Expected from LLM)

The LLM should return this structure:

```typescript
interface FAWeekEvaluationOutput {
  playerId: string;
  playerName: string;

  // The primary decision
  decision: {
    type: 'accepted' | 'shortlisted' | 'rejected_all';

    // If accepted, which bid was accepted
    acceptedBidId?: string;

    // Bids kept for next week (up to shortlistSize)
    shortlistedBidIds: string[];

    // Bids that were rejected
    rejectedBidIds: string[];

    // Overall reasoning
    reasoning: string;
  };

  // Per-bid analysis
  bidAnalysis: Array<{
    bidId: string;
    teamId: string;
    teamName: string;

    // Scores (0-1 scale)
    scores: {
      aavScore: number; // How APY compares to market
      signingBonusScore: number; // Upfront money evaluation
      guaranteeScore: number; // Security evaluation
      lengthScore: number; // Contract length fit
      teamScore: number; // Team quality/fit
      locationScore: number; // Location preference match
      roleScore: number; // Starting opportunity
      totalScore: number; // Overall weighted score
    };

    // Decision for this specific bid
    decision: 'accept' | 'shortlist' | 'reject';
    decisionReason: string;

    // Is this a "lowball" offer that hurts trust?
    isLowball: boolean;
  }>;

  // Trust impacts (negative for lowballs, affects ALL future FA negotiations)
  trustImpacts: Record<
    string,
    {
      change: number; // The trust change from this evaluation
      newTotal: number; // Updated total trust score
      reason: string; // Why trust changed
      isCompounded: boolean; // Was this a repeat offense?
    }
  >;

  // Player feedback (for display)
  feedback: {
    // Public statement (what gets shown to all teams)
    publicStatement: string;

    // Private message to each team (include hints about what player wants)
    teamMessages: Record<string, string>; // { teamId: "message with hints" }

    // Agent's professional assessment (for GM view)
    agentNotes: string;

    // What player wants (directional hints, not formal counter-offers)
    desires?: {
      wantsMoreMoney: boolean;
      wantsMoreGuarantees: boolean;
      wantsLongerDeal: boolean;
      wantsShorterDeal: boolean;
      wantsBetterRole: boolean;
      wantsBiggerMarket: boolean;
      specificHint?: string; // e.g., "Need at least 50% guaranteed"
    };
  };

  // Market impact (if a signing happened)
  marketImpact?: {
    position: string;
    tier: 'elite' | 'starter' | 'depth';
    contractValue: number;
    marketShift: 'up' | 'down' | 'stable';
    shiftPercentage: number;
  };
}
```

### Example Output JSON:

```json
{
  "playerId": "4046",
  "playerName": "Tyreek Hill",
  "decision": {
    "type": "shortlisted",
    "acceptedBidId": null,
    "shortlistedBidIds": ["bid_001", "bid_002"],
    "rejectedBidIds": ["bid_003"],
    "reasoning": "The Jets and Cowboys offers are competitive, but I'm still exploring the market in Week 2. Jacksonville's offer is insulting and has been dismissed."
  },
  "bidAnalysis": [
    {
      "bidId": "bid_001",
      "teamId": "team_nyj",
      "teamName": "New York Jets",
      "scores": {
        "aavScore": 0.92,
        "signingBonusScore": 0.88,
        "guaranteeScore": 0.95,
        "lengthScore": 0.75,
        "teamScore": 0.7,
        "locationScore": 0.9,
        "roleScore": 0.95,
        "totalScore": 0.87
      },
      "decision": "shortlist",
      "decisionReason": "Strong offer with excellent guarantees and big market appeal. Jets need a WR1 which means starting opportunity. However, team stability concerns and cold weather are slight negatives. Will keep this offer active to see if market develops.",
      "isLowball": false
    },
    {
      "bidId": "bid_002",
      "teamId": "team_dal",
      "teamName": "Dallas Cowboys",
      "scores": {
        "aavScore": 0.81,
        "signingBonusScore": 0.67,
        "guaranteeScore": 0.75,
        "lengthScore": 0.6,
        "teamScore": 0.85,
        "locationScore": 0.95,
        "roleScore": 0.6,
        "totalScore": 0.76
      },
      "decision": "shortlist",
      "decisionReason": "Dallas offers no state income tax and a big market, but they already have a starter at WR. APY is slightly below expectations and 2-year deal limits security. Good fallback option.",
      "isLowball": false
    },
    {
      "bidId": "bid_003",
      "teamId": "team_jax",
      "teamName": "Jacksonville Jaguars",
      "scores": {
        "aavScore": 0.45,
        "signingBonusScore": 0.2,
        "guaranteeScore": 0.0,
        "lengthScore": 0.3,
        "teamScore": 0.5,
        "locationScore": 0.4,
        "roleScore": 0.8,
        "totalScore": 0.38
      },
      "decision": "reject",
      "decisionReason": "This offer is 40% below market value with zero guarantees. A 1-year prove-it deal is an insult to a player of my caliber. Jacksonville should not expect to hear from us again.",
      "isLowball": true
    }
  ],
  "trustImpacts": {
    "team_jax": {
      "change": -0.15,
      "newTotal": -0.25,
      "reason": "Lowball offer significantly below market value. Second offense - compounded penalty.",
      "isCompounded": true
    },
    "team_nyj": {
      "change": 0.05,
      "newTotal": 0.1,
      "reason": "Competitive offer shows respect for player value.",
      "isCompounded": false
    },
    "team_dal": {
      "change": 0.02,
      "newTotal": 0.02,
      "reason": "Reasonable offer, slightly below expectations.",
      "isCompounded": false
    }
  },
  "feedback": {
    "publicStatement": "I'm evaluating some exciting opportunities right now. The market is still developing and I want to make sure I find the right fit. Some teams have shown real commitment to making me a priority.",
    "teamMessages": {
      "team_nyj": "The Jets have put together a serious offer. I appreciate the guaranteed money and the opportunity to be WR1. Let's keep talking.",
      "team_dal": "Dallas is an attractive destination but I'd need to see more commitment on the financial side. More guaranteed money would go a long way here.",
      "team_jax": "We have no interest in continuing discussions at this time."
    },
    "agentNotes": "Client is leaning Jets due to guaranteed money and starting role. Dallas would need to increase APY by ~$3M and add more guarantees. Jacksonville bid was unprofessional - advise avoiding this team in future dealings.",
    "desires": {
      "wantsMoreMoney": true,
      "wantsMoreGuarantees": true,
      "wantsLongerDeal": false,
      "wantsShorterDeal": false,
      "wantsBetterRole": false,
      "wantsBiggerMarket": false,
      "specificHint": "Looking for at least $25M APY with 60%+ guaranteed"
    }
  },
  "marketImpact": null
}
```

---

## 🎯 LLM Prompt Guidelines

When configuring the LLM for decision-making, provide these instructions:

### System Prompt for LLM:

```
You are an NFL player agent simulator for a dynasty fantasy football game. Your job is to evaluate contract offers on behalf of players based on their personality, market conditions, and the specific offers received.

KEY RULES:

1. **Respect the Personality**: Each player has weights and traits. A "money_motivated" player should prioritize APY. A player with high "teamLoyalty" should favor their current team. High "ego" players reject "disrespectful" offers more harshly.

2. **Week Progression Matters**:
   - Weeks 1-2: Be VERY picky. Only shortlist offers above ~70% of market value. Prefer to wait.
   - Week 3: Lower threshold to ~60%. Shortlist up to 3 offers.
   - Week 4: Very willing to accept. Low threshold (~50%). Still can reject and go to Open FA.
   - Week 5+: Open FA - not applicable (immediate signings at discount).

3. **Calculate Market Value**:
   - Elite players (90+ overall) expect top-of-market deals
   - Starter-quality (80-89) expect starter money
   - Depth players (70-79) should accept reasonable depth deals

4. **Lowball Detection**:
   - If offer APY < 60% of expectedAPY → LOWBALL
   - If zero guarantees AND below market → LOWBALL
   - Lowball offers get REJECTED and hurt team's LEAGUE-WIDE trust
   - Trust penalty is small but compounds with multiple offenses
   - High-ego players take MORE offense (higher penalty)

5. **Starting Opportunity Matters**:
   - Players prefer teams where they'll START
   - If team already has a starter at position, reduce roleScore by ~20%
   - Do NOT reject outright - just weight it lower

6. **Location Preferences**:
   - Check player's locationPreference trait
   - Big market players want NYC, LA, Dallas, etc.
   - Tax-sensitive players prefer no-income-tax states (TX, FL, TN, WA, NV)

7. **Generate Realistic Feedback**:
   - Use the player's personality to flavor messages
   - Aggressive players have demanding messages
   - Patient players are more diplomatic
   - Include agent perspective in agentNotes
   - **HINT at what player wants** (e.g., "I'd need more guaranteed money" or "A longer deal would make me feel more secure")
   - NO formal counter-offer numbers - just directional hints

8. **Only ONE acceptance per player**:
   - If accepting, pick the best offer
   - Shortlist up to 3 offers for next week (only offers above threshold)
   - Reject the rest

9. **Trust System**:
   - Lowball offers create small trust penalty affecting ALL future FA negotiations
   - Trust decays over time (seasons)
   - High-ego players: trust penalty is 1.5x normal
   - Repeat offenders: compounding penalties

OUTPUT REQUIREMENTS:
- Return valid JSON matching the FAWeekEvaluationOutput schema
- Include analysis for EVERY bid
- Provide meaningful reasoning (not generic)
- Generate personality-appropriate feedback
- Include hints about what player wants in feedback (no formal counter numbers)
```

---

## 🔧 Direct OpenAI Integration (No n8n Required)

Since you already have an OpenAI subscription, we call OpenAI directly from Firebase Functions. This is:

- ✅ **Simpler** - No middleware to maintain
- ✅ **Cheaper** - No n8n monthly fee
- ✅ **Faster** - One less network hop

### OpenAI Configuration:

```typescript
// Using the OpenAI Node.js SDK in Firebase Functions

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // From Firebase Secret Manager
});

const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini', // Recommended: cheap & effective
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: JSON.stringify(playerInputData) },
  ],
  response_format: { type: 'json_object' }, // Forces valid JSON output
  temperature: 0.7,
  max_tokens: 2000,
});

const decision = JSON.parse(response.choices[0].message.content);
```

### Model Recommendations

| Model         | Cost per Player | Quality   | Recommendation    |
| ------------- | --------------- | --------- | ----------------- |
| `gpt-4o-mini` | ~$0.001         | Good      | ✅ **Best value** |
| `gpt-4o`      | ~$0.04          | Excellent | Premium option    |
| `gpt-4-turbo` | ~$0.08          | Excellent | Overkill for this |

### Package Installation

```bash
cd apps/functions
npm install openai
```

---

## 📋 System Rules (Confirmed)

### 1. Week 4 Decision

Players become **more desperate** in Week 4 but can still reject all offers and enter Open FA (at a discount). Week 4 does NOT force acceptance - it just lowers the acceptance threshold significantly.

### 2. Starter Position Blocking

If a team already has a starter at a position and bids on another player at that position:

- The bid receives a **lower roleScore** (approximately -20% weight)
- It is NOT rejected outright
- Players prefer teams where they'll be "the guy"

### 3. Trust System

Lowball offers create a **small trust penalty** that:

- Affects **ALL future FA negotiations** with that team (not just this player)
- **Decays over time** (seasons)
- Can **build up** based on:
  - Player personality (high-ego players take more offense)
  - Multiple offenses (repeat lowballers get compounding penalties)

**Trust Calculation Formula:**

```
basePenalty = -0.1
egoMultiplier = 1.0 + (player.ego * 0.5)  // High ego = 1.5x penalty
compoundMultiplier = 1.0 + (lowballCount * 0.5)  // Each offense = +50%
finalPenalty = basePenalty * egoMultiplier * compoundMultiplier

Example:
- First lowball to normal player: -0.1 * 1.0 * 1.0 = -0.10
- Second lowball to high-ego (0.8) player: -0.1 * 1.4 * 1.5 = -0.21
```

**Trust Decay:**

```
Each season, trust decays 20% toward neutral (0)
Example: -0.25 trust → -0.20 after one season → -0.16 after two seasons
```

### 4. Counter-Offers

**No formal counter-offers in v1.** However:

- Players CAN hint in their feedback what they want
- Example: "I'd need a longer deal to feel secure" or "The guaranteed money needs to come up"
- Teams can then adjust their bid in the next week

### 5. Shortlist Threshold (Dynamic by Week)

| Week     | Shortlist Behavior                                                   |
| -------- | -------------------------------------------------------------------- |
| Week 1-2 | Keep offers **above threshold** (e.g., 70% of market value), up to 3 |
| Week 3   | Lower threshold, keep up to 3 offers                                 |
| Week 4   | Very low threshold, keep up to 3 offers                              |
| Week 5+  | Open FA - immediate signing at discount                              |

### 6. One Acceptance Rule

- A player can only accept **ONE offer** per week
- A player can only be on **ONE team's roster**
- A team CAN have multiple players accept their bids in the same week

### 7. Tie-Breaking

When two bids have identical scores:

1. Signing bonus (higher wins)
2. Number of guarantees (more wins)
3. Total value (higher wins)
4. Contract length (shorter wins for same value)
5. Bid ID (alphabetical as final tiebreaker)

---

## 📁 Related Files

| File                                          | Purpose                             |
| --------------------------------------------- | ----------------------------------- |
| `libs/domain/src/lib/domain.ts`               | FAWeekManager, evaluation logic     |
| `libs/domain/src/lib/personalities/`          | Player personality system           |
| `libs/types/src/lib/types.ts`                 | TypeScript interfaces for FA system |
| `libs/domain/src/lib/league-setup.service.ts` | Player setup with personalities     |
| `docs/NEGOTIATION_SYSTEM_README.md`           | Detailed negotiation mechanics      |
| `docs/FREE_AGENCY_SYSTEM_README.md`           | FA system development roadmap       |

---

_Last Updated: January 2026_
_Free Agency LLM Integration Guide v1.0_
