import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-emprestimos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './emprestimos.component.html',
  styleUrl: './emprestimos.component.css'
})
export class EmprestimosComponent implements OnInit {
  modoFormulario: boolean = false;
  emprestimos: any[] = [];
  termoBuscaEmprestimo: string = '';

  etapaAtual: number = 1;
  livros: any[] = [];
  usuarios: any[] = [];
  tipoSelecaoUsuario: 'existente' | 'novo' = 'existente';
  termoBuscaUsuario: string = '';
  termoBuscaLivro: string = '';

  formEmprestimo = {
    usuarioId: null,
    nomeUsuario: '',
    emailUsuario: '',
    cpfUsuario: '',
    cep: '',
    logradouro: '',
    numero: '',
    cidade: '',
    estado: '',
    livroId: null,
    dataEmprestimo: '',
    dataDevolucao: ''
  };

  constructor(private apiService: ApiService, private http: HttpClient) {}

  ngOnInit(): void {
    this.carregarEmprestimos();
    this.carregarDadosAuxiliares();
  }

  carregarEmprestimos() {
    this.apiService.getLista('emprestimos').subscribe({
      next: (data) => this.emprestimos = Array.isArray(data) ? data : [],
      error: (err) => console.error('Erro ao carregar empréstimos:', err)
    });
  }

  carregarDadosAuxiliares() {
    this.apiService.getLista('livros').subscribe({
      next: (data) => this.livros = Array.isArray(data) ? data : [],
      error: (err) => console.error('Erro ao carregar livros:', err)
    });

    this.apiService.getLista('usuarios').subscribe({
      next: (data) => this.usuarios = Array.isArray(data) ? data : [],
      error: (err) => console.error('Erro ao carregar usuários:', err)
    });
  }

  get emprestimosFiltrados() {
    if (!this.termoBuscaEmprestimo || this.termoBuscaEmprestimo.trim() === '') {
      return this.emprestimos;
    }
    const termo = this.termoBuscaEmprestimo.toLowerCase().trim();
    return this.emprestimos.filter(emp => {
      const nomeMatch = emp.nomeUsuario && emp.nomeUsuario.toLowerCase().includes(termo);
      const emailMatch = emp.emailUsuario && emp.emailUsuario.toLowerCase().includes(termo);
      const cpfMatch = emp.cpfUsuario && emp.cpfUsuario.toLowerCase().includes(termo);
      const idMatch = emp.id && emp.id.toString().includes(termo);
      return nomeMatch || emailMatch || cpfMatch || idMatch;
    });
  }

  get usuariosFiltrados() {
    if (!this.termoBuscaUsuario || this.termoBuscaUsuario.trim() === '') {
      return this.usuarios;
    }
    const termo = this.termoBuscaUsuario.toLowerCase().trim();
    return this.usuarios.filter(u => {
      const nomeMatch = u.nome && u.nome.toLowerCase().includes(termo);
      const cpfMatch = u.cpf && u.cpf.toLowerCase().includes(termo);
      const emailMatch = u.email && u.email.toLowerCase().includes(termo);
      return nomeMatch || cpfMatch || emailMatch;
    });
  }

  selecionarUsuarioExistente(usuario: any) {
    this.formEmprestimo.usuarioId = usuario.id;
    this.formEmprestimo.nomeUsuario = usuario.nome;
    this.formEmprestimo.emailUsuario = usuario.email;
    this.formEmprestimo.cpfUsuario = usuario.cpf;
    this.termoBuscaUsuario = `${usuario.nome} (CPF: ${usuario.cpf})`;
  }

  abrirNovoEmprestimo() {
    this.modoFormulario = true;
    this.etapaAtual = 1;
    this.tipoSelecaoUsuario = 'existente';
    this.termoBuscaUsuario = '';
    this.termoBuscaLivro = '';
    this.formEmprestimo = {
      usuarioId: null,
      nomeUsuario: '', emailUsuario: '', cpfUsuario: '',
      cep: '', logradouro: '', numero: '', cidade: '', estado: '',
      livroId: null, dataEmprestimo: '', dataDevolucao: ''
    };
  }

  voltarParaLista() {
    this.modoFormulario = false;
  }

  aplicarMascaraCpf() {
    let valor = this.formEmprestimo.cpfUsuario ? this.formEmprestimo.cpfUsuario.replace(/\D/g, '') : '';
    if (valor.length > 11) valor = valor.substring(0, 11);
    if (valor.length > 9) {
      valor = valor.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    } else if (valor.length > 6) {
      valor = valor.replace(/^(\d{3})(\d{3})(\d{1,3})$/, '$1.$2.$3');
    } else if (valor.length > 3) {
      valor = valor.replace(/^(\d{3})(\d{1,3})$/, '$1.$2');
    }
    this.formEmprestimo.cpfUsuario = valor;
  }

