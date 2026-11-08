import { Component, inject, NgZone, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, combineLatest, map, of, shareReplay, startWith, switchMap, take, } from 'rxjs';
import { PlayerResult, RoundResult } from 'src/app/entities/entities';
import { HostService } from 'src/app/services/host.service';
import { BaseGameContainer } from '../../base-game-container.component';
import { orderBy } from 'lodash-es';
import confetti from 'canvas-confetti';

interface PodiumSlot {
    place: 1 | 2 | 3;
    label: string;
    player: PlayerResult;
    delay: number; // seconds, for the staged reveal
}

const START_DELAY: number = 0.3;   // seconds before the first tier appears
const REVEAL_STEP: number = 0.8;   // seconds between tiers
const RISE_DURATION: number = 0.9; // keep in sync with the `rise` animation in the scss

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
    public podium$!: Observable<PodiumSlot[]>;
    public restDelay$!: Observable<number>;
    public giftImagePath$!: Observable<string | undefined>;

    public trackSlot = (_: number, slot: PodiumSlot) => `${slot.place}-${slot.player.userId}`;

    private router: Router = inject(Router);

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

        this.initPodiumStream();
        this.restDelay$ = this.podium$.pipe(
            map(slots => Math.max(0, ...slots.map(slot => slot.delay)) + RISE_DURATION)
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

    private initPodiumStream(): void {
        this.podium$ = combineLatest([this.firstPlaces$, this.secondPlaces$, this.thirdPlace$]).pipe(
            map(([firsts, seconds, third]) => {
                // Reveal order: 3rd -> 2nd -> 1st. Empty tiers are skipped,
                // so the delay depends on the tier's index, not its place.
                const tiers = [
                    { place: 3 as const, label: '3de Plaats', players: third ? [third] : [] },
                    { place: 2 as const, label: '2de Plaats', players: seconds },
                    { place: 1 as const, label: '1ste Plaats', players: firsts },
                ].filter(tier => tier.players.length > 0);

                const slotsByPlace = new Map<number, PodiumSlot[]>();
                tiers.forEach((tier, index) => {
                    const delay = START_DELAY + index * REVEAL_STEP;
                    slotsByPlace.set(
                        tier.place,
                        tier.players.map(player => ({ place: tier.place, label: tier.label, player, delay }))
                    );
                });

                const firstSlots = slotsByPlace.get(1) ?? [];
                const secondSlots = slotsByPlace.get(2) ?? [];
                const thirdSlots = slotsByPlace.get(3) ?? [];

                // Display order: 2nd, 1st, 3rd (a tied 2nd flanks the winner)
                const half = Math.ceil(secondSlots.length / 2);
                return [
                    ...secondSlots.slice(0, half),
                    ...firstSlots,
                    ...secondSlots.slice(half),
                    ...thirdSlots,
                ];
            }),
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
