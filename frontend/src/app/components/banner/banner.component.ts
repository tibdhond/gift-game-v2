import { Component, Input, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { ClientService } from '../../services/client.service';
import { MessageService } from '../../services/message.service';
import { NavigationEnd, Params, Router } from '@angular/router';
import { BehaviorSubject, combineLatest, filter, map, Observable, of, shareReplay, switchMap, take, takeUntil, tap } from 'rxjs';
import { BaseContainer } from '../../containers/base-container.component';
import { UserInfoResult } from '../../entities/entities';
import { LocalStorageService } from '../../services/localstorage.service';

@Component({
    selector: 'app-banner',
    templateUrl: './banner.component.html',
    styleUrls: ['./banner.component.scss']
})
export class BannerComponent extends BaseContainer implements OnInit, OnDestroy {
    @Input() title: string = 'Gift Game';

    @ViewChild('fileInput') fileInput!: ElementRef;

    public username$!: Observable<string | undefined>;
    public avatarUrl$!: Observable<string | undefined>
    public gameId$!: Observable<string>;
    private userId!: string | null;

    public avatarAvailable: boolean = true;
    public hasUploadedAvatar: boolean = false;

    private refreshTrigger$: BehaviorSubject<void> = new BehaviorSubject<void>(void 0);

    constructor(
        private client: ClientService,
        private message: MessageService,
        private router: Router,
        private localStorageService: LocalStorageService
    ) {
        super();
    }

    override ngOnInit(): void {
        this.initGameId();
        const userId$: Observable<string | null> = this.localStorageService.getUserId().pipe(
            takeUntil(this.destroy$));

        const userInfo$: Observable<UserInfoResult | null> = combineLatest([this.gameId$, userId$, this.refreshTrigger$]).pipe(
                switchMap(([gameId, userId, _]) => userId ? this.client.getUserInfo(gameId, userId) : of(null)),
                shareReplay(1)
            );

        this.username$ = userInfo$.pipe(
            map(userInfo => userInfo ? userInfo.name : undefined)
        );

        this.avatarUrl$ = userInfo$.pipe(
                tap(userInfo => {
                    if (!userInfo?.avatarPath) {
                        this.avatarAvailable = false;
                    } else {
                        this.avatarAvailable = true;
                    }
                }),
                map(userInfo => userInfo ? userInfo.avatarPath : undefined)
            );

        userId$.pipe(takeUntil(this.destroy$)).subscribe(userId => {
            this.userId = userId;
        })
    }

    private initGameId(): void {
        this.gameId$ = this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            map(() => this.getRouteParams()),
            map(params => params['game_id']),
            shareReplay(1)
        );
    }

    public override ngOnDestroy(): void {
        this.refreshTrigger$.complete();
    }

    private getRouteParams(): Params {
        let params: Params = {};
        let route = this.router.routerState.snapshot.root;

        while (route) {
            params = { ...params, ...route.params };
            route = route.firstChild!;
        }

        return params;
    }

    triggerUpload() {
        this.fileInput.nativeElement.click();
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (!file || !this.userId) return;

        this.message.show('Uploading...', 'loading');

        this.gameId$.pipe(
            switchMap(gameId => this.client.uploadAvatar(gameId, this.userId!, file)),
            take(1)
        ).subscribe({
            next: (res: any) => {
                this.message.show('Avatar succesvol geüpload', 'success');
                this.refreshTrigger$.next();
            },
            error: (err: any) => {
                const msg = err.error?.msg || 'Er is iets misgegaan bij het uploaden';
                this.message.show(msg, 'error');
            }
        });

        event.target.value = '';
    }

    public onAvatarLoadError(e: ErrorEvent): void {
        console.error(e);
        this.avatarAvailable = false;
    }
}
