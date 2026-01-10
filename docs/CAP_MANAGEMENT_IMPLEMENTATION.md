# Cap Management Implementation Guide

## Overview

This document describes the complete cap management system implementation, including what has been completed and what remains to be integrated.

## Completed Components

### 1. Cap Ledger Service (`apps/web/src/app/services/cap-ledger.service.ts`)

**Purpose**: Manages cap ledger entries for tracking dead money from cuts, trades, and other cap-affecting transactions.

**Key Methods**:
- `createDeadMoneyEntry()` - Creates dead money entries when a player is cut/released
- `createTradeDeadMoneyEntry()` - Creates dead money entries when a player is traded
- `getTeamCapLedger()` - Retrieves all cap ledger entries for a team in a specific year
- `getTeamDeadMoney()` - Calculates total dead money for a team in a year
- `getTeamCapLedgerYears()` - Gets all years with cap ledger entries

**Usage**:
```typescript
// When cutting a player
await capLedgerService.createDeadMoneyEntry(
  leagueId,
  teamId,
  contract,
  currentYear,
  preJune1, // true for pre-June 1, false for post-June 1
  'Player released'
);

// When trading a player
await capLedgerService.createTradeDeadMoneyEntry(
  leagueId,
  teamId,
  contract,
  currentYear,
  preJune1,
  tradeId
);
```

### 2. Cap Management Component (`apps/web/src/app/leagues/team/components/cap-management/`)

**Location**: `apps/web/src/app/leagues/team/components/cap-management/`

**Files**:
- `cap-management.component.ts` - Main component logic
- `cap-management.component.html` - Template with all features
- `cap-management.component.scss` - Styling

**Features Implemented**:

#### Phase 1: Overview Dashboard ✅
- Total Salary Cap display
- Available Cap Space (calculated: Salary Cap - Committed Cap - Dead Money)
- Committed Cap (sum of all active contract cap hits)
- Dead Money (from cap ledger entries)
- Cap Utilization percentage with progress bar

#### Phase 1: Active Contracts Table ✅
- Sortable table showing all active contracts
- Columns: Player, Position, Base Salary, Signing Bonus Proration, Cap Hit, Years Remaining, Total Value
- Action buttons for Cut/Trade calculator
- Pagination support

#### Phase 1: Multi-Year Projection ✅
- 5-year cap projection table
- Shows Salary Cap, Committed, Dead Money, Available, Utilization for each year
- Color-coded utilization warnings

#### Phase 2: Dead Money Breakdown ✅
- Table showing all dead money entries
- Displays dead money for current year and next year
- Shows reason and type (cut/trade)
- Sorted by total dead money

#### Phase 2: Upcoming Expirations ✅
- Lists contracts expiring in next 2 years
- Shows years remaining, current cap hit, and cap space that will be freed

#### Phase 3: Position Cap Allocation ✅
- Breakdown of cap by position
- Shows player count, total cap, percentage, and visual progress bar
- Helps identify if too much cap is tied to one position

#### Phase 3: Cap Calculator ✅
- Dialog for calculating cap impact of cuts/trades
- Pre-June 1 vs Post-June 1 toggle
- Shows dead money (current year and next year)
- Shows cap savings
- Restructure placeholder (not yet implemented)

### 3. Updated Types

**File**: `libs/types/src/lib/types.ts`

**Change**: Added `leagueId` field to `CapLedger` interface (required for queries)

```typescript
export interface CapLedger {
  id: string;
  leagueId: string; // ✅ Added
  teamId: string;
  leagueYear: number;
  capIn: number;
  capOut: number;
  reason: string;
  refType: 'contract' | 'trade' | 'cut' | 'restructure';
  refId: string;
  createdAt: Date;
}
```

## Integration Required

### 1. Trade Function Integration

**Location**: Trade service/component (to be identified)

**Action Required**: When a trade is completed, create cap ledger entries for dead money.

**Files to Update**:
- Trade completion function (likely in `apps/functions/src/lib/` or trade service)
- Trade component that handles trade acceptance