  aplicarMascaraCep() {
    let valor = this.formEmprestimo.cep ? this.formEmprestimo.cep.replace(/\D/g, '') : '';
    if (valor.length > 8) valor = valor.substring(0, 8);
    if (valor.length > 5) {
      valor = valor.replace(/^(\d{5})(\d{1,3})$/, '$1-$2');
    }
    this.formEmprestimo.cep = valor;
    if (valor.replace(/\D/g, '').length === 8) {
      this.consultarCep(valor.replace(/\D/g, ''));
    }
  }

  consultarCep(cepLimpo: string) {
    this.http.get(`https://viacep.com.br/ws/${cepLimpo}/json/`).subscribe({
      next: (dados: any) => {
        if (!dados.erro) {
          this.formEmprestimo.logradouro = dados.logradouro;
          this.formEmprestimo.cidade = dados.localidade;
          this.formEmprestimo.estado = dados.uf;
        } else {
          alert('CEP não encontrado.');
        }
      },
      error: (err) => console.error('Erro ao consultar CEP:', err)
    });
  }

  get livrosFiltrados() {
    if (!this.termoBuscaLivro || this.termoBuscaLivro.trim() === '') {
      return this.livros;
    }
    const termo = this.termoBuscaLivro.toLowerCase().trim();
    return this.livros.filter(livro => {
      const tituloMatch = livro.titulo && livro.titulo.toLowerCase().includes(termo);
      const idMatch = livro.id && livro.id.toString().includes(termo);
      const isbnMatch = livro.isbn && livro.isbn.toLowerCase().includes(termo);
      return tituloMatch || idMatch || isbnMatch;
    });
  }

  selecionarLivro(livro: any) {
    this.formEmprestimo.livroId = livro.id;
    this.termoBuscaLivro = `${livro.titulo} (ID: ${livro.id} - ISBN: ${livro.isbn || 'N/A'})`;
  }

  validarEtapa1(): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const cpfLimpo = this.formEmprestimo.cpfUsuario ? this.formEmprestimo.cpfUsuario.replace(/\D/g, '') : '';

    if (this.tipoSelecaoUsuario === 'existente' && !this.formEmprestimo.usuarioId) {
      alert('Por favor, selecione um usuário existente da lista.');
      return false;
    }

    if (!this.formEmprestimo.nomeUsuario?.trim()) { alert('Preencha o nome completo.'); return false; }
    if (!emailRegex.test(this.formEmprestimo.emailUsuario)) { alert('Insira um e-mail válido.'); return false; }
    if (cpfLimpo.length !== 11) { alert('O CPF deve conter 11 dígitos.'); return false; }
    return true;
  }

  validarEtapa2(): boolean {
    const cepLimpo = this.formEmprestimo.cep ? this.formEmprestimo.cep.replace(/\D/g, '') : '';
    if (cepLimpo.length !== 8 || !this.formEmprestimo.logradouro?.trim() || !this.formEmprestimo.numero?.trim() || !this.formEmprestimo.cidade?.trim()) {
      alert('Preencha todos os campos obrigatórios do endereço.');
      return false;
    }
    return true;
  }

  validarEtapa3(): boolean {
    if (!this.formEmprestimo.livroId) { alert('Selecione um livro válido.'); return false; }
    return true;
  }

  validarEtapa4(): boolean {
    if (!this.formEmprestimo.dataEmprestimo || !this.formEmprestimo.dataDevolucao) {
      alert('Preencha as datas de retirada e devolução.');
      return false;
    }
    return true;
  }

  proximaEtapa() {
    if (this.etapaAtual === 1 && !this.validarEtapa1()) return;
    if (this.etapaAtual === 2 && !this.validarEtapa2()) return;
    if (this.etapaAtual === 3 && !this.validarEtapa3()) return;
    if (this.etapaAtual < 4) this.etapaAtual++;
  }

  etapaAnterior() {
    if (this.etapaAtual > 1) this.etapaAtual--;
  }

  finalizarEmprestimo() {
    if (!this.validarEtapa4()) return;

    this.apiService.postItem('emprestimos', this.formEmprestimo).subscribe({
      next: (res) => {
        alert('Empréstimo registado com sucesso!');
        this.modoFormulario = false;
        this.carregarEmprestimos();
      },
      error: (err) => {
        console.error('Erro ao registar empréstimo:', err);
        alert('Erro ao concluir o empréstimo.');
      }
    });
  }
}