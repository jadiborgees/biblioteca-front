import { Routes } from '@angular/router';
import { DashboardComponent } from './admin/components/dashboard/dashboard.component';
import { LivrosComponent } from './admin/components/livros/livros.component';
import { AutoresComponent } from './admin/components/autores/autores.component';
import { UsuariosComponent } from './admin/components/usuarios/usuarios.component';
import { EmprestimosComponent } from './admin/components/emprestimos/emprestimos.component';
import { EnderecosComponent } from './admin/components/enderecos/enderecos.component';

export const routes: Routes = [
  { path: '', redirectTo: 'admin/dashboard', pathMatch: 'full' },
  { path: 'admin/dashboard', component: DashboardComponent },
  { path: 'admin/livros', component: LivrosComponent },
  { path: 'admin/autores', component: AutoresComponent },
  { path: 'admin/usuarios', component: UsuariosComponent },
  { path: 'admin/emprestimos', component: EmprestimosComponent },
  { path: 'admin/enderecos', component: EnderecosComponent },
  { path: '**', redirectTo: 'admin/dashboard' }
];