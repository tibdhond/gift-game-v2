import { Component, HostBinding, Input } from "@angular/core";

@Component({
    selector: 'app-tag-card',
    template: '<ng-content></ng-content>',
    styleUrls: ['./tag-card.component.scss'],
})
export class TagCardComponent {
    /** Colour of the bottom border. Default: gold. */
    @Input() @HostBinding('style.--tag-accent') accent?: string;

    /** Colour of the pin at the top. Default: translucent white. */
    @Input() @HostBinding('style.--tag-pin') pinColor?: string;
}