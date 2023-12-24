import { Component, OnInit } from '@angular/core';
import { Observable, map, switchMap, take, takeUntil } from 'rxjs';
import { GameService } from 'src/app/services/game.service';
import { ActivatedRoute, Router } from '@angular/router';
import { BaseGameContainer } from '../../base-game-container.component';
import { FormControl, Validators } from '@angular/forms';
import { ClientService } from 'src/app/services/client.service';
import { Player } from 'src/app/entities/entities';

@Component({
    selector: 'vote-container',
    templateUrl: './vote-container.component.html',
    styleUrls: ['./vote-container.component.scss']
})
export class VoteContainerComponent extends BaseGameContainer implements OnInit {
    public players$!: Observable<Player[]>;
    public userId: string = '';
    constructor(
        protected override route: ActivatedRoute,
        private clientService: ClientService,
        private router: Router
    ) {
        super(route);
    }

    override ngOnInit(): void {
        super.ngOnInit();

        this.userId = localStorage.getItem('userId') ?? '';
        this.players$ = this.gameId$.pipe(
            switchMap(gameId => this.clientService.getPlayers(gameId)),
            map(playersResult => playersResult.players)
        );
    }

    public onVote(userId: string): void {

    }
}
