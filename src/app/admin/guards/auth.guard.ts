
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, NivelAcesso } from '../../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.estaAutenticado()) {
    return router.createUrlTree(['/login']);
  }

  if (!authService.obterNivelAcesso()) {
    authService.logout();
    return router.createUrlTree(['/login']);
  }

  return true;
};

// Guard reutilizável para restringir rotas por nível de acesso.
export const nivelAcessoGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const niveisPermitidos =
    route.data['niveisPermitidos'] as NivelAcesso[] | undefined;

  const nivelAtual = authService.obterNivelAcesso();

  if (!authService.estaAutenticado() || !nivelAtual) {
    return router.createUrlTree(['/login']);
  }

  if (
    niveisPermitidos?.length &&
    !niveisPermitidos.includes(nivelAtual)
  ) {
    return router.createUrlTree(['/admin/dashboard']);
  }

  return true;
};
