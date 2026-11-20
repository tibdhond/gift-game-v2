import { Component, Input, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { ClientService } from '../../services/client.service';
import { MessageService } from '../../services/message.service';
import { BehaviorSubject, catchError, combineLatest, map, Observable, of, shareReplay, switchMap, take, takeUntil, tap } from 'rxjs';
import { BaseContainer } from '../../containers/base-container.component';
import { UserInfoResult } from '../../entities/entities';
import { HttpErrorResponse } from '@angular/common/http';
import { GlobalsService } from 'src/app/services/globals.service';

export const BANNER_SELECTOR: string = "app-banner";

@Component({
    selector: BANNER_SELECTOR,
    templateUrl: './banner.component.html',
    styleUrls: ['./banner.component.scss']
})
export class BannerComponent extends BaseContainer implements OnInit, OnDestroy {
    @Input() title: string = 'Gift Game';

    @Input() isHost!: boolean;

    @ViewChild('fileInput') fileInput!: ElementRef;

    public username$!: Observable<string | undefined>;
    public avatarUrl$!: Observable<string | undefined>
    public gameId$!: Observable<string>;

    public avatarAvailable: boolean = true;
    public hasUploadedAvatar: boolean = false;

    private refreshTrigger$: BehaviorSubject<void> = new BehaviorSubject<void>(void 0);

    constructor(
        private client: ClientService,
        private message: MessageService,
        private gameIdService: GlobalsService,
    ) {
        super();
    }

    override ngOnInit(): void {
        this.gameId$ = this.gameIdService.getGameId();

        const userInfo$: Observable<UserInfoResult | null> = combineLatest([this.gameId$, this.refreshTrigger$]).pipe(
            switchMap(([gameId, _]) => gameId && !this.isHost ? this.client.getUserInfo(gameId, true).pipe(
                catchError((e: HttpErrorResponse) => {
                    console.error('Failed fetching user info', e);
                    return of(null);
                })
            ) : of(null)),
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
    }

    public override ngOnDestroy(): void {
        this.refreshTrigger$.complete();
    }

    triggerUpload() {
        this.fileInput.nativeElement.click();
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (!file) return;

        this.message.show('Uploading...', 'loading');

        this.gameId$.pipe(
            switchMap(gameId => this.client.uploadAvatar(gameId, file)),
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
