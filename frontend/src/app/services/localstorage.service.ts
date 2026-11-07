import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';


@Injectable({
    providedIn: 'root',
})
export class LocalStorageService {
    private userIdRefreshed$: BehaviorSubject<boolean> = new BehaviorSubject(true);

    public getUserId(): Observable<string | null> {
        return this.userIdRefreshed$.pipe(
            map(() => localStorage.getItem("userId"))
        );
    }

    public setUserId(userId: string): void {
        localStorage.setItem('userId', userId);
        this.userIdRefreshed$.next(true);
    }
}
