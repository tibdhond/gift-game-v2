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
import { GamePhaseGuard } from './guards/game-phase.guard';
import { LogoutContainerComponent } from './containers/client/logout/logout.container';
import { GetTokenContainerComponent } from './containers/host/get-token/get-token.container';
import { HostShellComponent } from './containers/host/host-shell.container';

const routes: Routes = [
    {
        path: 'host/:gameId',
        children: [
            {
                path: '',
                component: HostShellComponent,
                children: [
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
                path: 'token',
                component: GetTokenContainerComponent
            }
        ]
    },
    {
        path: 'client',
        children: [
            {
                path: 'logout', // User used wrong logout path
                redirectTo: '/'
            },
            {
                path: ':gameId',
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
                        canActivate: [GamePhaseGuard]
                    },
                    {
                        path: 'gift-opening',
                        component: GiftOpenContainerComponent,
                        canActivate: [GamePhaseGuard]
                    },
                    {
                        path: 'vote',
                        component: VoteContainerComponent,
                        canActivate: [GamePhaseGuard]
                    },
                    {
                        path: 'personal-results',
                        component: PersonalResultsContainerComponent,
                        canActivate: [GamePhaseGuard]
                    },
                    {
                        path: '**',
                        redirectTo: 'waiting'
                    }
                ]
            },
            {
                path: '**',
                redirectTo: '..'
            }
        ]
    },
    {
        path: '',
        component: GameSelectionComponent,
        pathMatch: 'full'
    },
    {
        path: '**',
        redirectTo: '/'
    }
];

@NgModule({
    imports: [RouterModule.forRoot(
        routes,
        {
            // enableTracing: true
            paramsInheritanceStrategy: "always"
        }
    )],
    exports: [RouterModule]
})
export class AppRoutingModule { }
