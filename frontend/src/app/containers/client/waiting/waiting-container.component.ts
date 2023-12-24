import { Component, OnInit } from '@angular/core';
import { interval, map, switchMap, take, takeUntil, withLatestFrom } from 'rxjs';
import { GameService } from 'src/app/services/game.service';
import { ActivatedRoute, Router } from '@angular/router';
import { BaseGameContainer } from '../../base-game-container.component';
import { ClientService } from 'src/app/services/client.service';
import { UserPhase } from 'src/app/entities/entities';

@Component({
    selector: 'waiting-container',
    templateUrl: './waiting-container.component.html',
    styleUrls: ['./waiting-container.component.scss']
})
export class WaitingContainerComponent extends BaseGameContainer implements OnInit {
    constructor(
        protected override route: ActivatedRoute,
        private router: Router,
        private clientService: ClientService
    ) {
        super(route);
    }

    override ngOnInit(): void {
        super.ngOnInit();

        const userId: string | null = localStorage.getItem("userId");

        if (userId) {
            interval(3000).pipe(
                switchMap(() => this.gameId$),
                switchMap(gameId => this.clientService.getUserPhase(gameId, userId)),
                map(phaseResult => phaseResult.phase),
                withLatestFrom(this.gameId$),
                takeUntil(this.destroy$)
            ).subscribe(([phase, gameId]) => {
                if (phase === UserPhase.GIFT_OPENING) {
                    this.router.navigate(['client', gameId, 'gift-opening']);
                } else if (phase === UserPhase.VOTING) {
                    this.router.navigate(['cleint', gameId, 'vote']);
                }
            })
        }
    }

    public get gifUrl(): string {
        return `${this.host}/api/gif`
    }
}
