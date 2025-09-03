import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import {
  OffseasonTestService,
  OffseasonTestConfig,
  OffseasonTestResult,
  TeamBidResult,
  LeagueBidSummary,
} from '../../services/offseason-test.service';

@Component({
  selector: 'app-offseason-test',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    ProgressSpinnerModule,
    MessageModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './offseason-test.component.html',
  styleUrls: ['./offseason-test.component.scss'],
})
export class OffseasonTestComponent implements OnInit {
  private readonly offseasonTestService = inject(OffseasonTestService);

  // State signals
  isLoading = signal(false);
  testResult = signal<OffseasonTestResult | null>(null);
  currentStep = signal<string>('Ready to start');
  testConfig = signal<OffseasonTestConfig>({
    leagueName: 'Offseason Test League',
    numberOfTeams: 12,
    maxContractYears: 3,
    rosterRequirements: {
      QB: 1,
      RB: 2,
      WR: 3,
      TE: 1,
      DEF: 1,
      K: 1,
      DL: 0,
      LB: 0,
      DB: 0,
    },
    salaryCap: 200000000,
    faWeekDuration: 4,
  });

  // Test execution tracking
  testSteps = signal<string[]>([
    'Create test league',
    'Create 12 teams with empty rosters',
    'Set up 4 FA weeks',
    'Activate first FA week',
    'Load players into league',
    'Ready for testing',
  ]);

  currentStepIndex = signal(0);

  // Computed values for template
  totalRosterSize = computed(() => {
    const requirements = this.testConfig().rosterRequirements;
    return Object.values(requirements).reduce((sum, count) => sum + count, 0);
  });

  // Additional state signals for bid tracking
  teamResults = signal<TeamBidResult[]>([]);
  leagueSummary = signal<LeagueBidSummary | null>(null);
  showBidAnalytics = signal<boolean>(false);

  // New state signals for offseason progression
  currentWeek = signal<number>(1);
  totalPlayers = signal<number>(0);
  weekResults = signal<{
    week: number;
    bidsProcessed: number;
    playersSigned: number;
    message: string;
  } | null>(null);

