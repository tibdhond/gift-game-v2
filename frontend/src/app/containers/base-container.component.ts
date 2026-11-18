import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
    selector: '',
    template: ''
})
export abstract class BaseContainer implements OnInit, OnDestroy {
    protected destroy$: Subject<void> = new Subject<void>;

    constructor() { }

    ngOnInit(): void {
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
