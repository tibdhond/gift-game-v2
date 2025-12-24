import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { GameResult, RoundProgress, RoundResult } from '../entities/entities';
import { GameService } from './game.service';

@Injectable({ providedIn: 'root' })
export class HostService extends GameService {
    constructor(protected override http: HttpClient) {
        super(http);
    }

    public deletePlayer(gameId: string, playerId: string): Observable<void> {
        return this.delete(`${gameId}/players/${playerId}`);
    }

    public newRound(gameId: string): Observable<void> {
        return this.post(`${gameId}/round`, {});
    }

    public assignGift(gameId: string): Observable<boolean> {
        return this.post<{ result: boolean }>(`${gameId}/round/assign`, {}).pipe(
            map(result => result.result)
        );
    }

    public getRoundProgress(gameId: string): Observable<RoundProgress> {
        return this.get(`${gameId}/round/progress`);
    }

    public resetRound(gameId: string): Observable<void> {
        return this.post(`${gameId}/round/reset`, {});
    }

    public roundResult(gameId: string): Observable<RoundResult> {
        return this.get(`${gameId}/round/result`);
    }

    public gameResults(gameId: string): Observable<GameResult[]> {
        return this.get(`${gameId}/result`)
    }
}
