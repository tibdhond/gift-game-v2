import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RoundProgress } from '../entities/entities';
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

    public getRoundProgress(gameId: string): Observable<RoundProgress> {
        return this.get(`${gameId}/round/progress`);
    }
}
