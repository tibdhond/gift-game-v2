import { Component, OnInit } from '@angular/core';
import { switchMap, take, takeUntil } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalStorageService } from 'src/app/services/localstorage.service';
import { BaseGameContainer } from '../../base-game-container.component';
import { HostService } from 'src/app/services/host.service';


@Component({
    selector: 'get-token-container',
    template: '',
})
export class GetTokenContainerComponent extends BaseGameContainer implements OnInit {

    constructor(
        protected override route: ActivatedRoute,
        private router: Router,
        private hostService: HostService
    ) {
        super(route)
    }

    override ngOnInit(): void {
        super.ngOnInit();

        this.gameId$.pipe(
            switchMap(gameId => this.hostService.getHostToken(gameId)),
            take(1),
            takeUntil(this.destroy$)
        ).subscribe(result => {
            this.router.navigate(['host', `${result.game_id}`, 'players']);
        })
    }
}
