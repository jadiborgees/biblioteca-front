
import { HttpInterceptorFn } from '@angular/common/http';

export const apiKeyInterceptor: HttpInterceptorFn = (req, next) => {
  const token = sessionStorage.getItem('admin_token');

  // O login não precisa de chave de autenticação
  if (req.url.includes('/auth/login')) {
    return next(req);
  }

  // Adiciona o token às requisições autenticadas
  if (token) {
    const apiReq = req.clone({
      setHeaders: {
        'X-API-Key': token
      }
    });

    return next(apiReq);
  }

  return next(req);
};
