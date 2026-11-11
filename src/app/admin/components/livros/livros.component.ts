import { Component, OnInit, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';

type FiltroEstoque = 'todos' | 'disponiveis' | 'esgotados';
type Ordenacao = 'titulo' | 'ano' | 'disponiveis';

interface Toast {
  mensagem: string;
  tipo: 'sucesso' | 'erro';
}

@Component({
  selector: 'app-livros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './livros.component.html',
  styleUrl: './livros.component.css'
})
export class LivrosComponent implements OnInit {

  // ===== DADOS =====
  todosLivros: any[] = [];
  listaFiltrada: any[] = [];
  autores: any[] = [];
  carregando = false;

  // ===== LISTAGEM =====
  termoBusca = '';
  filtroEstoque: FiltroEstoque = 'todos';
  ordenacao: Ordenacao = 'titulo';
  itensPorPagina = 10;
  paginaAtual = 1;
  readonly opcoesPorPagina = [10, 20, 50];
  readonly skeletonLinhas = [1, 2, 3, 4, 5];
  readonly filtros: { valor: FiltroEstoque; rotulo: string }[] = [
    { valor: 'todos', rotulo: 'Todos' },
    { valor: 'disponiveis', rotulo: 'Disponíveis' },
    { valor: 'esgotados', rotulo: 'Esgotados' }
  ];

  // ===== FORMULÁRIO =====
  modoFormulario = false;
  isEdicao = false;
  salvando = false;
  tentouSalvar = false;
  capaComErro = false;
  erros: Record<string, string> = {};
  formLivro: any = this.criarFormularioVazio();
  autoresSelecionados: any[] = [];
  buscaAutor = '';

  // ===== EXCLUSÃO E FEEDBACK =====
  livroParaExcluir: any = null;
  excluindo = false;
  toast: Toast | null = null;
  private toastTimer: any;

  private readonly pastaCapas = '/image/livros/';
  private readonly capaPadrao = '/image/livros/capa-padrao.jpg';
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

  constructor(
    private api: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.carregarLivros();
    this.carregarAutores();
  }

  @HostListener('document:keydown.escape')
  aoPressionarEsc(): void {
    if (this.livroParaExcluir) {
      this.cancelarExclusao();
    } else if (this.modoFormulario) {
      this.cancelar();
    }
  }

  // =====================================================
  // CARREGAMENTO
  // =====================================================

  carregarLivros(): void {
    this.carregando = true;

    this.api.getLista('livros').subscribe({
      next: dados => {
        this.todosLivros = dados || [];
        this.carregando = false;
        this.atualizarLista();
      },
      error: erro => {
        this.carregando = false;
        this.erro('carregar livros', erro);
      }
    });
  }

  carregarAutores(): void {
    this.api.getLista('autores').subscribe({
      next: dados => this.autores = dados || [],
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
    return Math.max(0, this.obterQuantidadeTotal(livro) - this.obterQuantidadeDisponivel(livro));
  }

  livroDisponivel(livro: any): boolean {
    return this.obterQuantidadeDisponivel(livro) > 0;
  }

  percentualDisponivel(livro: any): number {
    const total = this.obterQuantidadeTotal(livro);
    return total > 0 ? Math.round((this.obterQuantidadeDisponivel(livro) / total) * 100) : 0;
  }

  get totalTitulos(): number {
    return this.todosLivros.length;
  }

  get totalExemplares(): number {
    return this.todosLivros.reduce((t, l) => t + this.obterQuantidadeTotal(l), 0);
  }

  get totalExemplaresDisponiveis(): number {
    return this.todosLivros.reduce((t, l) => t + this.obterQuantidadeDisponivel(l), 0);
  }

  get totalExemplaresEmprestados(): number {
    return this.todosLivros.reduce((t, l) => t + this.obterQuantidadeEmprestada(l), 0);
  }

  contagem(filtro: FiltroEstoque): number {
    if (filtro === 'disponiveis') {
      return this.todosLivros.filter(l => this.livroDisponivel(l)).length;
    }
    if (filtro === 'esgotados') {
      return this.todosLivros.filter(l => !this.livroDisponivel(l)).length;
    }
    return this.todosLivros.length;
  }

  // =====================================================
  // BUSCA, FILTRO E ORDENAÇÃO
  // =====================================================

  atualizarLista(): void {
    const termo = this.normalizar(this.termoBusca);

    this.listaFiltrada = this.todosLivros
      .filter(livro =>
        this.passaFiltroEstoque(livro) &&
        (!termo || this.textoBusca(livro).includes(termo))
      )
      .sort((a, b) => this.comparar(a, b));

    this.garantirPaginaValida();
  }

  aoAlterarFiltro(): void {
    this.paginaAtual = 1;
    this.atualizarLista();
  }

  definirFiltro(filtro: FiltroEstoque): void {
    this.filtroEstoque = filtro;
    this.aoAlterarFiltro();
  }

  limparBusca(): void {
    this.termoBusca = '';
    this.aoAlterarFiltro();
  }

  limparFiltros(): void {
    this.termoBusca = '';
    this.filtroEstoque = 'todos';
    this.aoAlterarFiltro();
  }

  private passaFiltroEstoque(livro: any): boolean {
    switch (this.filtroEstoque) {
      case 'disponiveis': return this.livroDisponivel(livro);
      case 'esgotados': return !this.livroDisponivel(livro);
      default: return true;
    }
  }

  private comparar(a: any, b: any): number {
    switch (this.ordenacao) {
      case 'ano':
        return Number(b.anoPublicacao) - Number(a.anoPublicacao);
      case 'disponiveis':
        return this.obterQuantidadeDisponivel(b) - this.obterQuantidadeDisponivel(a);
      default:
        return String(a.titulo || '').localeCompare(String(b.titulo || ''), 'pt-BR');
    }
  }

  private textoBusca(livro: any): string {
    const autores = (livro.autores || []).map((autor: any) => autor.nome).join(' ');
    return this.normalizar(`${livro.titulo} ${livro.isbn} ${livro.id} ${autores}`);
  }

  private normalizar(texto: string): string {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  // =====================================================
  // PAGINAÇÃO
  // =====================================================

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.listaFiltrada.length / this.itensPorPagina));
  }

  get livrosPaginados(): any[] {
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    return this.listaFiltrada.slice(inicio, inicio + this.itensPorPagina);
  }

  get paginasVisiveis(): number[] {
    const total = this.totalPaginas;
    const inicio = Math.max(1, Math.min(this.paginaAtual - 2, total - 4));
    const fim = Math.min(total, inicio + 4);

    return Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i);
  }

  get primeiroItem(): number {
    return this.listaFiltrada.length === 0 ? 0 : (this.paginaAtual - 1) * this.itensPorPagina + 1;
  }

  get ultimoItem(): number {
    return Math.min(this.paginaAtual * this.itensPorPagina, this.listaFiltrada.length);
  }

  irParaPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas || pagina === this.paginaAtual) {
      return;
    }
    this.paginaAtual = pagina;
  }

  alterarItensPorPagina(valor: string): void {
    this.itensPorPagina = Number(valor);
    this.paginaAtual = 1;
  }

  private garantirPaginaValida(): void {
    if (this.paginaAtual > this.totalPaginas) {
      this.paginaAtual = this.totalPaginas;
    }
  }

  // =====================================================
  // AUTORES
  // =====================================================

  nomeAutores(livro: any): string {
    return (livro.autores || []).map((autor: any) => autor.nome).join(', ') || '—';
  }

  get autoresSugeridos(): any[] {
    const termo = this.normalizar(this.buscaAutor);
    if (!termo) {
      return [];
    }

    const selecionados = new Set(this.autoresSelecionados.map(a => a.id));

    return this.autores
      .filter(autor =>
        !selecionados.has(autor.id) &&
        this.normalizar(autor.nome).includes(termo)
      )
      .slice(0, 6);
  }

  selecionarAutor(autor: any): void {
    if (!this.autoresSelecionados.some(a => a.id === autor.id)) {
      this.autoresSelecionados = [...this.autoresSelecionados, autor];
    }
    this.buscaAutor = '';
    this.tentouSalvar && this.validarFormulario();
  }

  removerAutor(id: number): void {
    this.autoresSelecionados = this.autoresSelecionados.filter(a => a.id !== id);
    this.tentouSalvar && this.validarFormulario();
  }

  // =====================================================
  // CAPAS
  // =====================================================

  obterCapa(livro: any): string {
    if (livro?.capaUrl?.trim()) {
      return livro.capaUrl.trim();
    }

    const titulo = this.normalizarTitulo(livro?.titulo);
    const arquivo = this.capasLivros[titulo];
    return arquivo ? this.pastaCapas + arquivo : this.capaPadrao;
  }

  imagemIndisponivel(event: Event): void {
    const imagem = event.target as HTMLImageElement;
    if (!imagem.src.endsWith('/capa-padrao.jpg')) {
      imagem.src = this.capaPadrao;
    }
  }

  private normalizarTitulo(titulo: string): string {
    return String(titulo || '').trim().toLowerCase();
  }

  // =====================================================
  // CADASTRO E EDIÇÃO
  // =====================================================

  novo(): void {
    this.formLivro = this.criarFormularioVazio();
    this.abrirFormulario(false);
  }

  editar(livro: any): void {
    this.formLivro = {
      id: livro.id,
      titulo: livro.titulo,
      isbn: livro.isbn,
      anoPublicacao: livro.anoPublicacao,
      capaUrl: livro.capaUrl || ''
    };
    this.autoresSelecionados = [...(livro.autores || [])];
    this.abrirFormulario(true);
  }

  cancelar(): void {
    if (this.salvando) {
      return;
    }
    this.fecharFormulario();
  }

  salvar(): void {
    if (this.salvando) {
      return;
    }

    this.tentouSalvar = true;

    if (!this.validarFormulario()) {
      return;
    }

    const payload = {
      titulo: this.formLivro.titulo.trim(),
      isbn: this.isbnLimpo(this.formLivro.isbn),
      anoPublicacao: Number(this.formLivro.anoPublicacao),
      capaUrl: this.formLivro.capaUrl?.trim() || null,
      autores: this.autoresSelecionados.map(autor => ({ id: autor.id }))
    };

    const requisicao = this.isEdicao
      ? this.api.putItem('livros', this.formLivro.id, payload)
      : this.api.postItem('livros', payload);

    this.salvando = true;

    requisicao.subscribe({
      next: () => {
        this.salvando = false;
        this.mostrarToast(
          this.isEdicao
            ? 'Livro atualizado com sucesso.'
            : 'Livro cadastrado com sucesso! Estoque inicial de 5 exemplares.',
          'sucesso'
        );
        this.fecharFormulario();
        this.paginaAtual = 1;
        this.carregarLivros();
      },
      error: erro => {
        this.salvando = false;
        this.erro('salvar livro', erro);
      }
    });
  }

  validarFormulario(): boolean {
    const f = this.formLivro;
    const erros: Record<string, string> = {};
    const anoMaximo = new Date().getFullYear() + 1;
    const ano = Number(f.anoPublicacao);
    const isbn = this.isbnLimpo(f.isbn);

    if (String(f.titulo || '').trim().length < 2) {
      erros['titulo'] = 'Informe o título (mínimo de 2 caracteres).';
    }

    if (!isbn) {
      erros['isbn'] = 'Informe o ISBN.';
    } else if (!/^(\d{9}[\dX]|\d{13})$/.test(isbn)) {
      erros['isbn'] = 'O ISBN deve ter 10 ou 13 dígitos.';
    } else if (this.isbnDuplicado(isbn)) {
      erros['isbn'] = 'Já existe um livro cadastrado com este ISBN.';
    }

    if (!Number.isInteger(ano) || ano < 1450 || ano > anoMaximo) {
      erros['ano'] = `Informe um ano entre 1450 e ${anoMaximo}.`;
    }

    if (String(f.capaUrl || '').trim() && !/^https?:\/\//i.test(String(f.capaUrl).trim())) {
      erros['capaUrl'] = 'Use um endereço iniciado por http:// ou https://.';
    }

    if (this.autoresSelecionados.length === 0) {
      erros['autores'] = 'Selecione pelo menos um autor.';
    }

    this.erros = erros;
    return Object.keys(erros).length === 0;
  }

  isbnLimpo(valor: any): string {
    return String(valor || '').replace(/[\s-]/g, '').toUpperCase();
  }

  private isbnDuplicado(isbn: string): boolean {
    return this.todosLivros.some(livro =>
      this.isbnLimpo(livro.isbn) === isbn && livro.id !== this.formLivro.id
    );
  }

  private criarFormularioVazio(): any {
    return {
      id: null,
      titulo: '',
      isbn: '',
      anoPublicacao: new Date().getFullYear(),
      capaUrl: ''
    };
  }

  private abrirFormulario(edicao: boolean): void {
    this.isEdicao = edicao;
    if (!edicao) {
      this.autoresSelecionados = [];
    }
    this.buscaAutor = '';
    this.erros = {};
    this.tentouSalvar = false;
    this.capaComErro = false;
    this.salvando = false;
    this.modoFormulario = true;
    this.rolarTopo();
  }

  private fecharFormulario(): void {
    this.modoFormulario = false;
    this.autoresSelecionados = [];
    this.buscaAutor = '';
    this.erros = {};
    this.tentouSalvar = false;
  }

  // =====================================================
  // EXCLUSÃO
  // =====================================================

  pedirExclusao(livro: any): void {
    this.livroParaExcluir = livro;
  }

  cancelarExclusao(): void {
    if (!this.excluindo) {
      this.livroParaExcluir = null;
    }
  }

  confirmarExclusao(): void {
    if (!this.livroParaExcluir || this.excluindo) {
      return;
    }

    const livro = this.livroParaExcluir;
    this.excluindo = true;

    this.api.deleteItem('livros', livro.id).subscribe({
      next: () => {
        this.excluindo = false;
        this.livroParaExcluir = null;
        this.mostrarToast(`"${livro.titulo}" foi excluído do acervo.`, 'sucesso');
        this.carregarLivros();
      },
      error: erro => {
        this.excluindo = false;
        this.livroParaExcluir = null;
        this.erro('excluir livro', erro);
      }
    });
  }

  // =====================================================
  // FEEDBACK E UTILITÁRIOS
  // =====================================================

  mostrarToast(mensagem: string, tipo: 'sucesso' | 'erro'): void {
    this.toast = { mensagem, tipo };
    clearTimeout(this.toastTimer);

    if (isPlatformBrowser(this.platformId)) {
      this.toastTimer = setTimeout(() => this.toast = null, 4000);
    }
  }

  fecharToast(): void {
    this.toast = null;
  }

  private erro(acao: string, erro: any): void {
    console.error(`Erro ao ${acao}:`, erro);

    this.mostrarToast(
      erro?.error?.mensagem ||
      erro?.error?.erro ||
      erro?.error?.message ||
      `Não foi possível ${acao}. Verifique a API e a chave de acesso.`,
      'erro'
    );
  }

  private rolarTopo(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}