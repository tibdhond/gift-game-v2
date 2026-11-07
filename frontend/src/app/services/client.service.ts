import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GameService } from './game.service';
import { map, Observable, of, tap } from 'rxjs';
import { LoginResult, PersonalResult, UserInfoResult, UserPhaseResult } from '../entities/entities';

@Injectable({ providedIn: 'root' })
export class ClientService extends GameService {
    private userInfo$: Observable<UserInfoResult> | undefined;
    constructor(protected override http: HttpClient) {
        super(http);
    }

    public login(gameId: string, name: string): Observable<LoginResult> {
        return this.post(`${gameId}/login`, { name });
    }

    public getUserInfo(gameId: string, userId: string): Observable<UserInfoResult> {
        return this.userInfo$ ?? this.get<UserInfoResult>(`${gameId}/players/${userId}`).pipe(
            tap(userInfo => {
                this.userInfo$ = of(userInfo);
            })
        );
    }

    public getUserPhase(gameId: string, userId: string): Observable<UserPhaseResult> {
        return this.get(`${gameId}/players/${userId}/phase`);
    }

    public getAvatar(gameId: string, userId: string): Observable<Blob> {
        return this.getBlob(`${gameId}/players/${userId}/avatar`);
    }

    public uploadAvatar(gameId: string, userId: string, file: File): Observable<any> {
        const formData = new FormData();
        formData.append('avatar', file);
        return this.post(`${gameId}/players/${userId}/avatar`, formData).pipe(
            tap(() => {
                this.userInfo$ = undefined;
            })
        );
    }

    public addGift(gameId: string, description: string, userId: string): Observable<void> {
        return this.post(`${gameId}/gifts`, { description, user_id: userId });
    }

    public vote(gameId: string, userId: string, targetId: string): Observable<void> {
        return this.post(`${gameId}/vote`, { voter_id: userId, target_id: targetId });
    }

    public getPersonalResult(game_id: string, userId: string): Observable<PersonalResult> {
        return this.get(`${game_id}/players/${userId}/result`);
    }
}