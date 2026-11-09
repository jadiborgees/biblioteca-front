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
  todosLivros: any[] = [];
  autores: any[] = [];

  termoBusca = '';
  buscaAutor = '';
  autoresSelecionados: any[] = [];

  modoFormulario = false;
  isEdicao = false;
  salvando = false;
  carregando = false;

  itensPorPagina = 10;
  paginaAtual = 1;
  totalElementosBackend = 0;
  totalPaginasBackend = 0;

  private readonly pastaCapas = '/image/livros/';

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
    capaUrl: '',
    autorIds: []
  };

  constructor(
    private api: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.carregar();
    this.carregarAutores();
  }

  // =====================================================
  // CARREGAMENTO
  // =====================================================

  carregar(): void {
    this.carregarPagina();
    this.carregarCatalogoAuxiliar();
  }

  private carregarPagina(): void {
    this.carregando = true;

    this.api.getPagina<any>(
      'livros',
      this.paginaAtual - 1,
      this.itensPorPagina
    ).subscribe({
      next: resposta => {
        this.livros = resposta?.conteudo || [];
        this.totalElementosBackend = Number(resposta?.totalElementos || 0);
        this.totalPaginasBackend = Number(resposta?.totalPaginas || 0);
        this.carregando = false;

        if (
          this.totalPaginasBackend > 0 &&
          this.paginaAtual > this.totalPaginasBackend
        ) {
          this.paginaAtual = this.totalPaginasBackend;
          this.carregarPagina();
        }
      },
      error: erro => {
        this.carregando = false;
        this.erro('carregar livros', erro);
      }
    });
  }

  private carregarCatalogoAuxiliar(): void {
    this.api.getLista('livros').subscribe({
      next: dados => {
        this.todosLivros = dados || [];
      },
      error: erro => this.erro('carregar catálogo de livros', erro)
    });
  }

  carregarAutores(): void {
    this.api.getLista('autores').subscribe({
      next: dados => {
        this.autores = dados || [];
      },
      error: erro => this.erro('carregar autores', erro)
    });
  }

  // =====================================================
  // ESTOQUE
  // =====================================================

  obterQuantidadeTotal(livro: any): number {
    const quantidade = Number(livro?.quantidadeTotal);
    return Number.isFinite(quantidade) ? quantidade : 0;
  }

  obterQuantidadeDisponivel(livro: any): number {
    const quantidade = Number(livro?.quantidadeDisponivel);
    return Number.isFinite(quantidade) ? quantidade : 0;
  }

  obterQuantidadeEmprestada(livro: any): number {
    return Math.max(
      0,
      this.obterQuantidadeTotal(livro) -
      this.obterQuantidadeDisponivel(livro)
    );
  }

  livroDisponivel(livro: any): boolean {
    return this.obterQuantidadeDisponivel(livro) > 0;
  }

  obterStatusEstoque(livro: any): string {
    return this.livroDisponivel(livro) ? 'DISPONÍVEL' : 'ESGOTADO';
  }

  get totalExemplares(): number {
    return this.todosLivros.reduce(
      (total, livro) =>
        total + this.obterQuantidadeTotal(livro),
      0
    );
  }

  get totalExemplaresDisponiveis(): number {
    return this.todosLivros.reduce(
      (total, livro) =>
        total + this.obterQuantidadeDisponivel(livro),
      0
    );
  }

  get totalExemplaresEmprestados(): number {
    return this.todosLivros.reduce(
      (total, livro) =>
        total + this.obterQuantidadeEmprestada(livro),
      0
    );
  }

  // =====================================================
  // PESQUISA
  // =====================================================

  get filtrados(): any[] {
    const q = this.termoBusca.trim().toLocaleLowerCase('pt-BR');

    if (!q) {
      return this.todosLivros;
    }

    return this.todosLivros.filter(livro => {
      const valores = [
        livro.titulo,
        livro.isbn,
        String(livro.id),
        ...(livro.autores || []).map((autor: any) => autor.nome)
      ];

      return valores.some(valor =>
        String(valor || '')
          .toLocaleLowerCase('pt-BR')
          .includes(q)
      );
    });
  }

  atualizarPesquisa(): void {
    this.paginaAtual = 1;

    if (!this.termoBusca.trim()) {
      this.carregarPagina();
    }
  }

  // =====================================================
  // PAGINAÇÃO
  // =====================================================

  get livrosPaginados(): any[] {
    if (!this.termoBusca.trim()) {
      return this.livros;
    }

    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;

    return this.filtrados.slice(
      inicio,
      inicio + this.itensPorPagina
    );
  }

  get totalRegistros(): number {
    return this.termoBusca.trim()
      ? this.filtrados.length
      : this.totalElementosBackend;
  }

  get totalPaginas(): number {
    return this.termoBusca.trim()
      ? Math.ceil(this.filtrados.length / this.itensPorPagina)
      : this.totalPaginasBackend;
  }

  get paginas(): number[] {
    return Array.from(
      { length: this.totalPaginas },
      (_, indice) => indice + 1
    );
  }

  get primeiroItem(): number {
    return this.totalRegistros === 0
      ? 0
      : (this.paginaAtual - 1) * this.itensPorPagina + 1;
  }

  get ultimoItem(): number {
    return Math.min(
      this.paginaAtual * this.itensPorPagina,
      this.totalRegistros
    );
  }

  irParaPagina(pagina: number): void {
    if (
      pagina < 1 ||
      pagina > this.totalPaginas ||
      pagina === this.paginaAtual
    ) {
      return;
    }

    this.paginaAtual = pagina;

    if (!this.termoBusca.trim()) {
      this.carregarPagina();
    }
  }

    // =====================================================
  // AUTORES
  // =====================================================

  nomeAutores(livro: any): string {
    return (livro.autores || [])
      .map((autor: any) => autor.nome)
      .join(', ') || '—';
  }

  get autoresSugeridos(): any[] {
    const termo = this.buscaAutor.trim().toLocaleLowerCase('pt-BR');

    if (!termo) {
      return [];
    }

    const selecionados = new Set(
      this.autoresSelecionados.map(autor => autor.id)
    );

    return this.autores
      .filter(autor =>
        !selecionados.has(autor.id) &&
        String(autor.nome || '')
          .toLocaleLowerCase('pt-BR')
          .includes(termo)
      )
      .slice(0, 8);
  }

  selecionarAutor(autor: any): void {
    if (
      !this.autoresSelecionados.some(
        selecionado => selecionado.id === autor.id
      )
    ) {
      this.autoresSelecionados = [
        ...this.autoresSelecionados,
        autor
      ];

      this.formLivro.autorIds =
        this.autoresSelecionados.map(item => item.id);
    }

    this.buscaAutor = '';
  }

  removerAutor(id: number): void {
    this.autoresSelecionados =
      this.autoresSelecionados.filter(autor => autor.id !== id);

    this.formLivro.autorIds =
      this.autoresSelecionados.map(autor => autor.id);
  }

  // =====================================================
  // CAPAS
  // =====================================================

  obterCapa(livro: any): string {
    const titulo = (livro?.titulo || '').trim().toLowerCase();
    const arquivo = this.capasLivros[titulo];

    return livro?.capaUrl?.trim() || (
      arquivo
        ? this.pastaCapas + arquivo
        : '/image/livros/capa-padrao.jpg'
    );
  }

  imagemIndisponivel(event: Event): void {
    const imagem = event.target as HTMLImageElement;

    if (!imagem.src.endsWith('/capa-padrao.jpg')) {
      imagem.src = '/image/livros/capa-padrao.jpg';
    }
  }

  validarUrlCapa(): void {
    const url = String(this.formLivro.capaUrl || '').trim();

    if (url && !/^https?:\/\//i.test(url)) {
      this.formLivro.capaUrl = '';

      if (isPlatformBrowser(this.platformId)) {
        alert('Informe uma URL iniciada por http:// ou https://.');
      }
    }
  }

  // =====================================================
  // CADASTRO E EDIÇÃO
  // =====================================================

  novo(): void {
    this.formLivro = {
      id: null,
      titulo: '',
      isbn: '',
      anoPublicacao: new Date().getFullYear(),
      autorIds: [],
      capaUrl: ''
    };

    this.autoresSelecionados = [];
    this.buscaAutor = '';
    this.isEdicao = false;
    this.modoFormulario = true;
    this.salvando = false;
  }

  editar(livro: any): void {
    this.formLivro = {
      id: livro.id,
      titulo: livro.titulo,
      isbn: livro.isbn,
      anoPublicacao: livro.anoPublicacao,
      capaUrl: livro.capaUrl || '',
      autorIds: (livro.autores || [])
        .map((autor: any) => autor.id)
    };

    this.autoresSelecionados = [...(livro.autores || [])];
    this.buscaAutor = '';
    this.isEdicao = true;
    this.modoFormulario = true;
    this.salvando = false;
  }

  cancelar(): void {
    if (this.salvando) {
      return;
    }

    this.modoFormulario = false;
    this.autoresSelecionados = [];
    this.buscaAutor = '';
  }

  salvar(): void {
    if (this.salvando) {
      return;
    }

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
      capaUrl: this.formLivro.capaUrl?.trim() || null,
      autores: ids.map(id => ({ id }))
    };

    const requisicao = this.isEdicao
      ? this.api.putItem('livros', this.formLivro.id, payload)
      : this.api.postItem('livros', payload);

    this.salvando = true;

    requisicao.subscribe({
      next: () => {
        this.salvando = false;

        if (isPlatformBrowser(this.platformId)) {
          alert(
            this.isEdicao
              ? 'Livro atualizado com sucesso!'
              : 'Livro cadastrado com sucesso! Estoque inicial de 5 exemplares.'
          );
        }

        this.modoFormulario = false;
        this.autoresSelecionados = [];
        this.buscaAutor = '';
        this.paginaAtual = 1;
        this.carregar();
      },
      error: erro => {
        this.salvando = false;
        this.erro('salvar livro', erro);
      }
    });
  }

  excluir(id: number): void {
    const confirmar = isPlatformBrowser(this.platformId)
      ? confirm('Deseja excluir este livro?')
      : true;

    if (!confirmar) {
      return;
    }

    this.api.deleteItem('livros', id).subscribe({
      next: () => {
        if (isPlatformBrowser(this.platformId)) {
          alert('Livro excluído com sucesso.');
        }

        this.paginaAtual = 1;
        this.carregar();
      },
      error: erro => this.erro('excluir livro', erro)
    });
  }

  // =====================================================
  // ERROS
  // =====================================================

  private erro(acao: string, erro: any): void {
    console.error(`Erro ao ${acao}:`, erro);

    if (isPlatformBrowser(this.platformId)) {
      alert(
        erro?.error?.mensagem ||
        erro?.error?.erro ||
        erro?.error?.message ||
        `Não foi possível ${acao}. Verifique a API e a chave de acesso.`
      );
    }
  }
}