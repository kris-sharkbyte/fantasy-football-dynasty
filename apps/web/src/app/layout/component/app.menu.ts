import { Component, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, AppMenuitem, RouterModule],
  template: `<ul class="layout-menu">
    @for (item of menuModel(); track i; let i = $index) { @if (!item.separator)
    {
    <li app-menuitem [item]="item" [index]="i" [root]="true"></li>
    } @if (item.separator) {
    <li class="menu-separator"></li>
    } }
  </ul>`,
})
export class AppMenu implements OnInit {
  private readonly adminMenu: MenuItem[] = [
    {
      label: 'Home',
      items: [
        { label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/'] },
      ],
    } as MenuItem,
  ];

  menuModel = computed(() => this.adminMenu);

  ngOnInit() {
    // Menu model is now handled by the computed signal
  }
}
