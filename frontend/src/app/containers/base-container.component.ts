import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subject, take } from 'rxjs';
import { GameService } from 'src/app/services/game.service';

@Component({
    selector: '',
    template: ''
})
export abstract class BaseContainer implements OnInit, OnDestroy {
    protected destroy$: Subject<void> = new Subject<void>;
    protected host!: string;
    constructor(protected route: ActivatedRoute) { }

    ngOnInit(): void {
        const location: Location = window.location;
        this.host = `${location.protocol}//${location.host}`;
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
