import { Component, Injectable } from '@angular/core';

import { NavigationEnd, NavigationError, Router, UrlTree } from '@angular/router';
import { filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RedirectService {
    pendingRedirectUrl: string | null = null;

    constructor(router: Router) {
        // Once the redirected navigation has finished, forget about it
        router.events.pipe(
            filter(event => event instanceof NavigationEnd || event instanceof NavigationError)
        ).subscribe(() => this.pendingRedirectUrl = null);
    }
}
