import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/database';
import { AngularFireAuth } from '@angular/fire/auth';
import { BehaviorSubject } from 'rxjs';
import * as firebase from 'firebase';
import 'firebase/messaging';

@Injectable({
  providedIn: 'root',
})
export class MessagingService {
  messaging = firebase.messaging();
  currentMessage = new BehaviorSubject(null);
  constructor(private db: AngularFireDatabase, private afAuth: AngularFireAuth) {
    // Add the public key generated from the console here.
    this.messaging.usePublicVapidKey(
      'BJ1mTbdu3wUjcNb_itFbupqqnmezzn5u407BSAH5koV7urFTkZ-ggf3FTmhRMYyPdoeiE85MNu4NsaTEbHKbS-A' // <- ここに、上記で生成した鍵ペアを貼りつけてください
    );
  }
  updateToken(token) {
    this.afAuth.authState.subscribe((user) => {
      if (!user) {
        return;
      }

      const data = { [user.uid]: token };
      this.db.object('fcmTokens/').update(data);
    });
  }
  getPermission() {
    this.messaging.requestPermission().then(() => {
      console.log('Notification permission granted.');
      return this.messaging.getToken();
    }).then((token) => {
      console.log(token);
      this.updateToken(token);
    }).catch((err) => {
      console.log('Unable to get permission to notify.', err);
    });
  }
  receiveMessage() {
    this.messaging.onMessage((payload) => {
      console.log('Message received. ', payload);
      this.currentMessage.next(payload);
    });
  }
}