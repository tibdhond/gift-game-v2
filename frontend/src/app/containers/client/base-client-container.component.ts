import { Component, OnInit } from '@angular/core';
import { interval, map, Observable, switchMap, take, takeUntil, withLatestFrom } from 'rxjs';
import { GameService } from 'src/app/services/game.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientService } from 'src/app/services/client.service';
import { UserPhase } from 'src/app/entities/entities';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { AnimationEvent } from "@angular/animations";
import { BaseGameContainer } from '../base-game-container.component';


@Component({
    selector: 'waiting-container',
    template: '',
})
export abstract class BaseClientContainerComponent extends BaseGameContainer implements OnInit {
    protected userId: string | null = localStorage.getItem("userId");

    constructor(
        protected override route: ActivatedRoute,
    ) {
        super(route);
    }

    public override ngOnInit(): void {
        super.ngOnInit();
    }
}
