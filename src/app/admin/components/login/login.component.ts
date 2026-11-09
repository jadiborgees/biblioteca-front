import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  email = '';
  senha = '';
  erro = '';
  carregando = false;

  mostrarSenha = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  alternarVisibilidadeSenha(): void {
    this.mostrarSenha = !this.mostrarSenha;
  }

  entrar(): void {
    this.erro = '';

    if (!this.email.trim() || !this.senha) {
      this.erro = 'Preencha o e-mail e a senha.';
      return;
    }

    this.carregando = true;

    this.authService.login({
      email: this.email,
      senha: this.senha
    }).subscribe({
      next: () => {
        this.carregando = false;
        this.router.navigate(['/admin']);
      },
      error: (erro) => {
        this.carregando = false;

        this.erro = erro.status === 401
          ? 'E-mail ou senha incorretos.'
          : 'Não foi possível realizar o login. Tente novamente.';
      }
    });
  }
}