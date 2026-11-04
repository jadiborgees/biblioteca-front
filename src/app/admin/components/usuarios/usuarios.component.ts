
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

  // Erros de validação por campo
  errosCampo: { [key: string]: string } = {};

  formUsuario: any = this.novoModelo();

  constructor(
    private api: ApiService,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.carregarUsuarios();
  }

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

  carregarUsuarios(): void {
    this.api.getLista('usuarios').subscribe({
      next: d => {
        this.usuarios = d;
        this.ajustarPagina();
      },
      error: e => this.erro(e)
    });
  }

  get usuariosFiltrados(): any[] {
    const q = this.termoBusca.trim().toLowerCase();

    return !q ? this.usuarios : this.usuarios.filter(u =>
      [
        u.nome,
        u.email,
        u.telefone,
        u.endereco?.cidade,
        String(u.id)
      ].some(v => String(v || '').toLowerCase().includes(q))
    );
  }

  // Usuários da página atual
  get usuariosPaginados(): any[] {
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;

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
    if (this.usuariosFiltrados.length === 0) return 0;

    return (this.paginaAtual - 1) * this.itensPorPagina + 1;
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

  atualizarPesquisa(): void {
    this.paginaAtual = 1;
  }

  // Limpa o erro de um campo quando ele é alterado
  limparErro(campo: string): void {
    this.errosCampo[campo] = '';
    this.errosCampo['geral'] = '';
  }

  // Validação do e-mail
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

  abrirNovo(): void {
    this.formUsuario = this.novoModelo();
    this.errosCampo = {};
    this.isEdicao = false;
    this.modoFormulario = true;
  }

  abrirEdicao(u: any): void {
    this.formUsuario = {
      ...u,
      endereco: {
        ...this.novoModelo().endereco,
        ...(u.endereco || {})
      }
    };

    this.errosCampo = {};
    this.isEdicao = true;
    this.modoFormulario = true;
  }

  voltarParaLista(): void {
    this.modoFormulario = false;
    this.errosCampo = {};
  }

  // Máscara dinâmica de telefone
  aplicarMascaraTelefone(): void {
    let v = (this.formUsuario.telefone || '')
      .replace(/\D/g, '')
      .slice(0, 11);

    if (v.length > 10) {
      v = v.replace(
        /^(\d{2})(\d{5})(\d{4})$/,
        '($1) $2-$3'
      );
    } else if (v.length > 6) {
      v = v.replace(
        /^(\d{2})(\d{4})(\d{0,4})$/,
        '($1) $2-$3'
      );
    } else if (v.length > 2) {
      v = v.replace(
        /^(\d{2})(\d{0,5})$/,
        '($1) $2'
      );
    } else if (v.length > 0) {
      v = `(${v}`;
    }

    this.formUsuario.telefone = v;
  }

  // Máscara de CEP + integração com ViaCEP
  aplicarMascaraCep(): void {
    let v = (this.formUsuario.endereco.cep || '')
      .replace(/\D/g, '')
      .slice(0, 8);

    const rawCep = v;

    if (v.length > 5) {
      v = v.replace(
        /^(\d{5})(\d{1,3})$/,
        '$1-$2'
      );
    }

    this.formUsuario.endereco.cep = v;

    if (rawCep.length === 8) {
      this.buscarCep(rawCep);
    }
  }

  private buscarCep(cepLimpo: string): void {
    this.http.get<any>(
      `https://viacep.com.br/ws/${cepLimpo}/json/`
    ).subscribe({
      next: (dados) => {
        if (!dados.erro) {
          this.formUsuario.endereco.logradouro =
            dados.logradouro || '';

          this.formUsuario.endereco.bairro =
            dados.bairro || '';

          this.formUsuario.endereco.cidade =
            dados.localidade || '';

          this.formUsuario.endereco.estado =
            dados.uf || '';

          this.errosCampo['cep'] = '';
        } else {
          this.errosCampo['cep'] = 'CEP não encontrado.';
        }
      },
      error: () => {
        this.errosCampo['cep'] =
          'Não foi possível consultar o CEP. Tente novamente.';
      }
    });
  }

  salvarUsuario(): void {
    const u = this.formUsuario;
    const e = u.endereco || {};

    this.errosCampo = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const telefoneLimpo = (u.telefone || '').replace(/\D/g, '');

    // Dados pessoais
    if (!u.nome?.trim()) {
      this.errosCampo['nome'] = 'Informe o nome completo.';
    }

    if (!u.email?.trim()) {
      this.errosCampo['email'] = 'Informe o e-mail.';
    } else if (!emailRegex.test(u.email.trim())) {
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

    if (!u.dataNascimento) {
      this.errosCampo['dataNascimento'] =
        'Informe a data de nascimento.';
    }

    // Endereço
    if (!e.cep?.trim()) {
      this.errosCampo['cep'] = 'Informe o CEP.';
    } else if (!/^\d{5}-?\d{3}$/.test(e.cep)) {
      this.errosCampo['cep'] = 'Informe um CEP válido.';
    }

    if (!e.estado?.trim()) {
      this.errosCampo['estado'] = 'Informe o estado.';
    } else if (e.estado.trim().length !== 2) {
      this.errosCampo['estado'] =
        'Informe a sigla do estado. Exemplo: SP.';
    }

    if (!e.logradouro?.trim()) {
      this.errosCampo['logradouro'] = 'Informe o logradouro.';
    }

    if (!e.numero?.trim()) {
      this.errosCampo['numero'] = 'Informe o número.';
    }

    if (!e.bairro?.trim()) {
      this.errosCampo['bairro'] = 'Informe o bairro.';
    }

    if (!e.cidade?.trim()) {
      this.errosCampo['cidade'] = 'Informe a cidade.';
    }

    // Interrompe o envio se houver erros
    if (Object.values(this.errosCampo).some(erro => !!erro)) {
      return;
    }

    const payload = {
      nome: u.nome.trim(),
      email: u.email.trim(),
      telefone: u.telefone.trim(),
      dataNascimento: u.dataNascimento,
      endereco: {
        logradouro: e.logradouro,
        numero: e.numero,
        complemento: e.complemento,
        bairro: e.bairro,
        cidade: e.cidade,
        estado: e.estado.toUpperCase(),
        cep: e.cep
      }
    };

    const req = this.isEdicao
      ? this.api.putItem('usuarios', u.id, payload)
      : this.api.postItem('usuarios', payload);

    req.subscribe({
      next: () => {
        this.mostrarAlerta('Usuário salvo com sucesso!');
        this.errosCampo = {};
        this.modoFormulario = false;
        this.carregarUsuarios();
      },
      error: err => {
        const mensagem =
          err?.error?.mensagem ||
          err?.error?.erro ||
          'Não foi possível concluir a operação.';

        const mensagemLower = String(mensagem).toLowerCase();

        // Erros relacionados ao e-mail
        if (
          err?.status === 409 ||
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

  excluirUsuario(id: number): void {
    const confirmar = isPlatformBrowser(this.platformId)
      ? confirm('Tem certeza que deseja excluir este usuário?')
      : true;

    if (confirmar) {
      this.api.deleteItem('usuarios', id).subscribe({
        next: () => this.carregarUsuarios(),
        error: err => this.erro(err)
      });
    }
  }

  private mostrarAlerta(msg: string): void {
    if (isPlatformBrowser(this.platformId)) {
      alert(msg);
    }
  }

  private erro(e: any): void {
    console.error(e);

    this.mostrarAlerta(
      e?.error?.mensagem ||
      e?.error?.erro ||
      'Não foi possível concluir a operação.'
    );
  }
}
