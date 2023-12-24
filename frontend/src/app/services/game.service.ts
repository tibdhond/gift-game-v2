import { Component, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GameCreationResult } from '../entities/entities';

@Injectable({ providedIn: 'root' })
export class GameService {
    constructor(protected http: HttpClient) { }
    private apiUrl: string = 'http://localhost:5000/api';

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
}
