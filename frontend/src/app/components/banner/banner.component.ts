import { Component, Input, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { ClientService } from '../../services/client.service';
import { MessageService } from '../../services/message.service';
import { NavigationEnd, Params, Router } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, filter, map, Observable, of, shareReplay, switchMap, take, tap } from 'rxjs';
import { BaseContainer } from 'src/app/containers/base-container.component';

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
        private router: Router
    ) {
        super();
    }

    override ngOnInit(): void {
        this.initGameId();
        this.userId = localStorage.getItem("userId");

        if (this.userId) {
            this.username$ = this.gameId$.pipe(
                switchMap(gameId => this.client.getUserInfo(gameId, this.userId!)),
                map(userInfo => userInfo.name)
            );

            this.avatarUrl$ = combineLatest([this.gameId$, this.refreshTrigger$]).pipe(
                switchMap(([gameId, _]) => this.client.getAvatar(gameId, this.userId!)),
                map(blob => URL.createObjectURL(blob)),
                catchError(e => {
                    console.log('error', e)
                    this.avatarAvailable = false;
                    return of(undefined);
                }),
                shareReplay(1)
            );

            this.hasUploadedAvatar = !!localStorage.getItem('has_uploaded_avatar');
        } else {
            this.username$ = of(undefined);
            this.avatarUrl$ = of(undefined);
        }
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
            tap(x => console.log('gameId', x)),
            switchMap(gameId => this.client.uploadAvatar(gameId, this.userId!, file)),
            take(1)
        ).subscribe({
            next: (res: any) => {
                this.message.show('Avatar succesvol geüpload', 'success');
                this.refreshTrigger$.next();
                this.hasUploadedAvatar = true;
                localStorage.setItem('has_uploaded_avatar', 'true');
            },
            error: (err: any) => {
                const msg = err.error?.msg || 'Er is iets misgegaan bij het uploaden';
                this.message.show(msg, 'error');
            }
        });

        event.target.value = '';
    }
}