**Code to Add**:
```typescript
import { CapLedgerService } from '../services/cap-ledger.service';

// After trade is completed and contracts are updated
const capLedgerService = inject(CapLedgerService);

// For each player being traded FROM this team
for (const contract of tradedContracts) {
  await capLedgerService.createTradeDeadMoneyEntry(
    leagueId,
    teamId,
    contract,
    currentYear,
    false, // preJune1 - could be based on date or user selection
    tradeId
  );
}
```

**Search For**:
- Functions that update `contract.teamId` on trade
- Trade acceptance/completion handlers
- Trade status updates to 'completed'

### 2. Player Release/Cut Function Integration

**Location**: Team service or player management service

**Action Required**: When a player is cut/released, create cap ledger entry and update contract status.

**Files to Update**:
- Player cut/release function
- Contract status update functions

**Code to Add**:
```typescript
import { CapLedgerService } from '../services/cap-ledger.service';

// When cutting a player
async cutPlayer(
  leagueId: string,
  teamId: string,
  contractId: string,
  preJune1: boolean = false
): Promise<void> {
  // 1. Get contract
  const contract = await getContract(contractId);
  
  // 2. Create dead money entry
  const capLedgerService = inject(CapLedgerService);
  await capLedgerService.createDeadMoneyEntry(
    leagueId,
    teamId,
    contract,
    currentYear,
    preJune1,
    'Player released'
  );
  
  // 3. Update contract status to 'inactive' or 'released'
  await updateContract(contractId, { status: 'inactive' });
  
  // 4. Remove from roster (already handled by roster system)
  // 5. Update team cap space if needed
}
```

**Search For**:
- Functions that remove players from rosters
- Contract deletion/status updates
- Player release/cut UI actions

### 3. Firestore Indexes Required

**File**: `firestore.indexes.json`

**Indexes Needed**:
```json
{
  "indexes": [
    {
      "collectionGroup": "capLedger",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "leagueId", "order": "ASCENDING" },
        { "fieldPath": "teamId", "order": "ASCENDING" },
        { "fieldPath": "leagueYear", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "capLedger",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "leagueId", "order": "ASCENDING" },
        { "fieldPath": "teamId", "order": "ASCENDING" },
        { "fieldPath": "leagueYear", "order": "DESCENDING" }
      ]
    }
  ]
}
```

**Command to Deploy**:
```bash
firebase deploy --only firestore:indexes
```

### 4. Contract Status Updates

**Current State**: Contracts may not have a `status` field consistently set.

**Action Required**: Ensure all contracts have `status: 'active' | 'inactive' | 'released' | 'traded'`

**Files to Check**:
- Contract creation functions
- Contract update functions
- Trade completion functions
- Player cut/release functions

**Code Pattern**:
```typescript
// When creating contract
{
  ...contractData,
  status: 'active',
  createdAt: new Date(),
}

// When cutting player
await updateDoc(contractRef, {
  status: 'inactive',
  releasedAt: new Date(),
});

// When trading player
await updateDoc(contractRef, {
  status: 'traded',
  tradedAt: new Date(),
  teamId: newTeamId, // Update team
});
```

## Testing Checklist

### Phase 1 Testing
- [ ] Verify committed cap calculation matches sum of all active contract cap hits
- [ ] Verify dead money shows $0 when no cuts/trades have occurred
- [ ] Verify available cap space = salary cap - committed - dead money
- [ ] Verify cap utilization percentage is correct
- [ ] Verify active contracts table shows all active contracts
- [ ] Verify multi-year projection shows correct committed cap for future years

### Phase 2 Testing
- [ ] Cut a player and verify dead money entry appears
- [ ] Trade a player and verify dead money entry appears
- [ ] Verify dead money breakdown shows correct amounts
- [ ] Verify expiring contracts shows contracts ending in next 2 years
- [ ] Verify cap space freed calculation is correct

### Phase 3 Testing
- [ ] Open cut calculator and verify dead money calculation
- [ ] Toggle pre-June 1 and verify dead money changes
- [ ] Verify cap savings calculation is correct
- [ ] Verify position allocation shows correct percentages
- [ ] Verify position allocation totals match committed cap

## Known Issues / Future Enhancements

### Not Yet Implemented
1. **Restructure Calculator**: Placeholder exists but logic not implemented
   - Would convert base salary to signing bonus
   - Would reduce current year cap hit
   - Would increase future year cap hits

