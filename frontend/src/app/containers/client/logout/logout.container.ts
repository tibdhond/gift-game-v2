import { Component, OnInit } from '@angular/core';
import { catchError, defer, iif, map, of, switchMap, take } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalStorageService } from 'src/app/services/localstorage.service';
import { BaseGameContainer } from '../../base-game-container.component';
import { ClientService } from 'src/app/services/client.service';


@Component({
    selector: 'logout-container',
    template: '',
})
export class LogoutContainerComponent extends BaseGameContainer implements OnInit {

    constructor(
        protected override route: ActivatedRoute,
        private router: Router,
        private localStorageService: LocalStorageService,
        private clientService: ClientService
    ) {
        super(route)
    }

    override ngOnInit(): void {
        super.ngOnInit();
        const logout: boolean = confirm('Are you sure you want to log out?');

        this.gameId$.pipe(
            switchMap(gameId => {
                if (logout) {
                    return this.clientService.logout(gameId).pipe(catchError(() => of(gameId)));
                }
                return of(gameId);
            }),
            take(1)
        ).subscribe(gameId => {
            if (logout) {
                this.localStorageService.logout();
                return this.router.navigate(['client', gameId, 'login']).then(() => location.reload());
            }

            return this.router.navigate(['client', gameId, 'waiting']);
        })
    }
}
