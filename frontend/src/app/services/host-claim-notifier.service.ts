import { Injectable } from "@angular/core";
import { catchError, EMPTY, exhaustMap, Subscription, timer } from "rxjs";
import { HostService } from "./host.service";
import { AppNotification, NotificationService } from "./notification.service";
import { Claim } from "../entities/entities";

@Injectable({ providedIn: 'root' })
export class HostClaimNotifier {
    private sub?: Subscription;

    constructor(private hostService: HostService, private notifications: NotificationService) { }

    public start(gameId: string): void {
        this.stop();
        this.sub = timer(0, 4000).pipe(
            // exhaustMap: no overlapping requests. On an error nothing is emitted,
            // so a network blip doesn't clear the notifications that are showing
            exhaustMap(() => this.hostService.getClaims(gameId).pipe(catchError(() => EMPTY)))
        ).subscribe(claims => {
            this.notifications.sync('claims', claims.map(claim => this.toNotification(gameId, claim)))
        });
    }

    public stop(): void {
        this.sub?.unsubscribe();
        this.sub = undefined;
        this.notifications.sync('claims', []);
    }

    private toNotification(gameId: string, claim: Claim): AppNotification<Claim> {
        return {
            key: `claim-${claim.id}`,
            source: 'claims',
            title: 'Opnieuw verbinden',
            message: [{ strong: claim.playerName }, ' wil opnieuw meedoen.'],
            note: `Vraag naar de code en controleer of het echt ${claim.playerName} is. `
                + 'Goedkeuren beëindigt de huidige sessie van deze speler.',
            detail: { label: 'Code', value: claim.key, concealed: true },
            accent: '#d9a441',
            actions: [
                { label: 'Goedkeuren', kind: 'primary', handler: () => this.hostService.resolveClaim(gameId, claim.id, "APPROVED") },
                { label: 'Weigeren', kind: 'neutral', handler: () => this.hostService.resolveClaim(gameId, claim.id, "DENIED") },
            ],
        };
    }
}