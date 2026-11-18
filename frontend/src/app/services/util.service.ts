import { Component, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';

import { GameService } from './game.service';

@Injectable({ providedIn: 'root' })
export class UtilService extends GameService {
    private ip$?: Observable<string>;
    constructor(protected override http: HttpClient) {
        super(http);
    }

    public getIp(): Observable<string> {
        return this.ip$ ?? this.get<string>(`ip`).pipe(
            tap(ip => this.ip$ = of(ip))
        );
    }
}
