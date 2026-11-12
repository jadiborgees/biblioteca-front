
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

const API_URL = 'https://biblioteca-api-10lf.onrender.com';

export type NivelAcesso = 'ADMIN' | 'OPERADOR';

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  token: string;
  email: string;
  nivelAcesso: NivelAcesso;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private platformId = inject(PLATFORM_ID);

  constructor(private http: HttpClient) {}

  private navegadorDisponivel(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  login(dados: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${API_URL}/auth/login`,
      dados
    ).pipe(
      tap(resposta => {
        if (this.navegadorDisponivel()) {
          const nivel = String(
            resposta.nivelAcesso ?? ''
          ).toUpperCase();

          sessionStorage.setItem('admin_token', resposta.token);
          sessionStorage.setItem('admin_email', resposta.email);
          sessionStorage.setItem('admin_nivel', nivel);
        }
      })
    );
  }

  logout(): void {
    if (this.navegadorDisponivel()) {
      sessionStorage.removeItem('admin_token');
      sessionStorage.removeItem('admin_email');
      sessionStorage.removeItem('admin_nivel');
    }
  }

  estaAutenticado(): boolean {
    return this.navegadorDisponivel() &&
      !!sessionStorage.getItem('admin_token');
  }

  obterNivelAcesso(): NivelAcesso | null {
    if (!this.navegadorDisponivel()) {
      return null;
    }

    const nivel = sessionStorage
      .getItem('admin_nivel')
      ?.toUpperCase();

    return nivel === 'ADMIN' || nivel === 'OPERADOR'
      ? nivel
      : null;
  }

  obterEmail(): string {
    if (!this.navegadorDisponivel()) {
      return '';
    }

    return sessionStorage.getItem('admin_email') ?? '';
  }

  ehAdmin(): boolean {
    return this.obterNivelAcesso() === 'ADMIN';
  }

  ehOperador(): boolean {
    return this.obterNivelAcesso() === 'OPERADOR';
  }
}
