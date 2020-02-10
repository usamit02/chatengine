import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../service/user.Service';
import { Subscription } from 'rxjs';
import { AngularFireDatabase } from '@angular/fire/database';
import { MessagingService } from '../service/messaging.service';
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  userSb: Subscription;
  users = [];
  constructor(private router: Router, public user: UserService, private db: AngularFireDatabase,
    private messaging: MessagingService, ) { }
  ngOnInit() {
    this.userSb = this.user.login();
    this.db.database.ref(`fcmTokens`).once('value').then(snap => {
      snap.forEach(doc => {
        this.users.push({ id: doc.key });
      });
    });
  }
  push(self, user) {
    this.db.database.ref(`chat/${self.id}`).push({ uid: user.id });
  }
  permission() {
    this.messaging.getPermission();
  }
  login() {
    this.router.navigate(["login"]);
  }
  logout() {
    this.user.logout();
  }
  ngOnDestroy() {
    this.userSb.unsubscribe();
  }
}
