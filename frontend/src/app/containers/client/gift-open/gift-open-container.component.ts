import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { switchMap, take, takeUntil } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { BaseGameContainer } from '../../base-game-container.component';
import { FormControl, Validators } from '@angular/forms';
import { ClientService } from 'src/app/services/client.service';
import { heicTo, isHeic } from 'heic-to';

@Component({
    selector: 'gift-open-container',
    templateUrl: './gift-open-container.component.html',
    styleUrls: ['./gift-open-container.component.scss']
})
export class GiftOpenContainerComponent extends BaseGameContainer implements OnDestroy {
    public giftController: FormControl = new FormControl(null, [Validators.required]);

    public previewUrl: string | null = null;
    public interacted: boolean = false;
    public selectedFile: File | null = null;

    public imageLoading: boolean = false;

    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

    constructor(
        protected override route: ActivatedRoute,
        private clientService: ClientService,
        private router: Router
    ) {
        super(route);
    }

    public override ngOnDestroy(): void {
        if (this.previewUrl) {
            URL.revokeObjectURL(this.previewUrl);
        }
    }

    public onGiftAdd(): void {
        if (this.giftController.valid) {
            this.gameId$.pipe(
                switchMap(gameId => this.clientService.openGift(gameId, this.giftController.value, this.selectedFile)),
                switchMap(() => this.gameId$),
                take(1),
                takeUntil(this.destroy$)
            ).subscribe(gameId => {
                this.router.navigate(['client', gameId, 'vote']);
            });
        }
    }

    public onPhotoClick(): void {
        this.interacted = true;
        this.fileInput.nativeElement.click();
    }

    public async onFileSelected(event: Event): Promise<void> {
        this.imageLoading = true;
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) {
            return;
        }

        if (this.previewUrl) {
            URL.revokeObjectURL(this.previewUrl);   // release the previous preview before creating a new one
        }
        this.selectedFile = file;
        this.previewUrl = await this.getPreviewUrl(file);
        input.value = '';   // lets the player pick the same file again later and still get a change event
        this.imageLoading = false;
    }

    public async getPreviewUrl(file: File): Promise<string> {
        const isHeicImage: boolean = await isHeic(file);

        if (isHeicImage) {
            const blob: Blob = await heicTo({
                blob: file,
                type: "image/jpeg",
                quality: 0.5
            });

            return URL.createObjectURL(blob);
        }

        return URL.createObjectURL(file);
    }

}
