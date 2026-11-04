
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
      next: d => {
        this.emprestimos = d;
        this.ajustarPagina();
      },
      error: e => this.erro(e)
    });
  }

  // CARREGAR LIVROS E USUÁRIOS
  carregarDadosAuxiliares(): void {
    this.api.getLista('livros').subscribe({
      next: d => this.livros = d,
      error: e => this.erro(e)
    });

    this.api.getLista('usuarios').subscribe({
      next: d => this.usuarios = d,
      error: e => this.erro(e)
    });
  }

  // VERIFICAR ATRASO
  estaAtrasado(emp: any): boolean {
    if (emp.status !== 'ATIVO') {
      return false;
    }

    const dataPrevista =
      emp.dataDevolucaoPrevista || emp.dataDevolucao;

    if (!dataPrevista) {
      return false;
    }

    return dataPrevista.substring(0, 10) < this.dataAtual();
  }

  // OBTER STATUS
  obterStatus(emp: any): string {
    if (this.estaAtrasado(emp)) {
      return 'ATRASADO';
    }

    return emp.status || 'ATIVO';
  }

  // QUANTIDADES DOS FILTROS
  get totalTodos(): number {
    return this.emprestimos.length;
  }

  get totalAtivos(): number {
    return this.emprestimos.filter(
      emp => emp.status === 'ATIVO' && !this.estaAtrasado(emp)
    ).length;
  }

  get totalDevolvidos(): number {
    return this.emprestimos.filter(
      emp => emp.status === 'DEVOLVIDO'
    ).length;
  }

  get totalAtrasados(): number {
    return this.emprestimos.filter(
      emp => this.estaAtrasado(emp)
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

    return !q ? this.usuarios : this.usuarios.filter(u =>
      [u.nome, u.email].some(v =>
        String(v || '').toLowerCase().includes(q)
      )
    );
  }

  // LIVROS FILTRADOS
  get livrosFiltrados(): any[] {
    const q = this.termoBuscaLivro.trim().toLowerCase();

    return !q ? this.livros : this.livros.filter(l =>
      [l.titulo, l.isbn, String(l.id)].some(v =>
        String(v || '').toLowerCase().includes(q)
      )
    );
  }

  // SELECIONAR USUÁRIO
  selecionarUsuario(u: any): void {
    this.usuarioSelecionado = u;
    this.formEmprestimo.usuarioId = u.id;
  }

  // SELECIONAR LIVRO
  selecionarLivro(l: any): void {
    this.livroSelecionado = l;
    this.formEmprestimo.livroId = l.id;
  }

  // ABRIR NOVO EMPRÉSTIMO
  abrirNovoEmprestimo(): void {
    this.formEmprestimo = this.modelo();

    this.modoFormulario = true;
    this.sucessoModal = false;
    this.etapaAtual = 1;

    this.termoBuscaUsuario = '';
    this.termoBuscaLivro = '';

    this.usuarioSelecionado = null;
    this.livroSelecionado = null;
  }

  // VOLTAR PARA LISTAGEM
  voltarParaLista(): void {
    this.modoFormulario = false;
    this.sucessoModal = false;
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
    if (!this.formEmprestimo.livroId) {
      this.mostrarAlerta('Selecione um livro.');
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
    if (this.etapaAtual === 1 && !this.validarEtapa1()) return;
    if (this.etapaAtual === 2 && !this.validarEtapa2()) return;

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
    if (!this.validarEtapa3()) return;

    const payload = {
      dataEmprestimo: this.formEmprestimo.dataEmprestimo,
      dataDevolucaoPrevista:
        this.formEmprestimo.dataDevolucaoPrevista,
      status: 'ATIVO',

      usuario: {
        id: this.usuarioSelecionado.id,
        nome: this.usuarioSelecionado.nome,
        email: this.usuarioSelecionado.email
      },

      livro: {
        id: this.livroSelecionado.id,
        titulo: this.livroSelecionado.titulo
      }
    };

    this.api.postItem('emprestimos', payload).subscribe({
      next: () => {
        this.sucessoModal = true;
        this.carregarEmprestimos();
      },
      error: e => this.erro(e)
    });
  }

  // DEVOLVER LIVRO
  devolver(id: number): void {
    const confirmar = isPlatformBrowser(this.platformId)
      ? confirm('Confirmar a devolução deste livro?')
      : true;

    if (confirmar) {
      this.api.patchItem('emprestimos', id, '/devolver').subscribe({
        next: () => this.carregarEmprestimos(),
        error: e => this.erro(e)
      });
    }
  }

  // ALERTAS
  private mostrarAlerta(msg: string): void {
    if (isPlatformBrowser(this.platformId)) {
      alert(msg);
    }
  }

  // TRATAMENTO DE ERROS
  private erro(e: any): void {
    console.error(e);

    this.mostrarAlerta(
      e?.error?.mensagem ||
      e?.error?.erro ||
      'Não foi possível concluir a operação.'
    );
  }
}
