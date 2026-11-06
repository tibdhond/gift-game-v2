import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-player-image',
    templateUrl: './player-image.component.html',
    styleUrls: ['./player-image.component.scss']
})
export class PlayerImageComponent {

    @Input() set avatarPath(avatarPath: string | null | undefined) {
        if (avatarPath) {
            this._avatarPath = avatarPath;
        }
        this.avatarAvailable = !!avatarPath;
    }

    @Input() enablePulse: boolean = false;

    @Output() onAvatarClicked: EventEmitter<void> = new EventEmitter();

    public _avatarPath: string | null = null;
    public avatarAvailable: boolean = true;


    public onAvatarLoadError(e: ErrorEvent): void {
        console.error(e);
        this.avatarAvailable = false;
    }

    public onClick(): void {
        this.onAvatarClicked.emit();
    }
}
