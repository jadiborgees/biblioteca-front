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
      next: d => this.usuarios = d,
      error: e => this.erro(e)
    });
  }

  get usuariosFiltrados(): any[] {
    const q = this.termoBusca.trim().toLowerCase();
    return !q ? this.usuarios : this.usuarios.filter(u =>
      [u.nome, u.email, u.telefone, u.endereco?.cidade, String(u.id)]
        .some(v => String(v || '').toLowerCase().includes(q))
    );
  }

  abrirNovo(): void {
    this.formUsuario = this.novoModelo();
    this.isEdicao = false;
    this.modoFormulario = true;
  }

  abrirEdicao(u: any): void {
    this.formUsuario = {
      ...u,
      endereco: { ...this.novoModelo().endereco, ...(u.endereco || {}) }
    };
    this.isEdicao = true;
    this.modoFormulario = true;
  }

  voltarParaLista(): void {
    this.modoFormulario = false;
  }

  // Máscara dinâmica de telefone: (11) 99999-8888 ou (11) 9999-8888
  aplicarMascaraTelefone(): void {
    let v = (this.formUsuario.telefone || '').replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) {
      v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (v.length > 6) {
      v = v.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
    } else if (v.length > 2) {
      v = v.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
    } else if (v.length > 0) {
      v = v.replace(/^(\d*)$/, '($1');
    }
    this.formUsuario.telefone = v;
  }

  // Máscara de CEP + Integração automática com ViaCEP
  aplicarMascaraCep(): void {
    let v = (this.formUsuario.endereco.cep || '').replace(/\D/g, '').slice(0, 8);
    const rawCep = v;
    if (v.length > 5) {
      v = v.replace(/^(\d{5})(\d{1,3})$/, '$1-$2');
    }
    this.formUsuario.endereco.cep = v;

    if (rawCep.length === 8) {
      this.buscarCep(rawCep);
    }
  }

  private buscarCep(cepLimpo: string): void {
    this.http.get<any>(`https://viacep.com.br/ws/${cepLimpo}/json/`).subscribe({
      next: (dados) => {
        if (!dados.erro) {
          this.formUsuario.endereco.logradouro = dados.logradouro || '';
          this.formUsuario.endereco.bairro = dados.bairro || '';
          this.formUsuario.endereco.cidade = dados.localidade || '';
          this.formUsuario.endereco.estado = dados.uf || '';
        } else {
          this.mostrarAlerta('CEP não encontrado.');
        }
      },
      error: () => console.error('Erro ao consultar ViaCEP')
    });
  }

  salvarUsuario(): void {
    const u = this.formUsuario;
    const e = u.endereco || {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!u.nome?.trim() || !emailRegex.test(u.email) || !u.telefone?.trim() || !u.dataNascimento) {
      this.mostrarAlerta('Preencha nome, e-mail válido, telefone e data de nascimento.');
      return;
    }

    if (!e.logradouro?.trim() || !e.numero?.trim() || !e.bairro?.trim() || !e.cidade?.trim() || !e.estado?.trim() || !/^\d{5}-?\d{3}$/.test(e.cep || '')) {
      this.mostrarAlerta('Preencha todos os campos obrigatórios do endereço e informe um CEP válido.');
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
        this.modoFormulario = false;
        this.carregarUsuarios();
      },
      error: err => this.erro(err)
    });
  }

  excluirUsuario(id: number): void {
    const confirmar = isPlatformBrowser(this.platformId) ? confirm('Tem certeza que deseja excluir este usuário?') : true;
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
    this.mostrarAlerta(e?.error?.mensagem || e?.error?.erro || 'Não foi possível concluir a operação.');
  }
}