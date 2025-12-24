import { Component } from '@angular/core';
import { switchMap, take, takeUntil, withLatestFrom } from 'rxjs';
import { GameService } from 'src/app/services/game.service';
import { ActivatedRoute, Router } from '@angular/router';
import { BaseContainer } from '../../base-container.component';
import { BaseGameContainer } from '../../base-game-container.component';
import { FormControl, Validators } from '@angular/forms';
import { ClientService } from 'src/app/services/client.service';

@Component({
    selector: 'login-container',
    templateUrl: './login-container.component.html',
    styleUrls: ['./login-container.component.scss']
})
export class LoginContainerComponent extends BaseGameContainer {
    public loginControl: FormControl = new FormControl(null, Validators.required);
    constructor(
        protected override route: ActivatedRoute,
        private clientService: ClientService,
        private router: Router
    ) {
        super(route);
    }

    public onLogin(): void {
        if (this.loginControl.valid) {
            this.gameId$.pipe(
                switchMap(gameId => this.clientService.login(gameId, this.loginControl.value)),
                withLatestFrom(this.gameId$),
                take(1),
                takeUntil(this.destroy$)
            ).subscribe(([result, gameId]) => {
                localStorage.setItem('userId', result.user_id);
                this.router.navigate(['client', gameId, 'waiting']);
            })
        }
    }
}
