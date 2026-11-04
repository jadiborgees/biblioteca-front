import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  termoBusca: string = '';
  modoFormulario: boolean = false;
  isEdicao: boolean = false;

  formUsuario = {
    id: null,
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    dataNascimento: ''
  };

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.carregarUsuarios();
  }

  carregarUsuarios() {
    this.apiService.getLista('usuarios').subscribe({
      next: (data) => this.usuarios = Array.isArray(data) ? data : [],
      error: (err) => console.error('Erro ao carregar usuários:', err)
    });
  }

  get usuariosFiltrados() {
    if (!this.termoBusca || this.termoBusca.trim() === '') {
      return this.usuarios;
    }
    const termo = this.termoBusca.toLowerCase().trim();
    return this.usuarios.filter(u => {
      const nomeMatch = u.nome && u.nome.toLowerCase().includes(termo);
      const emailMatch = u.email && u.email.toLowerCase().includes(termo);
      const cpfMatch = u.cpf && u.cpf.toLowerCase().includes(termo);
      const telefoneMatch = u.telefone && u.telefone.toLowerCase().includes(termo);
      const idMatch = u.id && u.id.toString().includes(termo);
      return nomeMatch || emailMatch || cpfMatch || telefoneMatch || idMatch;
    });
  }

  abrirNovo() {
    this.modoFormulario = true;
    this.isEdicao = false;
    this.formUsuario = { id: null, nome: '', email: '', cpf: '', telefone: '', dataNascimento: '' };
  }

  abrirEdicao(usuario: any) {
    this.modoFormulario = true;
    this.isEdicao = true;
    this.formUsuario = { ...usuario };
  }

  voltarParaLista() {
    this.modoFormulario = false;
  }

  aplicarMascaraCpf() {
    let valor = this.formUsuario.cpf ? this.formUsuario.cpf.replace(/\D/g, '') : '';
    if (valor.length > 11) valor = valor.substring(0, 11);
    if (valor.length > 9) {
      valor = valor.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    } else if (valor.length > 6) {
      valor = valor.replace(/^(\d{3})(\d{3})(\d{1,3})$/, '$1.$2.$3');
    } else if (valor.length > 3) {
      valor = valor.replace(/^(\d{3})(\d{1,3})$/, '$1.$2');
    }
    this.formUsuario.cpf = valor;
  }

  salvarUsuario() {
    const cpfLimpo = this.formUsuario.cpf ? this.formUsuario.cpf.replace(/\D/g, '') : '';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!this.formUsuario.nome?.trim()) { alert('Preencha o nome.'); return; }
    if (!emailRegex.test(this.formUsuario.email)) { alert('E-mail inválido.'); return; }
    if (cpfLimpo.length !== 11) { alert('O CPF deve ter 11 dígitos.'); return; }
    if (!this.formUsuario.telefone?.trim()) { alert('Preencha o telefone.'); return; }
    if (!this.formUsuario.dataNascimento) { alert('Preencha a data de nascimento.'); return; }

    if (this.isEdicao) {
      this.apiService.postItem(`usuarios/${this.formUsuario.id}`, this.formUsuario).subscribe({
        next: () => {
          alert('Usuário atualizado com sucesso!');
          this.modoFormulario = false;
          this.carregarUsuarios();
        },
        error: (err) => {
          console.error('Erro ao atualizar usuário:', err);
          alert('Erro ao atualizar usuário.');
        }
      });
    } else {
      this.apiService.postItem('usuarios', this.formUsuario).subscribe({
        next: () => {
          alert('Usuário cadastrado com sucesso!');
          this.modoFormulario = false;
          this.carregarUsuarios();
        },
        error: (err) => {
          console.error('Erro ao cadastrar usuário:', err);
          alert('Erro ao cadastrar usuário.');
        }
      });
    }
  }

  excluirUsuario(id: number) {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      this.apiService.deleteItem('usuarios', id).subscribe({
        next: () => {
          alert('Usuário excluído com sucesso!');
          this.carregarUsuarios();
        },
        error: (err) => {
          console.error('Erro ao excluir usuário:', err);
          alert('Erro ao excluir usuário.');
        }
      });
    }
  }
}