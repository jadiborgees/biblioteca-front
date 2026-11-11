import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../services/api.service';

type FiltroStatus = 'TODOS' | 'ATIVO' | 'ATRASADO' | 'DEVOLVIDO';

interface MesGrafico {
  nome: string;
  nomeCompleto: string;
  quantidade: number;
  destaque: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  // Totais gerais
  totalLivros = 0;
  totalAutores = 0;
  totalUsuarios = 0;
  totalEmprestimos = 0;

  // Estoque
  totalExemplares = 0;
  exemplaresDisponiveis = 0;
  exemplaresEmprestados = 0;

  // Status dos empréstimos (calculados uma vez por carga)
  totalAtivos = 0;
  totalAtrasados = 0;
  totalDevolvidos = 0;
  listaAtrasados: { emp: any; dias: number }[] = [];

  // Dados
  livros: any[] = [];
  emprestimos: any[] = [];

  // Estados da tela
  carregando = false;     // primeira carga
  atualizando = false;    // recarga com a tela já montada
  carregado = false;
  erroCarregamento = false;

  dataFormatada = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  ultimaAtualizacao = '';

  // Gráfico mensal
  periodosDisponiveis = [3, 6, 12];
  periodoMeses = 6;
  meses: MesGrafico[] = [];
  maxEmprestimos = 1;
  variacaoMensal: number | null = null;

