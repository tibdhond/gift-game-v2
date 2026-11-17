import { Component } from "@angular/core";
import { finalize, Observable } from "rxjs";
import { Claim } from "src/app/entities/entities";
import { NotificationService, AppNotification, NotificationAction, MessagePart } from "src/app/services/notification.service";

@Component({
    selector: 'app-notifications',
    templateUrl: './notifications.component.html',
    styleUrls: ['./notifications.component.scss'],
})
export class NotificationsComponent {
    public notifications$: Observable<AppNotification<Claim>[]> = this.service.notifications$ as Observable<AppNotification<Claim>[]>;
    public busy: Set<string> = new Set<string>();
    public revealed: Set<string> = new Set<string>();

    constructor(private service: NotificationService) { }

    track = (_: number, n: AppNotification) => n.key;   // same key = same DOM element, so the reveal state survives polls

    public toggleReveal(n: AppNotification): void {
        if (!n.detail?.concealed) {
            return;
        }
        this.revealed.has(n.key) ? this.revealed.delete(n.key) : this.revealed.add(n.key);
    }

    public run(n: AppNotification, action: NotificationAction): void {
        if (this.busy.has(n.key)) {
            return;   // protects against double taps
        }
        this.busy.add(n.key);
        action.handler().pipe(
            finalize(() => this.busy.delete(n.key))
        ).subscribe({
            complete: () => this.service.dismiss(n.key),   // success: remove it right away, don't wait for the next poll
            error: () => { /* stays visible, so the host can try again */ },
        });
    }

    isText(part: MessagePart): part is string {
        return typeof part === 'string';
    }
}