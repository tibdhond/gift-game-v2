import { Component, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { HostClaimNotifier } from "src/app/services/host-claim-notifier.service";

@Component({
    selector: 'host-shell',
    template: '<router-outlet></router-outlet>',
})
export class HostShellComponent implements OnInit, OnDestroy {
    constructor(private route: ActivatedRoute, private claimNotifier: HostClaimNotifier) { }

    ngOnInit(): void {
        // The shell sits on the :gameId route, so the param is on its own route
        const gameId = this.route.snapshot.paramMap.get('gameId');
        if (gameId) {
            this.claimNotifier.start(gameId);
        }
    }

    ngOnDestroy(): void {
        this.claimNotifier.stop();
    }
}