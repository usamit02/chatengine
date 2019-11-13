import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as mailer from 'nodemailer';
import * as google from 'googleapis';

admin.initializeApp();

export const fcmSend = functions.database.ref('/chat/{id}').onCreate((snapshot, context) => {
  const doc = snapshot.val();
  const payload = {
    notification: {
      title: 'セクシャルレポートより', // Pushメッセージのタイトル
      body: doc.id + 'が登録されました 🎉', // Pushメッセージ本文
      clickAction: '', // Push通知をタップした時に、飛ばすURLを指定
      icon: '', // Push通知で使うロゴ
    },
  };

  admin.database().ref('/fcmTokens/').once('value').then((token) => {
    const tokenList = token.val() || '';
    Object.keys(tokenList).forEach(function (key, index) {
      console.log(tokenList[key]);
      admin.messaging().sendToDevice(tokenList[key], payload).then((res) => {
        console.log('Sent Successfully', res);
      }).catch((err) => {
        console.log(err);
      });
    });
  }).catch((err) => {
    console.log(err);
  });

  const OAuth2 = google.google.auth.OAuth2;
  const APP_NAME = "sexualreport";
  const clientID = "610920766258-4tiulk960o1u77llb2duenf02e9nedao.apps.googleusercontent.com";
  const clientSecret = "V5NgFXtzPgKvVw5b0ByI3tkC";
  const refreshToken = "1//04x7kmHAMQrFbCgYIARAAGAQSNwF-L9Irb__i4j8PycKvYt_l8LxrG8addHzQlzOteIL99lar0_0A4A5Nsf0FVuwCbKvSglTRjO8"

  const oauth2Client = new OAuth2(
    clientID, //client Id
    clientSecret, // Client Secret
    "https://developers.google.com/oauthplayground" // Redirect URL
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });
  oauth2Client.refreshAccessToken().then((tokens: any) => {
    const accessToken = tokens.credentials.access_token;
    const smtpTransport = mailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: "usamit02@gmail.com",
        clientId: clientID,
        clientSecret: clientSecret,
        refreshToken: refreshToken,
        accessToken: accessToken
      }
    });
    const mailOptions = {
      from: `${APP_NAME} <usamit02@gmail.com>`,
      to: "usamit02@yahoo.co.jp", //sending to email IDs in app request, please check README.md
      subject: `Hello from ${APP_NAME}!`,
      text: `Hi,\n Test email from ${APP_NAME}.`
    };
    smtpTransport.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error.message);
        smtpTransport.close();
      }
      return "mail sent";
    });
  }).catch(err => {
    console.log("アクセストークンの取得に失敗しました。\r\n" + err.message);
  });
});