import { Component } from '@angular/core';
import { switchMap, take, takeUntil } from 'rxjs';
import { GameService } from 'src/app/services/game.service';
import { ActivatedRoute, Router } from '@angular/router';
import { BaseGameContainer } from '../../base-game-container.component';
import { FormControl, Validators } from '@angular/forms';
import { ClientService } from 'src/app/services/client.service';

@Component({
    selector: 'gift-open-container',
    templateUrl: './gift-open-container.component.html',
    styleUrls: ['./gift-open-container.component.scss']
})
export class GiftOpenContainerComponent extends BaseGameContainer {
    public giftController: FormControl = new FormControl(null, [Validators.required]);
    constructor(
        protected override route: ActivatedRoute,
        private clientService: ClientService,
        private router: Router
    ) {
        super(route);
    }

    public onGiftAdd(): void {
        const userId: string | null = localStorage.getItem('userId');

        if (userId) {
            if (this.giftController.valid) {
                this.gameId$.pipe(
                    switchMap(gameId => this.clientService.addGift(gameId, this.giftController.value, userId)),
                    switchMap(() => this.gameId$),
                    take(1),
                    takeUntil(this.destroy$)
                ).subscribe(gameId => {
                    this.router.navigate(['client', gameId, 'vote']);
                });
            }
        }
    }
}
