import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/database';
import { AngularFireAuth } from '@angular/fire/auth';
import * as firebase from 'firebase';
import 'firebase/messaging';

@Injectable({
  providedIn: 'root',
})
export class MessagingService {
  private messaging = firebase.messaging();
  constructor(private db: AngularFireDatabase, private afAuth: AngularFireAuth) {

  }
  private updateToken(token) {
    this.afAuth.authState.subscribe((user) => {
      if (user) {
        this.db.object('fcmTokens/').update({ [user.uid]: token });
      }
    });
  }
  getPermission() {
    Notification.requestPermission().then(permission => {
      if (permission === 'default' || permission === 'granted') {
        this.messaging.getToken().then(token => {
          this.updateToken(token);
        });
      } else if (permission === 'denied') {
        alert(`通知はブロックに設定されています。ブロックを解除してから再操作してください。`);
      } else {
        throw new Error('permisson undefined');
      }
    }).catch((err) => {
      alert(`通知パーミッションの取得に失敗しました。${err}`);
    });
  }
  init() {
    this.messaging.usePublicVapidKey('BORvt0d053IW4RTBKtUgxtDqDc0sClk4P-fsLf4zRk_oSRCdoAThlmeKwLdzSLASfGlIb6jqCzfRKEWKXAyKBjU');
    this.messaging.onMessage(payload => {
      console.log('メッセージング受信');
      const title = 'セクシャルレポート';
      const options = {
        body: payload.body,
        icon: payload.icon
      };
      const notification = new Notification(title, options);
    });
    this.messaging.onTokenRefresh(() => {
      this.messaging.getToken().then(token => {
        this.updateToken(token);
      });
    });
  }
}