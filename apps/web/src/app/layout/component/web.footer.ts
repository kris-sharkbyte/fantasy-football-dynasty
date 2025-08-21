import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'web-footer',
  template: `<!-- Footer -->
    <footer class="footer-theme border-t mt-auto">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="text-center text-secondary-600">
          <p>&copy; 2024 Dynasty Fantasy. Built with Angular and Firebase.</p>
        </div>
      </div>
    </footer>`,
})
export class WebFooter {}
