
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

const API_URL = 'https://biblioteca-api-10lf.onrender.com';

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  token: string;
  email: string;
  nivelAcesso: string;
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
          sessionStorage.setItem('admin_token', resposta.token);
          sessionStorage.setItem('admin_email', resposta.email);
          sessionStorage.setItem('admin_nivel', resposta.nivelAcesso);
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
    if (!this.navegadorDisponivel()) {
      return false;
    }

    return !!sessionStorage.getItem('admin_token');
  }
}
