import { Component, OnInit } from "@angular/core";
import { Observable, map, switchMap, take, tap } from "rxjs";
import { GameService } from "src/app/services/game.service";
import { ActivatedRoute, Router } from "@angular/router";
import { BaseGameContainer } from "../../base-game-container.component";
import { ClientService } from "src/app/services/client.service";
import { Player } from "src/app/entities/entities";
import { BaseClientContainerComponent } from "../base-client-container.component";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { MessageService } from "src/app/services/message.service";
import { VoteConfirmDialogComponent } from "src/app/components/dialogs/confirm/confirm.dialog.component";

@Component({
    selector: "vote-container",
    templateUrl: "./vote-container.component.html",
    styleUrls: ["./vote-container.component.scss"]
})
export class VoteContainerComponent extends BaseClientContainerComponent implements OnInit {
    public players$!: Observable<Player[]>;
    public isProcessing = false;

    constructor(
        protected override route: ActivatedRoute,
        protected clientService: ClientService,
        private router: Router,
        private dialog: MatDialog,
        private messageService: MessageService
    ) {
        super(route, clientService);
    }

    override ngOnInit(): void {
        super.ngOnInit();

        this.players$ = this.gameId$.pipe(
            switchMap(gameId => this.clientService.getPlayers(gameId, true)),
            map(playersResult => playersResult.players)
        );
    }

    public onVote(targetId: string): void {
        if (!this.userId) {
            this.router.navigate(["/"]);
            return;
        }

        this.players$.pipe(take(1)).subscribe(players => {
            const player = players.find(p => p.id === targetId);
            if (player) {
                this.confirmVote(player);
            }
        });
    }

    private confirmVote(player: Player): void {
        const question = this.userId === player.id ? "Is dit jouw cadeau?" : `Ben je zeker van je keuze?`;

        this.userInfo$.pipe(
            map(userInfo => userInfo.name),
            tap(() => {
                this.isProcessing = true;
            }),
            map(userName => this.dialog.open(VoteConfirmDialogComponent,
                {
                    panelClass: 'gift-tag-dialog',
                    hasBackdrop: false, width: 'min(31.25rem, calc(100vw - 2rem), calc((100dvh - 2rem) * 0.967))',
                    maxWidth: 'none',
                    data: {
                        message: question,
                        confirmText: "Ja",
                        cancelText: "Nee",
                        voteTarget: player.name,
                        currentPlayer: userName
                    }
                }
            )),
            switchMap(dialogRef => dialogRef.afterClosed()),
            take(1)
        ).subscribe(result => {
            if (result) {
                this.executeVote(player.id, player.name);
            } else {
                this.isProcessing = false;
            }
        });
    }

    private executeVote(targetId: string, targetName: string): void {
        this.isProcessing = true;

        this.gameId$.pipe(
            switchMap(gameId => this.clientService.vote(gameId, targetId)),
            switchMap(() => this.gameId$),
            take(1)
        ).subscribe({
            next: (gameId) => {
                this.messageService.show(`Stem voor ${targetName} succesvol geregistreerd.`, "success");
                this.router.navigate(["client", gameId, "waiting"]);
            },
            error: () => {
                this.isProcessing = false;
            }
        });
    }
}
