import { Component } from '@angular/core';
import { catchError, EMPTY, switchMap, take, takeUntil, withLatestFrom } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { BaseGameContainer } from '../../base-game-container.component';
import { FormControl, Validators } from '@angular/forms';
import { ClientService } from '../../../services/client.service';
import { LocalStorageService } from '../../../services/localstorage.service';

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
        private router: Router,
        private localStorageService: LocalStorageService
    ) {
        super(route);
    }

    public onLogin(): void {
        if (this.loginControl.valid) {
            this.gameId$.pipe(
                switchMap(gameId => this.clientService.login(gameId, this.loginControl.value)),
                withLatestFrom(this.gameId$),
                take(1),
                catchError(e => {
                    alert(JSON.stringify(e));
                    return EMPTY
                }),
                takeUntil(this.destroy$)
            ).subscribe(([result, gameId]) => {
                this.localStorageService.setUserId(result.user_id);
                this.router.navigate(['client', gameId, 'waiting']);
            })
        }
    }
}
