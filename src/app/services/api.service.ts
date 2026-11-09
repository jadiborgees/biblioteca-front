import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';

const API_URL = 'http://localhost:8080';

export interface PaginaResponse<T> {
  conteudo: T[];
  pagina: number;
  tamanho: number;
  totalElementos: number;
  totalPaginas: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http: HttpClient) {}

  private url(endpoint: string, id?: number, sufixo = ''): string {
    const base = `${API_URL}/${endpoint.toLowerCase()}`;

    return id === undefined
      ? base
      : `${base}/${id}${sufixo}`;
  }

  private extrairLista(resposta: any): any[] {
    if (Array.isArray(resposta)) {
      return resposta;
    }

    if (Array.isArray(resposta?.conteudo)) {
      return resposta.conteudo;
    }

    const embutido = resposta?._embedded;

    if (embutido) {
      const primeiraLista = Object.values(embutido)
        .find(valor => Array.isArray(valor));

      return (primeiraLista as any[]) ?? [];
    }

    return [];
  }

  getPagina<T = any>(
    endpoint: string,
    pagina = 0,
    tamanho = 10
  ): Observable<PaginaResponse<T>> {
    return this.http.get<PaginaResponse<T>>(this.url(endpoint), {
      params: {
        page: pagina,
        size: tamanho
      },
      headers: new HttpHeaders({ 'X-API-Version': '2' })
    });
  }

  getLista(endpoint: string): Observable<any[]> {
    return this.http
      .get<any>(this.url(endpoint), {
        params: { size: 100 }
      })
      .pipe(map(resposta => this.extrairLista(resposta)));
  }

  getTotal(endpoint: string): Observable<number> {
    return this.http
      .get<any>(this.url(endpoint), {
        params: { size: 100 }
      })
      .pipe(
        map(resposta => {
          const total =
            resposta?.totalElementos ??
            resposta?.page?.totalElements ??
            resposta?.totalElements ??
            resposta?.metadados?.totalElements;

          if (total !== undefined && total !== null) {
            return Number(total);
          }

          return this.extrairLista(resposta).length;
        })
      );
  }

  getPorId(endpoint: string, id: number): Observable<any> {
    return this.http.get<any>(this.url(endpoint, Number(id)));
  }

  postItem(endpoint: string, data: any): Observable<any> {
    return this.http.post<any>(this.url(endpoint), data);
  }

  putItem(endpoint: string, id: number, data: any): Observable<any> {
    return this.http.put<any>(this.url(endpoint, Number(id)), data);
  }

  patchItem(endpoint: string, id: number, sufixo = ''): Observable<any> {
    return this.http.patch<any>(
      this.url(endpoint, Number(id), sufixo),
      null
    );
  }

  deleteItem(endpoint: string, id: number): Observable<any> {
    return this.http.delete<any>(this.url(endpoint, Number(id)));
  }
}