import { Component, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { SliderModule } from 'primeng/slider';
import { InputNumberModule } from 'primeng/inputnumber';
import { Functions, httpsCallable } from '@angular/fire/functions';

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

interface SimulationResult {
  success: boolean;
  input: any;
  output: LLMOutput;
  tokensUsed: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface SimulationParams {
  weekNumber: number;
  personalityType: string;
  playerOverall: number;
  bidScenario: string;
}

@Component({
  selector: 'app-fa-simulator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    SelectModule,
    ProgressSpinnerModule,
    TabsModule,
    TagModule,
    TooltipModule,
    PanelModule,
    DividerModule,
    SliderModule,
    InputNumberModule,
    KeyValuePipe,
  ],
  templateUrl: './fa-simulator.component.html',
  styleUrls: ['./fa-simulator.component.scss'],
})
export class FaSimulatorComponent implements OnDestroy {
  private readonly functions = inject(Functions);

  // State
  isLoading = signal(false);
  currentWeek = signal(2);
  personalityType = signal('money_motivated');
  playerOverall = signal(88);
  bidScenario = signal('mixed');
  result = signal<SimulationResult | null>(null);
  error = signal<string | null>(null);
  logs = signal<
    Array<{
      time: string;
      message: string;
      type: 'info' | 'success' | 'warning' | 'error';
    }>
  >([
    {
      time: this.getTime(),
      message: 'System initialized. Click "Run Test Simulation" to begin.',
      type: 'info',
    },
  ]);

  weekOptions = [
    { label: 'Week 1 - Early FA (85% threshold)', value: 1 },
    { label: 'Week 2 - Early FA (85% threshold)', value: 2 },
    { label: 'Week 3 - Mid FA (70% threshold)', value: 3 },
    { label: 'Week 4 - Final (60% threshold, MUST decide)', value: 4 },
  ];

  personalityOptions = [
    {
      label: '💰 Money Motivated',
      value: 'money_motivated',
      description: 'Prioritizes salary & guarantees',
    },
    {
      label: '🏆 Competitor',
      value: 'competitor',
      description: 'Wants to win championships',
    },
    {
      label: '🏠 Loyalty First',
      value: 'loyalty_first',
      description: 'Values stability & trust',
    },
    {
      label: '⚖️ Balanced',
      value: 'balanced',
      description: 'Considers all factors equally',
    },
    {
      label: '🌴 Location Seeker',
      value: 'location_seeker',
      description: 'Prioritizes market & weather',
    },
    {
      label: '😤 High Ego',
      value: 'high_ego',
      description: 'Demands respect & top dollar',
    },
  ];

  bidScenarioOptions = [
    {
      label: 'Mixed Bids (Good, Medium, Lowball)',
      value: 'mixed',
      description: 'Standard test with varied offers',
    },
    {
      label: 'All Competitive',
      value: 'all_competitive',
      description: 'All bids near market value',
    },
    {
      label: 'All Lowball',
      value: 'all_lowball',
      description: 'All offers below market (should reject all)',
    },
    {
      label: 'Single Bid',
      value: 'single_bid',
      description: 'Only one team makes an offer',
    },
    {
      label: 'Has Starter Conflict',
      value: 'starter_conflict',
      description: 'Best offer from team with starter at position',
    },
    {
      label: 'Trust Issues',
      value: 'trust_issues',
      description: 'Best offer from team with negative trust',
    },
  ];

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  private getTime(): string {
    return new Date().toLocaleTimeString();
  }

  private log(
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ): void {
    this.logs.update((logs) => [
      ...logs,
      { time: this.getTime(), message, type },
    ]);
  }

  getExpectedAPY(): number {
    // Base calculation: $200k per overall point for WR
    return this.playerOverall() * 200000;
  }

  getPersonalityDescription(): string {
    return (
      this.personalityOptions.find((p) => p.value === this.personalityType())
        ?.description || ''
    );
  }

  getBidScenarioDescription(): string {
    return (
      this.bidScenarioOptions.find((s) => s.value === this.bidScenario())
        ?.description || ''
    );
  }

  async runSimulation(): Promise<void> {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    this.error.set(null);

    const params: SimulationParams = {
      weekNumber: this.currentWeek(),
      personalityType: this.personalityType(),
      playerOverall: this.playerOverall(),
      bidScenario: this.bidScenario(),
    };

    this.log(`Starting simulation...`, 'info');
    this.log(
      `Week: ${params.weekNumber} | Personality: ${params.personalityType} | Overall: ${params.playerOverall} | Scenario: ${params.bidScenario}`,
      'info'
    );

    try {
      this.log('Calling simulateFAWeekEvaluation function...', 'info');

      const simulateFn = httpsCallable<SimulationParams, SimulationResult>(
        this.functions,
        'simulateFAWeekEvaluation'
      );

      const response = await simulateFn(params);
      const data = response.data;

      this.result.set(data);

      if (data.success && data.output) {
        const output = data.output;
        this.log(
          `✅ Simulation complete! Decision: ${output.decision?.type}`,
          'success'
        );
        this.log(`Tokens used: ${data.tokensUsed?.total_tokens || 0}`, 'info');

        if (output.decision?.type === 'accepted') {
          const acceptedBid = output.bidAnalysis?.find(
            (b) => b.bidId === output.decision.acceptedBidId
          );
          this.log(
            `🎉 Player signed with ${acceptedBid?.teamName || 'Unknown'}!`,
            'success'
          );
        } else if (output.decision?.type === 'rejected_all') {
          this.log(`❌ Player rejected all offers`, 'warning');
        } else {
          this.log(
            `📋 ${
              output.decision?.shortlistedBidIds?.length || 0
            } offers shortlisted for next week`,
            'info'
          );
        }
      } else {
        this.log('Simulation returned but with unexpected format', 'warning');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown error occurred';
      this.error.set(errorMessage);
      this.log(`❌ Error: ${errorMessage}`, 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  clearResults(): void {
    this.result.set(null);
    this.error.set(null);
    this.logs.set([
      {
        time: this.getTime(),
        message: 'Results cleared. Ready for new simulation.',
        type: 'info',
      },
    ]);
  }

  getScoreColor(score: number): string {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  }

  getDecisionSeverity(
    decision: string
  ): 'success' | 'warning' | 'danger' | 'info' {
    switch (decision) {
      case 'accept':
      case 'accepted':
        return 'success';
      case 'shortlist':
      case 'shortlisted':
        return 'warning';
      case 'reject':
      case 'rejected':
      case 'rejected_all':
        return 'danger';
      default:
        return 'info';
    }
  }

  formatScore(score: number): string {
    return `${Math.round(score * 100)}%`;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  getDesiresList(desires: LLMOutput['feedback']['desires']): string[] {
    const list: string[] = [];
    if (desires?.wantsMoreMoney) list.push('💰 More Money');
    if (desires?.wantsMoreGuarantees) list.push('🔒 More Guarantees');
    if (desires?.wantsLongerDeal) list.push('📅 Longer Deal');
    if (desires?.wantsShorterDeal) list.push('⏱️ Shorter Deal');
    if (desires?.wantsBetterRole) list.push('⭐ Better Role');
    if (desires?.wantsBiggerMarket) list.push('🏙️ Bigger Market');
    return list;
  }
}
