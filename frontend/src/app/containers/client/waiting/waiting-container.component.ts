import { Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, interval, map, Observable, switchMap, takeUntil, withLatestFrom } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientService } from 'src/app/services/client.service';
import { UserPhase } from 'src/app/entities/entities';
import { animate, style, transition, trigger } from '@angular/animations';
import { BaseClientContainerComponent } from '../base-client-container.component';


@Component({
    selector: 'waiting-container',
    templateUrl: './waiting-container.component.html',
    styleUrls: ['./waiting-container.component.scss'],
    animations: [
        trigger('flyAcross', [
            transition(':enter', [
                style({
                    transform: 'translateX(-5vw)',
                }),
                animate(
                    '2000ms linear',
                    style({
                        transform: 'translateX(50vw)',
                    })
                )
            ])
        ])
    ]
})
export class WaitingContainerComponent extends BaseClientContainerComponent implements OnInit, OnDestroy {
    private static readonly COOLDOWN_MS = 2000;

    public gifUrl$!: Observable<string>;
    public gifVersion$: BehaviorSubject<number> = new BehaviorSubject<number>(0);

    public interacted: boolean = false;
    public rotation: number = 0;
    public cooling: boolean = false;
    public stuck: boolean = false;
    private cooldownTimer?: ReturnType<typeof setTimeout>;
    public gifLoading: boolean = true;

    constructor(
        protected override route: ActivatedRoute,
        protected clientService: ClientService,
        private router: Router,
    ) {
        super(route, clientService);
    }

    override ngOnInit(): void {
        super.ngOnInit();
        // this.loopIconAnimation();

        if (this.userId) {
            interval(3000).pipe(
                switchMap(() => this.gameId$),
                switchMap(gameId => this.clientService.getUserPhase(gameId, this.userId!)),
                map(phaseResult => phaseResult.phase),
                withLatestFrom(this.gameId$),
                takeUntil(this.destroy$)
            ).subscribe(([phase, gameId]) => {
                if (phase === UserPhase.GIFT_OPENING) {
                    this.router.navigate(['client', gameId, 'gift-opening']);
                } else if (phase === UserPhase.VOTING) {
                    this.router.navigate(['client', gameId, 'vote']);
                } else if (phase === UserPhase.UNREGISTERED) {
                    this.router.navigate(['/']);
                } else if (phase === UserPhase.FINISHED) {
                    this.router.navigate(['client', gameId, 'personal-results']);
                }
            })
        } else {
            this.router.navigate(['/']);
        }

        this.gifUrl$ = this.gifVersion$.pipe(
            map(version => `/api/gif?v=${version}`)
        )
    }

    public override ngOnDestroy(): void {
        this.gifVersion$.complete();
        clearTimeout(this.cooldownTimer);
        super.ngOnDestroy();
    }

    public onNewGif(): void {
        if (this.cooling) {
            this.stuck = true;   // plays the "stuck" animation, nothing else happens
            return;
        }

        this.interacted = true;
        this.rotation += 15;
        this.gifVersion$.next(this.gifVersion$.value + 1);
        this.cooling = true;
        this.cooldownTimer = setTimeout(() => this.cooling = false, WaitingContainerComponent.COOLDOWN_MS);
        this.gifLoading = true;
    }

    onAnimationEnd(event: AnimationEvent): void {
        // Angular prefixes keyframe names per component, so match the end of the name
        if (event.animationName.endsWith('stuck')) {
            this.stuck = false;
        }
    }

    onGifLoad(): void {
        this.gifLoading = false;
    }
}
