import { Component, Input } from "@angular/core";

export interface RestEntry {
    key: string;
    name: string;
    avatarPath?: string;
    stat: string;   // already formatted, e.g. "12%" or "3 correcte stemmen"
}

@Component({
    selector: 'app-player-rest-list',
    templateUrl: './player-rest-list.component.html',
    styleUrls: ['./player-rest-list.component.scss'],
})
export class PlayerRestListComponent {
    @Input() entries: RestEntry[] = [];
    /** Seconds before the list fades in; pages pass the podium's endDelay. */
    @Input() delay = 0;

    trackEntry = (_: number, entry: RestEntry) => entry.key;
}