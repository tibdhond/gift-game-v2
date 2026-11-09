import { Component, Input } from "@angular/core";
import { PodiumSlot } from "src/app/entities/entities";

const RISE_DURATION = 0.9; // keep in sync with the `rise` animation

@Component({
    selector: 'app-podium',
    templateUrl: './podium.component.html',
    styleUrls: ['./podium.component.scss'],
})
export class PodiumComponent {
    @Input() slots: PodiumSlot[] = [];

    /** Seconds until the last step has landed; pages use it to delay what comes after. */
    get endDelay(): number {
        return Math.max(0, ...this.slots.map(slot => slot.delay)) + RISE_DURATION;
    }

    trackSlot = (_: number, slot: PodiumSlot) => slot.key;
}