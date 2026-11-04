import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-livros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './livros.component.html',
  styleUrl: './livros.component.css'
})
export class LivrosComponent implements OnInit {
  livros: any[] = [];
  autores: any[] = [];
  termoBusca = '';
  modoFormulario = false;
  isEdicao = false;
  formLivro: any = { id: null, titulo: '', isbn: '', anoPublicacao: new Date().getFullYear(), autorIds: [] as number[] };

  constructor(
    private api: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.carregar();
    this.carregarAutores();
  }

  carregar(): void {
    this.api.getLista('livros').subscribe({
      next: data => this.livros = data,
      error: e => this.erro('livros', e)
    });
  }

  carregarAutores(): void {
    this.api.getLista('autores').subscribe({
      next: data => this.autores = data,
      error: e => this.erro('autores', e)
    });
  }

  get filtrados(): any[] {
    const q = this.termoBusca.trim().toLowerCase();
    return !q ? this.livros : this.livros.filter(l =>
      [l.titulo, l.isbn, String(l.id), ...(l.autores || []).map((a: any) => a.nome)]
        .some(v => String(v || '').toLowerCase().includes(q))
    );
  }

  nomeAutores(livro: any): string {
    return (livro.autores || []).map((a: any) => a.nome).join(', ') || '—';
  }

  novo(): void {
    this.formLivro = { id: null, titulo: '', isbn: '', anoPublicacao: new Date().getFullYear(), autorIds: [] };
    this.isEdicao = false;
    this.modoFormulario = true;
  }

  editar(l: any): void {
    this.formLivro = {
      id: l.id,
      titulo: l.titulo,
      isbn: l.isbn,
      anoPublicacao: l.anoPublicacao,
      autorIds: (l.autores || []).map((a: any) => a.id)
    };
    this.isEdicao = true;
    this.modoFormulario = true;
  }

  cancelar(): void {
    this.modoFormulario = false;
  }

  salvar(): void {
    const ids: number[] = this.formLivro.autorIds || [];
    if (!this.formLivro.titulo?.trim() || !this.formLivro.isbn?.trim() || !this.formLivro.anoPublicacao || ids.length === 0) {
      if (isPlatformBrowser(this.platformId)) {
        alert('Preencha os dados e selecione pelo menos um autor.');
      }
      return;
    }

    const payload = {
      titulo: this.formLivro.titulo.trim(),
      isbn: this.formLivro.isbn.trim(),
      anoPublicacao: Number(this.formLivro.anoPublicacao),
      autores: ids.map(id => ({ id }))
    };

    const req = this.isEdicao
      ? this.api.putItem('livros', this.formLivro.id, payload)
      : this.api.postItem('livros', payload);

    req.subscribe({
      next: () => {
        if (isPlatformBrowser(this.platformId)) {
          alert('Livro salvo com sucesso!');
        }
        this.modoFormulario = false;
        this.carregar();
      },
      error: e => this.erro('salvar livro', e)
    });
  }

  excluir(id: number): void {
    const confirmar = isPlatformBrowser(this.platformId) ? confirm('Deseja excluir este livro?') : true;
    if (confirmar) {
      this.api.deleteItem('livros', id).subscribe({
        next: () => this.carregar(),
        error: e => this.erro('excluir livro', e)
      });
    }
  }

  private erro(acao: string, e: any): void {
    console.error(`Erro ao ${acao}:`, e);
    if (isPlatformBrowser(this.platformId)) {
      alert(e?.error?.mensagem || e?.error?.erro || `Não foi possível ${acao}. Verifique a API e a chave de acesso.`);
    }
  }
}