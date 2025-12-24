import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Route, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject, combineLatest, distinctUntilChanged, filter, interval, map, share, shareReplay, startWith, switchMap, take, takeUntil, takeWhile, tap } from 'rxjs';
import { PersonalResult, PersonalRoundResult, Player, PlayerResult, RoundProgress, RoundResult } from 'src/app/entities/entities';
import { HostService } from 'src/app/services/host.service';
import { BaseGameContainer } from '../../base-game-container.component';
import { orderBy, result } from 'lodash-es';
import { ClientService } from 'src/app/services/client.service';
import { BaseClientContainerComponent } from '../base-client-container.component';

@Component({
    selector: 'personal-results',
    templateUrl: './personal-results-container.component.html',
    styleUrls: ['./personal-results-container.component.scss'],
})
export class PersonalResultsContainerComponent extends BaseClientContainerComponent implements OnInit, OnDestroy {
    public giftScore$!: Observable<number>;
    public sabotageScore$!: Observable<number>;
    public voteScore$!: Observable<number>;
    public targetCorrect$!: Observable<number>;
    public targetWrong$!: Observable<number>;

    public personalRounds$!: Observable<PersonalRoundResult[]>;

    private router: Router = inject(Router);

    constructor(protected override route: ActivatedRoute, private clientService: ClientService) {
        super(route);
    }

    override ngOnInit(): void {
        super.ngOnInit();

        if (this.userId) {

            const personalResults$: Observable<PersonalResult> = this.gameId$.pipe(
                switchMap(gameId => this.clientService.getPersonalResult(gameId, this.userId!)),
                shareReplay(1)
            );

            this.giftScore$ = personalResults$.pipe(
                map(personalResults => personalResults.gift_score),
                shareReplay(1)
            );

            this.sabotageScore$ = personalResults$.pipe(
                map(personalResults => personalResults.sabotage_score),
                shareReplay(1)
            );

            this.voteScore$ = personalResults$.pipe(
                map(personalResults => personalResults.vote_score),
                shareReplay(1)
            );

            this.targetCorrect$ = personalResults$.pipe(
                map(personalResults => personalResults.target_correct),
                shareReplay(1)
            );

            this.targetWrong$ = personalResults$.pipe(
                map(personalResults => personalResults.target_wrong),
                shareReplay(1)
            );

            this.personalRounds$ = personalResults$.pipe(
                map(personalResults => personalResults.rounds),
                shareReplay(1)
            );
        } else {
            this.router.navigate(['/']);
        }
    }

    override ngOnDestroy(): void {
        super.ngOnDestroy();
    }
}
