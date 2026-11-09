import { Component } from '@angular/core';
import { ClientService } from './services/client.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'gift_game_v2';
  userId = '';
  gameId = '';

  constructor(private client: ClientService) {}

  ngOnInit() {
    // Logic to populate userId and gameId from the state or route
  }
}
