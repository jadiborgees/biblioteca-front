
import { Routes } from '@angular/router';

import { LoginComponent } from './admin/components/login/login.component';
import { DashboardComponent } from './admin/components/dashboard/dashboard.component';
import { LivrosComponent } from './admin/components/livros/livros.component';
import { AutoresComponent } from './admin/components/autores/autores.component';
import { UsuariosComponent } from './admin/components/usuarios/usuarios.component';
import { EmprestimosComponent } from './admin/components/emprestimos/emprestimos.component';

import { authGuard } from './admin/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'livros',
        component: LivrosComponent
      },
      {
        path: 'autores',
        component: AutoresComponent
      },
      {
        path: 'usuarios',
        component: UsuariosComponent
      },
      {
        path: 'emprestimos',
        component: EmprestimosComponent
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
