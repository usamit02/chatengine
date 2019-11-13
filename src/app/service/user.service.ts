import { Injectable } from '@angular/core';
import { Store } from './store.service';
import { AngularFireAuth } from '@angular/fire/auth';
import { Subscription } from 'rxjs';
import { USER } from '../class';
@Injectable({ providedIn: 'root' })
export class UserService {
  get $() {
    return this.store.select(state => state.user);
  }
  constructor(private store: Store, private fireAuth: AngularFireAuth, ) { }
  mailLink(href: string) {//メールリンクログインでメーラーから飛んできた場合の処理
    if (this.fireAuth.auth.isSignInWithEmailLink(href)) {
      let email: string = localStorage.getItem('emailForSignIn');
      if (!email) {
        //email = prompt("メールアドレスを入力してください。");
        email = "usamit02@gmail.com"; console.log("mailaddress empty in localstrage!");
      }
      this.fireAuth.auth.signInWithEmailLink(email, href).then(res => {
        console.log("maillinklogin success:" + href + "\r\nname:" + res.user.displayName + "\r\nemail:" + res.user.email);
      }).catch(err => {
        alert("メールログインに失敗しました。\r\n" + err.message);
      }).finally(() => {
        localStorage.removeItem('emailForSignIn');
      })
    }
  }
  login(): Subscription {
    return this.fireAuth.user.subscribe(user => {
      if (user && user.uid) {
        this.fireAuth.auth.currentUser.getIdToken().then(token => {
          this.store.update(state => ({
            ...state, user: { id: user.uid, na: user.displayName, avatar: user.photoURL, token: token },
          }))
        });
      } else {
        this.store.update(state => ({
          ...state, user: USER
        }))
      }
    })
  }
  logout() {
    this.fireAuth.auth.signOut();
  }
}
