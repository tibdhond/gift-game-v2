import { Component, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject, combineLatest, distinctUntilChanged, filter, interval, map, shareReplay, startWith, switchMap, take, takeUntil, takeWhile, tap, withLatestFrom } from 'rxjs';
import { Player, RoundProgress, UserPhase } from 'src/app/entities/entities';
import { HostService } from 'src/app/services/host.service';
import { BaseGameContainer } from '../../base-game-container.component';
import { layoutSignposts, SignpostEdge, SignpostLayout, SignpostSlot } from 'src/app/helpers/signposts';
import { EyePost } from 'src/app/components/animated-eyes/animated-eyes.component';

@Component({
    selector: 'round-progress',
    templateUrl: './round-progress-container.component.html',
    styleUrls: ['./round-progress-container.component.scss'],
})
export class RoundProgressContainerComponent extends BaseGameContainer implements OnInit, OnDestroy {
    public gift$!: Observable<string | undefined>;
    public players$!: Observable<Player[]>;
    public invalid$: BehaviorSubject<boolean> = new BehaviorSubject(false);
    public finished$: BehaviorSubject<boolean> = new BehaviorSubject(false);

    // Signs
    public layout$!: Observable<SignpostLayout>;
    public fit: number = 1;
    public arrivedVoted: Set<string> = new Set<string>();
    private firstLayout: boolean = true;

    // Eyes
    public eyePosts$!: Observable<EyePost[]>;

    // Image
    public giftImagePath$!: Observable<string | undefined>;

    // Injectors
    private router: Router = inject(Router);

    trackEdge = (_: number, edge: SignpostEdge) => edge.name;
    trackSlot = (_: number, slot: SignpostSlot) => slot.player.id;

    @HostListener('window:resize')
    onResize(): void {
        this.updateFit();
    }

    constructor(protected override route: ActivatedRoute, private hostService: HostService) {
        super(route);
    }

    override ngOnInit(): void {
        super.ngOnInit();
        this.initFinishedListener();

        const progress$: Observable<RoundProgress> = interval(3000).pipe(
            switchMap(() => this.invalid$.pipe(
                filter(invalid => !invalid),
                distinctUntilChanged(),
            )),
            switchMap(() => this.gameId$),
            switchMap(gameId => this.hostService.getRoundProgress(gameId)),
            tap(result => {
                this.invalid$.next(result.invalid);
                if (!result.invalid) {
                    this.finished$.next(result.players.map(player => (player.phase === UserPhase.WAITING)).every(Boolean))
                }
            }),
            shareReplay(1),
        );

        this.gift$ = progress$.pipe(
            map(progress => progress.gift),
            distinctUntilChanged(),
            shareReplay(1)
        );


        this.giftImagePath$ = progress$.pipe(
            map(progress => progress.giftImagePath),
            distinctUntilChanged(),
            shareReplay(1)
        );

        this.players$ = progress$.pipe(
            map(progress => progress.players),
            shareReplay(1)
        );

        this.layout$ = combineLatest([this.players$, this.gift$]).pipe(
            map(([players, gift]) => layoutSignposts(players, gift ?? '')),   // gift as salt: lean and pop differ per round
            tap(layout => this.trackArrivals(layout)),
            shareReplay(1)
        );
        this.updateFit();

        this.eyePosts$ = this.layout$.pipe(
            map(layout => layout.edges.flatMap(edge => edge.slots)
                .map(slot => ({ id: slot.player.id, waiting: !(slot.player.phase === UserPhase.WAITING) }))),
            shareReplay(1)
        );
    }
    private trackArrivals(layout: SignpostLayout): void {
        for (const slot of layout.edges.flatMap(edge => edge.slots)) {
            if (!(slot.player.phase === UserPhase.WAITING)) {
                this.arrivedVoted.delete(slot.player.id);   // a new round: snow and animations apply again
            } else if (this.firstLayout) {
                this.arrivedVoted.add(slot.player.id);
            }
        }
        this.firstLayout = false;
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

    private updateFit(): void {
        const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        this.fit = Math.min(1, Math.max(0.6, window.innerHeight / rootPx / 67.5));   // 67.5rem = a 1080px-high screen
    }

    public locateBoard(id: string): HTMLElement | null {
        return document.querySelector<HTMLElement>(`[data-post-id="${CSS.escape(id)}"] .board`);
    }
}