2. **Pending Bids Impact**: During FA, show impact of pending bids
   - Would need to query active FA bids
   - Would show "if all pending bids accepted, remaining cap: $X"

3. **Cap Ledger History**: View cap ledger entries across all years
   - Currently only shows current selected year
   - Could add a "History" tab

4. **Export Cap Sheet**: Export to CSV/Excel
   - Would be useful for external analysis

5. **Cap Alerts**: Warn when approaching cap limit
   - Could show warnings at 75%, 90%, 95% utilization

### Potential Improvements
1. **Real-time Updates**: Currently loads on navigation, could add real-time listeners
2. **Batch Operations**: Calculate impact of cutting multiple players
3. **Contract Comparison**: Compare two contracts side-by-side
4. **Cap Trends**: Graph showing cap utilization over time

## File Structure

```
apps/web/src/app/
├── services/
│   ├── cap-ledger.service.ts          ✅ Created
│   └── number-format.service.ts       ✅ Exists
├── leagues/team/
│   ├── components/
│   │   └── cap-management/
│   │       ├── cap-management.component.ts    ✅ Created
│   │       ├── cap-management.component.html ✅ Created
│   │       └── cap-management.component.scss ✅ Created
│   ├── team.component.ts              ✅ Updated (imports cap-management)
│   └── team.component.html            ✅ Updated (uses cap-management)
└── ...

libs/types/src/lib/
└── types.ts                           ✅ Updated (CapLedger.leagueId)

docs/
└── CAP_MANAGEMENT_IMPLEMENTATION.md   ✅ This file
```

## Implementation Status

### ✅ Completed
- Cap Ledger Service created and functional
- Cap Management Component created with all 3 phases
- Component integrated into team component
- All calculations implemented (committed cap, dead money, available space)
- Active contracts table with sorting and actions
- Multi-year projection (5 years)
- Dead money breakdown table
- Expiring contracts table
- Position cap allocation with visualizations
- Cap calculator dialog (cut/trade impact)
- Type definitions updated (CapLedger.leagueId added)
- Component compiles successfully

### ⚠️ Remaining Integration Work

1. **Identify Trade Completion Function**
   - **Location**: Search for trade acceptance/completion code
   - **Files to Check**: 
     - `apps/functions/src/lib/` (trade functions)
     - `apps/web/src/app/services/` (trade service if exists)
     - `apps/web/src/app/trades/` (trade components)
   - **Action**: Add cap ledger entry creation when trade completes
   - **Code Pattern**: See "Integration Required" section above

2. **Identify Player Cut/Release Function**
   - **Location**: Search for player removal code
   - **Files to Check**:
     - `apps/web/src/app/services/team.service.ts` (has `removePlayerFromRoster`)
     - Contract update functions
   - **Action**: Add cap ledger entry creation when player is cut
   - **Code Pattern**: See "Integration Required" section above

3. **Add Firestore Indexes**
   - **File**: `firestore.indexes.json`
   - **Action**: Add indexes for capLedger collection queries
   - **Command**: `firebase deploy --only firestore:indexes`
   - **Indexes Needed**: See "Firestore Indexes Required" section above

4. **Verify Contract Status**
   - **Action**: Audit all contract creation/update points
   - **Ensure**: `status` field is always set ('active' | 'inactive' | 'released' | 'traded')
   - **Files to Check**: All contract creation/update functions

5. **End-to-End Testing**
   - Create a test league
   - Sign some players (creates contracts)
   - Cut a player (should create cap ledger entry)
   - Trade a player (should create cap ledger entry)
   - Verify cap management shows correct numbers

## Questions for Future Development

1. Should dead money from trades be split between teams (sender pays bonus, receiver pays salary)?
2. Should we track cap rollover (unused cap space from previous year)?
3. Should we support contract extensions (not just new contracts)?
4. Should we track performance bonuses that affect cap?
5. Should we support void years (contracts that extend beyond player's actual contract)?

## Support

If you encounter issues or need clarification:
1. Check the component code comments
2. Review the CapMath class in `libs/domain/src/lib/domain.ts`
3. Check Firestore console for cap ledger entries
4. Verify contract status fields are set correctly
