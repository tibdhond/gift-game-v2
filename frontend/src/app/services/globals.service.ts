import { inject, Injectable } from '@angular/core';
import { ActivationEnd, ActivationStart, ChildActivationEnd, ChildActivationStart, GuardsCheckEnd, NavigationCancel, NavigationEnd, NavigationError, NavigationSkipped, NavigationStart, Params, ResolveEnd, ResolveStart, Router, RoutesRecognized } from '@angular/router';
import { BehaviorSubject, filter, map, Observable, shareReplay, startWith, take, tap } from 'rxjs';
import { UtilService } from './util.service';


@Injectable({
    providedIn: 'root',
})
export class GlobalsService {
    private router: Router = inject(Router);
    private utilService: UtilService = inject(UtilService);

    private gameId$: Observable<string> = this.router.events.pipe(
        filter(event => event instanceof NavigationEnd),
        startWith(null),
        map(() => this.getRouteParams()),
        map(params => params['gameId']),
        shareReplay(1)
    );

    private host$: Observable<string> = this.utilService.getIp().pipe(
        map(ip => `http://${ip}:5000`),
        take(1),
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

    public getHost(): Observable<string> {
        return this.host$;
    }
}
