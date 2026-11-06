import { Component, OnInit } from "@angular/core";
import { Observable, map, switchMap, take } from "rxjs";
import { GameService } from "src/app/services/game.service";
import { ActivatedRoute, Router } from "@angular/router";
import { BaseGameContainer } from "../../base-game-container.component";
import { ClientService } from "src/app/services/client.service";
import { Player } from "src/app/entities/entities";
import { BaseClientContainerComponent } from "../base-client-container.component";
import { MatDialog } from "@angular/material/dialog";
import { MessageService } from "src/app/services/message.service";

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
        private clientService: ClientService,
        private router: Router,
        private dialog: MatDialog,
        private messageService: MessageService
    ) {
        super(route);
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
        const question = this.userId === player.id ? "Is dit jouw cadeau?" : `Stem voor ${player.name}?`;
        
        this.dialog.open([
            {
                title: question,
                type: "confirm",
                options: [
                    { label: "Ja", confirm: true },
                    { label: "Nee", confirm: false }
                ]
            }
        ], (result) => {
            if (result.confirm) {
                this.executeVote(player.id, player.name);
            }
        });
    }

    private executeVote(targetId: string, targetName: string): void {
        this.isProcessing = true;
        
        this.gameId$.pipe(
            switchMap(gameId => this.clientService.vote(gameId, this.userId!, targetId)),
            switchMap(() => this.gameId$),
            take(1)
        ).subscribe({
            next: (gameId) => {
                this.messageService.show(`Stem voor ${targetName} succesvol geregistreerd.`);
                this.router.navigate(["client", gameId, "waiting"]);
            },
            error: () => {
                this.isProcessing = false;
            }
        });
    }
}
