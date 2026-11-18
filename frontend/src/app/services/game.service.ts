import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { GameCreationResult, PlayersResult } from '../entities/entities';

@Injectable({ providedIn: 'root' })
export class GameService {

    constructor(protected http: HttpClient) { }
    private apiUrl: string = '/api';

    protected post<T>(url: string, body: any, headers: HttpHeaders = new HttpHeaders()): Observable<T> {
        return this.http.post<T>(`${this.apiUrl}/${url}`, body, { headers });
    }

    protected get<T>(url: string, headers: HttpHeaders = new HttpHeaders(), context?: HttpContext): Observable<T> {
        return this.http.get<T>(`${this.apiUrl}/${url}`, { headers, context });
    }

    protected getBlob(url: string, headers: HttpHeaders = new HttpHeaders()) {
        return this.http.get(`${this.apiUrl}/${url}`, { headers, responseType: 'blob' });
    }

    protected delete<T>(url: string, headers: HttpHeaders = new HttpHeaders()): Observable<T> {
        return this.http.delete<T>(`${this.apiUrl}/${url}`, { headers });
    }

    protected head<T>(url: string, headers: HttpHeaders = new HttpHeaders()): Observable<T> {
        return this.http.head<T>(`${this.apiUrl}/${url}`, { headers })
    }

    public startNewGame(): Observable<GameCreationResult> {
        return this.post(`new-game`, {});
    }

    public getPlayers(gameId: string, filtered?: boolean): Observable<PlayersResult> {
        let url: string = `${gameId}/players`;
        if (filtered) {
            url += '?filtered=true';
        }
        return this.get(url);
    }

    public isValidGame(gameId: string): Observable<boolean> {
        return this.head(gameId).pipe(
            map(() => true), // return 200 if the game exists or 404 if it doesn't, which throws an error
            catchError(() => of(false))
        );
    }
}
