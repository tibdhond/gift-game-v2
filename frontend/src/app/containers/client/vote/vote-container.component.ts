import { Component, OnInit } from '@angular/core';
import { Observable, map, switchMap, take, takeUntil, withLatestFrom } from 'rxjs';
import { GameService } from 'src/app/services/game.service';
import { ActivatedRoute, Router } from '@angular/router';
import { BaseGameContainer } from '../../base-game-container.component';
import { FormControl, Validators } from '@angular/forms';
import { ClientService } from 'src/app/services/client.service';
import { Player } from 'src/app/entities/entities';
import { BaseClientContainerComponent } from '../base-client-container.component';

@Component({
    selector: 'vote-container',
    templateUrl: './vote-container.component.html',
    styleUrls: ['./vote-container.component.scss']
})
export class VoteContainerComponent extends BaseClientContainerComponent implements OnInit {
    public players$!: Observable<Player[]>;
    constructor(
        protected override route: ActivatedRoute,
        private clientService: ClientService,
        private router: Router
    ) {
        super(route);
    }

    override ngOnInit(): void {
        super.ngOnInit();

        this.players$ = this.gameId$.pipe(
            switchMap(gameId => this.clientService.getPlayers(gameId)),
            map(playersResult => playersResult.players)
        );
    }

    public onVote(targetId: string): void {
        if (!this.userId) {
            this.router.navigate(['/']);
        }

        this.gameId$.pipe(
            switchMap(gameId => this.clientService.vote(gameId, this.userId!, targetId)),
            switchMap(() => this.gameId$),
            take(1)
        ).subscribe(gameId => {
            this.router.navigate(['client', gameId, 'waiting']);
        })
    }
}
