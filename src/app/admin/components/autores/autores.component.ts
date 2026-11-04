
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-autores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './autores.component.html',
  styleUrl: './autores.component.css'
})
export class AutoresComponent implements OnInit {

  autores: any[] = [];
  busca = '';

  formVisivel = false;
  edicao = false;

  // Paginação
  itensPorPagina = 6;
  paginaAtual = 1;

  form: any = {
    id: null,
    nome: '',
    nacionalidade: ''
  };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.api.getLista('autores').subscribe({
      next: d => {
        this.autores = d;
        this.ajustarPagina();
      },
      error: e => this.erro(e)
    });
  }

  get filtrados(): any[] {
    const q = this.busca.toLowerCase().trim();

    return !q
      ? this.autores
      : this.autores.filter(a =>
          [a.nome, a.nacionalidade, String(a.id)]
            .some(v => String(v || '').toLowerCase().includes(q))
        );
  }

  // Autores exibidos na página atual
  get autoresPaginados(): any[] {
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;

    return this.filtrados.slice(
      inicio,
      inicio + this.itensPorPagina
    );
  }

  // Quantidade total de páginas
  get totalPaginas(): number {
    return Math.ceil(this.filtrados.length / this.itensPorPagina);
  }

  // Números das páginas
  get paginas(): number[] {
    return Array.from(
      { length: this.totalPaginas },
      (_, i) => i + 1
    );
  }

  // Primeiro registro exibido
  get primeiroItem(): number {
    return this.filtrados.length === 0
      ? 0
      : (this.paginaAtual - 1) * this.itensPorPagina + 1;
  }

  // Último registro exibido
  get ultimoItem(): number {
    return Math.min(
      this.paginaAtual * this.itensPorPagina,
      this.filtrados.length
    );
  }

  irParaPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaAtual = pagina;
    }
  }

  ajustarPagina(): void {
    if (this.totalPaginas === 0) {
      this.paginaAtual = 1;
      return;
    }

    if (this.paginaAtual > this.totalPaginas) {
      this.paginaAtual = this.totalPaginas;
    }
  }

  atualizarPesquisa(): void {
    this.paginaAtual = 1;
  }

  novo(): void {
    this.form = {
      id: null,
      nome: '',
      nacionalidade: ''
    };

    this.edicao = false;
    this.formVisivel = true;
  }

  editar(a: any): void {
    this.form = { ...a };
    this.edicao = true;
    this.formVisivel = true;
  }

  salvar(): void {
    if (!this.form.nome.trim()) {
      alert('Informe o nome do autor.');
      return;
    }

    const body = {
      nome: this.form.nome.trim(),
      nacionalidade: this.form.nacionalidade
    };

    const req = this.edicao
      ? this.api.putItem('autores', this.form.id, body)
      : this.api.postItem('autores', body);

    req.subscribe({
      next: () => {
        this.formVisivel = false;
        this.carregar();
      },
      error: e => this.erro(e)
    });
  }

  excluir(id: number): void {
    if (confirm('Excluir este autor?')) {
      this.api.deleteItem('autores', id).subscribe({
        next: () => this.carregar(),
        error: e => this.erro(e)
      });
    }
  }

  private erro(e: any): void {
    console.error(e);

    alert(
      e?.error?.mensagem ||
      e?.error?.erro ||
      'Não foi possível concluir a operação.'
    );
  }
}
