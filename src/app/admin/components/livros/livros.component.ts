
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

  // Paginação
  itensPorPagina = 6;
  paginaAtual = 1;

  // Caminho das capas
  private readonly pastaCapas = '/image/livros/';

  // Associação entre títulos e arquivos das capas
  private readonly capasLivros: { [titulo: string]: string } = {
    'a hora da estrela': 'a-hora-da-estrela.jpg',
    'capitães da areia': 'capitaes-da-areia.jpg',
    'dom casmurro': 'dom-casmurro.webp',
    'memórias póstumas de brás cubas': 'memorias-postumas-bras-cubas.jpg',
    'quincas borba': 'quincas-borba.jpg',
    'o cortiço': 'o-cortico.webp',
    'laços de família': 'lacos-de-familia.png',
    'vidas secas': 'vidas-secas.jpg',
    'são bernardo': 'sao-bernardo.webp',
    'gabriela, cravo e canela': 'gabriela-cravo-e-canela.jpg',
    'iracema': 'iracema.jpg',
    'triste fim de policarpo quaresma': 'triste-fim-policarpo-quaresma.webp',
    'o quinze': 'o-quinze.jpg',
    'sentimento do mundo': 'sentimento-do-mundo.webp',
    'romanceiro da inconfidência': 'romanceiro-da-inconfidencia.jpg'
  };

  formLivro: any = {
    id: null,
    titulo: '',
    isbn: '',
    anoPublicacao: new Date().getFullYear(),
    autorIds: [] as number[]
  };

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
      next: data => {
        this.livros = data;
        this.ajustarPagina();
      },
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

    return !q
      ? this.livros
      : this.livros.filter(l =>
          [
            l.titulo,
            l.isbn,
            String(l.id),
            ...(l.autores || []).map((a: any) => a.nome)
          ].some(v => String(v || '').toLowerCase().includes(q))
        );
  }

  // Livros da página atual
  get livrosPaginados(): any[] {
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;

    return this.filtrados.slice(
      inicio,
      inicio + this.itensPorPagina
    );
  }

  get totalPaginas(): number {
    return Math.ceil(this.filtrados.length / this.itensPorPagina);
  }

  get paginas(): number[] {
    return Array.from(
      { length: this.totalPaginas },
      (_, i) => i + 1
    );
  }

  get primeiroItem(): number {
    return this.filtrados.length === 0
      ? 0
      : (this.paginaAtual - 1) * this.itensPorPagina + 1;
  }

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

  nomeAutores(livro: any): string {
    return (livro.autores || [])
      .map((a: any) => a.nome)
      .join(', ') || '—';
  }

  // Retorna a capa correspondente ao título do livro
  obterCapa(livro: any): string {
    const titulo = (livro?.titulo || '').trim().toLowerCase();
    const arquivo = this.capasLivros[titulo];

    return arquivo
      ? this.pastaCapas + arquivo
      : '/image/livros/capa-padrao.jpg';
  }

  // Caso a imagem não seja encontrada, mostra a capa padrão
  imagemIndisponivel(event: Event): void {
    const imagem = event.target as HTMLImageElement;

    if (!imagem.src.endsWith('/capa-padrao.jpg')) {
      imagem.src = '/image/livros/capa-padrao.jpg';
    }
  }

  novo(): void {
    this.formLivro = {
      id: null,
      titulo: '',
      isbn: '',
      anoPublicacao: new Date().getFullYear(),
      autorIds: []
    };

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

    if (
      !this.formLivro.titulo?.trim() ||
      !this.formLivro.isbn?.trim() ||
      !this.formLivro.anoPublicacao ||
      ids.length === 0
    ) {
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
    const confirmar = isPlatformBrowser(this.platformId)
      ? confirm('Deseja excluir este livro?')
      : true;

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
      alert(
        e?.error?.mensagem ||
        e?.error?.erro ||
        `Não foi possível ${acao}. Verifique a API e a chave de acesso.`
      );
    }
  }
}
