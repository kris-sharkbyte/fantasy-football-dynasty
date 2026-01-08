# Dynasty Fantasy Football - Draft & Player Acquisition System

## 🎯 Overview

A comprehensive draft and player acquisition system implementing a **Hybrid Acquisition → Negotiation** model. This system separates player acquisition (draft/auction/FA) from contract negotiation, giving teams strategic flexibility while maintaining salary cap integrity.

---

## 🏗️ Core Architecture

### Two-Phase System

#### Phase A: Acquire "Rights"

- Teams acquire **negotiation rights** to players
- No contracts are created during acquisition
- Multiple acquisition modes supported per league

#### Phase B: Contract Negotiation

- Timed negotiation window (48-72 hours)
- Teams must sign or renounce acquired players
- AI-powered agent negotiations
- Contract type limitations (1-3 years max)

---

## 📋 Acquisition Modes

### 1. Snake Draft (Recommended for Speed & Fairness)

**For Rookies:**

- Immediately receive fixed rookie scale contracts (2-3 years)
- No negotiation required - automatic signing

**For Veterans:**

- Gain exclusive negotiation rights only
- Must negotiate contract within time window

**Technical Implementation:**

```typescript
interface SnakeDraftConfig {
  rounds: number;
  timeLimit: number; // seconds per pick
  autodraftDelay: number; // seconds before autodraft
  rookieAutoContracts: boolean;
}
```

### 2. Auction Draft (High Engagement)

**For Veterans:**

- Winning bid grants exclusive negotiation rights
- Auction price becomes a "cap hold" placeholder
- Must finalize contract or cap space returns

**For Rookies:**

- Optional: auction for draft order, then snake draft
- Or auction for players directly with rookie scale

**Technical Implementation:**

```typescript
interface AuctionDraftConfig {
  bidIncrement: number;
  bidTimeLimit: number;
  maxBudget: number;
  minimumBid: number;
  capHoldMultiplier: number; // auction price * multiplier = cap hold
}
```

### 3. Open Free Agency Rounds (Live Bidding Room)

**Real-time bidding system:**

- Timed rounds (configurable intervals)
- Simultaneous bidding on multiple players
- Highest bid wins negotiation rights

**Technical Implementation:**

```typescript
interface FreeAgencyRoundConfig {
  roundDuration: number; // seconds
  maxSimultaneousBids: number;
  bidIncrement: number;
  tieBreaker: 'timestamp' | 'random' | 'priority';
}
```

---

## 🤝 Contract Negotiation System

### Contract Types (Rails-Based)

#### 1-Year "Prove-It" Deal

- **APY Ceiling:** 90% of estimated 2-year value
- **Guarantees:** 60-80% of total value
- **Strategy:** Lower risk for teams, high security for players

#### 2-Year "Bridge" Deal

- **APY:** Market rate
- **Guarantees:** 40-60% of total value
- **Backloading:** Mild allowed (up to 20% variance)

#### 3-Year "Standard" Deal (Maximum)

- **APY Discount:** 5-10% below shorter deals
- **Guarantees:** 30-50% of total value
- **Dead Cap Risk:** Highest if cut early

### Contract Rails Configuration

```typescript
interface ContractRails {
  maxYears: 3;
  minBase: number; // league minimum
  maxSigningBonusPct: 40; // % of total value
  guaranteeRanges: {
    '1year': { min: 60; max: 80 };
    '2year': { min: 40; max: 60 };
    '3year': { min: 30; max: 50 };
  };
  apyDiscounts: {
    '3year': 0.05; // 5% discount vs shorter deals
  };
}
```

---

## 🤖 AI Agent Negotiation

### Preference Algorithm

```typescript
interface PlayerNegotiationProfile {
  guaranteeBias: number; // 0-1, how much they prioritize guarantees
  lengthPreference: 1 | 2 | 3; // preferred contract length
  apyWeight: number; // importance of average per year
  teamFactors: {
    contenderBonus: number; // extra value for playoff teams
    loyaltyDiscount: number; // discount for current team
    marketSizePreference: number; // preference for big markets
  };
}
```

### Negotiation Flow

1. **Initial Evaluation:** AI agent evaluates team's offer
2. **Market Analysis:** Compare with estimated market value
3. **Counter Logic:**
   - Increase guarantees first (most common)
   - Adjust contract length if outside preference
   - Small APY bumps with diminishing returns
4. **Decision:** Accept, Counter, or Wait for better offers

---

## 🎮 User Interface Design

### Draft Room Interface (PrimeNG Components)

#### Core Components:

- **Draft Board:** Real-time player availability grid
- **Team Queue:** Draggable player queue for each team
- **Pick Timer:** Countdown with auto-pick functionality
- **Chat System:** Real-time communication
- **Trade Panel:** In-draft pick/player trading

