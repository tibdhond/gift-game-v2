import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GameService } from './game.service';
import { Observable } from 'rxjs';
import { LoginResult, UserPhaseResult } from '../entities/entities';

@Injectable({ providedIn: 'root' })
export class ClientService extends GameService {
    constructor(protected override http: HttpClient) {
        super(http);
    }

    public login(gameId: string, name: string): Observable<LoginResult> {
        return this.post(`${gameId}/login`, { name });
    }

    public getUserPhase(gameId: string, userId: string): Observable<UserPhaseResult> {
        return this.get(`${gameId}/players/${userId}/phase`);
    }

    public addGift(gameId: string, description: string, userId: string): Observable<void> {
        return this.post(`${gameId}/gifts`, { description, user_id: userId });
    }
}
