import { NgModule } from "@angular/core";
import { ConfirmDialogComponent } from "./confirm/confirm.dialog.component";
import { CommonModule } from "@angular/common";
import { MatDialogModule } from "@angular/material/dialog";


@NgModule({
  declarations: [
    ConfirmDialogComponent
  ],
  imports: [
    CommonModule,
    MatDialogModule
  ],
  providers: [],
  bootstrap: []
})
export class DialogModule { }
