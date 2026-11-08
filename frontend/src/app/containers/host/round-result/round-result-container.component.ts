import { Component, inject, NgZone, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, combineLatest, map, of, shareReplay, startWith, switchMap, take, } from 'rxjs';
import { PlayerResult, PodiumSlot, RoundResult } from 'src/app/entities/entities';
import { HostService } from 'src/app/services/host.service';
import { BaseGameContainer } from '../../base-game-container.component';
import { orderBy } from 'lodash-es';
import confetti from 'canvas-confetti';
import { ToPercentPipe } from 'src/app/pipes/to-percent.pipe';
import { buildPodiumSlots, rankPodium } from 'src/app/helpers/podium';
import { RestEntry } from 'src/app/components/player-rest-list/player-rest-list.component';

@Component({
    selector: 'round-result',
    templateUrl: './round-result-container.component.html',
    styleUrls: ['./round-result-container.component.scss'],
})
export class RoundResultContainerComponent extends BaseGameContainer implements OnInit, OnDestroy {

    public restEntries$!: Observable<RestEntry[]>;
    public roundNumber$!: Observable<number>;
    public gift$!: Observable<string>;
    public totalVotes$!: Observable<number>;
    public buttonsDisabled$: BehaviorSubject<boolean> = new BehaviorSubject(false);
    public giftImagePath$!: Observable<string | undefined>;
    public slots$!: Observable<PodiumSlot[]>;

    private router: Router = inject(Router);

    private toPercent = new ToPercentPipe(); // works if your pipe has no constructor dependencies

    constructor(protected override route: ActivatedRoute, private hostService: HostService, private ngZone: NgZone) {
        super(route);
    }

    override ngOnInit(): void {
        super.ngOnInit();

        const roundResult_$: Observable<RoundResult> = this.gameId$.pipe(
            switchMap(gameId => this.hostService.roundResult(gameId)),
            shareReplay(1)
        );

        this.giftImagePath$ = roundResult_$.pipe(
            map(result => result.giftImagePath),
            shareReplay(1)
        );

        const playerResults_$: Observable<PlayerResult[]> = roundResult_$.pipe(
            map(results => results.playerResults),
            map(results => orderBy(results, ['votes'], ['desc'])),
            shareReplay(1)
        )

        const ranked$ = playerResults_$.pipe(
            map(results => rankPodium(results, result => result.votes)),
            shareReplay(1)
        );

        this.slots$ = combineLatest([ranked$, this.totalVotes$]).pipe(
            map(([layout, total]) => buildPodiumSlots(layout, result => ({
                key: result.userId,
                name: result.name,
                avatarPath: result.avatarPath,
                stat: this.toPercent.transform(result.votes / total),
            }))),
            shareReplay(1)
        );

        this.restEntries$ = combineLatest([ranked$, this.totalVotes$]).pipe(
            map(([layout, total]) => layout.rest.map(result => ({
                key: result.userId,
                name: result.name,
                avatarPath: result.avatarPath,
                stat: this.toPercent.transform(result.votes / total),
            }))),
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

    private confetti(): void {
        const base = {
            particleCount: 80, spread: 70, startVelocity: 60, ticks: 200,
            colors: ['#a4262c', '#1b4332', '#d9a441', '#f7f4ee'], // Christmas palette
        };
        this.ngZone.runOutsideAngular(() => {
            confetti({ ...base, angle: 60, origin: { x: 0, y: 0.85 } });
            confetti({ ...base, angle: 120, origin: { x: 1, y: 0.85 } });
        });
    }

    override ngOnDestroy(): void {
        super.ngOnDestroy();
    }
}
