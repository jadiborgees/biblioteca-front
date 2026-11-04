import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';

// Endereço da API Spring Boot (IntelliJ) e chave de desenvolvimento (nível ADMIN).
// A chave abaixo é criada pelo LoadDatabase do back a cada execução.
const API_URL = 'http://localhost:8080';
const API_KEY = 'bib-chave-demo-12345';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private headers = new HttpHeaders({ 'X-API-Key': API_KEY });

  constructor(private http: HttpClient) {}

  private url(endpoint: string, id?: number, sufixo = ''): string {
    const base = `${API_URL}/${endpoint.toLowerCase()}`;
    return id === undefined ? base : `${base}/${id}${sufixo}`;
  }

  // A API devolve listas paginadas no formato HATEOAS:
  // { _embedded: { livroList: [...] }, page: { totalElements, ... } }
  // Sem registros o campo _embedded nem aparece.
  private extrairLista(resposta: any): any[] {
    if (Array.isArray(resposta)) return resposta;
    const embutido = resposta?._embedded;
    return embutido ? (Object.values(embutido)[0] as any[]) ?? [] : [];
  }

  getLista(endpoint: string): Observable<any[]> {
    // 100 é o máximo de itens por página permitido pelo back
    return this.http
      .get<any>(this.url(endpoint), { headers: this.headers, params: { size: 100 } })
      .pipe(map(r => this.extrairLista(r)));
  }

  getTotal(endpoint: string): Observable<number> {
    return this.http
      .get<any>(this.url(endpoint), { headers: this.headers, params: { size: 1 } })
      .pipe(map(r => r?.page?.totalElements ?? this.extrairLista(r).length));
  }

  getPorId(endpoint: string, id: number): Observable<any> {
    return this.http.get<any>(this.url(endpoint, Number(id)), { headers: this.headers });
  }

  postItem(endpoint: string, data: any): Observable<any> {
    return this.http.post<any>(this.url(endpoint), data, { headers: this.headers });
  }

  putItem(endpoint: string, id: number, data: any): Observable<any> {
    return this.http.put<any>(this.url(endpoint, Number(id)), data, { headers: this.headers });
  }

  patchItem(endpoint: string, id: number, sufixo = ''): Observable<any> {
    return this.http.patch<any>(this.url(endpoint, Number(id), sufixo), null, { headers: this.headers });
  }

  deleteItem(endpoint: string, id: number): Observable<any> {
    return this.http.delete<any>(this.url(endpoint, Number(id)), { headers: this.headers });
  }
}