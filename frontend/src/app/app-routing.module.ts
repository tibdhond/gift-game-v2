import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GameSelectionComponent } from './containers/game-selection/game-selection-container.component';
import { PlayersContainerComponent } from './containers/host/players/players-container.component';
import { LoginContainerComponent } from './containers/client/login/login-container.component';
import { WaitingContainerComponent } from './containers/client/waiting/waiting-container.component';
import { RoundProgressContainerComponent } from './containers/host/round-progress/round-progress-container.component';
import { GiftOpenContainerComponent } from './containers/client/gift-open/gift-open-container.component';
import { VoteContainerComponent } from './containers/client/vote/vote-container.component';
import { RoundResultContainerComponent } from './containers/host/round-result/round-result-container.component';
import { FinalResultContainerComponent } from './containers/host/final-results/final-results-container.component';
import { PersonalResultsContainerComponent } from './containers/client/personal-results/personal-results-container.component';
import { ClientLoginGuard } from './guards/login.guard';
import { GamePhaseGuard } from './guards/game-phase.guard';
import { LogoutContainerComponent } from './containers/client/logout/logout.container';
import { GetTokenContainerComponent } from './containers/host/get-token/get-token.container';

const routes: Routes = [
  {
    path: 'host/:game_id',
    children: [
      {
        path: 'token',
        component: GetTokenContainerComponent
      },
      {
        path: 'players',
        component: PlayersContainerComponent
      },
      {
        path: 'round-progress',
        component: RoundProgressContainerComponent
      },
      {
        path: 'round-result',
        component: RoundResultContainerComponent
      },
      {
        path: 'final-results',
        component: FinalResultContainerComponent
      }
    ]
  },
  {
    path: 'client/:game_id',
    children: [
      {
        path: 'logout',
        component: LogoutContainerComponent
      },
      {
        path: 'login',
        component: LoginContainerComponent,
        canActivate: [GamePhaseGuard]
      },
      {
        path: 'waiting',
        component: WaitingContainerComponent,
        canActivate: [ClientLoginGuard, GamePhaseGuard]
      },
      {
        path: 'gift-opening',
        component: GiftOpenContainerComponent,
        canActivate: [ClientLoginGuard, GamePhaseGuard]
      },
      {
        path: 'vote',
        component: VoteContainerComponent,
        canActivate: [ClientLoginGuard, GamePhaseGuard]
      },
      {
        path: 'personal-results',
        component: PersonalResultsContainerComponent,
        canActivate: [ClientLoginGuard, GamePhaseGuard]
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
