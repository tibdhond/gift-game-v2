import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject, combineLatest, interval, map, shareReplay, startWith, switchMap, take, takeUntil, tap } from 'rxjs';
import { Player } from 'src/app/entities/entities';
import { HostService } from 'src/app/services/host.service';
import { BaseGameContainer } from '../../base-game-container.component';

@Component({
    selector: 'players',
    templateUrl: './players-container.component.html',
    styleUrls: ['./players-container.component.scss'],
})
export class PlayersContainerComponent extends BaseGameContainer implements OnInit, OnDestroy {
    public players$!: Observable<Player[]>;
    public playerDeleted$: BehaviorSubject<void> = new BehaviorSubject<void>(undefined);
    public qrUrl$!: Observable<string>;

    public codeChars$!: Observable<string[]>;
    public trackPlayer = (_: number, player: Player) => player.id;

    constructor(protected override route: ActivatedRoute, private hostService: HostService, private router: Router) {
        super(route);
    }

    override ngOnInit(): void {
        super.ngOnInit();

        this.players$ = combineLatest([this.playerDeleted$, interval(3000)]).pipe(
            startWith(0),
            switchMap(() => this.gameId$),
            switchMap(gameId => this.hostService.getPlayers(gameId)),
            map(playerResult => playerResult.players)
        );

        this.qrUrl$ = combineLatest([this.host$, this.gameId$]).pipe(
            map(([host, gameId]) => `${host}?gameId=${gameId}`)
        );

        this.codeChars$ = this.gameId$.pipe(map(id => [...String(id)]));
    }

    override ngOnDestroy(): void {
        this.playerDeleted$.complete();
        super.ngOnDestroy();
    }

    public onDeletePlayer(playerId: string): void {
        this.gameId$.pipe(
            switchMap(gameId => this.hostService.deletePlayer(gameId, playerId)),
            take(1),
            tap(() => this.playerDeleted$.next()),
            takeUntil(this.destroy$)
        ).subscribe();
    }

    public onRoundStart(): void {
        this.gameId$.pipe(
            switchMap(gameId => this.hostService.newRound(gameId)),
            switchMap(() => this.gameId$),
            take(1),
            takeUntil(this.destroy$)
        ).subscribe(gameId => {
            this.router.navigate(['host', gameId, 'round-progress']);
        });
    }
}
