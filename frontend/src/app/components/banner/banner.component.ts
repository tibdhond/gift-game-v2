import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { ClientService } from '../../services/client.service';
import { MessageService } from '../../services/message.service';
import { BaseGameContainer } from 'src/app/containers/base-game-container.component';
import { ActivatedRoute } from '@angular/router';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-banner',
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.scss']
})
export class BannerComponent extends BaseGameContainer {
  @Input() title: string = 'Gift Game';
  @Input() avatarUrl: string = 'assets/icons/person.png';

  @ViewChild('fileInput') fileInput!: ElementRef;

  constructor(
    private client: ClientService,
    private message: MessageService,
    protected override route: ActivatedRoute
  ) {
    super(route);
  }

  triggerUpload() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.message.show('Uploading...', 'loading');

    combineLatest([this.client.])

    this.client.uploadAvatar(this.gameId, this.userId, file).subscribe({
      next: (res: any) => {
        this.message.show('Avatar succesvol geüp-load', 'success');
      },
      error: (err: any) => {
        const msg = err.error?.msg || 'Er is iets misgegaan bij het uploaden';
        this.message.show(msg, 'error');
      }
    });

    event.target.value = '';
  }
}
