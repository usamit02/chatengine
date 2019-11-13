import { Component, OnInit, OnDestroy } from '@angular/core';
import * as firebase from 'firebase';
import { AngularFireAuth } from '@angular/fire/auth';
import { UiService } from '../service/ui.service';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../service/user.Service';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WindowService } from '../service/window'
import { FormControl, FormBuilder, Validators } from '@angular/forms';
import { AlertController } from '@ionic/angular';
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit, OnDestroy {
  email = new FormControl("", [Validators.email, Validators.required]);
  phone = new FormControl("", [Validators.pattern(/^(([0-9]{2,4}-[0-9]{2,4}-[0-9]{3,4})|([0-9]{9,11}))$/), Validators.required]);
  mailForm = this.builder.group({
    email: this.email,
  });
  phoneForm = this.builder.group({
    phone: this.phone,
  });
  userSb: Subscription;
  windowRef;
  recaptchaWidgetId;
  recaptchaOK: boolean = false;
  private onDestroy$ = new Subject();
  constructor(private fireAuth: AngularFireAuth, private ui: UiService, private location: Location, private user: UserService,
    private router: Router, private window: WindowService, private builder: FormBuilder, private alert: AlertController, ) { }
  ngOnInit() {
    if (location.search) {
      this.user.mailLink(location.href);
      this.userSb = this.user.login();
    }
    this.user.$.pipe(takeUntil(this.onDestroy$)).subscribe(user => {
      if (user.id) {
        this.ui.pop(`ようこそ${user.na}さん`);
        if (this.userSb) {
          this.userSb.unsubscribe();
          //this.router.navigate(['home']);
        } else {
          //this.location.back();
        }
      }
    });
    this.windowRef = this.window.windowRef;
    this.windowRef.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
      callback: responseToken => {
        this.recaptchaOK = true;
      }
    });
    this.windowRef.recaptchaVerifier.render().then(res => {
      this.recaptchaWidgetId = res;
    });
  }
  login(button: string) {
    if (button === "phone") {
      let phone: string = this.phone.value;
      phone = "+81" + phone.replace(/-/g, "").slice(1);
      this.fireAuth.auth.signInWithPhoneNumber(phone, this.windowRef.recaptchaVerifier).then(result => {
        this.windowRef.confirmationResult = result;
        this.verifySmsCode();
      }).catch(err => {
        this.windowRef.grecaptcha.reset(this.recaptchaWidgetId);
        this.ui.alert("SMSメッセージの発行に失敗しました。\r\n" + err.toString());
      });
    } else if (button === "email") {
      this.fireAuth.auth.sendSignInLinkToEmail(this.email.value, { url: location.href, handleCodeInApp: true }).then(() => {
        localStorage.setItem('emailForSignIn', this.email.value);
        this.ui.alert("ログイン用メールを送信しました。\r\nメール内のリンクをクリックしてログインしてください。");
      }).catch(err => {
        let msg: string;
        switch (err.code) {
          case "auth/invalid-email":
            msg = "メールアドレスの形式が正しくありません。"; break;
          case "auth/email-already-in-use":
            msg = "このメールアドレスは既に使用されています。別のメールアドレスを入力してください。"; break;
          default:
            msg = "登録に失敗しました。\r\n" + err.toString();
        }
        this.ui.alert(msg);
      });
    } else if (button === "anonymous") {
      this.fireAuth.auth.signInAnonymously().catch(err => {
        this.ui.alert("匿名認証に失敗しました。\r\n" + err.toString());
      })
    }
  }
  snsLogin(button) {
    let provider;//: firebase.auth.AuthProvider;
    if (button === "twitter") {
      provider = new firebase.auth.TwitterAuthProvider();
    } else if (button === "facebook") {
      provider = new firebase.auth.FacebookAuthProvider();
    } else if (button === "google") {
      provider = new firebase.auth.GoogleAuthProvider();
    }
    this.fireAuth.auth.signInWithPopup(provider).catch(err => {
      this.ui.alert(button + "のログインに失敗しました。\r\n" + err.toString());
    })
  }

  async verifySmsCode() {
    const alert = await this.alert.create({
      header: 'SMS確認コード',
      message: '６桁の数字',
      inputs: [{
        name: "code", type: "number", min: 0, max: 999999
      }],
      buttons: [
        {
          text: 'キャンセル',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            this.windowRef.grecaptcha.reset(this.recaptchaWidgetId);
          }
        }, {
          text: '検証',
          handler: (input) => {
            if (this.fireAuth.auth.currentUser.uid) {//既にログイン済みなら電話番号を追加
              const verificationId = this.windowRef.confirmationResult.verificationId;
              const phoneCredential = firebase.auth.PhoneAuthProvider.credential(verificationId, input.code);
              this.fireAuth.auth.currentUser.linkWithCredential(phoneCredential).catch(err => {
                this.ui.alert("電話番号の検証追加に失敗しました。\r\n" + err.toString());
              });
            } else {//電話番号アカウントでログイン
              this.windowRef.confirmationResult.confirm(input.code).then(res => {
                let a = res;
              }).catch(error => {
                this.ui.alert("検証に失敗しました。\r\n" + error.toString());
              });
            }
          }
        }
      ]
    });
    await alert.present();
  }
  ngOnDestroy() {
    this.onDestroy$.next();
    if (this.userSb) this.userSb.unsubscribe();
  }
}
