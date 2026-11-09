import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { MessageService, AppMessage } from '../../services/message.service';
import { BehaviorSubject, Subscription } from 'rxjs';

@Component({
  selector: 'app-message-display',
  templateUrl: './message-display.component.html',
  styleUrls: ['./message-display.component.css']
})
export class MessageDisplayComponent implements OnInit, OnDestroy {
  currentMessage$: BehaviorSubject<AppMessage | null> = new BehaviorSubject<AppMessage | null>(null);
  private messageSub!: Subscription;

  constructor(private messageService: MessageService) { }

  ngOnInit() {
    this.messageSub = this.messageService.message$.subscribe(msg => {
      this.currentMessage$.next(msg);

      setTimeout(() => {
        this.currentMessage$.next(null);
      }, 5000);
    });
  }

  ngOnDestroy() {
    if (this.messageSub) {
      this.messageSub.unsubscribe();
      this.currentMessage$.complete();
    }
  }
}
