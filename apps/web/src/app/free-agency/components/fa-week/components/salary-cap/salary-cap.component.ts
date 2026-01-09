import { Component, inject, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';
import { TeamService } from '../../../../../services/team.service';
import { LeagueService } from '../../../../../services/league.service';
import { FreeAgencyService } from '../../../../../services/free-agency.service';
import { NumberFormatService } from '../../../../../services/number-format.service';
import { SportsDataService } from '../../../../../services/sports-data.service';
import { Position, FABid, Contract } from '@fantasy-football-dynasty/types';
import { CapMath } from '@fantasy-football-dynasty/domain';

interface BidSummaryItem {
  playerId: string;
  playerName: string;
  bidId: string;
  status: 'accepted' | 'shortlisted' | 'rejected' | 'considering' | 'pending';
  apy: number;
  years: number;
  signingBonus: number;
  guarantees: number;
  feedback?: string;
  decisionReason?: string;
  position?: string;
}

@Component({
  selector: 'app-salary-cap',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    CardModule,
    TagModule,
    TableModule,
    ButtonModule,
    TabsModule,
  ],
  templateUrl: './salary-cap.component.html',
  styleUrls: ['./salary-cap.component.scss'],
})
export class SalaryCapComponent {
  private readonly firestore = inject(Firestore);
  private readonly teamService = inject(TeamService);
  private readonly leagueService = inject(LeagueService);
  private readonly freeAgencyService = inject(FreeAgencyService);
  private readonly numberFormatService = inject(NumberFormatService);
  private readonly sportsDataService = inject(SportsDataService);
  
  // Cache for team contracts
  private _teamContractsCache = signal<Map<string, Contract[]>>(new Map());

  // Bid summary dialog visibility (regular property for two-way binding)
  private _showBidSummaryDialog = false;
  
  get showBidSummaryDialog(): boolean {
    return this._showBidSummaryDialog;
  }
  
  set showBidSummaryDialog(value: boolean) {
    this._showBidSummaryDialog = value;
    // Sync with service signal
    this.freeAgencyService.showBidSummary.set(value);
  }

  // Computed values from services - now using cached data
  public activeBids = computed(() => this.freeAgencyService.activeBids());

  // Use cached league data
  public currentUserTeam = computed(() => this.leagueService.currentUserTeam());
  public leagueTeams = computed(() => this.leagueService.leagueTeams());
  public selectedLeague = computed(() => this.leagueService.selectedLeague());

  // Team cap information from cached data
  public currentTeamCap = computed(() => {
    const myTeam = this.currentUserTeam();
    if (!myTeam) return 0;

    // Get actual team cap space from cached data
    return myTeam.capSpace || 200000000; // Use actual cap space or default
  });

  // Team bids filtered for current user
  public currentTeamBids = computed(() => {
    const myTeam = this.currentUserTeam();
    if (!myTeam?.teamId) return [];

    return this.activeBids().filter((bid: any) => bid.teamId === myTeam.teamId);
  });

  // Get current year from league
  public currentYear = computed(() => {
    const league = this.selectedLeague();
    return league?.currentYear || new Date().getFullYear();
  });

  // Team contracts signal
  private _teamContracts = signal<Contract[]>([]);

  // Calculate total cap hit from active contracts
  public totalContractsCapHit = computed(() => {
    const contracts = this._teamContracts();
    const year = this.currentYear();
    
    return contracts.reduce((total, contract) => {
      return total + CapMath.calculateCapHit(contract, year);
    }, 0);
  });

  // Salary cap calculations
  public totalBidsValue = computed(() => {
    return this.currentTeamBids()
      .filter((bid) => bid.status === 'pending')
      .reduce((sum, bid) => sum + (bid.offer.totalValue || 0), 0);
  });

  public remainingCapSpace = computed(() => {
    const totalCap = this.currentTeamCap();
    const totalBidsValue = this.totalBidsValue();
    const totalContractsCapHit = this.totalContractsCapHit();
    return totalCap - totalBidsValue - totalContractsCapHit;
  });

  // Convert contract offer to baseSalary structure
  private convertContractToBaseSalary(contractData: any, startYear: number): Record<number, number> {
    const baseSalary: Record<number, number> = {};
    const years = contractData['years'] || 1;
    const apy = contractData['apy'] || 0;

    // If baseSalary is already a record, use it
    if (contractData['baseSalary'] && typeof contractData['baseSalary'] === 'object') {
      return contractData['baseSalary'];
    }

    // Otherwise, calculate from APY - spread evenly across years
    for (let i = 0; i < years; i++) {
      baseSalary[startYear + i] = apy;
    }

    return baseSalary;
  }

