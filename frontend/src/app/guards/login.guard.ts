import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const ClientLoginGuard: CanActivateFn = (route, state) => {
    const router: Router = inject(Router);

    const userId: string | null = localStorage.getItem("userId");
    if (!!userId) {
        return true;
    }

    const segments: string[] = state.url.split('/');
    segments[segments.length - 1] = 'login';

    return router.parseUrl(segments.join('/'));
};