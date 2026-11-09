import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseContainer } from './base-container.component';
import { Observable, map } from 'rxjs';

@Component({
    selector: '',
    template: ''
})
export abstract class BaseGameContainer extends BaseContainer implements OnInit {
    protected gameId$!: Observable<string>;

    constructor(protected route: ActivatedRoute) {
        super();
    }

    override ngOnInit(): void {
        super.ngOnInit();
        this.gameId$ = this.route.params.pipe(
            map(params => params['game_id'])
        )
    }
}
