import { Component, OnInit } from '@angular/core';
import { interval, map, Observable, switchMap, take, takeUntil, tap, withLatestFrom } from 'rxjs';
import { GameService } from 'src/app/services/game.service';
import { ActivatedRoute, Router } from '@angular/router';
import { BaseGameContainer } from '../../base-game-container.component';
import { ClientService } from 'src/app/services/client.service';
import { UserPhase } from 'src/app/entities/entities';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { AnimationEvent } from "@angular/animations";
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
export class WaitingContainerComponent extends BaseClientContainerComponent implements OnInit {
    public gifUrl$!: Observable<string>;
    public showIcon1: boolean = true;
    public showIcon2: boolean = true;
    public showIcon3: boolean = true;

    constructor(
        protected override route: ActivatedRoute,
        private router: Router,
        private clientService: ClientService
    ) {
        super(route);
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

        this.gifUrl$ = this.host$.pipe(
            map(host => `${host}/api/gif`)
        )
    }

    private loopIconAnimation() {
        setInterval(() => {
            this.showIcon1 = false;
            setTimeout(() => this.showIcon1 = true, 50);
        }, 50000);
    }

    public onAnimationEvent(event: AnimationEvent): void {
        console.log(event);
    }
}
