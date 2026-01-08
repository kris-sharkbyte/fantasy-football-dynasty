import { Component, inject, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Firestore, collection, query, where, orderBy, limit, onSnapshot } from '@angular/fire/firestore';
import { Timestamp } from '@angular/fire/firestore';

export interface SocialMediaPost {
  id: string;
  playerId: string;
  playerName: string;
  position: string;
  post: string;
  postedAt: Date;
  weekNumber?: number;
  context?: 'free-agency' | 'draft' | 'trade' | 'general';
}

@Component({
  selector: 'app-social-media-feed-modal',
  standalone: true,
  imports: [CommonModule, DialogModule, CardModule, ButtonModule, TagModule],
  templateUrl: './social-media-feed-modal.component.html',
  styleUrls: ['./social-media-feed-modal.component.scss'],
})
export class SocialMediaFeedModalComponent {
  private readonly db = inject(Firestore);

  // Inputs
  visible = input.required<boolean>();
  leagueId = input.required<string>();

  // Outputs
  visibleChange = output<boolean>();

  // State
  posts = signal<SocialMediaPost[]>([]);
  isLoading = signal(true);

  // Regular property for p-dialog (doesn't support signals yet)
  // This is bound with [(visible)] in the template
  dialogVisible = false;

  // Effects
  constructor() {
    // Sync input signal to regular property for p-dialog
    effect(() => {
      this.dialogVisible = this.visible();
    });
    
    // Sync property changes back to output
    effect(() => {
      if (!this.dialogVisible) {
        this.visibleChange.emit(false);
      }
    });

    effect(() => {
      const isVisible = this.dialogVisible;
      const league = this.leagueId();
      
      if (isVisible && league) {
        this.loadPosts(league);
      }
    });
  }

  private loadPosts(leagueId: string): void {
    this.isLoading.set(true);
    
    const postsRef = collection(this.db, 'leagues', leagueId, 'socialMediaPosts');
    const q = query(
      postsRef,
      orderBy('postedAt', 'desc'),
      limit(50) // Last 50 posts
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const postsData: SocialMediaPost[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const postedAt = data['postedAt'];
          postsData.push({
            id: doc.id,
            playerId: data['playerId'] || '',
            playerName: data['playerName'] || 'Unknown Player',
            position: data['position'] || '',
            post: data['post'] || '',
            postedAt: postedAt?.toDate ? postedAt.toDate() : new Date(postedAt),
            weekNumber: data['weekNumber'],
            context: data['context'] || 'general',
          });
        });
        this.posts.set(postsData);
        this.isLoading.set(false);
      },
      (error) => {
        console.error('Error loading social media posts:', error);
        this.isLoading.set(false);
      }
    );
  }

  getContextIcon(context?: string): string {
    switch (context) {
      case 'free-agency':
        return 'pi-dollar';
      case 'draft':
        return 'pi-star';
      case 'trade':
        return 'pi-exchange';
      default:
        return 'pi-comment';
    }
  }

  getContextLabel(context?: string): string {
    switch (context) {
      case 'free-agency':
        return 'Free Agency';
      case 'draft':
        return 'Draft';
      case 'trade':
        return 'Trade';
      default:
        return 'General';
    }
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }
}

