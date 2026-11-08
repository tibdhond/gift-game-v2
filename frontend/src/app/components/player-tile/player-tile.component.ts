import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-player-tile',
    templateUrl: './player-tile.component.html',
    styleUrls: ['./player-tile.component.scss']
})
export class PlayerTileComponent {
    @Input() avatarPath?: string;
    @Input() isProcessing: boolean = false;
    @Input() highlight: boolean = false;
    @Input() badge: boolean = false;
    @Input() badgeMessage: string = "";
    @Input() name: string = "";
    @Input() deleteIcon: boolean = false;
    @Input() infoText?: string;
    @Input() clickable: boolean = false

    @Output() onTileClicked: EventEmitter<void> = new EventEmitter();
    @Output() onDeleteClicked: EventEmitter<void> = new EventEmitter();


    public onClick(): void {
        this.onTileClicked.emit();
    }

    public onDeleteClick(): void {
        this.onDeleteClicked.emit();
    }
}
