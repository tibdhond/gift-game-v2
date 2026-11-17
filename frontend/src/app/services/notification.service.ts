import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";

export interface NotificationAction<T = unknown> {
    label: string;
    kind?: 'primary' | 'neutral';
    handler: () => Observable<T>;   // the component runs it and tracks the busy state
}

export interface AppNotification<T = unknown> {
    key: string;       // stable identity, e.g. `claim-<id>`
    source: string;    // who owns it, e.g. 'claims'; sync() only touches its own source
    title?: string;
    message: string;
    detail?: { label: string; value: string; concealed?: boolean };
    accent?: string;   // colour of the tag card's bottom border
    actions?: NotificationAction<T>[];
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
    private readonly items$ = new BehaviorSubject<AppNotification[]>([]);
    readonly notifications$ = this.items$.asObservable();

    private dismissedAt = new Map<string, number>();

    /**
     * Makes the notifications of one source match `incoming`: new ones are appended,
     * missing ones removed, existing ones keep their position.
     */
    public sync(source: string, incoming: AppNotification[]): void {
        const now = Date.now();
        // Ignore items the user just handled, so a poll that was already in flight can't bring them back
        const fresh = incoming.filter(i => now - (this.dismissedAt.get(i.key) ?? 0) > 10_000);

        const current = this.items$.value;
        const byKey = new Map(fresh.map(i => [i.key, i]));
        const next: AppNotification[] = [];

        for (const item of current) {
            if (item.source !== source) {
                next.push(item);
                continue;
            }
            const updated = byKey.get(item.key);
            if (updated) {
                next.push(updated);
                byKey.delete(item.key);
            }
        }
        next.push(...byKey.values());

        const changed = next.length !== current.length
            || next.some((n, i) => n.key !== current[i].key
                || n.message !== current[i].message
                || n.detail?.value !== current[i].detail?.value);

        if (changed) {
            this.items$.next(next);   // unchanged polls don't emit, so nothing re-renders every 4 seconds
        }
    }

    public dismiss(key: string): void {
        this.dismissedAt.set(key, Date.now());
        this.items$.next(this.items$.value.filter(n => n.key !== key));
    }
}