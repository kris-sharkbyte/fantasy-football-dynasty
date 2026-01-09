import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, query, orderBy, limit, where, getDocs, Timestamp, deleteDoc, doc } from '@angular/fire/firestore';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
// Note: DatePicker not available in PrimeNG 20, using text input for now
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { CardModule } from 'primeng/card';
import { TabsModule } from 'primeng/tabs';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

interface FunctionLog {
  id: string;
  functionName: string;
  status: 'running' | 'success' | 'error';
  startTime: Date | Timestamp;
  endTime?: Date | Timestamp;
  duration?: number;
  request?: any;
  response?: any;
  logs: Array<{
    level: 'info' | 'debug' | 'warn' | 'error';
    message: string;
    timestamp: Date | Timestamp;
    data?: any;
  }>;
  error?: string;
  userId?: string;
  adminId?: string;
  metadata?: any;
}

@Component({
  selector: 'app-function-logs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    DialogModule,
    CardModule,
    TabsModule,
    ToastModule,
    ProgressSpinnerModule,
  ],
  providers: [MessageService],
  templateUrl: './function-logs.component.html',
  styleUrls: ['./function-logs.component.scss'],
})
export class FunctionLogsComponent implements OnInit {
  private readonly firestore = inject(Firestore);
  private readonly messageService = inject(MessageService);

  // State
  logs = signal<FunctionLog[]>([]);
  isLoading = signal(false);
  selectedLog = signal<FunctionLog | null>(null);
  showDetailDialog = signal(false);

  // Filters
  functionNameFilter = signal<string | null>(null);
  statusFilter = signal<'all' | 'success' | 'error' | 'running'>('all');
  dateRange = signal<Date[] | null>(null);

  // Statistics
  stats = computed(() => {
    const allLogs = this.logs();
    const total = allLogs.length;
    const success = allLogs.filter((l) => l.status === 'success').length;
    const error = allLogs.filter((l) => l.status === 'error').length;
    const running = allLogs.filter((l) => l.status === 'running').length;
    const avgDuration =
      allLogs
        .filter((l) => l.duration)
        .reduce((sum, l) => sum + (l.duration || 0), 0) /
      allLogs.filter((l) => l.duration).length || 0;

    return {
      total,
      success,
      error,
      running,
      successRate: total > 0 ? ((success / total) * 100).toFixed(1) : '0',
      avgDuration: Math.round(avgDuration),
    };
  });

  // Filtered logs
  filteredLogs = computed(() => {
    let filtered = [...this.logs()];

    // Function name filter
    if (this.functionNameFilter()) {
      const filter = this.functionNameFilter()!.toLowerCase();
      filtered = filtered.filter((log) =>
        log.functionName.toLowerCase().includes(filter)
      );
    }

    // Status filter
    if (this.statusFilter() !== 'all') {
      filtered = filtered.filter((log) => log.status === this.statusFilter());
    }

    // Date range filter
    if (this.dateRange() && this.dateRange()!.length === 2) {
      const [start, end] = this.dateRange()!;
      filtered = filtered.filter((log) => {
        const logDate = this.getLogDate(log.startTime);
        return logDate >= start && logDate <= end;
      });
    }

    return filtered.sort((a, b) => {
      const dateA = this.getLogDate(a.startTime);
      const dateB = this.getLogDate(b.startTime);
      return dateB.getTime() - dateA.getTime();
    });
  });

  // Function name options
  functionNameOptions = computed(() => {
    const names = new Set(this.logs().map((log) => log.functionName));
    return Array.from(names).sort().map(name => ({ label: name, value: name }));
  });

  // Expose JSON for template
  JSON = JSON;

  ngOnInit(): void {
    this.loadLogs();
  }