#### Mobile-First Design:

- Swipe navigation between views
- Collapsible panels for space optimization
- Touch-friendly drag & drop

### Negotiation Room Interface

#### Per-Player Negotiation:

```html
<div class="negotiation-container">
  <player-card [player]="selectedPlayer" />

  <contract-builder [contractRails]="leagueRails" [playerProfile]="playerProfile" (offerChange)="previewCapImpact($event)" />

  <cap-impact-preview [offer]="currentOffer" [teamCapSpace]="teamCapSpace" />

  <ai-response-panel [agentResponse]="agentResponse" [negotiationHistory]="negotiationHistory" />

  <action-buttons>
    <button (click)="submitOffer()">Submit Offer</button>
    <button (click)="issueQualifyingOffer()">Issue QO</button>
    <button (click)="applyFranchiseTag()">Franchise Tag</button>
    <button (click)="renounceRights()">Renounce Rights</button>
  </action-buttons>
</div>
```

---

## 🗄️ Data Models

### Enhanced Type Definitions

```typescript
// Rights Management
interface PlayerRights {
  playerId: string;
  rightsTeamId: string;
  capHold: number; // placeholder cap hit
  rightsExpireAt: Date;
  acquisitionMethod: 'draft' | 'auction' | 'free_agency';
  acquisitionPrice?: number; // for auction/FA
}

// Draft State Management
interface DraftState {
  leagueId: string;
  currentPick: number;
  currentTeamId: string;
  timeRemaining: number;
  isPaused: boolean;
  draftOrder: string[]; // team IDs in draft order
  completedPicks: Pick[];
}

// Auction State
interface AuctionState {
  leagueId: string;
  currentPlayerId?: string;
  currentHighBid?: number;
  currentHighBidder?: string;
  timeRemaining: number;
  activeBidders: string[]; // team IDs currently bidding
}

// Contract Negotiation
interface ContractNegotiation {
  id: string;
  playerId: string;
  teamId: string;
  currentOffer?: ContractOffer;
  agentResponse?: AgentResponse;
  negotiationHistory: NegotiationEvent[];
  expiresAt: Date;
  status: 'active' | 'agreed' | 'renounced' | 'expired';
}

interface ContractOffer {
  years: 1 | 2 | 3;
  baseSalary: Record<number, number>;
  signingBonus: number;
  guarantees: Guarantee[];
  contractType: 'prove_it' | 'bridge' | 'standard';
}

interface AgentResponse {
  decision: 'accept' | 'counter' | 'reject';
  counterOffer?: ContractOffer;
  reasoning: string;
  satisfactionScore: number; // 0-100
}
```

---

## ⚙️ Backend Services (Firebase Functions)

### Draft Management Functions

```typescript
// Draft room management
export const startDraft = onCall(async (request) => {
  // Initialize draft state, create pick order
});

export const makeDraftPick = onCall(async (request) => {
  // Validate turn, assign rights, advance to next pick
});

export const tradeDraftPick = onCall(async (request) => {
  // Handle mid-draft pick trading
});

// Auction management
export const placeBid = onCall(async (request) => {
  // Validate bid, update auction state
});

export const resolveAuction = onCall(async (request) => {
  // Assign rights to highest bidder
});

// Negotiation management
export const submitContractOffer = onCall(async (request) => {
  // Validate offer, run AI evaluation, store response
});

export const acceptOffer = onCall(async (request) => {
  // Create contract, clear rights, update cap
});

export const renounceRights = onCall(async (request) => {
  // Clear rights, return to free agency pool
});
```

### Real-time Updates (Firestore Listeners)

```typescript
// Draft room updates
firestore
  .collection('draft-states')
  .doc(leagueId)
  .onSnapshot((doc) => {
    // Update draft UI in real-time
  });

// Auction updates
firestore
  .collection('auction-states')
  .doc(auctionId)
  .onSnapshot((doc) => {
    // Update bidding interface
  });

// Negotiation updates
firestore
  .collection('negotiations')
  .where('teamId', '==', teamId)
  .onSnapshot((querySnapshot) => {
    // Update negotiation panels
  });
```

---

## 🧪 Testing Strategy

### Unit Tests

- **Cap Math:** Contract validation, dead money calculations
- **Draft Logic:** Pick order, timer functionality, auto-draft
- **AI Agent:** Negotiation responses, preference calculations
- **Contract Rails:** Type validation, guarantee limits

### Integration Tests

- **Real-time Features:** Draft room updates, auction bidding
- **Negotiation Flow:** Offer → counter → accept/reject
- **Database Transactions:** Rights assignment, contract creation

