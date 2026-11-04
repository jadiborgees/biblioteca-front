import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  totalLivros: number = 0;
  totalAutores: number = 0;
  totalUsuarios: number = 0;
  totalEmprestimos: number = 0;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.carregarEstatisticas();
  }

  carregarEstatisticas() {
    this.apiService.getLista('livros').subscribe({
      next: (data) => this.totalLivros = Array.isArray(data) ? data.length : 0,
      error: (err) => console.error('Erro ao carregar livros:', err)
    });

    this.apiService.getLista('autores').subscribe({
      next: (data) => this.totalAutores = Array.isArray(data) ? data.length : 0,
      error: (err) => console.error('Erro ao carregar autores:', err)
    });

    this.apiService.getLista('usuarios').subscribe({
      next: (data) => this.totalUsuarios = Array.isArray(data) ? data.length : 0,
      error: (err) => console.error('Erro ao carregar usuários:', err)
    });

    this.apiService.getLista('emprestimos').subscribe({
      next: (data) => this.totalEmprestimos = Array.isArray(data) ? data.length : 0,
      error: (err) => console.error('Erro ao carregar empréstimos:', err)
    });
  }
}