  // Helper methods for template
  onLeagueNameChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.updateConfig('leagueName', value);
  }

  onNumberOfTeamsChange(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.updateConfig('numberOfTeams', value);
  }

  onMaxContractYearsChange(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.updateConfig('maxContractYears', value);
  }

  ngOnInit(): void {
    // Component is ready
  }

  /**
   * Start the offseason test
   */
  async startOffseasonTest(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.currentStep.set('Creating test league...');
      this.currentStepIndex.set(0);
      this.currentWeek.set(1); // Reset to week 1

      // Create the test league
      const result = await this.offseasonTestService.createOffseasonTestLeague(
        this.testConfig()
      );

      this.testResult.set(result);
      this.currentStepIndex.set(4); // Skip to "Load players" step

      if (result.success) {
        this.currentStep.set(
          'Test league created successfully! Ready to load players.'
        );
        console.log('Offseason test result:', result);
      } else {
        this.currentStep.set(`Test failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Error in offseason test:', error);
      this.currentStep.set(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Load players into the test league
   */
  async loadPlayers(): Promise<void> {
    if (!this.testResult()?.leagueId) {
      this.currentStep.set('No test league found. Please create one first.');
      return;
    }

    try {
      this.isLoading.set(true);
      this.currentStep.set('Loading players into league...');
      this.currentStepIndex.set(5);

      // Load players using the service
      const result = await this.offseasonTestService.loadPlayers(
        this.testResult()!.leagueId!
      );

      if (result.success) {
        this.totalPlayers.set(result.playerCount);
        this.currentStep.set(result.message);
        this.currentStepIndex.set(6);
      } else {
        this.currentStep.set(`Error loading players: ${result.message}`);
      }
    } catch (error) {
      console.error('Error loading players:', error);
      this.currentStep.set(
        `Error loading players: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Simulate team bidding activity
   */
  async simulateBidding(): Promise<void> {
    if (!this.testResult()?.leagueId) {
      this.currentStep.set('No test league found. Please create one first.');
      return;
    }

    try {
      this.isLoading.set(true);
      this.currentStep.set(
        `Simulating team bidding activity for Week ${this.currentWeek()}...`
      );

      // Simulate bidding
      await this.offseasonTestService.simulateTeamBidding(
        this.testResult()!.leagueId!
      );

      // Get team results and league summary
      const results = await this.offseasonTestService.getTeamResults(
        this.testResult()!.leagueId!
      );
      const summary = await this.offseasonTestService.getLeagueBidSummary(
        this.testResult()!.leagueId!
      );

      this.teamResults.set(results);
      this.leagueSummary.set(summary);
      this.showBidAnalytics.set(true);

      this.currentStep.set(
        `Week ${this.currentWeek()} bidding simulation completed! View analytics below.`
      );
    } catch (error) {
      console.error('Error simulating bidding:', error);
      this.currentStep.set(
        `Bidding simulation error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Advance to the next week and process bids
   */
  async advanceWeek(): Promise<void> {
    if (!this.testResult()?.leagueId) {
      this.currentStep.set('No test league found. Please create one first.');
      return;
    }

    try {
      this.isLoading.set(true);
      this.currentStep.set(`Advancing from Week ${this.currentWeek()}...`);

      // Advance week using the service
      const result = await this.offseasonTestService.advanceWeek(
        this.testResult()!.leagueId!
      );

      if (result.success) {
        this.currentWeek.set(result.week);
        this.weekResults.set({
          week: result.week - 1, // The week that was just completed
          bidsProcessed: result.bidsProcessed,
          playersSigned: result.playersSigned,
          message: result.message,
        });

        this.currentStep.set(result.message);

        // Refresh analytics to show updated results
        await this.refreshAnalytics();
      } else {
        this.currentStep.set(result.message);
      }
    } catch (error) {
      console.error('Error advancing week:', error);
      this.currentStep.set(
        `Error advancing week: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Refresh bid analytics
   */
  async refreshAnalytics(): Promise<void> {
    if (!this.testResult()?.leagueId) return;

    try {
      this.isLoading.set(true);

      const results = await this.offseasonTestService.getTeamResults(
        this.testResult()!.leagueId!
      );
      const summary = await this.offseasonTestService.getLeagueBidSummary(
        this.testResult()!.leagueId!
      );

      this.teamResults.set(results);
      this.leagueSummary.set(summary);
    } catch (error) {
      console.error('Error refreshing analytics:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Run the complete offseason simulation
   */
  async runSimulation(): Promise<void> {
    if (!this.testResult()?.leagueId) {
      this.currentStep.set('No test league found. Please create one first.');
      return;
    }

    try {
      this.isLoading.set(true);
      this.currentStep.set('Running offseason simulation...');

      await this.offseasonTestService.runOffseasonSimulation(
        this.testResult()!.leagueId!
      );

      this.currentStep.set('Offseason simulation completed!');
    } catch (error) {
      console.error('Error running simulation:', error);
      this.currentStep.set(
        `Simulation error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Reset the test
   */
  resetTest(): void {
    this.testResult.set(null);
    this.currentStep.set('Ready to start');
    this.currentStepIndex.set(0);
    this.teamResults.set([]);
    this.leagueSummary.set(null);
    this.showBidAnalytics.set(false);
    this.currentWeek.set(1);
    this.totalPlayers.set(0);
    this.weekResults.set(null);
  }

  /**
   * Update test configuration
   */
  updateConfig(field: keyof OffseasonTestConfig, value: any): void {
    this.testConfig.update((config) => ({
      ...config,
      [field]: value,
    }));
  }

  /**
   * Get step status for display
   */
  getStepStatus(stepIndex: number): 'completed' | 'current' | 'pending' {
    if (stepIndex < this.currentStepIndex()) return 'completed';
    if (stepIndex === this.currentStepIndex()) return 'current';
    return 'pending';
  }

  // Utility methods for display
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'accepted':
        return 'px-2 py-1 text-xs rounded-full bg-green-100 text-green-800';
      case 'rejected':
        return 'px-2 py-1 text-xs rounded-full bg-red-100 text-red-800';
      case 'pending':
        return 'px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800';
      case 'shortlisted':
        return 'px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800';
      default:
        return 'px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800';
    }
  }

  // Helper methods for template calculations
  getPositionDemand(position: string): number {
    const summary = this.leagueSummary();
    if (!summary?.positionDemand) return 0;
    return (
      summary.positionDemand[position as keyof typeof summary.positionDemand] ||
      0
    );
  }

  calculateSuccessRate(successful: number, total: number): number {
    return total > 0 ? Math.round((successful / total) * 100) : 0;
  }
}
