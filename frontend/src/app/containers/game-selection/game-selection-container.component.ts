import { Component, OnInit } from '@angular/core';
import { take, takeUntil } from 'rxjs';
import { GameService } from 'src/app/services/game.service';
import { BaseContainer } from '../base-container.component';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl } from '@angular/forms';

@Component({
    selector: 'game-selection',
    templateUrl: './game-selection-container.component.html',
    styleUrls: ['./game-selection-container.component.scss']
})
export class GameSelectionComponent extends BaseContainer implements OnInit {
    public gameSelectionControl: FormControl = new FormControl();

    constructor(protected override route: ActivatedRoute, private gameService: GameService, private router: Router) {
        super(route);
    }

    override ngOnInit(): void {
        this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(
            params => {
                if (params["gameId"] && !this.gameSelectionControl.value?.trim()) {
                    this.gameSelectionControl.setValue(params["gameId"])
                }
            }
        );
    }

    public onNewGame(): void {
        this.gameService.startNewGame().pipe(
            take(1),
            takeUntil(this.destroy$)
        ).subscribe(result => {
            this.router.navigate([`host/${result.game_id}/players`]);
        })
    }

    public onJoinGame(): void {
        this.router.navigate([`client/${this.gameSelectionControl.value}/login`])
    }
}
