import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { ClientService } from '../services/client.service';
import { map, of, take, tap } from 'rxjs';
import { UserPhase } from '../entities/entities';
import { RedirectService } from '../services/redirect.service';

export const GamePhaseGuard: CanActivateFn = (route, state) => {
    const router: Router = inject(Router);
    const clientService: ClientService = inject(ClientService);
    const redirectService: RedirectService = inject(RedirectService);

    // Previously checked url, now processing redirect
    if (redirectService.pendingRedirectUrl === state.url) {
        return true;
    }
    redirectService.pendingRedirectUrl = null;

    // Check for fresh load
    const navigation = router.getCurrentNavigation();
    const isFreshLoad = !router.navigated;
    const isHistoryNavigation =
        navigation?.trigger === 'popstate' || navigation?.trigger === 'hashchange';

    if (!isFreshLoad && !isHistoryNavigation) {
        return true;
    }

    const segments: string[] = state.url.split('/');
    const gameIdIndex: number = segments[0] === "" ? 2 : 1;
    const gameId: string = segments[gameIdIndex];
    const pageUrl = segments[segments.length - 1];

    const userId: string | null = localStorage.getItem("userId");
    if (!userId) {
        if (pageUrl === "login") {
            return of(true);
        } else {
            return of(false);
        }
    }

    const redirectTo = (url: string): UrlTree => {
        const tree = router.parseUrl(url);
        redirectService.pendingRedirectUrl = router.serializeUrl(tree);
        return tree;
    };


    return clientService.getUserPhase(gameId, userId).pipe(
        take(1),
        map(userphase => userphase.phase),
        map(userPhase => {
            switch (userPhase) {
                case (UserPhase.GIFT_OPENING):
                    if (pageUrl === 'gift-opening') {
                        return true;
                    }
                    return redirectTo(['client', gameId, 'gift-opening'].join('/'));
                case (UserPhase.VOTING):
                    if (pageUrl === 'vote') {
                        return true;
                    }
                    return redirectTo(['client', gameId, 'vote'].join('/'));
                case (UserPhase.FINISHED):
                    if (pageUrl === 'personal-results') {
                        return true;
                    }
                    return redirectTo(['client', gameId, 'personal-results'].join('/'));
                case (UserPhase.WAITING):
                    if (pageUrl === 'waiting') {
                        return true;
                    }
                    return redirectTo(['client', gameId, 'waiting'].join('/'));
                default:
                    if (pageUrl === 'login') {
                        return true;
                    }
                    return redirectTo(['client', gameId, 'login'].join('/'));
            }
        })
    );
};