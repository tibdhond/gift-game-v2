import { inject, Injectable } from '@angular/core';
import { NavigationEnd, Params, Router } from '@angular/router';
import { BehaviorSubject, filter, map, Observable, shareReplay } from 'rxjs';


@Injectable({
    providedIn: 'root',
})
export class gameIdService {
    private router: Router = inject(Router);

    private gameId$: Observable<string> = this.router.events.pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => this.getRouteParams()),
        map(params => params['gameId']),
        shareReplay(1)
    );

    private getRouteParams(): Params {
        let params: Params = {};
        let route = this.router.routerState.snapshot.root;

        while (route) {
            params = { ...params, ...route.params };
            route = route.firstChild!;
        }

        return params;
    }

    public getGameId(): Observable<string> {
        return this.gameId$;
    }
}
