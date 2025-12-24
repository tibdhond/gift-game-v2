import { Component, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { GameService } from './game.service';

@Injectable({ providedIn: 'root' })
export class UtilService extends GameService {
    constructor(protected override http: HttpClient) {
        super(http);
    }

    public getIp(): Observable<string> {
        return this.get(`ip`);
    }
}
