import { NgModule } from "@angular/core";
import { VoteConfirmDialogComponent } from "./confirm/confirm.dialog.component";
import { CommonModule } from "@angular/common";
import { MatDialogModule } from "@angular/material/dialog";


@NgModule({
  declarations: [
    VoteConfirmDialogComponent
  ],
  imports: [
    CommonModule,
    MatDialogModule
  ],
  providers: [],
  bootstrap: []
})
export class DialogModule { }
