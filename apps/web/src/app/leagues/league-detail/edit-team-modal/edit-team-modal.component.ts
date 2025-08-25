import {
  Component,
  signal,
  inject,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FileUploadModule } from 'primeng/fileupload';
import { MenuModule } from 'primeng/menu';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TeamService } from '../../../services/team.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-edit-team-modal',
  standalone: true,
  imports: [
    DialogModule,
    ButtonModule,
    InputTextModule,
    FileUploadModule,
    MenuModule,
    ToastModule,
    ReactiveFormsModule,
  ],
  providers: [MessageService],
  templateUrl: './edit-team-modal.component.html',
  styleUrls: ['./edit-team-modal.component.scss'],
})
export class EditTeamModalComponent {
  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  isSubmitting = signal(false);
  activeMenuItem = signal('team-settings');
  avatarPreview = signal<string | null>(null);

  teamForm: FormGroup;

  menuItems: Array<{ id: string; label: string; icon: string }> = [
    { id: 'team-settings', label: 'Team Settings', icon: 'pi pi-cog' },
    // Future menu items (uncomment as implemented):
    // { id: 'team-colors', label: 'Team Colors', icon: 'pi pi-palette' },
    // { id: 'team-bio', label: 'Team Bio', icon: 'pi pi-file-edit' },
    // { id: 'social-links', label: 'Social Links', icon: 'pi pi-share-alt' },
    // { id: 'notifications', label: 'Notifications', icon: 'pi pi-bell' },
    // { id: 'team-preferences', label: 'Team Preferences', icon: 'pi pi-sliders-h' },
    // { id: 'stats-display', label: 'Stats Display', icon: 'pi pi-chart-bar' },
    // { id: 'roster-layout', label: 'Roster Layout', icon: 'pi pi-list' },
    // { id: 'team-theme', label: 'Team Theme', icon: 'pi pi-palette' }
  ];

  private teamService = inject(TeamService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);

  constructor() {
    this.teamForm = this.fb.group({
      teamName: ['', [Validators.required, Validators.minLength(2)]],
      teamMotto: [''],
      avatar: [null],
    });
  }

  onShow(): void {
    this.loadTeamData();
  }

  setActiveMenuItem(menuId: string): void {
    this.activeMenuItem.set(menuId);
  }

  async loadTeamData(): Promise<void> {
    try {
      const currentUser = this.authService.currentUser();
      if (!currentUser) return;

      // TODO: Load team data from the current league context
      // For now, we'll use placeholder data
      this.teamForm.patchValue({
        teamName: 'My Dynasty Team',
        teamMotto: '',
      });
    } catch (error) {
      console.error('Error loading team data:', error);
    }
  }

  onFileUpload(event: any): void {
    const file = event.files[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatarPreview.set(e.target.result);
      };
      reader.readAsDataURL(file);

      // Store file in form
      this.teamForm.patchValue({ avatar: file });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.teamForm.valid) {
      try {
        this.isSubmitting.set(true);

        const formData = this.teamForm.value;

        // TODO: Update team data in the current league context
        // For now, just show success message

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Team settings updated successfully!',
        });

        // Close modal after a short delay
        setTimeout(() => {
          this.closeModal();
        }, 1500);
      } catch (error) {
        console.error('Error updating team:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update team settings. Please try again.',
        });
      } finally {
        this.isSubmitting.set(false);
      }
    }
  }

  closeModal(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.teamForm.reset();
    this.avatarPreview.set(null);
  }
}