### E2E Tests

- **Complete Draft:** Full draft from start to finish
- **Auction Session:** Multiple players, multiple bidders
- **Negotiation Window:** Acquire rights → negotiate → sign

---

## 📊 Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)

- [ ] Enhanced type definitions in `libs/types`
- [ ] Basic Firebase Functions for draft management
- [ ] Draft state management services
- [ ] Real-time update infrastructure

### Phase 2: Snake Draft System (Week 3-4)

- [ ] Draft room UI components
- [ ] Pick timer and auto-draft functionality
- [ ] In-draft trading system
- [ ] Rookie contract auto-assignment

### Phase 3: Contract Negotiation (Week 5-6)

- [ ] Negotiation room interface
- [ ] Contract builder with rails validation
- [ ] AI agent negotiation engine
- [ ] Cap impact preview and validation

### Phase 4: Auction System (Week 7-8)

- [ ] Auction room interface
- [ ] Real-time bidding functionality
- [ ] Cap hold management
- [ ] Auction resolution logic

### Phase 5: Advanced Features (Week 9-10)

- [ ] Qualifying offers system
- [ ] Franchise/transition tags
- [ ] Right of first refusal
- [ ] Advanced AI negotiation

### Phase 6: Polish & Testing (Week 11-12)

- [ ] Mobile optimization
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation and guides

---

## 🎯 Success Metrics

### User Engagement

- [ ] Draft completion rate > 95%
- [ ] Average negotiation completion time < 24 hours
- [ ] User satisfaction with AI negotiations > 80%

### Technical Performance

- [ ] Draft room real-time updates < 500ms latency
- [ ] Auction bid processing < 200ms
- [ ] Cap calculations accuracy 100%

### Business Logic

- [ ] Contract validation prevents cap violations
- [ ] AI agent fairness across all player types
- [ ] Zero draft order conflicts or timing issues

---

## 🔧 Configuration Examples

### League Setup: Competitive Snake Draft

```typescript
const competitiveLeague: LeagueRules = {
  draft: {
    mode: 'snake',
    rounds: 25,
    timeLimit: 120, // 2 minutes per pick
    rookieAutoContracts: true,
    veteranNegotiationWindow: 72, // hours
  },
  contracts: {
    maxYears: 3,
    rookieScale: true,
    negotiationRails: {
      maxSigningBonusPct: 40,
      guaranteeRanges: {
        /* ... */
      },
    },
  },
};
```

### League Setup: High-Stakes Auction

```typescript
const auctionLeague: LeagueRules = {
  draft: {
    mode: 'auction',
    budget: 300, // $300 per team
    bidIncrement: 1,
    bidTimeLimit: 30, // seconds
    capHoldMultiplier: 1.2,
  },
  freeAgency: {
    negotiationWindow: 48,
    minimumBid: 1,
  },
};
```

---

## 📚 Developer Resources

### Key Files to Implement

- `libs/types/src/lib/draft-types.ts` - Draft-specific type definitions
- `apps/functions/src/draft/` - Draft management functions
- `apps/web/src/app/draft/` - Draft room components
- `apps/web/src/app/negotiation/` - Contract negotiation interface
- `libs/domain/src/lib/draft-engine.ts` - Draft business logic
- `libs/domain/src/lib/ai-agent.ts` - AI negotiation engine

### External Dependencies

- Real-time: Firestore real-time listeners
- Timer Management: RxJS intervals and operators
- UI Components: PrimeNG tables, dialogs, progress bars
- Form Validation: Angular Reactive Forms + Zod schemas

### Database Collections

```
/leagues/{leagueId}/draft-state
/leagues/{leagueId}/auction-states/{auctionId}
/leagues/{leagueId}/player-rights/{playerId}
/leagues/{leagueId}/negotiations/{negotiationId}
/leagues/{leagueId}/picks/{pickId}
/draft-classes/{draftClassId}
```

---

## 🔄 Integration Points

### With Existing Systems

- **Salary Cap:** Real-time cap validation during negotiations
- **Team Management:** Roster updates after signings
- **Trade System:** Pick trading during draft
- **Free Agency:** Seamless transition from draft to FA
- **Scoring:** Rookie contract integration with weekly scoring

### Future Enhancements

- **Advanced Analytics:** Draft value calculators, trade analyzers
- **Commissioner Tools:** Draft pause/resume, manual overrides
- **Mobile App:** Native iOS/Android draft experience
- **Streaming Integration:** Twitch/YouTube draft broadcasts
- **Advanced AI:** Machine learning for better agent behavior

---

_This README serves as the comprehensive specification for the Dynasty Fantasy Football draft and player acquisition system. All implementation should reference this document for consistency and completeness._
