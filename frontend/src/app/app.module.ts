import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { GameSelectionComponent } from './containers/game-selection/game-selection-container.component';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { LoginContainerComponent } from './containers/client/login/login-container.component';
import { WaitingContainerComponent } from './containers/client/waiting/waiting-container.component';
import { CommonModule } from '@angular/common';
import { PlayersContainerComponent } from './containers/host/players/players-container.component';
import { RoundProgressContainerComponent } from './containers/host/round-progress/round-progress-container.component';
import { GiftOpenContainerComponent } from './containers/client/gift-open/gift-open-container.component';

@NgModule({
  declarations: [
    AppComponent,
    GameSelectionComponent,
    PlayersContainerComponent,
    LoginContainerComponent,
    WaitingContainerComponent,
    RoundProgressContainerComponent,
    GiftOpenContainerComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    ReactiveFormsModule,
    BrowserModule,
    AppRoutingModule,
    MatIconModule
  ],
  providers: [HttpClient],
  bootstrap: [AppComponent]
})
export class AppModule { }
