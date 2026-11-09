
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-emprestimos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './emprestimos.component.html',
  styleUrl: './emprestimos.component.css'
})
export class EmprestimosComponent implements OnInit {

  modoFormulario = false;
  sucessoModal = false;
  processando = false;

  emprestimos: any[] = [];
  livros: any[] = [];
  usuarios: any[] = [];

  termoBuscaEmprestimo = '';
  termoBuscaUsuario = '';
  termoBuscaLivro = '';

  filtroStatus = 'TODOS';
  etapaAtual = 1;

  usuarioSelecionado: any = null;
  livroSelecionado: any = null;

  formEmprestimo: any = this.modelo();

  // PAGINAÇÃO
  itensPorPagina = 6;
  paginaAtual = 1;

  constructor(
    private api: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  private modelo(): any {
    return {
      usuarioId: null,
      livroId: null,
      dataEmprestimo: this.dataAtual(),
      dataDevolucaoPrevista: ''
    };
  }

  private dataAtual(): string {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
  }

  ngOnInit(): void {
    this.carregarEmprestimos();
    this.carregarDadosAuxiliares();
  }

  // CARREGAR EMPRÉSTIMOS
  carregarEmprestimos(): void {
    this.api.getLista('emprestimos').subscribe({
      next: dados => {
        this.emprestimos = dados || [];
        this.ajustarPagina();
      },
      error: erro => this.erro(erro)
    });
  }

  // CARREGAR LIVROS E USUÁRIOS
  carregarDadosAuxiliares(): void {
    this.api.getLista('livros').subscribe({
      next: dados => {
        this.livros = dados || [];

        if (this.livroSelecionado) {
          const atualizado = this.livros.find(
            livro => livro.id === this.livroSelecionado.id
          );

          if (atualizado) {
            this.livroSelecionado = atualizado;
          }
        }
      },
      error: erro => this.erro(erro)
    });

    this.api.getLista('usuarios').subscribe({
      next: dados => {
        this.usuarios = dados || [];
      },
      error: erro => this.erro(erro)
    });
  }

  // QUANTIDADE DISPONÍVEL
  obterQuantidadeDisponivel(livro: any): number {
    if (!livro) {
      return 0;
    }

    const quantidade = Number(
      livro.quantidadeDisponivel ??
      livro.estoqueDisponivel ??
      livro.quantidadeTotal ??
      5
    );

    return Number.isFinite(quantidade)
      ? Math.max(0, quantidade)
      : 0;
  }

  // QUANTIDADE TOTAL
  obterQuantidadeTotal(livro: any): number {
    if (!livro) {
      return 0;
    }

    const quantidade = Number(
      livro.quantidadeTotal ??
      livro.quantidade ??
      5
    );

    return Number.isFinite(quantidade)
      ? Math.max(0, quantidade)
      : 5;
  }

  // TOTAL DE LIVROS COM ESTOQUE
  get totalLivrosDisponiveis(): number {
    return this.livros.filter(
      livro => this.obterQuantidadeDisponivel(livro) > 0
    ).length;
  }

  // VERIFICAR DISPONIBILIDADE
  livroDisponivel(livro: any): boolean {
    return this.obterQuantidadeDisponivel(livro) > 0;
  }

  // VERIFICAR ATRASO
  estaAtrasado(emp: any): boolean {
    if (
      emp.status !== 'ATIVO' &&
      emp.status !== 'ATRASADO'
    ) {
      return false;
    }

    const dataPrevista =
      emp.dataDevolucaoPrevista || emp.dataDevolucao;

    if (!dataPrevista) {
      return false;
    }

    return String(dataPrevista).substring(0, 10) < this.dataAtual();
  }

  // OBTER STATUS
  obterStatus(emp: any): string {
    if (emp.status === 'CANCELADO') {
      return 'CANCELADO';
    }

    if (emp.status === 'DEVOLVIDO') {
      return 'DEVOLVIDO';
    }

    if (this.estaAtrasado(emp)) {
      return 'ATRASADO';
    }

    return emp.status || 'ATIVO';
  }

  // PODE DEVOLVER?
  podeDevolver(emp: any): boolean {
    const status = this.obterStatus(emp);
    return status === 'ATIVO' || status === 'ATRASADO';
  }

  // PODE CANCELAR?
  podeCancelar(emp: any): boolean {
    const status = this.obterStatus(emp);
    return status === 'ATIVO' || status === 'ATRASADO';
  }

  // QUANTIDADES DOS FILTROS
  get totalTodos(): number {
    return this.emprestimos.length;
  }

  get totalAtivos(): number {
    return this.emprestimos.filter(
      emp => this.obterStatus(emp) === 'ATIVO'
    ).length;
  }

  get totalDevolvidos(): number {
    return this.emprestimos.filter(
      emp => this.obterStatus(emp) === 'DEVOLVIDO'
    ).length;
  }

  get totalAtrasados(): number {
    return this.emprestimos.filter(
      emp => this.obterStatus(emp) === 'ATRASADO'
    ).length;
  }

  get totalCancelados(): number {
    return this.emprestimos.filter(
      emp => this.obterStatus(emp) === 'CANCELADO'
    ).length;
  }

  // PESQUISA E FILTROS
  get emprestimosFiltrados(): any[] {
    const q = this.termoBuscaEmprestimo.trim().toLowerCase();

    return this.emprestimos.filter(emp => {

      const correspondeBusca = !q || [
        emp.usuario?.nome,
        emp.usuario?.email,
        emp.livro?.titulo,
        this.obterStatus(emp),
        String(emp.id)
      ].some(valor =>
        String(valor || '').toLowerCase().includes(q)
      );

      const status = this.obterStatus(emp);

      const correspondeStatus =
        this.filtroStatus === 'TODOS' ||
        status === this.filtroStatus;

      return correspondeBusca && correspondeStatus;
    });
  }

  // PAGINAÇÃO
  get emprestimosPaginados(): any[] {
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;

    return this.emprestimosFiltrados.slice(
      inicio,
      inicio + this.itensPorPagina
    );
  }

  get totalPaginas(): number {
    return Math.ceil(
      this.emprestimosFiltrados.length / this.itensPorPagina
    );
  }

  get paginas(): number[] {
    return Array.from(
      { length: this.totalPaginas },
      (_, i) => i + 1
    );
  }

  get primeiroItem(): number {
    return this.emprestimosFiltrados.length === 0
      ? 0
      : (this.paginaAtual - 1) * this.itensPorPagina + 1;
  }

  get ultimoItem(): number {
    return Math.min(
      this.paginaAtual * this.itensPorPagina,
      this.emprestimosFiltrados.length
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

  selecionarFiltro(status: string): void {
    this.filtroStatus = status;
    this.paginaAtual = 1;
  }

  // USUÁRIOS FILTRADOS
  get usuariosFiltrados(): any[] {
    const q = this.termoBuscaUsuario.trim().toLowerCase();

    return !q
      ? this.usuarios
      : this.usuarios.filter(usuario =>
          [usuario.nome, usuario.email].some(valor =>
            String(valor || '').toLowerCase().includes(q)
          )
        );
  }

  // LIVROS FILTRADOS
  get livrosFiltrados(): any[] {
    const q = this.termoBuscaLivro.trim().toLowerCase();

    return !q
      ? this.livros
      : this.livros.filter(livro =>
          [
            livro.titulo,
            livro.isbn,
            String(livro.id)
          ].some(valor =>
            String(valor || '').toLowerCase().includes(q)
          )
        );
  }

  // SELECIONAR USUÁRIO
  selecionarUsuario(usuario: any): void {
    this.usuarioSelecionado = usuario;
    this.formEmprestimo.usuarioId = usuario.id;
  }

  // SELECIONAR LIVRO
  selecionarLivro(livro: any): void {
    if (!this.livroDisponivel(livro)) {
      this.mostrarAlerta(
        'Este livro não possui exemplares disponíveis no momento.'
      );
      return;
    }

    this.livroSelecionado = livro;
    this.formEmprestimo.livroId = livro.id;
  }

  // ABRIR NOVO EMPRÉSTIMO
  abrirNovoEmprestimo(): void {
    this.formEmprestimo = this.modelo();

    this.modoFormulario = true;
    this.sucessoModal = false;
    this.processando = false;
    this.etapaAtual = 1;

    this.termoBuscaUsuario = '';
    this.termoBuscaLivro = '';

    this.usuarioSelecionado = null;
    this.livroSelecionado = null;

    this.carregarDadosAuxiliares();
  }

  // VOLTAR PARA LISTAGEM
  voltarParaLista(): void {
    this.modoFormulario = false;
    this.sucessoModal = false;
    this.processando = false;
    this.paginaAtual = 1;
  }

  // VALIDAÇÕES
  validarEtapa1(): boolean {
    if (!this.formEmprestimo.usuarioId) {
      this.mostrarAlerta('Selecione um usuário cadastrado.');
      return false;
    }

    return true;
  }

  validarEtapa2(): boolean {
    if (!this.formEmprestimo.livroId || !this.livroSelecionado) {
      this.mostrarAlerta('Selecione um livro.');
      return false;
    }

    if (!this.livroDisponivel(this.livroSelecionado)) {
      this.mostrarAlerta(
        'Este livro não possui exemplares disponíveis. Selecione outro livro.'
      );
      return false;
    }

    return true;
  }

  validarEtapa3(): boolean {
    if (
      !this.formEmprestimo.dataEmprestimo ||
      !this.formEmprestimo.dataDevolucaoPrevista ||
      this.formEmprestimo.dataDevolucaoPrevista <
      this.formEmprestimo.dataEmprestimo
    ) {
      this.mostrarAlerta(
        'Informe datas válidas: devolução prevista igual ou posterior à retirada.'
      );

      return false;
    }

    return true;
  }

  // PRÓXIMA ETAPA
  proximaEtapa(): void {
    if (this.etapaAtual === 1 && !this.validarEtapa1()) {
      return;
    }

    if (this.etapaAtual === 2 && !this.validarEtapa2()) {
      return;
    }

    if (this.etapaAtual < 3) {
      this.etapaAtual++;
    }
  }

  // ETAPA ANTERIOR
  etapaAnterior(): void {
    if (this.etapaAtual > 1) {
      this.etapaAtual--;
    }
  }

  // FINALIZAR EMPRÉSTIMO
  finalizarEmprestimo(): void {
    if (this.processando) {
      return;
    }

    if (!this.validarEtapa3()) {
      return;
    }

    if (!this.validarEtapa2()) {
      this.etapaAtual = 2;
      return;
    }

    const payload = {
      dataEmprestimo: this.formEmprestimo.dataEmprestimo,
      dataDevolucaoPrevista:
        this.formEmprestimo.dataDevolucaoPrevista,
      status: 'ATIVO',
      usuario: {
        id: this.usuarioSelecionado.id
      },
      livro: {
        id: this.livroSelecionado.id
      }
    };

    this.processando = true;

    this.api.postItem('emprestimos', payload).subscribe({
      next: () => {
        this.processando = false;
        this.sucessoModal = true;

        this.carregarEmprestimos();
        this.carregarDadosAuxiliares();
      },
      error: erro => {
        this.processando = false;
        this.erro(erro);
        this.carregarDadosAuxiliares();
      }
    });
  }

  // DEVOLVER LIVRO
  devolver(id: number): void {
    const confirmar = isPlatformBrowser(this.platformId)
      ? confirm('Confirmar a devolução deste livro?')
      : true;

    if (!confirmar) {
      return;
    }

    this.api.patchItem('emprestimos', id, '/devolver').subscribe({
      next: () => {
        this.carregarEmprestimos();
        this.carregarDadosAuxiliares();

        this.mostrarAlerta(
          'Devolução registrada com sucesso.'
        );
      },
      error: erro => this.erro(erro)
    });
  }

  // CANCELAR EMPRÉSTIMO
  cancelar(id: number): void {
    const confirmar = isPlatformBrowser(this.platformId)
      ? confirm(
          'Deseja realmente cancelar este empréstimo? O exemplar deverá retornar ao estoque.'
        )
      : true;

    if (!confirmar) {
      return;
    }

    this.api.patchItem('emprestimos', id, '/cancelar').subscribe({
      next: () => {
        this.carregarEmprestimos();
        this.carregarDadosAuxiliares();

        this.mostrarAlerta(
          'Empréstimo cancelado com sucesso.'
        );
      },
      error: erro => this.erro(erro)
    });
  }

  // ALERTAS
  private mostrarAlerta(mensagem: string): void {
    if (isPlatformBrowser(this.platformId)) {
      alert(mensagem);
    }
  }

  // TRATAMENTO DE ERROS
  private erro(erro: any): void {
    console.error(erro);

    this.mostrarAlerta(
      erro?.error?.mensagem ||
      erro?.error?.erro ||
      erro?.error?.message ||
      'Não foi possível concluir a operação.'
    );
  }
}
