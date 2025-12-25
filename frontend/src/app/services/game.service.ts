import { Component, inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GameCreationResult, PlayersResult } from '../entities/entities';
import { UtilService } from './util.service';

@Injectable({ providedIn: 'root' })
export class GameService {
    private utilService: UtilService = inject(UtilService);

    constructor(protected http: HttpClient) { }
    private apiUrl: string = '/api';

    private get apiUrl$(): Observable<string> {
        return this.utilService.getIp()
    }

    protected post<T>(url: string, body: any, headers: HttpHeaders = new HttpHeaders()): Observable<T> {
        return this.http.post<T>(`${this.apiUrl}/${url}`, body, { headers });
    }

    protected get<T>(url: string, headers: HttpHeaders = new HttpHeaders()): Observable<T> {
        return this.http.get<T>(`${this.apiUrl}/${url}`, { headers });
    }

    protected delete<T>(url: string, headers: HttpHeaders = new HttpHeaders()): Observable<T> {
        return this.http.delete<T>(`${this.apiUrl}/${url}`, { headers });
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
}
