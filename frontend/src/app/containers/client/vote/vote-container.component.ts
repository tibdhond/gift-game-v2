import { Component, ElementRef, OnInit, QueryList, ViewChild, ViewChildren } from "@angular/core";
import { EMPTY, Observable, catchError, firstValueFrom, map, of, shareReplay, switchMap, take, tap } from "rxjs";
import { ActivatedRoute, Router } from "@angular/router";
import { ClientService } from "src/app/services/client.service";
import { Player, UserInfoResult } from "src/app/entities/entities";
import { BaseClientContainerComponent } from "../base-client-container.component";
import { MessageService } from "src/app/services/message.service";
import { PlayerTileComponent } from "src/app/components/player-tile/player-tile.component";

@Component({
    selector: "vote-container",
    templateUrl: "./vote-container.component.html",
    styleUrls: ["./vote-container.component.scss"]
})
export class VoteContainerComponent extends BaseClientContainerComponent implements OnInit {
    public players$!: Observable<Player[]>;
    public isProcessing = false;
    public selectedPlayer?: Player;
    public currentUser$!: Observable<UserInfoResult>

    public isSending: boolean = false;

    @ViewChildren(PlayerTileComponent) tiles!: QueryList<PlayerTileComponent>;
    @ViewChild('confirmBar') confirmBar?: ElementRef<HTMLElement>;

    constructor(
        protected override route: ActivatedRoute,
        protected override client: ClientService,
        private router: Router,
        private messageService: MessageService
    ) {
        super(route, client);
    }

    override ngOnInit(): void {
        super.ngOnInit();

        this.players$ = this.gameId$.pipe(
            switchMap(gameId => this.client.getPlayers(gameId, true)),
            map(playersResult => playersResult.players),
            shareReplay(1)
        );

        this.currentUser$ = this.gameId$.pipe(
            switchMap(gameId => this.client.getUserInfo(gameId)),
            shareReplay(1)
        )
    }

    public onVote(player: Player): void {
        this.selectedPlayer = player;
    }

    public async confirmVote(): Promise<void> {
        const chosen = this.tiles.find(t => t.selected);
        if (!chosen || this.isSending || !this.selectedPlayer) return;
        this.isSending = true;
        document.documentElement.style.overflow = 'hidden';

        // Start the request right away; it runs while the animation plays
        // const request = firstValueFrom(this.api.send(chosen.id)); // your existing call
        const request: Promise<string> = firstValueFrom(this.executeVote(this.selectedPlayer.id, this.selectedPlayer.name)); // your existing call
        request.catch(() => { }); // handled below; just avoids an unhandled rejection warning

        const leaving: Animation[] = [];
        try {
            await this.scrollToCenter(chosen.wrapEl);

            // 1 + 2) bar slides down, other tiles slide away
            leaving.push(...this.slideOthersAway(chosen));
            const bar = this.confirmBar?.nativeElement;
            if (bar) {
                leaving.push(bar.animate(
                    [{ transform: 'translateY(0)' }, { transform: 'translateY(120%)' }],
                    { duration: 300, easing: 'ease-in', fill: 'forwards' }));
            }
            await Promise.all(leaving.map(a => a.finished));

            await chosen.pack();      // 3 + 4
            const gameId: string = await request;            // envelope stays closed until the server answered
            await chosen.flyAway();   // 5
            this.router.navigate(["client", gameId, "waiting"]);
        } catch (err) {
            console.error('confirm failed', err);
            await chosen.unpack();
            leaving.forEach(a => a.reverse());
            await Promise.all(leaving.map(a => a.finished));
            leaving.forEach(a => a.cancel());
            this.isSending = false;
            // show your error message here
        } finally {
            document.documentElement.style.overflow = '';
        }
    }

    private slideOthersAway(chosen: PlayerTileComponent): Animation[] {
        const sel = chosen.wrapEl.getBoundingClientRect();
        const selCenter = sel.top + sel.height / 2;

        return this.tiles.filter(t => t !== chosen).map(t => {
            const el = t.wrapEl;
            const r = el.getBoundingClientRect();
            const goesUp = r.top + r.height / 2 < selCenter;
            const dy = goesUp ? -(r.bottom + 60) : window.innerHeight - r.top + 60;
            return el.animate(
                [{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${dy}px)`, opacity: 0 }],
                { duration: 450, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' });
        });
    }

    private async scrollToCenter(el: HTMLElement): Promise<void> {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 350)); // good enough; 'scrollend' isn't universal yet
    }

    private executeVote(targetId: string, targetName: string): Observable<string> {
        this.isProcessing = true;

        return this.gameId$.pipe(
            switchMap(gameId => this.client.vote(gameId, targetId)),
            switchMap(() => this.gameId$),
            take(1),
            tap(() => this.messageService.show(`Stem voor ${targetName} succesvol geregistreerd.`, "success")),
            catchError(() => {
                this.isProcessing = false;
                this.messageService.show(`Stem voor ${targetName} registreren mislukt.`, "error")
                return EMPTY;
            }),
        );
    }
}
