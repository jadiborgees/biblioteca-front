import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private isBrowser: boolean;

  // Base de dados inicial simulada (Mock)
  private mockData: Record<string, any[]> = {
    livro: [
      { id: 1, titulo: 'Dom Casmurro', isbn: '978-8535902778', anoPublicacao: 1899, autores: [{ id: 1, nome: 'Machado de Assis' }] },
      { id: 2, titulo: 'O Cortiço', isbn: '978-8508041534', anoPublicacao: 1890, autores: [{ id: 2, nome: 'Aluísio Azevedo' }] },
      { id: 3, titulo: 'Memórias Póstumas de Brás Cubas', isbn: '978-8535914047', anoPublicacao: 1881, autores: [{ id: 1, nome: 'Machado de Assis' }] }
    ],
    autor: [
      { id: 1, nome: 'Machado de Assis', nacionalidade: 'Brasileira' },
      { id: 2, nome: 'Aluísio Azevedo', nacionalidade: 'Brasileira' }
    ],
    usuario: [
      { id: 1, nome: 'João Silva', email: 'joao@email.com', telefone: '11999998888', dataNascimento: '1995-05-10', endereco: { logradouro: 'Rua das Flores', numero: '123', bairro: 'Centro', cidade: 'São Paulo', estado: 'SP', cep: '01001-000' } },
      { id: 2, nome: 'Maria Santos', email: 'maria@email.com', telefone: '11977776666', dataNascimento: '1998-11-20', endereco: { logradouro: 'Av. Paulista', numero: '1000', bairro: 'Bela Vista', cidade: 'São Paulo', estado: 'SP', cep: '01310-100' } }
    ],
    emprestimo: [
      { id: 1, usuario: { id: 1, nome: 'João Silva', email: 'joao@email.com' }, livro: { id: 1, titulo: 'Dom Casmurro' }, dataEmprestimo: '2026-11-01', dataDevolucaoPrevista: '2026-11-15', status: 'ATIVO' }
    ]
  };

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.carregarDoLocalStorage();
  }

  private normalizarEndpoint(endpoint: string): string {
    const mapa: Record<string, string> = {
      'livros': 'livro',
      'autores': 'autor',
      'usuarios': 'usuario',
      'emprestimos': 'emprestimo',
      'enderecos': 'endereco'
    };
    return mapa[endpoint.toLowerCase()] || endpoint.toLowerCase();
  }

  private carregarDoLocalStorage(): void {
    if (this.isBrowser) {
      const salvas = localStorage.getItem('bib_mock_db');
      if (salvas) {
        try {
          this.mockData = JSON.parse(salvas);
        } catch (e) {
          console.error('Erro ao ler do localStorage', e);
        }
      }
    }
  }

  private guardarNoLocalStorage(): void {
    if (this.isBrowser) {
      localStorage.setItem('bib_mock_db', JSON.stringify(this.mockData));
    }
  }

  getLista(endpoint: string): Observable<any[]> {
    const ep = this.normalizarEndpoint(endpoint);
    const lista = this.mockData[ep] || [];
    return of([...lista]);
  }

  getTotal(endpoint: string): Observable<number> {
    const ep = this.normalizarEndpoint(endpoint);
    const lista = this.mockData[ep] || [];
    return of(lista.length);
  }

  getPorId(endpoint: string, id: number): Observable<any> {
    const ep = this.normalizarEndpoint(endpoint);
    const item = (this.mockData[ep] || []).find(i => i.id === Number(id));
    return of(item ? { ...item } : null);
  }

  postItem(endpoint: string, data: any): Observable<any> {
    const ep = this.normalizarEndpoint(endpoint);
    if (!this.mockData[ep]) this.mockData[ep] = [];
    
    const novoId = this.mockData[ep].length > 0 ? Math.max(...this.mockData[ep].map(i => i.id || 0)) + 1 : 1;
    const novoItem = { ...data, id: novoId };
    
    this.mockData[ep].push(novoItem);
    this.guardarNoLocalStorage();
    return of(novoItem);
  }

  putItem(endpoint: string, id: number, data: any): Observable<any> {
    const ep = this.normalizarEndpoint(endpoint);
    const index = (this.mockData[ep] || []).findIndex(i => i.id === Number(id));
    if (index !== -1) {
      this.mockData[ep][index] = { ...data, id: Number(id) };
      this.guardarNoLocalStorage();
      return of(this.mockData[ep][index]);
    }
    return of(data);
  }

  patchItem(endpoint: string, id: number, sufixo = ''): Observable<any> {
    const ep = this.normalizarEndpoint(endpoint);
    const item = (this.mockData[ep] || []).find(i => i.id === Number(id));
    if (item) {
      if (sufixo === '/devolver') {
        item.status = 'DEVOLVIDO';
        item.dataDevolucao = new Date().toISOString().slice(0, 10);
      }
      this.guardarNoLocalStorage();
      return of(item);
    }
    return of(null);
  }

  deleteItem(endpoint: string, id: number): Observable<any> {
    const ep = this.normalizarEndpoint(endpoint);
    if (this.mockData[ep]) {
      this.mockData[ep] = this.mockData[ep].filter(i => i.id !== Number(id));
      this.guardarNoLocalStorage();
    }
    return of(true);
  }
}