import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { GameService } from './game.service';
import { map, Observable, of, tap } from 'rxjs';
import { Claim, PersonalResult, UserInfoResult, UserPhaseResult } from '../entities/entities';
import { SKIP_AUTH_REDIRECT } from '../injectors/token.interceptor';

@Injectable({ providedIn: 'root' })
export class ClientService extends GameService {
    private userInfo$: Observable<UserInfoResult> | undefined;
    constructor(protected override http: HttpClient) {
        super(http);
    }

    // #region Auth

    public login(gameId: string, name: string): Observable<UserInfoResult> {
        return this.post(`${gameId}/login`, { name });
    }

    public logout(gameId: string): Observable<boolean> {
        return this.post(`${gameId}/logout`, {}).pipe(map(() => true));
    }

    public getClaim(gameId: string): Observable<Claim> {
        return this.get(`${gameId}/claims/me`, new HttpHeaders(), new HttpContext().set(SKIP_AUTH_REDIRECT, true));
    }

    public makeClaim(gameId: string, name: string): Observable<Claim> {
        return this.post(`${gameId}/claims`, { name });
    }

    public redeemClaim(gameId: string): Observable<UserInfoResult> {
        return this.post(`${gameId}/claims/me/redeem`, {});
    }

    // #endregion

    // #region Users
    public getUserInfo(gameId: string, skipAuthRedirect: boolean = false): Observable<UserInfoResult> {
        return this.userInfo$ ?? this.get<UserInfoResult>(`${gameId}/players/me`, new HttpHeaders(), new HttpContext().set(SKIP_AUTH_REDIRECT, skipAuthRedirect)).pipe(
            tap(userInfo => {
                this.userInfo$ = of(userInfo);
            })
        );
    }

    public getUserPhase(gameId: string, skipAuthRedirect: boolean = false): Observable<UserPhaseResult> {
        return this.get(`${gameId}/players/me/phase`, new HttpHeaders(), new HttpContext().set(SKIP_AUTH_REDIRECT, skipAuthRedirect));
    }

    public getAvatar(gameId: string): Observable<Blob> {
        return this.getBlob(`${gameId}/players/me/avatar`);
    }

    public uploadAvatar(gameId: string, file: File): Observable<any> {
        const formData = new FormData();
        formData.append('avatar', file);
        return this.post(`${gameId}/players/me/avatar`, formData).pipe(
            tap(() => {
                this.userInfo$ = undefined;
            })
        );
    }

    public getPersonalResult(gameId: string): Observable<PersonalResult> {
        return this.get(`${gameId}/players/me/result`);
    }

    // #endregion


    // #region Other
    public addGift(gameId: string, description: string): Observable<void> {
        return this.post(`${gameId}/gifts`, { description });
    }

    public vote(gameId: string, targetId: string): Observable<void> {
        return this.post(`${gameId}/vote`, { target_id: targetId });
    }

    // #endregion
}