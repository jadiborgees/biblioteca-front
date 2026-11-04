import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service'; // Caminho correto com .service

@Component({
  selector: 'app-livros',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './livros.component.html',
  styleUrl: './livros.component.css'
})
export class LivrosComponent implements OnInit {
  livros: any[] = [];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.carregarLivros();
  }

  carregarLivros() {
    this.apiService.getLista('livros').subscribe({
      next: (data: any) => {
        this.livros = data;
        console.log('Livros carregados:', data);
      },
      error: (err: any) => {
        console.error('Erro ao carregar livros:', err);
      }
    });
  }
}