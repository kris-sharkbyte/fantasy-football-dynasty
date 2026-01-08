import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PlayerFeedbackData {
  status: 'pending' | 'accepted' | 'shortlisted' | 'considering' | 'rejected';
  feedback?: string | null; // Public statement
  teamMessage?: string | null; // Private message to team
}

@Component({
  selector: 'app-player-feedback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-feedback.component.html',
  styleUrls: ['./player-feedback.component.scss'],
})
export class PlayerFeedbackComponent {
  @Input() feedbackData!: PlayerFeedbackData | null;
  @Input() showLabel: boolean = true; // Whether to show the status label
  @Input() variant: 'default' | 'compact' = 'default'; // Display variant

  // Computed properties for display
  statusIcon = computed(() => {
    const status = this.feedbackData?.status;
    if (!status) return 'pi-info-circle text-blue-400';

    switch (status) {
      case 'accepted':
        return 'pi-check-circle text-green-400';
      case 'shortlisted':
      case 'considering':
        return 'pi-clock text-orange-400';
      case 'rejected':
        return 'pi-times-circle text-red-400';
      case 'pending':
      default:
        return 'pi-info-circle text-blue-400';
    }
  });

  statusLabel = computed(() => {
    const status = this.feedbackData?.status;
    if (!status) return 'Player Response';

    switch (status) {
      case 'accepted':
        return 'Previous Bid - Accepted';
      case 'shortlisted':
      case 'considering':
        return 'Previous Bid - Under Consideration';
      case 'rejected':
        return 'Previous Bid - Rejected';
      case 'pending':
      default:
        return 'Previous Bid - Pending';
    }
  });

  messageLabel = computed(() => {
    const status = this.feedbackData?.status;
    const hasTeamMessage = !!this.feedbackData?.teamMessage;

    if (!hasTeamMessage) return 'Player Response:';

    switch (status) {
      case 'accepted':
        return 'Private Message to Your Team:';
      case 'shortlisted':
      case 'considering':
        return 'Player Feedback:';
      case 'rejected':
        return 'Rejection Reason:';
      case 'pending':
      default:
        return 'Player Response:';
    }
  });

  hasFeedback(): boolean {
    return !!(this.feedbackData?.feedback || this.feedbackData?.teamMessage);
  }

  shouldShowPublicStatement(): boolean {
    return !!(
      this.feedbackData?.feedback &&
      this.feedbackData?.teamMessage &&
      this.feedbackData.feedback !== this.feedbackData.teamMessage
    );
  }
}

