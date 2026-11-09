import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject, combineLatest, distinctUntilChanged, filter, interval, map, share, shareReplay, startWith, switchMap, take, takeUntil, takeWhile, tap } from 'rxjs';
import { GameResult, Player, PlayerResult, PodiumSlot, RoundProgress, RoundResult } from 'src/app/entities/entities';
import { HostService } from 'src/app/services/host.service';
import { BaseGameContainer } from '../../base-game-container.component';
import { orderBy, result } from 'lodash-es';
import { buildPodiumSlots, rankPodium } from 'src/app/helpers/podium';
import { RestEntry } from 'src/app/components/player-rest-list/player-rest-list.component';

type ScoreField = 'vote_score' | 'target_wrong' | 'gift_score' | 'sabotage_score';

interface Category {
    field: ScoreField;
    title: string;
    icon: string;
    fontSet?: string;
    description: string;
    statLabel: string;
}

const CATEGORIES: Category[] = [
    {
        field: 'vote_score', title: 'Detective', icon: 'fingerprint', statLabel: 'correcte stemmen',
        description: 'Deze persoon is een echte detective en kon het meeste cadeaus aan de juiste persoon toekennen.'
    },
    {
        field: 'target_wrong', title: 'Dief', icon: 'domino_mask', fontSet: 'material-symbols-outlined', statLabel: 'foute stemmen',
        description: 'Als de cadeaus zouden meegaan met de persoon die de stemmen krijgt zou deze persoon de meeste cadeaus hebben. Deze persoon kreeg de meeste foutieve stemmen.'
    },
    {
        field: 'gift_score', title: 'Strategist', icon: 'psychology', statLabel: 'levensduur cadeau',
        description: 'Deze persoon koos zijn/haar cadeau strategisch en bleef het langst in het spel.'
    },
    {
        field: 'sabotage_score', title: 'Saboteur', icon: 'theater_comedy', statLabel: 'sabotages van ronde',
        description: 'Deze persoon is een echte grapjas en zorgde er het meeste voor dat de ronde opnieuw moest worden gestart.'
    },
];

@Component({
    selector: 'final-results',
    templateUrl: './final-results-container.component.html',
    styleUrls: ['./final-results-container.component.scss'],
})
export class FinalResultContainerComponent extends BaseGameContainer implements OnInit, OnDestroy {
    public categories: Category[] = CATEGORIES;
    public sortField$: BehaviorSubject<ScoreField> = new BehaviorSubject<ScoreField>('vote_score');
    public category$!: Observable<Category>;
    public slots$!: Observable<PodiumSlot[]>;
    public restEntries$!: Observable<RestEntry[]>;

    constructor(protected override route: ActivatedRoute, private hostService: HostService) {
        super(route);
    }

    override ngOnInit(): void {
        super.ngOnInit();

        const gameResult_$: Observable<GameResult[]> = this.gameId$.pipe(
            switchMap(gameId => this.hostService.gameResults(gameId)),
            shareReplay(1)
        );

        this.category$ = this.sortField$.pipe(
            distinctUntilChanged(),
            map(field => CATEGORIES.find(category => category.field === field)!),
            shareReplay(1)
        );

        const ranked$ = combineLatest([gameResult_$, this.category$]).pipe(
            map(([results, category]) => ({
                category,
                layout: rankPodium(orderBy(results, [category.field], ['desc']), r => r[category.field]),
            })),
            shareReplay(1)
        );

        this.slots$ = ranked$.pipe(
            map(({ category, layout }) => buildPodiumSlots(layout, r => ({
                key: `${category.field}-${r.userId}`, // changes per category, so the reveal replays
                name: r.name,
                avatarPath: r.avatarPath,
                stat: String(r[category.field]),
                statLabel: category.statLabel,
            }), { start: 0.2, step: 0.6 })) // quicker than the round screen; the host flips between four categories
        );

        this.restEntries$ = ranked$.pipe(
            map(({ category, layout }) => layout.rest.map(result => ({
                key: `${category.field}-${result.userId}`,
                name: result.name,
                avatarPath: result.avatarPath,
                stat: `${result[category.field]} ${category.statLabel}`,
            }))),
            shareReplay(1)
        );
    }

    public onSetSortField(sortField: ScoreField): void {
        this.sortField$.next(sortField);
    }

    override ngOnDestroy(): void {
        super.ngOnDestroy();
    }
}
