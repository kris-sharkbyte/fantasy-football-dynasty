import { Injectable, signal, computed } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly THEME_KEY = 'dynasty-theme';
  private readonly THEME_ATTRIBUTE = 'data-theme';

  // Angular signals instead of BehaviorSubject
  private currentThemeSignal = signal<Theme>('light');

  // Public readonly signals
  public currentTheme = this.currentThemeSignal.asReadonly();
  public isDarkMode = computed(() => this.currentThemeSignal() === 'dark');
  public isLightMode = computed(() => this.currentThemeSignal() === 'light');

  constructor() {
    this.initializeTheme();
  }

  private initializeTheme(): void {
    // Check for saved theme preference
    const savedTheme = this.getSavedTheme();

    if (savedTheme) {
      this.setThemeInternal(savedTheme);
    } else {
      // Check system preference
      const systemTheme = this.getSystemTheme();
      this.setThemeInternal(systemTheme);
    }
  }

  private getSavedTheme(): Theme | null {
    try {
      const saved = localStorage.getItem(this.THEME_KEY);
      return saved === 'light' || saved === 'dark' ? saved : null;
    } catch {
      return null;
    }
  }

  private getSystemTheme(): Theme {
    // Check if user prefers dark mode
    if (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
    return 'light';
  }

  public toggleTheme(): void {
    const currentTheme = this.currentThemeSignal();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.setThemeInternal(newTheme);
  }

  public setTheme(theme: Theme): void {
    this.setThemeInternal(theme);
  }

  private setThemeInternal(theme: Theme): void {
    // Update document attribute
    document.documentElement.setAttribute(this.THEME_ATTRIBUTE, theme);

    // Update body class for CSS targeting
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);

    // Update signal
    this.currentThemeSignal.set(theme);

    // Save to localStorage
    try {
      localStorage.setItem(this.THEME_KEY, theme);
    } catch {
      // Ignore localStorage errors
    }
  }

  public getCurrentTheme(): Theme {
    return this.currentThemeSignal();
  }
}
