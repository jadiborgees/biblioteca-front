import { HttpInterceptorFn } from '@angular/common/http';

export const apiKeyInterceptor: HttpInterceptorFn = (req, next) => {
  const apiReq = req.clone({
    setHeaders: {
      'X-API-Key': 'bib-chave-demo-12345'
    }
  });
  return next(apiReq);
};