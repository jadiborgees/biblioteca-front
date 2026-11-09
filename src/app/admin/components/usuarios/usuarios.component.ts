import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css'
})
export class UsuariosComponent implements OnInit {

  usuarios: any[] = [];
  termoBusca = '';

  modoFormulario = false;
  isEdicao = false;

  // Paginação
  itensPorPagina = 6;
  paginaAtual = 1;

  // Erros de validação
  errosCampo: { [key: string]: string } = {};

  // Controle da consulta de CEP
  cepConsultando = false;
  ultimoCepConsultado = '';

  formUsuario: any = this.novoModelo();

  constructor(
    private api: ApiService,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.carregarUsuarios();
  }

  // =====================================================
  // MODELO DO USUÁRIO
  // =====================================================

  private novoModelo(): any {
    return {
      id: null,
      nome: '',
      email: '',
      telefone: '',
      dataNascimento: '',
      endereco: {
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: ''
      }
    };
  }

  // =====================================================
  // CARREGAMENTO DOS USUÁRIOS
  // =====================================================

  carregarUsuarios(): void {
    this.api.getLista('usuarios').subscribe({
      next: dados => {
        this.usuarios = dados || [];
        this.ajustarPagina();
      },
      error: erro => this.erro(erro)
    });
  }

  // =====================================================
  // PESQUISA
  // =====================================================

  get usuariosFiltrados(): any[] {
    const q = this.termoBusca.trim().toLowerCase();

    return !q
      ? this.usuarios
      : this.usuarios.filter(usuario =>
          [
            usuario.nome,
            usuario.email,
            usuario.telefone,
            usuario.endereco?.cidade,
            String(usuario.id)
          ].some(valor =>
            String(valor || '').toLowerCase().includes(q)
          )
        );
  }

  atualizarPesquisa(): void {
    this.paginaAtual = 1;
  }

  // =====================================================
  // PAGINAÇÃO
  // =====================================================

  get usuariosPaginados(): any[] {
    const inicio =
      (this.paginaAtual - 1) * this.itensPorPagina;

    return this.usuariosFiltrados.slice(
      inicio,
      inicio + this.itensPorPagina
    );
  }

  get totalPaginas(): number {
    return Math.ceil(
      this.usuariosFiltrados.length / this.itensPorPagina
    );
  }

  get paginas(): number[] {
    return Array.from(
      { length: this.totalPaginas },
      (_, i) => i + 1
    );
  }

  get primeiroItem(): number {
    if (this.usuariosFiltrados.length === 0) {
      return 0;
    }

    return (
      (this.paginaAtual - 1) * this.itensPorPagina + 1
    );
  }

