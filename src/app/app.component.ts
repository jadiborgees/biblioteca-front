
import { Component } from '@angular/core';
import {
  Router,
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
  NavigationEnd
} from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

  title = 'biblioteca-front';

  isLoginPage = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    this.isLoginPage = this.router.url === '/login';

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd)
      )
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.isLoginPage = event.urlAfterRedirects === '/login';
        }
      });
  }

  sair(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