  // Load team contracts
  private async loadTeamContracts(): Promise<void> {
    const myTeam = this.currentUserTeam();
    const league = this.selectedLeague();
    if (!myTeam?.teamId || !league?.id) {
      this._teamContracts.set([]);
      return;
    }

    // Check cache first
    const cacheKey = `${league.id}_${myTeam.teamId}`;
    const cached = this._teamContractsCache().get(cacheKey);
    if (cached) {
      this._teamContracts.set(cached);
      return;
    }

    try {
      const contractsRef = collection(this.firestore, 'contracts');
      const q = query(
        contractsRef,
        where('leagueId', '==', league.id),
        where('teamId', '==', myTeam.teamId),
        where('status', '==', 'active')
      );

      const snapshot = await getDocs(q);
      const contracts: Contract[] = [];
      const currentYear = this.currentYear();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const contractOffer = data['contract'] || data; // Contract offer is nested in 'contract' field
        
        // Contract offer structure: { years, apy, baseSalary, signingBonus, guarantees }
        const years = contractOffer['years'] || 1;
        const apy = contractOffer['apy'] || 0;
        
        // Determine start year - use signedAt year if available, otherwise current year
        const signedAt = data['signedAt']?.toDate() || data['createdAt']?.toDate();
        const signedYear = signedAt ? signedAt.getFullYear() : currentYear;
        const startYear = data['startYear'] || signedYear;
        const endYear = data['endYear'] || startYear + years - 1;
        
        // Convert to Contract interface
        const contract: Contract = {
          id: doc.id,
          playerId: data['leaguePlayerId'] || data['playerId'] || '',
          teamId: data['teamId'],
          startYear: startYear,
          endYear: endYear,
          baseSalary: this.convertContractToBaseSalary(contractOffer, startYear),
          signingBonus: contractOffer['signingBonus'] || 0,
          guarantees: contractOffer['guarantees'] || [],
          noTradeClause: contractOffer['noTradeClause'] || false,
          createdAt: data['createdAt']?.toDate() || new Date(),
        };
        contracts.push(contract);
      });

