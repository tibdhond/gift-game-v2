import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface VoteConfirmDialogData {
  currentPlayer: string;
  voteTarget: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm.dialog.component.html',
  styleUrls: ['./confirm.dialog.component.scss']
})
export class VoteConfirmDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<VoteConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VoteConfirmDialogData
  ) { }

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}