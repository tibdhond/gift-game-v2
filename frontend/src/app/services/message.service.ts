import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type MessageType = 'success' | 'error' | 'info' | 'loading';

export interface AppMessage {
  type: MessageType;
  text: string;
}

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private messageSubject = new Subject<AppMessage>();
  message$ = this.messageSubject.asObservable();

  show(text: string, type: MessageType = 'info') {
    this.messageSubject.next({ type, text });
  }

  clear() {
    this.messageSubject.next({ type: 'info', text: '' });
  }
}
