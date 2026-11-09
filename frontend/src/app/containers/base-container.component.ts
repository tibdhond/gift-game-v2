import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { map, Observable, shareReplay, Subject, take } from 'rxjs';
import { UtilService } from '../services/util.service';

@Component({
    selector: '',
    template: ''
})
export abstract class BaseContainer implements OnInit, OnDestroy {
    protected destroy$: Subject<void> = new Subject<void>;
    protected host$!: Observable<string>;

    private readonly utilService: UtilService = inject(UtilService);

    constructor() { }

    ngOnInit(): void {
        this.host$ = this.utilService.getIp().pipe(
            map(ip => `http://${ip}:5000`),
            take(1),
            shareReplay(1)
        );
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
