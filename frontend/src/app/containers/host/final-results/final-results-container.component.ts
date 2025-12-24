import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject, combineLatest, distinctUntilChanged, filter, interval, map, share, shareReplay, startWith, switchMap, take, takeUntil, takeWhile, tap } from 'rxjs';
import { GameResult, Player, PlayerResult, RoundProgress, RoundResult } from 'src/app/entities/entities';
import { HostService } from 'src/app/services/host.service';
import { BaseGameContainer } from '../../base-game-container.component';
import { orderBy, result } from 'lodash-es';
@Component({
    selector: 'final-results',
    templateUrl: './final-results-container.component.html',
    styleUrls: ['./final-results-container.component.scss'],
})
export class FinalResultContainerComponent extends BaseGameContainer implements OnInit, OnDestroy {
    public firstPlaces$!: Observable<GameResult[]>;
    public secondPlaces$!: Observable<GameResult[]>;
    public thirdPlace$!: Observable<GameResult | undefined>;
    public gameResults$!: Observable<GameResult[]>;
    public sortField$: BehaviorSubject<keyof Omit<GameResult, "name">> = new BehaviorSubject<keyof Omit<GameResult, "name">>("vote_score");

    constructor(protected override route: ActivatedRoute, private hostService: HostService) {
        super(route);
    }

    override ngOnInit(): void {
        super.ngOnInit();

        const gameResult_$: Observable<GameResult[]> = this.gameId$.pipe(
            switchMap(gameId => this.hostService.gameResults(gameId)),
            map(result => Object.entries(result).map(([userId, playerResult]) => ({ userId, ...playerResult }))),
            shareReplay(1)
        );

        const sortedGameResults$: Observable<GameResult[]> = combineLatest([gameResult_$, this.sortField$.pipe(distinctUntilChanged())]).pipe(
            map(([results, sortField]) => orderBy(results, [sortField], ['desc'])),
            shareReplay(1)
        );

        this.firstPlaces$ = sortedGameResults$.pipe(
            map(results => results.filter(result => result[this.sortField$.value] === results[0][this.sortField$.value])),
            shareReplay(1)
        );

        this.secondPlaces$ = combineLatest([this.firstPlaces$, sortedGameResults$]).pipe(
            map(([firstPlaces, results]) => firstPlaces.length > 1 ? [] : results.filter(result => results[1][this.sortField$.value] > 0 && result[this.sortField$.value] === results[1][this.sortField$.value]).slice(0, 2)),
            shareReplay(1)
        );

        this.thirdPlace$ = combineLatest([this.firstPlaces$, this.secondPlaces$, sortedGameResults$]).pipe(
            map(([firstPlaces, secondPlaces, results]) => firstPlaces.length > 1 || secondPlaces.length > 1 || results.length <= 2 || results[2][this.sortField$.value] === 0 ? undefined : results[2]),
            shareReplay(1)
        )

        this.gameResults$ = combineLatest([this.firstPlaces$, this.secondPlaces$, this.thirdPlace$, sortedGameResults$]).pipe(
            map(([firstPlaces, secondPlaces, thirdPlace, results]) => results.slice(firstPlaces.length + secondPlaces.length + (thirdPlace ? 1 : 0))),
            shareReplay(1)
        );
    }

    public onSetSortField(sortField: keyof Omit<GameResult, "name">): void {
        this.sortField$.next(sortField);
    }

    override ngOnDestroy(): void {
        super.ngOnDestroy();
    }
}