      // Update cache and signal
      this._teamContractsCache.update((cache) => {
        const newCache = new Map(cache);
        newCache.set(cacheKey, contracts);
        return newCache;
      });
      this._teamContracts.set(contracts);
    } catch (error) {
      console.error('[Salary Cap] Error loading team contracts:', error);
      this._teamContracts.set([]);
    }
  }

  // Additional computed values for display
  public totalTeams = computed(() => this.leagueTeams().length);
  public teamsWithBids = computed(() => {
    const teamIdsWithBids = new Set(
      this.activeBids().map((bid: any) => bid.teamId)
    );
    return teamIdsWithBids.size;
  });

  // Roster spot tracking
  public rosterSpotTracking = computed(() => {
    const league = this.selectedLeague();
    const myTeam = this.currentUserTeam();
    const myBids = this.currentTeamBids();

    if (!league?.rules?.roster?.positionRequirements || !myTeam) {
      return [];
    }

    const positionRequirements = league.rules.roster.positionRequirements;
    const tracking: Array<{
      position: Position;
      required: number;
      currentBids: number;
      status: 'under-limit' | 'at-limit' | 'over-limit';
    }> = [];

    // Get all positions that have requirements
    Object.entries(positionRequirements).forEach(([position, required]) => {
      const pos = position as Position;
      const requiredCount = required as number;

      // Count non-rejected bids for this position
      const currentBids = myBids.filter(
        (bid) => bid.position === pos && bid.status !== 'rejected'
      ).length;

      // Determine status
      let status: 'under-limit' | 'at-limit' | 'over-limit' = 'under-limit';
      if (currentBids > requiredCount) {
        status = 'over-limit';
      } else if (currentBids === requiredCount) {
        status = 'at-limit';
      }

      tracking.push({
        position: pos,
        required: requiredCount,
        currentBids,
        status,
      });
    });

    // Sort by position for consistent display
    return tracking.sort((a, b) => a.position.localeCompare(b.position));
  });

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return this.numberFormatService.formatCurrency(amount);
  }

  // Bid summary functionality (integrated from bid-summary component)
  currentUserTeamId = computed(() => this.leagueService.currentUserTeamId());

  // Get all team bids
  allTeamBids = computed(() => {
    const myTeamId = this.currentUserTeamId();
    if (!myTeamId) {
      return [];
    }
    return this.freeAgencyService.getAllTeamBids(myTeamId);
  });

  // Filter bids by status
  acceptedBids = computed(() => {
    return this.allTeamBids()
      .filter((bid) => bid.status === 'accepted')
      .map((bid) => this.mapBidToSummaryItem(bid, 'accepted'));
  });

  shortlistedBids = computed(() => {
    return this.allTeamBids()
      .filter((bid) => bid.status === 'shortlisted')
      .map((bid) => this.mapBidToSummaryItem(bid, 'shortlisted'));
  });

  rejectedBids = computed(() => {
    return this.allTeamBids()
      .filter((bid) => bid.status === 'rejected')
      .map((bid) => this.mapBidToSummaryItem(bid, 'rejected'));
  });

  consideringBids = computed(() => {
    return this.allTeamBids()
      .filter((bid) => bid.status === 'considering')
      .map((bid) => this.mapBidToSummaryItem(bid, 'considering'));
  });

  pendingBids = computed(() => {
    return this.allTeamBids()
      .filter((bid) => bid.status === 'pending')
      .map((bid) => this.mapBidToSummaryItem(bid, 'pending'));
  });

  // Financial summary for accepted bids
  financialSummary = computed(() => {
    const accepted = this.acceptedBids();
    
    const totalContractValue = accepted.reduce((sum, bid) => {
      return sum + (bid.apy * bid.years) + bid.signingBonus;
    }, 0);

    const totalSigningBonuses = accepted.reduce((sum, bid) => sum + bid.signingBonus, 0);
    const totalGuarantees = accepted.reduce((sum, bid) => sum + bid.guarantees, 0);
    const totalYears = accepted.reduce((sum, bid) => sum + bid.years, 0);
    const averageAPY = accepted.length > 0 
      ? accepted.reduce((sum, bid) => sum + bid.apy, 0) / accepted.length 
      : 0;

    return {
      totalContractValue,
      totalSigningBonuses,
      totalGuarantees,
      totalYears,
      averageAPY,
      acceptedCount: accepted.length,
    };
  });

  // Position breakdown for accepted bids
  positionBreakdown = computed(() => {
    const accepted = this.acceptedBids();
    const breakdown: Record<string, { count: number; totalValue: number; averageAPY: number }> = {};

    accepted.forEach((bid) => {
      const pos = bid.position || 'UNK';
      if (!breakdown[pos]) {
        breakdown[pos] = { count: 0, totalValue: 0, averageAPY: 0 };
      }
      breakdown[pos].count++;
      breakdown[pos].totalValue += (bid.apy * bid.years) + bid.signingBonus;
    });

    // Calculate average APY per position
    Object.keys(breakdown).forEach((pos) => {
      const bids = accepted.filter((b) => (b.position || 'UNK') === pos);
      breakdown[pos].averageAPY = bids.length > 0
        ? bids.reduce((sum, b) => sum + b.apy, 0) / bids.length
        : 0;
    });

    return breakdown;
  });

  // Helper method to map FABid to BidSummaryItem
  private mapBidToSummaryItem(
    bid: FABid,
    status: 'accepted' | 'shortlisted' | 'rejected' | 'considering' | 'pending'
  ): BidSummaryItem {
    const player = this.sportsDataService.getPlayerById(bid.playerId);
    const playerName = player
      ? `${player.FirstName} ${player.LastName}`.trim()
      : 'Unknown Player';

    const totalGuarantees = Array.isArray(bid.offer?.guarantees)
      ? bid.offer.guarantees.reduce(
          (sum: number, g: any) => sum + (g.amount || 0),
          0
        )
      : 0;

    return {
      playerId: String(bid.playerId),
      playerName,
      bidId: bid.id,
      status,
      apy: bid.offer?.apy || 0,
      years: bid.offer?.years || 0,
      signingBonus: bid.offer?.signingBonus || 0,
      guarantees: totalGuarantees,
      feedback: bid.feedback,
      decisionReason: bid.teamMessage,
      position: bid.position,
    };
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (status) {
      case 'accepted':
        return 'success';
      case 'shortlisted':
        return 'info';
      case 'considering':
        return 'warning';
      case 'pending':
        return 'info';
      case 'rejected':
        return 'danger';
      default:
        return 'info';
    }
  }

  openBidSummary(): void {
    this.showBidSummaryDialog = true;
  }

  closeBidSummary(): void {
    this.showBidSummaryDialog = false;
  }

  // Helper methods for Object operations in template
  getObjectKeys(obj: Record<string, any>): string[] {
    return Object.keys(obj);
  }

  getObjectEntries(obj: Record<string, any>): Array<[string, any]> {
    return Object.entries(obj);
  }

  constructor() {
    // Watch for showBidSummary signal from service (triggered by week advancement)
    effect(() => {
      const shouldShow = this.freeAgencyService.showBidSummary();
      if (shouldShow && !this._showBidSummaryDialog) {
        this.showBidSummaryDialog = true;
      }
    });

    // Load team contracts when team or league changes
    effect(() => {
      const myTeam = this.currentUserTeam();
      const league = this.selectedLeague();
      if (myTeam?.teamId && league?.id) {
        this.loadTeamContracts();
      }
    });
  }
}
