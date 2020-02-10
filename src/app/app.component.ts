import { Component, OnInit } from '@angular/core';
import { MessagingService } from './service/messaging.service';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {
  constructor(private messaging: MessagingService) { }
  ngOnInit() {
    //this.msgService.getPermission();
    this.messaging.init();
  }

}
