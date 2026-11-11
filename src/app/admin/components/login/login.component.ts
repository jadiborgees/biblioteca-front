import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

interface Livro {
  h: number; // altura (px)
  w: number; // largura (px)
  c: string; // cor da lombada
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {

  private readonly CHAVE_EMAIL = 'biblioteca_email';

  email = '';
  senha = '';
  erro = '';
  carregando = false;

  mostrarSenha = false;
  lembrarMe = false;
  capsLockAtivo = false;
  tremer = false;

  // Estante decorativa (clique em um livro para puxá-lo e trocar a frase)
  readonly estantes: Livro[][] = [
    [
      { h: 92, w: 22, c: '#ffc23c' }, { h: 110, w: 26, c: '#5fb8c4' },
      { h: 84, w: 20, c: '#f2efe6' }, { h: 118, w: 24, c: '#e8604c' },
      { h: 98, w: 28, c: '#9b7fd1' }, { h: 88, w: 20, c: '#ffc23c' },
      { h: 106, w: 24, c: '#7cc6a0' }, { h: 94, w: 22, c: '#f2efe6' }
    ],
    [
      { h: 100, w: 24, c: '#e8604c' }, { h: 86, w: 20, c: '#5fb8c4' },
      { h: 114, w: 28, c: '#ffc23c' }, { h: 90, w: 22, c: '#9b7fd1' },
      { h: 108, w: 22, c: '#f2efe6' }, { h: 96, w: 26, c: '#7cc6a0' },
      { h: 82, w: 20, c: '#e8604c' }, { h: 112, w: 24, c: '#5fb8c4' }
    ],
    [
      { h: 104, w: 26, c: '#7cc6a0' }, { h: 90, w: 20, c: '#ffc23c' },
      { h: 116, w: 24, c: '#f2efe6' }, { h: 86, w: 22, c: '#e8604c' },
      { h: 100, w: 28, c: '#5fb8c4' }, { h: 94, w: 20, c: '#9b7fd1' },
      { h: 110, w: 24, c: '#ffc23c' }, { h: 88, w: 22, c: '#f2efe6' }
    ]
  ];

  readonly frases = [
    'Um livro emprestado é uma história que ganha mais um leitor.',
    'Quando a comunidade lê junto, o bairro inteiro aprende mais.',
    'Cada devolução abre espaço para o próximo leitor.',
    'Um acervo bem cuidado é um convite para voltar.'
  ];

  fraseAtual = 0;
  selecionado: { p: number; j: number } | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    try {
      const salvo = localStorage.getItem(this.CHAVE_EMAIL);
      if (salvo) {
        this.email = salvo;
        this.lembrarMe = true;
      }
    } catch {
      // armazenamento indisponível: segue sem preencher
    }
  }

  alternarVisibilidadeSenha(): void {
    this.mostrarSenha = !this.mostrarSenha;
  }

  verificarCapsLock(evento: KeyboardEvent): void {
    this.capsLockAtivo = evento.getModifierState?.('CapsLock') ?? false;
  }

  selecionarLivro(p: number, j: number): void {
    const jaSelecionado = this.selecionado?.p === p && this.selecionado?.j === j;
    this.selecionado = jaSelecionado ? null : { p, j };

    if (!jaSelecionado) {
      this.fraseAtual = (this.fraseAtual + 1) % this.frases.length;
    }
  }

  entrar(): void {
    this.erro = '';

    if (!this.email.trim() || !this.senha) {
      this.mostrarErro('Preencha o e-mail e a senha.');
      return;
    }

    this.carregando = true;

    this.authService.login({
      email: this.email,
      senha: this.senha
    }).subscribe({
      next: () => {
        this.carregando = false;
        this.guardarEmail();
        this.router.navigate(['/admin']);
      },
      error: (erro) => {
        this.carregando = false;

        this.mostrarErro(
          erro.status === 401
            ? 'E-mail ou senha incorretos.'
            : 'Não foi possível realizar o login. Tente novamente.'
        );
      }
    });
  }

  private guardarEmail(): void {
    try {
      if (this.lembrarMe) {
        localStorage.setItem(this.CHAVE_EMAIL, this.email.trim());
      } else {
        localStorage.removeItem(this.CHAVE_EMAIL);
      }
    } catch {
      // ignora falhas de armazenamento
    }
  }

  // Mostra a mensagem e faz o formulário "balançar" (reinicia a animação a cada erro)
  private mostrarErro(mensagem: string): void {
    this.erro = mensagem;
    this.tremer = false;
    setTimeout(() => {
      this.tremer = true;
      setTimeout(() => (this.tremer = false), 500);
    });
  }
}