  // Tabela de empréstimos
  filtros: { valor: FiltroStatus; rotulo: string }[] = [
    { valor: 'TODOS', rotulo: 'Todos' },
    { valor: 'ATIVO', rotulo: 'Ativos' },
    { valor: 'ATRASADO', rotulo: 'Atrasados' },
    { valor: 'DEVOLVIDO', rotulo: 'Devolvidos' }
  ];
  filtroStatus: FiltroStatus = 'TODOS';
  busca = '';
  mostrarTodos = false;
  readonly limite = 6;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.carregarEstatisticas();
  }

  carregarEstatisticas(): void {
    if (this.carregado) {
      this.atualizando = true;
    } else {
      this.carregando = true;
    }
    this.erroCarregamento = false;

    forkJoin({
      livrosTotal: this.api.getTotal('livros'),
      livros: this.api.getLista('livros'),
      autores: this.api.getTotal('autores'),
      usuarios: this.api.getTotal('usuarios'),
      emprestimosTotal: this.api.getTotal('emprestimos'),
      emprestimos: this.api.getLista('emprestimos')
    }).subscribe({
      next: (r) => {
        this.totalLivros = r.livrosTotal;
        this.totalAutores = r.autores;
        this.totalUsuarios = r.usuarios;
        this.totalEmprestimos = r.emprestimosTotal;

        this.livros = r.livros;

        // Mais recentes primeiro
        this.emprestimos = [...r.emprestimos].sort(
          (a, b) => this.timestamp(b) - this.timestamp(a)
        );

        this.calcularEstoque();
        this.calcularStatus();
        this.gerarGrafico();

        this.ultimaAtualizacao = new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        });

        this.carregado = true;
        this.carregando = false;
        this.atualizando = false;
      },

      error: (e) => {
        console.error('Erro ao carregar Dashboard:', e);
        this.erroCarregamento = true;
        this.carregando = false;
        this.atualizando = false;
      }
    });
  }

  atualizarDashboard(): void {
    this.carregarEstatisticas();
  }

  // ---------------------------------------------------------
  // Estoque
  // ---------------------------------------------------------
  private calcularEstoque(): void {
    this.totalExemplares = this.livros.reduce(
      (total, livro) => total + Number(livro.quantidadeTotal ?? 0), 0
    );

    this.exemplaresDisponiveis = this.livros.reduce(
      (total, livro) => total + Number(livro.quantidadeDisponivel ?? 0), 0
    );

    this.exemplaresEmprestados = Math.max(
      0,
      this.totalExemplares - this.exemplaresDisponiveis
    );
  }

  get percentualDisponivel(): number {
    return this.totalExemplares
      ? (this.exemplaresDisponiveis / this.totalExemplares) * 100
      : 0;
  }

  // ---------------------------------------------------------
  // Status
  // ---------------------------------------------------------
  private dataEmprestimo(emp: any): string {
    return emp.dataEmprestimo || emp.dataRetirada || '';
  }

  private timestamp(emp: any): number {
    const valor = this.dataEmprestimo(emp);
    return valor ? new Date(valor.substring(0, 10) + 'T00:00:00').getTime() || 0 : 0;
  }

  estaAtrasado(emp: any): boolean {
    if (emp.status !== 'ATIVO') {
      return false;
    }

    const data = emp.dataDevolucaoPrevista || emp.dataDevolucao;

    if (!data) {
      return false;
    }

    return data.substring(0, 10) < this.formatarDataISO(new Date());
  }

  obterStatus(emp: any): string {
    if (emp.status === 'CANCELADO') {
      return 'CANCELADO';
    }

    if (emp.status === 'DEVOLVIDO') {
      return 'DEVOLVIDO';
    }

    if (emp.status === 'ATRASADO' || this.estaAtrasado(emp)) {
      return 'ATRASADO';
    }

    return emp.status || 'ATIVO';
  }

  diasAtraso(emp: any): number {
    const data = emp.dataDevolucaoPrevista || emp.dataDevolucao;

    if (!data) {
      return 0;
    }

    const previsto = new Date(data.substring(0, 10) + 'T00:00:00');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return Math.max(0, Math.round((hoje.getTime() - previsto.getTime()) / 86400000));
  }

  private calcularStatus(): void {
    this.totalAtivos = 0;
    this.totalAtrasados = 0;
    this.totalDevolvidos = 0;

    for (const emp of this.emprestimos) {
      switch (this.obterStatus(emp)) {
        case 'ATIVO': this.totalAtivos++; break;
        case 'ATRASADO': this.totalAtrasados++; break;
        case 'DEVOLVIDO': this.totalDevolvidos++; break;
      }
    }

    this.listaAtrasados = this.emprestimos
      .filter(e => this.obterStatus(e) === 'ATRASADO')
      .map(e => ({ emp: e, dias: this.diasAtraso(e) }))
      .sort((a, b) => b.dias - a.dias)
      .slice(0, 5);
  }

  get percentualAtivos(): number {
    return this.totalEmprestimos ? (this.totalAtivos / this.totalEmprestimos) * 100 : 0;
  }

  get percentualAtrasados(): number {
    return this.totalEmprestimos ? (this.totalAtrasados / this.totalEmprestimos) * 100 : 0;
  }

  get percentualDevolvidos(): number {
    return this.totalEmprestimos ? (this.totalDevolvidos / this.totalEmprestimos) * 100 : 0;
  }

  get gradienteDonut(): string {
    if (!this.totalEmprestimos) {
      return 'var(--track)';
    }

    const a = this.percentualAtivos;
    const b = a + this.percentualAtrasados;
    const c = b + this.percentualDevolvidos;

    return `conic-gradient(var(--green) 0% ${a}%, var(--coral) ${a}% ${b}%, var(--purple) ${b}% ${c}%, var(--track) ${c}% 100%)`;
  }

  // ---------------------------------------------------------
  // Gráfico mensal
  // ---------------------------------------------------------
  definirPeriodo(meses: number): void {
    this.periodoMeses = meses;
    this.gerarGrafico();
  }

  private contarMes(ano: number, mes: number): number {
    return this.emprestimos.filter(emp => {
      const valor = this.dataEmprestimo(emp);

      if (!valor) {
        return false;
      }

      const data = new Date(valor.substring(0, 10) + 'T00:00:00');
      return data.getFullYear() === ano && data.getMonth() === mes;
    }).length;
  }

  gerarGrafico(): void {
    const hoje = new Date();
    this.meses = [];

    for (let i = this.periodoMeses - 1; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);

      this.meses.push({
        nome: data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        nomeCompleto: data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        quantidade: this.contarMes(data.getFullYear(), data.getMonth()),
        destaque: i === 0
      });
    }

    this.maxEmprestimos = Math.max(1, ...this.meses.map(m => m.quantidade));

    // Variação do mês atual contra o anterior
    const atual = this.contarMes(hoje.getFullYear(), hoje.getMonth());
    const anterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const qtdAnterior = this.contarMes(anterior.getFullYear(), anterior.getMonth());

    this.variacaoMensal = qtdAnterior > 0
      ? Math.round(((atual - qtdAnterior) / qtdAnterior) * 100)
      : null;
  }

  get totalPeriodo(): number {
    return this.meses.reduce((soma, m) => soma + m.quantidade, 0);
  }

  get eixoMeio(): number {
    return Math.round(this.maxEmprestimos / 2);
  }

  alturaBarra(valor: number): number {
    if (valor === 0) {
      return 3;
    }

    return Math.max(8, (valor / this.maxEmprestimos) * 100);
  }

  // ---------------------------------------------------------
  // Tabela: filtros e busca
  // ---------------------------------------------------------
  contagem(filtro: FiltroStatus): number {
    switch (filtro) {
      case 'ATIVO': return this.totalAtivos;
      case 'ATRASADO': return this.totalAtrasados;
      case 'DEVOLVIDO': return this.totalDevolvidos;
      default: return this.emprestimos.length;
    }
  }

  definirFiltro(filtro: FiltroStatus): void {
    this.filtroStatus = filtro;
    this.mostrarTodos = false;
  }

  /** Clicar de novo no filtro ativo limpa o filtro. */
  alternarFiltro(filtro: FiltroStatus): void {
    this.definirFiltro(this.filtroStatus === filtro ? 'TODOS' : filtro);
  }

  limparBusca(): void {
    this.busca = '';
  }

  private normalizar(texto: string): string {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  get emprestimosFiltrados(): any[] {
    const termo = this.normalizar(this.busca);

    return this.emprestimos.filter(emp => {
      if (this.filtroStatus !== 'TODOS' && this.obterStatus(emp) !== this.filtroStatus) {
        return false;
      }

      if (!termo) {
        return true;
      }

      const texto = `${emp.usuario?.nome ?? ''} ${emp.livro?.titulo ?? ''}`;
      return this.normalizar(texto).includes(termo);
    });
  }

  get emprestimosVisiveis(): any[] {
    const lista = this.emprestimosFiltrados;
    return this.mostrarTodos ? lista : lista.slice(0, this.limite);
  }

  // ---------------------------------------------------------
  // Formatação
  // ---------------------------------------------------------
  formatarData(valor: string): string {
    if (!valor) {
      return '—';
    }

    return new Date(valor.substring(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR');
  }

  private formatarDataISO(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
  }
}