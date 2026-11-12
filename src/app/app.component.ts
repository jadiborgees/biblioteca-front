
import { Component } from '@angular/core';

import {
  Router,
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
  NavigationEnd
} from '@angular/router';

import { filter } from 'rxjs';

import {
  AuthService,
  NivelAcesso
} from './services/auth.service';

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
      .subscribe(event => {

        if (event instanceof NavigationEnd) {
          this.isLoginPage =
            event.urlAfterRedirects === '/login';
        }

      });
  }

  get nivelAcesso(): NivelAcesso | null {
    return this.authService.obterNivelAcesso();
  }

  get nomeNivelAcesso(): string {

    if (this.nivelAcesso === 'ADMIN') {
      return 'Administrador';
    }

    if (this.nivelAcesso === 'OPERADOR') {
      return 'Operador';
    }

    return '';
  }

  get emailUsuario(): string {
    return this.authService.obterEmail();
  }

  get iniciaisUsuario(): string {

    const email = this.emailUsuario;

    if (!email) {
      return 'BC';
    }

    const nome = email.split('@')[0];

    const partes = nome
      .replace(/[._-]/g, ' ')
      .split(' ')
      .filter(parte => parte.length > 0);

    if (partes.length >= 2) {
      return (
        partes[0].charAt(0) +
        partes[1].charAt(0)
      ).toUpperCase();
    }

    return nome.substring(0, 2).toUpperCase();
  }

  sair(): void {

    this.authService.logout();

    this.router.navigate(['/login']);
  }
}
