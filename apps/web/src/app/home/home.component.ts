import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  features = [
    {
      title: 'League Management',
      description:
        'Create and manage your dynasty fantasy football leagues with customizable rules and settings.',
      icon: '🏆',
      route: '/leagues',
    },
    {
      title: 'Salary Cap System',
      description:
        'Advanced salary cap management with contract structures, dead money calculations, and cap compliance.',
      icon: '💰',
      route: '/teams',
    },
    {
      title: 'Player Database',
      description:
        'Comprehensive player database with stats, traits, and development grades for informed decisions.',
      icon: '👤',
      route: '/players',
    },
    {
      title: 'Free Agency',
      description:
        'Dynamic free agency bidding system with real-time updates and AI negotiation.',
      icon: '🎯',
      route: '/free-agency',
    },
    {
      title: 'Draft Room',
      description:
        'Interactive draft room with timers, trade functionality, and rookie contract management.',
      icon: '📋',
      route: '/draft',
    },
    {
      title: 'Trade System',
      description:
        'Advanced trade system with cap impact previews and approval workflows.',
      icon: '🔄',
      route: '/trades',
    },
  ];

  quickActions = [
    { label: 'Create League', route: '/leagues', variant: 'primary' },
    { label: 'Join League', route: '/leagues', variant: 'secondary' },
    { label: 'Browse Players', route: '/players', variant: 'secondary' },
  ];
}
