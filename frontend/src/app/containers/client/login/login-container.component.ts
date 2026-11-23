import { Component, OnDestroy, OnInit } from '@angular/core';
import { catchError, EMPTY, exhaustMap, filter, finalize, Observable, of, Subscription, switchMap, take, takeUntil, takeWhile, tap, timer, withLatestFrom } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { BaseGameContainer } from '../../base-game-container.component';
import { FormControl, Validators } from '@angular/forms';
import { ClientService } from '../../../services/client.service';
import { LocalStorageService } from '../../../services/localstorage.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Claim } from 'src/app/entities/entities';

const CLAIM_POLL_MS: number = 5000;
type LoginStage = "form" | "confirm" | "waiting" | "denied" | "expired";
type PollResult = Claim | "gone" | "error";

@Component({
    selector: 'login-container',
    templateUrl: './login-container.component.html',
    styleUrls: ['./login-container.component.scss']
})
export class LoginContainerComponent extends BaseGameContainer implements OnInit, OnDestroy {

    public loginControl: FormControl = new FormControl(null, Validators.required);
    public claimError?: string;
    public loginStage: LoginStage = "form"
    public busy: boolean = false;
    public takenName?: string;
    public claim?: Claim;
    public redeemError: boolean = false;

    public pollSub?: Subscription;

    constructor(
        protected override route: ActivatedRoute,
        private clientService: ClientService,
        private router: Router,
        private localStorageService: LocalStorageService
    ) {
        super(route);
    }

    public override ngOnInit(): void {
        super.ngOnInit();
        this.resumeClaim();
    }

    public override ngOnDestroy(): void {
        this.stopPolling();
        super.ngOnDestroy();
    }

    private resumeClaim(): void {
        this.gameId$.pipe(
            switchMap(gameId => this.clientService.getClaim(gameId)),
            withLatestFrom(this.gameId$),
            catchError(() => EMPTY),
            take(1),
            takeUntil(this.destroy$)
        ).subscribe(([claim, gameId]) => {
            this.claim = claim;
            if (claim.state === 'PENDING') {
                this.loginStage = 'waiting';
                this.startPolling(gameId);
            } else if (claim.state === 'APPROVED') {
                this.loginStage = 'waiting';
                this.redeem();
            }
        });
    }

    public onLogin(): void {
        if (this.loginControl.valid) {
            const name: string | undefined = this.loginControl.value?.trim()

            if (!name || this.busy) {
                return;
            }

            this.busy = true;
            this.gameId$.pipe(
                switchMap(gameId => this.clientService.login(gameId, this.loginControl.value?.trim())),
                switchMap(() => this.gameId$),
                take(1),
                catchError((e: HttpErrorResponse) => {
                    if (e.status === 409) {
                        this.claimError = undefined;
                        this.loginStage = "confirm";
                        this.takenName = name;
                    } else {
                        console.error(e);
                    }
                    return EMPTY
                }),
                finalize(() => this.busy = false),
                takeUntil(this.destroy$)
            ).subscribe((gameId) => {
                this.resolveLogin(gameId);
            })
        }
    }


    private resolveLogin(gameId: string): void {
        this.router.navigate(['client', gameId, 'waiting']);
    }

    public onConfirmClaim(): void {
        if (this.busy || !this.takenName) {
            return;
        }

        this.busy = true;
        this.gameId$.pipe(
            switchMap(gameId => this.clientService.makeClaim(gameId, this.takenName!)),
            withLatestFrom(this.gameId$),
            catchError((e: HttpErrorResponse) => {
                this.claimError = e.status === 409 ? 'Er is al een verzoek voor deze naam. Informeer bij de host of probeer het later opnieuw.'
                    : 'Er ging iets mis. Probeer later opnieuw.';
                return EMPTY
            }),
            take(1),
            finalize(() => this.busy = false)
        ).subscribe(([claim, gameId]) => {
            this.claim = claim;
            this.loginStage = "waiting";
            this.startPolling(gameId)
        })
    }

    private startPolling(gameId: string): void {
        this.stopPolling();

        this.pollSub = timer(0, CLAIM_POLL_MS).pipe(
            exhaustMap(() => this.clientService.getClaim(gameId).pipe(
                catchError((error: HttpErrorResponse) => of<PollResult>((error.status === 404 || error.status === 401) ? 'gone' : 'error'))
            )),
            takeWhile(result => result === 'error' || (result !== 'gone' && result.state === 'PENDING'), true),
            takeUntil(this.destroy$)
        ).subscribe(result => this.onPollResult(result));
    }

    private stopPolling(): void {
        this.pollSub?.unsubscribe();
        this.pollSub = undefined;
    }

    private onPollResult(result: PollResult): void {
        if (result == "error") {
            return;
        }
        if (result === "gone") {
            this.loginStage = "expired";
            return;
        }

        this.claim = result;
        switch (result.state) {
            case "APPROVED":
                this.redeem();
                break;
            case "DENIED":
                this.loginStage = "denied";
                break;
            case "REDEEMED":
                this.loginStage = "form";
                break;
        }
    }

    private redeem(): void {
        if (!this.claim) {
            return;
        }

        this.redeemError = false;
        this.gameId$.pipe(
            switchMap(gameId => this.clientService.redeemClaim(gameId)),
            switchMap(() => this.gameId$),
            catchError((e: HttpErrorResponse) => {
                this.redeemError = true;
                return EMPTY;
            }),
            take(1),
            takeUntil(this.destroy$)
        ).subscribe(gameId => {
            this.resolveLogin(gameId);
        })
    }

    public onRetryRedeem(): void {
        this.redeem();
    }

    public onCancelClaim(): void {
        this.stopPolling();
        this.claim = undefined;
        this.loginStage = "form";
    }

    public onTryAgain(): void {
        this.claim = undefined;
        this.loginStage = "form";
    }

    onChooseOtherName(): void {
        this.loginStage = 'form';   // loginControl keeps its value, so the player can adjust the name
        this.claimError = undefined;
    }

    get accent(): string | undefined {
        switch (this.loginStage) {
            case 'confirm':
            case 'waiting': return '#d9a441';
            case 'denied':
            case 'expired': return '#d6504f';
            default: return undefined;
        }
    }
}
