# 🎯 Advanced Negotiation System

A sophisticated, AI-ready negotiation engine that makes contract negotiations in dynasty fantasy football feel realistic and engaging. This system simulates real NFL agent behavior with deterministic logic that can be enhanced with LLM integration.

## 🏗️ System Architecture

### **4-Layer Negotiation Model**

```
┌─────────────────────────────────────────────────────────────┐
│                    NEGOTIATION ENGINE                      │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: Reputation & Memory                             │
│  ├── Team trust scoring                                   │
│  ├── Promise tracking                                     │
│  └── Contender status                                     │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: Market Pressure                                 │
│  ├── Team cap space analysis                              │
│  ├── Positional need assessment                           │
│  ├── Recent contract comparisons                          │
│  └── Season stage dynamics                                │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Player Personality & Risk                       │
│  ├── Risk tolerance (guarantees vs AAV)                   │
│  ├── Security preferences (years vs flexibility)          │
│  ├── Agent quality (negotiation toughness)                │
│  ├── Loyalty factors (hometown discount)                  │
│  └── Team priorities (role, contender, location)          │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Deterministic Baseline                          │
│  ├── Salary floor (tier × age × position)                 │
│  ├── Contract minimums                                    │
│  ├── Cap validation                                       │
│  └── Roster compliance                                    │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 **Phase 1: Foundation (COMPLETED ✅)**

### **What's Built:**

- ✅ **Player Rating System** - Dynamic OVR calculation from Sleeper data
- ✅ **Player Personality Generation** - Deterministic profiles for consistent behavior
- ✅ **Enhanced Contract Creation Interface** - Professional two-column layout
- ✅ **Contract Validation** - Real-time cap compliance and minimum requirements

### **Technical Implementation:**

```typescript
// Player Rating Calculator
export class PlayerRatingCalculator {
  static calculatePlayerOVR(player: any): number {
    // Base from search rank, age modifiers, experience, position
    // Returns 50-99 range for realistic ratings
  }
}

// Personality Generator
export class PlayerPersonalityGenerator {
  static generatePersonality(player: any): PlayerPersonality {
    // Deterministic generation using player ID as seed
    // Consistent behavior across sessions
  }
}
```

## 🚧 **Phase 2: Negotiation Engine Core (IN PROGRESS 🔄)**

### **Current Focus:**

- 🔄 **Negotiation Session Management** - Firestore data model
- 🔄 **Offer Evaluation Algorithm** - Utility calculation system
- 🔄 **Counter Generation Logic** - Intelligent response system
- 🔄 **Acceptance/Rejection Logic** - Decision making engine

### **Firestore Data Model:**

```typescript
// negotiations/{sessionId}
interface NegotiationSession {
  playerId: string;
  teamId: string;
  round: number;
  reservation: {
    aav: number; // Average annual value
    gtdPct: number; // Guaranteed percentage
    years: number; // Contract length
  };
  patience: number; // Remaining negotiation rounds
  askAnchor: {
    // Player's opening ask
    aav: number;
    gtdPct: number;
    years: number;
  };
  history: Array<{
    type: 'offer' | 'counter' | 'accept' | 'decline';
    offer: Offer;
    timestamp: number;
    message?: string;
  }>;
  status: 'active' | 'accepted' | 'declined' | 'expired';
  marketContext: {
    competingOffers: number;
    positionalDemand: number;
    capSpaceAvailable: number;
  };
}
```

### **Offer Evaluation Algorithm:**

```typescript
// Utility calculation based on player personality
function calculatePlayerUtility(offer: Offer, player: Player, session: NegotiationSession): number {
  const personality = player.personality;

  // Base utility from reservation value
  const aavUtility = Math.min(1, offer.aav / session.reservation.aav);
  const gtdUtility = Math.min(1, offer.gtdPct / session.reservation.gtdPct);
  const yearsUtility = Math.min(1, offer.years / session.reservation.years);

  // Weighted by personality preferences
  const utility = personality.moneyVsRole * aavUtility + (1 - personality.riskTolerance) * gtdUtility + personality.securityPref * yearsUtility;

  return utility;
}
```

### **Counter Generation Logic:**

```typescript
function generateCounter(offer: Offer, session: NegotiationSession): CounterOffer {
  const gaps = {
    aav: Math.max(0, session.reservation.aav - offer.aav),
    gtd: Math.max(0, session.reservation.gtdPct - offer.gtdPct),
    years: Math.max(0, session.reservation.years - offer.years),
  };

  // Target biggest gap first
  const biggestGap = Object.entries(gaps).reduce((a, b) => (a[1] > b[1] ? a : b));

  return {
    aav: offer.aav + Math.round(gaps.aav * 0.75),
    gtdPct: offer.gtdPct + gaps.gtd * 0.85,
    years: offer.years + Math.ceil(gaps.years * 0.5),
    message: generateCounterMessage(biggestGap[0], biggestGap[1]),
  };
}
```

## 📋 **Phase 3: Market Simulation (PLANNED 📅)**

### **Team Needs Analysis:**

- **Positional Depth Assessment** - Current roster analysis
- **Cap Space Analysis** - Available budget for each team
- **Competitive Landscape** - Other teams bidding on same player

### **Market Pressure Calculations:**

```typescript
interface MarketContext {
  competingOffers: number; // How many teams are interested
  positionalDemand: number; // Market demand for this position
  capSpaceAvailable: number; // Total cap space across interested teams
  recentComps: Contract[]; // Similar contracts signed recently
  seasonStage: 'EarlyFA' | 'MidFA' | 'Camp' | 'MidSeason';
}
```

### **Competitive Offer Simulation:**

- **Ghost Offers** - AI-generated competing bids
- **Market Rumors** - "Reports say Team X is interested"
- **Bidding Wars** - Escalating offer scenarios

## 🤖 **Phase 4: LLM Integration (PLANNED 📅)**

### **AI-Generated Content:**

- **Agent Messages** - Realistic negotiation dialogue
- **Market Rumors** - Dynamic market intelligence
- **Counter Explanations** - Detailed reasoning for offers

### **Integration Points:**

```typescript
// LLM service for flavor text
interface LLMService {
  generateAgentMessage(context: NegotiationContext): Promise<string>;
  generateMarketRumor(market: MarketContext): Promise<string>;
  generateCounterExplanation(counter: CounterOffer): Promise<string>;
}
```

### **Structured Data Flow:**

1. **Deterministic Logic** - Core negotiation outcomes
2. **LLM Enhancement** - Flavor text and market context
3. **Real-time Updates** - Live negotiation status

## 🎮 **Phase 5: Free Agency Integration (PLANNED 📅)**

### **Real-time Bidding Interface:**

- **Live Auction Room** - Real-time bid updates
- **Market Rounds** - Timed bidding periods
- **Tie-breaker Logic** - Fair resolution of equal bids

### **Contract Commitment Flows:**

- **Acceptance Processing** - Automatic contract creation
- **Cap Impact Calculation** - Real-time team updates
- **Roster Integration** - Seamless player addition

## 🔧 **Technical Implementation Details**

### **State Management:**

```typescript
// Angular signals for reactive state
export class NegotiationService {
  private _activeSessions = signal<NegotiationSession[]>([]);
  private _marketContext = signal<MarketContext | null>(null);

