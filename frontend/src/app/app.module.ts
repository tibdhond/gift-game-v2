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
import { VoteContainerComponent } from './containers/client/vote/vote-container.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { QRCodeModule } from 'angularx-qrcode';
import { RoundResultContainerComponent } from './containers/host/round-result/round-result-container.component';
import { ToPercentPipe } from './pipes/to-percent.pipe';
import { FinalResultContainerComponent } from './containers/host/final-results/final-results-container.component';
import { PersonalResultsContainerComponent } from './containers/client/personal-results/personal-results-container.component';

@NgModule({
  declarations: [
    AppComponent,
    GameSelectionComponent,
    PlayersContainerComponent,
    LoginContainerComponent,
    WaitingContainerComponent,
    RoundProgressContainerComponent,
    GiftOpenContainerComponent,
    VoteContainerComponent,
    RoundResultContainerComponent,
    FinalResultContainerComponent,
    PersonalResultsContainerComponent,
    ToPercentPipe
  ],
  imports: [
    CommonModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ReactiveFormsModule,
    BrowserModule,
    AppRoutingModule,
    MatIconModule,
    QRCodeModule
  ],
  providers: [HttpClient],
  bootstrap: [AppComponent]
})
export class AppModule { }
