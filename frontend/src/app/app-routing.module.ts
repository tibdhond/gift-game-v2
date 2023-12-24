import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GameSelectionComponent } from './containers/game-selection/game-selection-container.component';
import { PlayersContainerComponent } from './containers/host/players/players-container.component';
import { LoginContainerComponent } from './containers/client/login/login-container.component';
import { WaitingContainerComponent } from './containers/client/waiting/waiting-container.component';
import { RoundProgressContainerComponent } from './containers/host/round-progress/round-progress-container.component';
import { GiftOpenContainerComponent } from './containers/client/gift-open/gift-open-container.component';

const routes: Routes = [
  {
    path: 'host/:game_id',
    children: [
      {
        path: 'players',
        component: PlayersContainerComponent
      },
      {
        path: 'round-progress',
        component: RoundProgressContainerComponent
      }
    ]
  },
  {
    path: 'client/:game_id',
    children: [
      {
        path: 'login',
        component: LoginContainerComponent
      },
      {
        path: 'waiting',
        component: WaitingContainerComponent
      },
      {
        path: 'gift-opening',
        component: GiftOpenContainerComponent
      }
    ]
  },
  {
    path: '**',
    component: GameSelectionComponent
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
