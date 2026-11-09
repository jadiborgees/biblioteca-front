import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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

  // =====================================================
  // PROPRIEDADES
  // =====================================================

  autores: any[] = [];
  todosAutores: any[] = [];

  busca = '';

  formVisivel = false;
  edicao = false;
  salvando = false;
  carregando = false;

  // Paginação
  itensPorPagina = 10;
  paginaAtual = 1;

  totalElementosBackend = 0;
  totalPaginasBackend = 0;

  // Formulário
  form: any = {
    id: null,
    nome: '',
    nacionalidade: ''
  };

  constructor(
    private api: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // =====================================================
  // INICIALIZAÇÃO
  // =====================================================

  ngOnInit(): void {
    this.carregar();
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
      'autores',
      this.paginaAtual - 1,
      this.itensPorPagina
    ).subscribe({

      // O tipo any permite receber V1 ou V2
      next: (resposta: any) => {

        // =============================================
        // EXTRAIR AUTORES
        // =============================================

        if (Array.isArray(resposta?.conteudo)) {

          // Formato V2
          this.autores = resposta.conteudo;

        } else if (resposta?._embedded) {

          // Formato V1 - Spring HATEOAS
          const embedded = resposta._embedded;

          const primeiraLista = Object.values(embedded)
            .find((valor: any) => Array.isArray(valor));

          this.autores = (primeiraLista as any[]) || [];

        } else {

          this.autores = [];

        }

        // =============================================
        // METADADOS DA PAGINAÇÃO
        // =============================================

        const totalElementos =
          resposta?.totalElementos ??
          resposta?.page?.totalElements ??
          resposta?.totalElements ??
          this.autores.length;

        const totalPaginas =
          resposta?.totalPaginas ??
          resposta?.page?.totalPages ??
          resposta?.totalPages ??
          Math.ceil(
            Number(totalElementos) / this.itensPorPagina
          );

        this.totalElementosBackend = Number(totalElementos);
        this.totalPaginasBackend = Number(totalPaginas);

        this.carregando = false;

        // Corrigir página caso ela não exista mais
        if (
          this.totalPaginasBackend > 0 &&
          this.paginaAtual > this.totalPaginasBackend
        ) {

          this.paginaAtual = this.totalPaginasBackend;

          this.carregarPagina();

        }

      },

      error: (erro: any) => {

        this.carregando = false;

        this.erro(erro);

      }

    });

  }

  // =====================================================
  // CATÁLOGO AUXILIAR
  // =====================================================

  private carregarCatalogoAuxiliar(): void {

    this.api.getLista('autores').subscribe({

      next: dados => {

        this.todosAutores = dados || [];

      },

      error: erro => {

        this.erro(erro);

      }

    });

  }

  // =====================================================
  // PESQUISA
  // =====================================================

  get filtrados(): any[] {

    const q = this.busca
      .trim()
      .toLocaleLowerCase('pt-BR');

    if (!q) {

      return this.todosAutores;

    }

    return this.todosAutores.filter(autor => {

      const valores = [
        autor.nome,
        autor.nacionalidade,
        String(autor.id)
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

    if (!this.busca.trim()) {

      this.carregarPagina();

    }

  }

  // =====================================================
  // PAGINAÇÃO
  // =====================================================

  get autoresPaginados(): any[] {

    // Listagem normal: utiliza os dados do backend
    if (!this.busca.trim()) {

      return this.autores;

    }

    // Pesquisa: paginação local
    const inicio =
      (this.paginaAtual - 1) * this.itensPorPagina;

    return this.filtrados.slice(
      inicio,
      inicio + this.itensPorPagina
    );

  }

  get totalRegistros(): number {

    return this.busca.trim()
      ? this.filtrados.length
      : this.totalElementosBackend;

  }

  get totalPaginas(): number {

    return this.busca.trim()

      ? Math.ceil(
          this.filtrados.length / this.itensPorPagina
        )

      : this.totalPaginasBackend;

  }

  get paginas(): number[] {

    return Array.from(
      { length: this.totalPaginas },
      (_, indice) => indice + 1
    );

  }

  get primeiroItem(): number {

    if (this.totalRegistros === 0) {

      return 0;

    }

    return (
      (this.paginaAtual - 1) * this.itensPorPagina + 1
    );

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

    if (!this.busca.trim()) {

      this.carregarPagina();

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

  // =====================================================
  // NOVO AUTOR
  // =====================================================

  novo(): void {

    this.form = {
      id: null,
      nome: '',
      nacionalidade: ''
    };

    this.edicao = false;
    this.formVisivel = true;
    this.salvando = false;

  }

  // =====================================================
  // EDITAR AUTOR
  // =====================================================

  editar(autor: any): void {

    this.form = {
      id: autor.id,
      nome: autor.nome || '',
      nacionalidade: autor.nacionalidade || ''
    };

    this.edicao = true;
    this.formVisivel = true;
    this.salvando = false;

  }

  // =====================================================
  // CANCELAR
  // =====================================================

  cancelar(): void {

    if (this.salvando) {

      return;

    }

    this.formVisivel = false;

    this.form = {
      id: null,
      nome: '',
      nacionalidade: ''
    };

  }

  // =====================================================
  // SALVAR AUTOR
  // =====================================================

  salvar(): void {

    if (this.salvando) {

      return;

    }

    if (!this.form.nome?.trim()) {

      this.mostrarAlerta('Informe o nome do autor.');

      return;

    }

    const body = {
      nome: this.form.nome.trim(),
      nacionalidade: this.form.nacionalidade?.trim() || ''
    };

    const requisicao = this.edicao

      ? this.api.putItem(
          'autores',
          this.form.id,
          body
        )

      : this.api.postItem(
          'autores',
          body
        );

    this.salvando = true;

    requisicao.subscribe({

      next: () => {

        this.salvando = false;

        const estavaEditando = this.edicao;

        this.formVisivel = false;
        this.paginaAtual = 1;

        this.form = {
          id: null,
          nome: '',
          nacionalidade: ''
        };

        this.edicao = false;

        this.carregar();

        this.mostrarAlerta(
          estavaEditando
            ? 'Autor atualizado com sucesso!'
            : 'Autor cadastrado com sucesso!'
        );

      },

      error: erro => {

        this.salvando = false;

        this.erro(erro);

      }

    });

  }

  // =====================================================
  // EXCLUIR AUTOR
  // =====================================================

  excluir(id: number): void {

    const confirmar = isPlatformBrowser(this.platformId)
      ? confirm('Deseja realmente excluir este autor?')
      : true;

    if (!confirmar) {

      return;

    }

    this.api.deleteItem('autores', id).subscribe({

      next: () => {

        this.paginaAtual = 1;

        this.carregar();

        this.mostrarAlerta(
          'Autor excluído com sucesso!'
        );

      },

      error: erro => {

        this.erro(erro);

      }

    });

  }

  // =====================================================
  // ALERTAS
  // =====================================================

  private mostrarAlerta(mensagem: string): void {

    if (isPlatformBrowser(this.platformId)) {

      alert(mensagem);

    }

  }

  // =====================================================
  // TRATAMENTO DE ERROS
  // =====================================================

  private erro(erro: any): void {

    console.error(
      'Erro na operação de autores:',
      erro
    );

    this.mostrarAlerta(

      erro?.error?.mensagem ||

      erro?.error?.erro ||

      erro?.error?.message ||

      'Não foi possível concluir a operação. Verifique a API.'

    );

  }

}