import { Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, interval, map, Observable, switchMap, take, takeUntil, withLatestFrom } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientService } from 'src/app/services/client.service';
import { UserPhase } from 'src/app/entities/entities';
import { animate, style, transition, trigger } from '@angular/animations';
import { BaseClientContainerComponent } from '../base-client-container.component';
import { LocalStorageService } from 'src/app/services/localstorage.service';
import { BaseGameContainer } from '../../base-game-container.component';


@Component({
    selector: 'logout-container',
    template: '',
})
export class LogoutContainerComponent extends BaseGameContainer implements OnInit {

    constructor(
        protected override route: ActivatedRoute,
        private router: Router,
        private localStorageService: LocalStorageService
    ) {
        super(route)
    }

    override ngOnInit(): void {
        super.ngOnInit();
        const logout: boolean = confirm('Are you sure you want to log out?');

        this.gameId$.pipe(take(1)).subscribe(gameId => {
            if (logout) {
                this.localStorageService.logout();
                return this.router.navigate(['client', gameId, 'login']).then(() => location.reload());
            }

            return this.router.navigate(['client', gameId, 'waiting']);
        })
    }
}