  get ultimoItem(): number {
    return Math.min(
      this.paginaAtual * this.itensPorPagina,
      this.usuariosFiltrados.length
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

  // =====================================================
  // VALIDAÇÃO DE CAMPOS
  // =====================================================

  limparErro(campo: string): void {
    this.errosCampo[campo] = '';
    this.errosCampo['geral'] = '';
  }

  validarEmail(): void {
    const email = (this.formUsuario.email || '').trim();

    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      this.errosCampo['email'] = 'Informe o e-mail.';
    } else if (!regex.test(email)) {
      this.errosCampo['email'] = 'Informe um e-mail válido.';
    } else {
      this.errosCampo['email'] = '';
    }
  }

  // =====================================================
  // ABRIR FORMULÁRIO
  // =====================================================

  abrirNovo(): void {
    this.formUsuario = this.novoModelo();
    this.errosCampo = {};
    this.isEdicao = false;
    this.modoFormulario = true;
    this.ultimoCepConsultado = '';
    this.cepConsultando = false;
  }

  abrirEdicao(usuario: any): void {
    this.formUsuario = {
      ...usuario,
      endereco: {
        ...this.novoModelo().endereco,
        ...(usuario.endereco || {})
      }
    };

    this.errosCampo = {};
    this.isEdicao = true;
    this.modoFormulario = true;

    this.ultimoCepConsultado = '';
    this.cepConsultando = false;
  }

  voltarParaLista(): void {
    this.modoFormulario = false;
    this.errosCampo = {};
    this.ultimoCepConsultado = '';
    this.cepConsultando = false;
  }

  // =====================================================
  // MÁSCARA DE TELEFONE
  // =====================================================

  aplicarMascaraTelefone(): void {
    let valor = (this.formUsuario.telefone || '')
      .replace(/\D/g, '')
      .slice(0, 11);

    if (valor.length > 10) {
      valor = valor.replace(
        /^(\d{2})(\d{5})(\d{4})$/,
        '($1) $2-$3'
      );
    } else if (valor.length > 6) {
      valor = valor.replace(
        /^(\d{2})(\d{4})(\d{0,4})$/,
        '($1) $2-$3'
      );
    } else if (valor.length > 2) {
      valor = valor.replace(
        /^(\d{2})(\d{0,5})$/,
        '($1) $2'
      );
    } else if (valor.length > 0) {
      valor = `(${valor}`;
    }

    this.formUsuario.telefone = valor;
    this.limparErro('telefone');
  }

  // =====================================================
  // MÁSCARA DE CEP
  // =====================================================

  aplicarMascaraCep(): void {
    let valor = (this.formUsuario.endereco.cep || '')
      .replace(/\D/g, '')
      .slice(0, 8);

    if (valor.length > 5) {
      valor = valor.replace(
        /^(\d{5})(\d{1,3})$/,
        '$1-$2'
      );
    }

    this.formUsuario.endereco.cep = valor;

    this.limparErro('cep');

    const cepLimpo = valor.replace(/\D/g, '');

    // Permite uma nova consulta quando o CEP é alterado
    if (cepLimpo !== this.ultimoCepConsultado) {
      this.ultimoCepConsultado = '';
    }

    // Consulta somente quando existem os 8 dígitos
    if (cepLimpo.length === 8) {
      this.buscarCep(cepLimpo);
    }
  }

  // =====================================================
  // CONSULTA DE CEP - VIACEP
  // =====================================================

  private buscarCep(cepLimpo: string): void {

    if (
      this.cepConsultando ||
      this.ultimoCepConsultado === cepLimpo
    ) {
      return;
    }

    this.cepConsultando = true;
    this.ultimoCepConsultado = cepLimpo;

    this.errosCampo['cep'] = '';

    this.http.get<any>(
      `https://viacep.com.br/ws/${cepLimpo}/json/`
    ).subscribe({

      next: dados => {

        if (dados?.erro) {
          this.cepConsultando = false;
          this.ultimoCepConsultado = '';

          this.errosCampo['cep'] = 'CEP não encontrado.';
          return;
        }

        this.preencherEndereco({
          logradouro: dados.logradouro,
          bairro: dados.bairro,
          cidade: dados.localidade,
          estado: dados.uf
        });

        this.cepConsultando = false;
        this.errosCampo['cep'] = '';

      },

      error: () => {

        // Se ViaCEP falhar, tenta a BrasilAPI
        this.buscarCepAlternativo(cepLimpo);

      }

    });
  }

  // =====================================================
  // CONSULTA ALTERNATIVA - BRASILAPI
  // =====================================================

  private buscarCepAlternativo(cepLimpo: string): void {

    this.http.get<any>(
      `https://brasilapi.com.br/api/cep/v1/${cepLimpo}`
    ).subscribe({

      next: dados => {

        if (!dados || !dados.city || !dados.state) {
          this.finalizarErroCep(
            'Não foi possível localizar esse CEP. Confira os números.'
          );
          return;
        }

        this.preencherEndereco({
          logradouro: dados.street,
          bairro: dados.neighborhood,
          cidade: dados.city,
          estado: dados.state
        });

        this.cepConsultando = false;
        this.errosCampo['cep'] = '';

      },

      error: () => {

        this.finalizarErroCep(
          'Não foi possível consultar o CEP. Verifique sua conexão ou preencha o endereço manualmente.'
        );

      }

    });
  }

  // =====================================================
  // PREENCHIMENTO AUTOMÁTICO DO ENDEREÇO
  // =====================================================

  private preencherEndereco(dados: any): void {

    this.formUsuario.endereco.logradouro =
      dados.logradouro || '';

    this.formUsuario.endereco.bairro =
      dados.bairro || '';

    this.formUsuario.endereco.cidade =
      dados.cidade || '';

    this.formUsuario.endereco.estado =
      dados.estado || '';

    this.errosCampo['cep'] = '';
    this.errosCampo['logradouro'] = '';
    this.errosCampo['bairro'] = '';
    this.errosCampo['cidade'] = '';
    this.errosCampo['estado'] = '';
  }

  private finalizarErroCep(mensagem: string): void {
    this.cepConsultando = false;
    this.ultimoCepConsultado = '';
    this.errosCampo['cep'] = mensagem;
  }

  // =====================================================
  // SALVAR USUÁRIO
  // =====================================================

  salvarUsuario(): void {

    const usuario = this.formUsuario;
    const endereco = usuario.endereco || {};

    this.errosCampo = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const telefoneLimpo = (usuario.telefone || '')
      .replace(/\D/g, '');

    const cepLimpo = (endereco.cep || '')
      .replace(/\D/g, '');

    // ---------------------------------------------
    // DADOS PESSOAIS
    // ---------------------------------------------

    if (!usuario.nome?.trim()) {
      this.errosCampo['nome'] = 'Informe o nome completo.';
    }

    if (!usuario.email?.trim()) {
      this.errosCampo['email'] = 'Informe o e-mail.';
    } else if (!emailRegex.test(usuario.email.trim())) {
      this.errosCampo['email'] = 'Informe um e-mail válido.';
    }

    if (!telefoneLimpo) {
      this.errosCampo['telefone'] = 'Informe o telefone.';
    } else if (
      telefoneLimpo.length !== 10 &&
      telefoneLimpo.length !== 11
    ) {
      this.errosCampo['telefone'] = 'Informe um telefone válido.';
    }

    if (!usuario.dataNascimento) {
      this.errosCampo['dataNascimento'] =
        'Informe a data de nascimento.';
    }

    // ---------------------------------------------
    // ENDEREÇO
    // ---------------------------------------------

    if (!cepLimpo) {
      this.errosCampo['cep'] = 'Informe o CEP.';
    } else if (cepLimpo.length !== 8) {
      this.errosCampo['cep'] = 'Informe um CEP válido.';
    }

    if (!endereco.estado?.trim()) {
      this.errosCampo['estado'] = 'Informe o estado.';
    } else if (endereco.estado.trim().length !== 2) {
      this.errosCampo['estado'] =
        'Informe a sigla do estado. Exemplo: SP.';
    }

    if (!endereco.logradouro?.trim()) {
      this.errosCampo['logradouro'] = 'Informe o logradouro.';
    }

    if (!endereco.numero?.trim()) {
      this.errosCampo['numero'] = 'Informe o número.';
    }

    if (!endereco.bairro?.trim()) {
      this.errosCampo['bairro'] = 'Informe o bairro.';
    }

    if (!endereco.cidade?.trim()) {
      this.errosCampo['cidade'] = 'Informe a cidade.';
    }

    // Não permite salvar durante a consulta do CEP
    if (this.cepConsultando) {
      this.errosCampo['cep'] =
        'Aguarde a consulta do CEP terminar.';
    }

    // ---------------------------------------------
    // VERIFICAÇÃO DOS ERROS
    // ---------------------------------------------

    if (
      Object.values(this.errosCampo).some(erro => !!erro)
    ) {
      return;
    }

    // ---------------------------------------------
    // PAYLOAD
    // ---------------------------------------------

    const payload = {
      nome: usuario.nome.trim(),
      email: usuario.email.trim(),
      telefone: usuario.telefone.trim(),
      dataNascimento: usuario.dataNascimento,

      endereco: {
        logradouro: endereco.logradouro,
        numero: endereco.numero,
        complemento: endereco.complemento,
        bairro: endereco.bairro,
        cidade: endereco.cidade,
        estado: endereco.estado.toUpperCase(),
        cep: cepLimpo
      }
    };

    // ---------------------------------------------
    // REQUISIÇÃO
    // ---------------------------------------------

    const requisicao = this.isEdicao
      ? this.api.putItem(
          'usuarios',
          usuario.id,
          payload
        )
      : this.api.postItem(
          'usuarios',
          payload
        );

    requisicao.subscribe({

      next: () => {

        this.mostrarAlerta('Usuário salvo com sucesso!');

        this.errosCampo = {};
        this.modoFormulario = false;

        this.carregarUsuarios();

      },

      error: erro => {

        const mensagem =
          erro?.error?.mensagem ||
          erro?.error?.erro ||
          'Não foi possível concluir a operação.';

        const mensagemLower =
          String(mensagem).toLowerCase();

        // Erros relacionados ao e-mail
        if (
          erro?.status === 409 ||
          mensagemLower.includes('email') ||
          mensagemLower.includes('e-mail') ||
          mensagemLower.includes('já cadastrado') ||
          mensagemLower.includes('ja cadastrado') ||
          mensagemLower.includes('duplicado') ||
          mensagemLower.includes('duplicate')
        ) {

          this.errosCampo['email'] = mensagem;
          return;

        }

        // Outros erros da API
        this.errosCampo['geral'] = mensagem;

      }

    });
  }

  // =====================================================
  // EXCLUIR USUÁRIO
  // =====================================================

  excluirUsuario(id: number): void {

    const confirmar = isPlatformBrowser(this.platformId)
      ? confirm('Tem certeza que deseja excluir este usuário?')
      : true;

    if (!confirmar) {
      return;
    }

    this.api.deleteItem('usuarios', id).subscribe({

      next: () => {
        this.carregarUsuarios();
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

    console.error('Erro na operação de usuários:', erro);

    this.mostrarAlerta(
      erro?.error?.mensagem ||
      erro?.error?.erro ||
      'Não foi possível concluir a operação.'
    );

  }

}