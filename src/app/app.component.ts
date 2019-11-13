import { Component, OnInit } from '@angular/core';

import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { MessagingService } from './service/messaging.service';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {
  message;
  constructor(
    private platform: Platform, private splashScreen: SplashScreen, private statusBar: StatusBar, private msgService: MessagingService
  ) {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }

  ngOnInit() {
    this.msgService.getPermission();
    this.msgService.receiveMessage();
    this.message = this.msgService.currentMessage;
  }

}