  async loadLogs(): Promise<void> {
    try {
      this.isLoading.set(true);
      const logsRef = collection(this.firestore, 'functionLogs');
      const q = query(logsRef, orderBy('startTime', 'desc'), limit(100));
      const snapshot = await getDocs(q);

      const logs: FunctionLog[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        logs.push({
          id: doc.id,
          ...data,
          startTime: this.convertTimestamp(data['startTime']),
          endTime: data['endTime'] ? this.convertTimestamp(data['endTime']) : undefined,
          logs: (data['logs'] || []).map((log: any) => ({
            ...log,
            timestamp: this.convertTimestamp(log.timestamp),
          })),
        } as FunctionLog);
      });

      this.logs.set(logs);
    } catch (error) {
      console.error('Error loading logs:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load function logs',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  viewLog(log: FunctionLog): void {
    this.selectedLog.set(log);
    this.showDetailDialog.set(true);
  }

  closeDetailDialog(): void {
    this.showDetailDialog.set(false);
    this.selectedLog.set(null);
  }

  async deleteLog(logId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.firestore, 'functionLogs', logId));
      this.logs.update((logs) => logs.filter((l) => l.id !== logId));
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Log deleted',
      });
    } catch (error) {
      console.error('Error deleting log:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete log',
      });
    }
  }

  clearFilters(): void {
    this.functionNameFilter.set(null);
    this.statusFilter.set('all');
    this.dateRange.set(null);
  }

  getStatusSeverity(status: string): 'success' | 'danger' | 'warning' | 'info' {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'danger';
      case 'running':
        return 'warning';
      default:
        return 'info';
    }
  }

  getLogLevelSeverity(level: string): 'success' | 'danger' | 'warning' | 'info' {
    switch (level) {
      case 'error':
        return 'danger';
      case 'warn':
        return 'warning';
      case 'info':
        return 'info';
      case 'debug':
        return 'info';
      default:
        return 'info';
    }
  }

  formatDuration(ms: number | undefined): string {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  formatDate(date: Date | Timestamp | undefined): string {
    if (!date) return '-';
    const d = this.convertTimestamp(date);
    return d.toLocaleString();
  }

  private convertTimestamp(timestamp: Date | Timestamp): Date {
    if (timestamp instanceof Date) return timestamp;
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    return new Date();
  }

  private getLogDate(timestamp: Date | Timestamp): Date {
    return this.convertTimestamp(timestamp);
  }

  async copyTabContent(tab: 'overview' | 'logs' | 'request' | 'response'): Promise<void> {
    if (!this.selectedLog()) return;

    let content = '';
    
    switch (tab) {
      case 'overview':
        content = this.formatOverviewContent();
        break;
      case 'logs':
        content = this.formatLogsContent();
        break;
      case 'request':
        content = this.formatRequestContent();
        break;
      case 'response':
        content = this.formatResponseContent();
        break;
    }

    try {
      await navigator.clipboard.writeText(content);
      this.messageService.add({
        severity: 'success',
        summary: 'Copied',
        detail: `${tab.charAt(0).toUpperCase() + tab.slice(1)} content copied to clipboard`,
        life: 2000,
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to copy to clipboard',
        life: 3000,
      });
    }
  }

  private formatOverviewContent(): string {
    const log = this.selectedLog()!;
    return `Function: ${log.functionName}
Status: ${log.status}
Start Time: ${this.formatDate(log.startTime)}
End Time: ${this.formatDate(log.endTime)}
Duration: ${this.formatDuration(log.duration)}
${log.error ? `Error: ${log.error}\n` : ''}${log.userId ? `User ID: ${log.userId}\n` : ''}${log.adminId ? `Admin ID: ${log.adminId}\n` : ''}`;
  }

  private formatLogsContent(): string {
    const log = this.selectedLog()!;
    return log.logs.map(entry => {
      let content = `[${entry.level.toUpperCase()}] ${this.formatDate(entry.timestamp)} - ${entry.message}`;
      if (entry.data) {
        content += `\n${JSON.stringify(entry.data, null, 2)}`;
      }
      return content;
    }).join('\n\n');
  }

  private formatRequestContent(): string {
    const log = this.selectedLog()!;
    return log.request ? JSON.stringify(log.request, null, 2) : 'No request data';
  }

  private formatResponseContent(): string {
    const log = this.selectedLog()!;
    return log.response ? JSON.stringify(log.response, null, 2) : 'No response data';
  }
}
