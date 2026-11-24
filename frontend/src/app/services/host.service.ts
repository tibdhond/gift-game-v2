import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Claim, ClaimState, GameCreationResult, GameResult, RoundProgress, RoundResult } from '../entities/entities';
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

    public getroundResult(gameId: string): Observable<RoundResult> {
        return this.get(`${gameId}/round/result`);
    }

    public getGameResults(gameId: string): Observable<GameResult[]> {
        return this.get(`${gameId}/result`)
    }

    public getHostToken(gameId: string): Observable<GameCreationResult> {
        return this.get(`${gameId}/token`);
    }

    public getClaims(gameId: string): Observable<Claim[]> {
        return this.get<{ claims: Claim[] }>(`${gameId}/claims`).pipe(map(claimResult => claimResult.claims));
    }

    public resolveClaim(gameId: string, claimdId: string, claimState: ClaimState): Observable<Claim> {
        return this.post(`${gameId}/claims/${claimdId}/resolve`, { claimState });
    }
}
