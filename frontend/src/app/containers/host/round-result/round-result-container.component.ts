import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject, combineLatest, distinctUntilChanged, filter, interval, map, of, share, shareReplay, startWith, switchMap, take, takeUntil, takeWhile, tap } from 'rxjs';
import { Player, PlayerResult, RoundProgress, RoundResult } from 'src/app/entities/entities';
import { HostService } from 'src/app/services/host.service';
import { BaseGameContainer } from '../../base-game-container.component';
import { orderBy, result } from 'lodash-es';

declare function confetti(arg: any): void;

@Component({
    selector: 'round-result',
    templateUrl: './round-result-container.component.html',
    styleUrls: ['./round-result-container.component.scss'],
})
export class RoundResultContainerComponent extends BaseGameContainer implements OnInit, OnDestroy {
    public roundResults$!: Observable<PlayerResult[]>;
    public roundNumber$!: Observable<number>;
    public gift$!: Observable<string>;
    public firstPlaces$!: Observable<PlayerResult[]>;
    public secondPlaces$!: Observable<PlayerResult[]>;
    public thirdPlace$!: Observable<PlayerResult | undefined>;
    public totalVotes$!: Observable<number>;
    public buttonsDisabled$: BehaviorSubject<boolean> = new BehaviorSubject(false);

    private router: Router = inject(Router);

    constructor(protected override route: ActivatedRoute, private hostService: HostService) {
        super(route);
    }

    override ngOnInit(): void {
        super.ngOnInit();

        const roundResult_$: Observable<RoundResult> = this.gameId$.pipe(
            switchMap(gameId => this.hostService.roundResult(gameId)),
            shareReplay(1)
        );

        const playerResults_$: Observable<PlayerResult[]> = roundResult_$.pipe(
            map(results => results.playerResults),
            map(result => Object.entries(result).map(([userId, playerResult]) => ({ userId, ...playerResult }))),
            map(results => orderBy(results, ['votes'], ['desc'])),
            shareReplay(1)
        )

        this.firstPlaces$ = playerResults_$.pipe(
            map(results => results.filter(result => result.votes === results[0].votes)),
            shareReplay(1)
        );

        this.secondPlaces$ = combineLatest([this.firstPlaces$, playerResults_$]).pipe(
            map(([firstPlaces, results]) => firstPlaces.length > 1 ? [] : results.filter(result => results[1].votes > 0 && result.votes === results[1].votes).slice(0, 2)),
            shareReplay(1)
        );

        this.thirdPlace$ = combineLatest([this.firstPlaces$, this.secondPlaces$, playerResults_$]).pipe(
            map(([firstPlaces, secondPlaces, results]) => firstPlaces.length > 1 || secondPlaces.length > 1 || results.length <= 2 || results[2].votes === 0 ? undefined : results[2]),
            shareReplay(1)
        );

        this.roundResults$ = combineLatest([this.firstPlaces$, this.secondPlaces$, this.thirdPlace$, playerResults_$]).pipe(
            map(([firstPlaces, secondPlaces, thirdPlace, results]) => results.slice(firstPlaces.length + secondPlaces.length + (thirdPlace ? 1 : 0))),
            shareReplay(1)
        );

        this.totalVotes$ = playerResults_$.pipe(
            map(results => results.reduce((totalVotes, result) => totalVotes + result.votes, 0))
        );

        this.roundNumber$ = roundResult_$.pipe(
            map(result => result.roundNumber),
            shareReplay(1)
        );

        this.gift$ = roundResult_$.pipe(
            map(result => result.gift),
            shareReplay(1)
        );
    }

    public onCorrect(): void {
        this.buttonsDisabled$.next(true)
        this.confetti();

        setTimeout(() => {
            this.gameId$.pipe(
                switchMap(gameId => this.hostService.assignGift(gameId)),
                switchMap(finished => combineLatest([this.gameId$, of(finished)])),
                take(1)
            ).subscribe(([gameId, finished]) => {
                if (finished) {
                    this.router.navigate(['host', gameId, 'final-results']);
                } else {
                    this.router.navigate(['host', gameId, 'round-progress']);
                }
            });
        }, 3000);
    }

    public onIncorrect(): void {
        this.gameId$.pipe(
            switchMap(gameId => this.hostService.newRound(gameId)),
            switchMap(() => this.gameId$),
            take(1)
        ).subscribe(gameId => {
            this.router.navigate(['host', gameId, 'round-progress']);
        });
    }

    private fire(particleRatio: number, opts: any) {
        const count = 200,
            defaults = {
                origin: { y: 0.6 },
                direction: "top"
            };

        confetti(
            Object.assign({}, defaults, opts, {
                particleCount: Math.floor(count * particleRatio),
                direction: "top"
            })
        );
    }

    private confetti(): void {
        this.fire(0.25, {
            spread: 26,
            startVelocity: 55,
        });

        this.fire(0.2, {
            spread: 60,
        });

        this.fire(0.35, {
            spread: 100,
            decay: 0.91,
            scalar: 0.8,
        });

        this.fire(0.1, {
            spread: 120,
            startVelocity: 25,
            decay: 0.92,
            scalar: 1.2,
        });

        this.fire(0.1, {
            spread: 120,
            startVelocity: 45,
        });
    }

    override ngOnDestroy(): void {
        super.ngOnDestroy();
    }
}
