import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse, HttpContextToken } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, NavigationCancel, NavigationEnd, NavigationError, Router, RouterStateSnapshot } from "@angular/router";
import { filter, Observable, catchError, throwError } from "rxjs";

export const SKIP_AUTH_REDIRECT: HttpContextToken<boolean> = new HttpContextToken<boolean>(() => false)

@Injectable()
export class UnauthorizedInterceptor implements HttpInterceptor {
    private redirecting = false;

    constructor(private router: Router) {
        // Allow a new redirect once the current navigation has settled
        this.router.events.pipe(
            filter(e => e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError)
        ).subscribe(() => this.redirecting = false);
    }

    intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        return next.handle(req).pipe(
            catchError((error: unknown) => {
                if (error instanceof HttpErrorResponse && error.status === 401 && !req.context.get(SKIP_AUTH_REDIRECT)) {
                    this.handleUnauthorized();
                }
                return throwError(() => error);   // callers still see the error
            })
        );
    }

    private handleUnauthorized(): void {
        if (this.redirecting) {
            return;   // several polls can fail at the same moment; only redirect once
        }

        const snapshot: RouterStateSnapshot = this.router.routerState.snapshot;
        const gameId: string | null = this.findParam(snapshot.root, 'gameId');
        const isHost: boolean = this.router.url.startsWith('/host');

        localStorage.clear();

        const target = isHost || !gameId ? ['/'] : ['/client', gameId, 'login'];
        if (this.router.url.split('?')[0] === this.router.createUrlTree(target).toString()) {
            return;   // already there, avoid a loop
        }

        this.redirecting = true;
        this.router.navigate(target).then(() => location.reload());
    }

    private findParam(route: ActivatedRouteSnapshot, name: string): string | null {
        return route.paramMap.get(name) ?? (route.firstChild ? this.findParam(route.firstChild, name) : null);
    }
}