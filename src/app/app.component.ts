import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router'; // <-- Adicionado o RouterLink

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink], // <-- Adicionado nos imports do componente
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'biblioteca-front';
}