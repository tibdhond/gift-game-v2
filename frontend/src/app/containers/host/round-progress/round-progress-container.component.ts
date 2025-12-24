import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject, combineLatest, distinctUntilChanged, filter, interval, map, shareReplay, startWith, switchMap, take, takeUntil, takeWhile, tap, withLatestFrom } from 'rxjs';
import { Player, RoundProgress } from 'src/app/entities/entities';
import { HostService } from 'src/app/services/host.service';
import { BaseGameContainer } from '../../base-game-container.component';

@Component({
    selector: 'round-progress',
    templateUrl: './round-progress-container.component.html',
    styleUrls: ['./round-progress-container.component.scss'],
})
export class RoundProgressContainerComponent extends BaseGameContainer implements OnInit, OnDestroy {
    public gift$!: Observable<string | undefined>;
    public players$!: Observable<Player[]>;
    public votesCount$!: Observable<number>;
    public playerCount$!: Observable<number>;
    public ratio$!: Observable<string>;
    public invalid$: BehaviorSubject<boolean> = new BehaviorSubject(false);
    public finished$: BehaviorSubject<boolean> = new BehaviorSubject(false);

    // Injectors
    private router: Router = inject(Router);

    constructor(protected override route: ActivatedRoute, private hostService: HostService) {
        super(route);
    }

    override ngOnInit(): void {
        super.ngOnInit();
        this.initFinishedListener();

        const progress$: Observable<RoundProgress> = interval(3000).pipe(
            startWith(0),
            switchMap(() => this.invalid$.pipe(
                filter(invalid => !invalid),
                distinctUntilChanged(),
            )),
            switchMap(() => this.gameId$),
            switchMap(gameId => this.hostService.getRoundProgress(gameId)),
            tap(result => {
                this.invalid$.next(result.invalid);
                if (!result.invalid) {
                    this.finished$.next(result.players.map(player => !!player.voted).every(Boolean))
                }
            }),
            shareReplay(1),
        );

        this.gift$ = progress$.pipe(
            map(progress => progress.gift),
            distinctUntilChanged(),
            shareReplay(1)
        );

        this.players$ = progress$.pipe(
            map(progress => progress.players),
            shareReplay(1)
        );

        this.initVotesCount$();
        this.initPlayerCount$();
        this.initRatio$();
    }

    override ngOnDestroy(): void {
        this.invalid$.complete();
        this.finished$.complete();
        super.ngOnDestroy();
    }

    public initFinishedListener(): void {
        this.finished$.pipe(
            filter(Boolean),
            switchMap(() => this.gameId$),
            takeUntil(this.destroy$)
        ).subscribe(gameId => {
            this.router.navigate(['host', gameId, 'round-result'])
        });
    }

    public onResetRound(): void {
        this.gameId$.pipe(
            switchMap(gameId => this.hostService.resetRound(gameId)),
            tap(() => this.invalid$.next(false)),
            take(1)
        ).subscribe();
    }

    public initVotesCount$(): void {
        this.votesCount$ = this.players$.pipe(
            map(players => players.filter(player => player.voted).length),
            shareReplay(1)
        );
    }

    public initPlayerCount$(): void {
        this.playerCount$ = this.players$.pipe(
            map(players => players.length),
            shareReplay(1)
        );
    }

    public initRatio$(): void {
        this.ratio$ = combineLatest([this.votesCount$, this.playerCount$]).pipe(
            map(([votes, total]) => Math.round(votes / total * 10000) / 100),
            map(ratio => `${ratio}%`),
            shareReplay(1)
        );
    }
}
