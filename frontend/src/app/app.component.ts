import { Component } from '@angular/core';
import { ClientService } from './services/client.service';
import { distinctUntilChanged, filter, map, Observable, startWith } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent {
	title = 'gift_game_v2';
	userId = '';
	gameId = '';

	public isHostArea$!: Observable<boolean>;

	constructor(private router: Router) { }

	ngOnInit() {
		this.isHostArea$ = this.router.events.pipe(
			filter((event): event is NavigationEnd => event instanceof NavigationEnd),
			startWith(null),
			map(() => this.router.url.startsWith('/host')),
			distinctUntilChanged()
		);
	}
}
