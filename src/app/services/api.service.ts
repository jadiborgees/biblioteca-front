import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:8080';
  private apiKey = 'COLOQUE_A_CHAVE_EXATA_AQUI'; // Insira aqui a chave correta validada pelo Spring Boot

  constructor(private http: HttpClient) { }

  private getHeaders() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      })
    };
  }

  getLista(endpoint: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${endpoint}`, this.getHeaders());
  }

  postItem(endpoint: string, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/${endpoint}`, data, this.getHeaders());
  }

  deleteItem(endpoint: string, id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${endpoint}/${id}`, this.getHeaders());
  }
}