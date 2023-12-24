import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable, Subject, combineLatest, distinctUntilChanged, filter, interval, map, shareReplay, startWith, switchMap, take, takeUntil, tap } from 'rxjs';
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
    public invalid$: BehaviorSubject<boolean> = new BehaviorSubject(false);

    constructor(protected override route: ActivatedRoute, private hostService: HostService) {
        super(route);
    }

    override ngOnInit(): void {
        super.ngOnInit();

        const progress$: Observable<RoundProgress> = interval(3000).pipe(
            startWith(0),
            switchMap(() => this.gameId$),
            switchMap(gameId => this.hostService.getRoundProgress(gameId)),
            tap(result => this.invalid$.next(result.invalid)),
            tap(x => console.log(x)),
            shareReplay(1),
            takeUntil(this.invalid$.pipe(filter(invalid => invalid))),
        );

        this.gift$ = progress$.pipe(
            map(progress => progress.gift),
            distinctUntilChanged()
        );

        this.players$ = progress$.pipe(
            map(progress => progress.players)
        );
    }

    override ngOnDestroy(): void {
        this.invalid$.complete();
        super.ngOnDestroy();
    }

    public get votesCount$(): Observable<number> {
        return this.players$.pipe(
            map(players => players.filter(player => player.voted).length)
        );
    }

    public get playerCount$(): Observable<number> {
        return this.players$.pipe(
            map(players => players.length)
        );
    }

    public get ratio$(): Observable<string> {
        return combineLatest([this.votesCount$, this.playerCount$]).pipe(
            map(([votes, total]) => Math.round(votes / total * 10000) / 100),
            map(ratio => `${ratio}%`)
        );
    }
}
