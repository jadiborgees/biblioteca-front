
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  // Estatísticas gerais
  totalLivros = 0;
  totalAutores = 0;
  totalUsuarios = 0;
  totalEmprestimos = 0;

  // Estatísticas do estoque
  totalExemplares = 0;
  exemplaresDisponiveis = 0;
  exemplaresEmprestados = 0;

  // Dados
  livros: any[] = [];
  emprestimos: any[] = [];

  carregando = true;
  erroCarregamento = false;

  dataAtual = new Date();

  // Gráfico mensal
  meses: any[] = [];
  maxEmprestimos = 1;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.carregarEstatisticas();
  }

  carregarEstatisticas(): void {
    this.carregando = true;
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

        // Totais gerais
        this.totalLivros = r.livrosTotal;
        this.totalAutores = r.autores;
        this.totalUsuarios = r.usuarios;
        this.totalEmprestimos = r.emprestimosTotal;

        // Listas
        this.livros = r.livros;
        this.emprestimos = r.emprestimos;

        // Calcula estoque
        this.calcularEstoque();

        // Atualiza gráfico
        this.gerarGrafico();

        this.carregando = false;
      },

      error: (e) => {
        console.error('Erro ao carregar Dashboard:', e);

        this.erroCarregamento = true;
        this.carregando = false;
      }
    });
  }

  /**
   * Calcula o estoque usando os dados reais dos livros.
   *
   * Exemplo:
   * Total: 5
   * Disponíveis: 4
   * Emprestados: 1
   */
  private calcularEstoque(): void {

    this.totalExemplares = this.livros.reduce(
      (total, livro) => {
        return total + Number(livro.quantidadeTotal ?? 0);
      },
      0
    );

    this.exemplaresDisponiveis = this.livros.reduce(
      (total, livro) => {
        return total + Number(livro.quantidadeDisponivel ?? 0);
      },
      0
    );

    this.exemplaresEmprestados =
      this.totalExemplares - this.exemplaresDisponiveis;

    // Evita apresentar valores negativos em caso de inconsistência.
    this.exemplaresEmprestados = Math.max(
      0,
      this.exemplaresEmprestados
    );
  }

  private dataEmprestimo(emp: any): string {
    return emp.dataEmprestimo || emp.dataRetirada || '';
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

  get totalAtivos(): number {
    return this.emprestimos.filter(
      e => this.obterStatus(e) === 'ATIVO'
    ).length;
  }

  get totalAtrasados(): number {
    return this.emprestimos.filter(
      e => this.obterStatus(e) === 'ATRASADO'
    ).length;
  }

  get totalDevolvidos(): number {
    return this.emprestimos.filter(
      e => this.obterStatus(e) === 'DEVOLVIDO'
    ).length;
  }

  get ultimosEmprestimos(): any[] {
    return [...this.emprestimos]
      .sort((a, b) => {

        const dataA = new Date(
          this.dataEmprestimo(a)
        ).getTime() || 0;

        const dataB = new Date(
          this.dataEmprestimo(b)
        ).getTime() || 0;

        return dataB - dataA;
      })
      .slice(0, 5);
  }

  gerarGrafico(): void {

    const hoje = new Date();

    this.meses = [];

    for (let i = 5; i >= 0; i--) {

      const data = new Date(
        hoje.getFullYear(),
        hoje.getMonth() - i,
        1
      );

      const ano = data.getFullYear();
      const mes = data.getMonth();

      const quantidade = this.emprestimos.filter(emp => {

        const valor = this.dataEmprestimo(emp);

        if (!valor) {
          return false;
        }

        const dataEmp = new Date(valor + 'T00:00:00');

        return dataEmp.getFullYear() === ano &&
               dataEmp.getMonth() === mes;

      }).length;

      this.meses.push({
        nome: data.toLocaleDateString('pt-BR', {
          month: 'short'
        }).replace('.', ''),

        quantidade,
        destaque: i === 0
      });
    }

    this.maxEmprestimos = Math.max(
      1,
      ...this.meses.map(m => m.quantidade)
    );
  }

  alturaBarra(valor: number): number {

    if (valor === 0) {
      return 3;
    }

    return Math.max(
      8,
      (valor / this.maxEmprestimos) * 100
    );
  }

  get percentualAtivos(): number {
    return this.totalEmprestimos
      ? (this.totalAtivos / this.totalEmprestimos) * 100
      : 0;
  }

  get percentualAtrasados(): number {
    return this.totalEmprestimos
      ? (this.totalAtrasados / this.totalEmprestimos) * 100
      : 0;
  }

  get percentualDevolvidos(): number {
    return this.totalEmprestimos
      ? (this.totalDevolvidos / this.totalEmprestimos) * 100
      : 0;
  }

  formatarData(valor: string): string {

    if (!valor) {
      return '—';
    }

    const data = new Date(
      valor.substring(0, 10) + 'T00:00:00'
    );

    return data.toLocaleDateString('pt-BR');
  }

  private formatarDataISO(data: Date): string {

    const ano = data.getFullYear();

    const mes = String(
      data.getMonth() + 1
    ).padStart(2, '0');

    const dia = String(
      data.getDate()
    ).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
  }

  atualizarDashboard(): void {
    this.carregarEstatisticas();
  }
}