  public activeSessions = this._activeSessions.asReadonly();
  public marketContext = this._marketContext.asReadonly();
}
```

### **Real-time Updates:**

- **Firestore Listeners** - Live negotiation status
- **WebSocket Integration** - Instant bid notifications
- **Push Notifications** - Mobile alerts for important events

### **Performance Optimization:**

- **Lazy Loading** - Negotiation data loaded on demand
- **Caching Strategy** - Market data cached for performance
- **Batch Updates** - Efficient database operations

## 🧪 **Testing Strategy**

### **Unit Tests:**

- **Negotiation Logic** - All decision algorithms
- **Utility Calculations** - Player preference scoring
- **Counter Generation** - Response logic validation

### **Integration Tests:**

- **End-to-End Flows** - Complete negotiation cycles
- **Market Simulation** - Multi-team scenarios
- **LLM Integration** - AI service testing

### **Golden Test Cases:**

- **Edge Cases** - Extreme personality combinations
- **Market Conditions** - High/low demand scenarios
- **Performance Tests** - Large-scale simulations

## 📊 **Success Metrics**

### **User Experience:**

- **Negotiation Completion Rate** - % of offers that result in contracts
- **User Engagement** - Time spent in negotiation interface
- **Satisfaction Scores** - User feedback on realism

### **Technical Performance:**

- **Response Time** - < 500ms for offer evaluation
- **Real-time Updates** - < 100ms for status changes
- **System Reliability** - 99.9% uptime during peak usage

### **Business Impact:**

- **Contract Signing Rate** - Increased player acquisition
- **User Retention** - Higher engagement leads to retention
- **Feature Adoption** - % of users using negotiation system

## 🚀 **Deployment Roadmap**

### **Week 1-2: Core Engine**

- [ ] Negotiation session data model
- [ ] Basic offer evaluation
- [ ] Simple counter generation
- [ ] Integration with contract creation

### **Week 3-4: Market Simulation**

- [ ] Team needs analysis
- [ ] Market pressure calculations
- [ ] Competitive offer simulation
- [ ] Real-time market updates

### **Week 5-6: LLM Integration**

- [ ] AI service setup
- [ ] Message generation
- [ ] Market rumor system
- [ ] Enhanced user experience

### **Week 7-8: Free Agency Integration**

- [ ] Real-time bidding interface
- [ ] Market rounds system
- [ ] Contract commitment flows
- [ ] End-to-end testing

## 🔮 **Future Enhancements**

### **Advanced AI Features:**

- **Learning System** - AI that adapts to user behavior
- **Predictive Analytics** - Market trend predictions
- **Personalized Negotiation** - Custom strategies per user

### **Social Features:**

- **Negotiation History** - Public contract databases
- **Agent Reputations** - Community ratings for AI agents
- **Strategy Sharing** - User-created negotiation tactics

### **Mobile Experience:**

- **Push Notifications** - Real-time negotiation alerts
- **Mobile-Optimized UI** - Touch-friendly interface
- **Offline Capabilities** - Basic negotiation without internet

---

## 📚 **Related Documentation**

- [PLAYER_CONTRACT.md](./PLAYER_CONTRACT.md) - Contract minimum specifications
- [PROJECT_CHECKLIST.md](./PROJECT_CHECKLIST.md) - Overall project status
- [README.md](./README.md) - Main project overview

---

**Status: Phase 2 - Negotiation Engine Core (IN PROGRESS)**
**Next Milestone: Basic offer evaluation and counter generation**
**Target Completion: End of Week 2**
