import { Component, OnInit, OnDestroy } from '@angular/core';
import { MessageService, AppMessage } from '../../services/message.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-message-display',
  templateUrl: './message-display.component.html',
  styleUrls: ['./message-display.component.css']
})
export class MessageDisplayComponent implements OnInit, OnDestroy {
  currentMessage: AppMessage | null = null;
  private messageSub!: Subscription;

  constructor(private messageService: MessageService) {}

  ngOnInit() {
    this.messageSub = this.messageService.message$.subscribe(msg => {
      this.currentMessage = msg;
      
      // Auto-clear success or error messages after a delay
      if (msg.type === 'success' || msg.type === 'error') {
        setTimeout(() => {
          this.currentMessage = null;
        }, 3000);
      }
    });
  }

  ngOnDestroy() {
    if (this.messageSub) {
      this.messageSub.unsubscribe();
    }
  }
}
