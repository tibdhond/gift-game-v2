import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseGameContainer } from '../base-game-container.component';
import { Observable, switchMap } from 'rxjs';
import { UserInfoResult } from 'src/app/entities/entities';
import { ClientService } from 'src/app/services/client.service';


@Component({
    selector: 'waiting-container',
    template: '',
})
export abstract class BaseClientContainerComponent extends BaseGameContainer implements OnInit {
    protected userId: string | null = localStorage.getItem("userId");
    protected userInfo$!: Observable<UserInfoResult>;

    constructor(
        protected override route: ActivatedRoute,
        protected client: ClientService
    ) {
        super(route);
    }

    public override ngOnInit(): void {
        super.ngOnInit();

        this.userInfo$ = this.gameId$.pipe(
            switchMap(gameId => this.client.getUserInfo(gameId, this.userId!))
        );
    }
}
