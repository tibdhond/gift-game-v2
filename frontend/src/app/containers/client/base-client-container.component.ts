import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
