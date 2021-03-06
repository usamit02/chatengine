import { Component, OnInit, ViewChild, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { IonContent, IonInfiniteScroll, Platform } from '@ionic/angular';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
})
export class ChatPage implements OnInit {
  @ViewChild('chatscontent', { read: ElementRef, static: false }) content: ElementRef;
  @ViewChild('top', { static: false }) top: IonInfiniteScroll; @ViewChild('btm', { static: false }) btm: IonInfiniteScroll;
  @ViewChildren('chatDivs', { read: ElementRef }) chatDivs: QueryList<ElementRef>;
  @ViewChild('talk', { read: ElementRef, static: false }) talk: ElementRef;//チャット投稿欄
  chats: Array<any> = [];//チャットデータ [0]=古い、[length-1]=最新 <div id="chatX"
  loading: boolean = false;//読み込み時の自動スクロールにion-infinate-scrollが反応するのを止める。
  dbcon: AngularFirestoreDocument<{}>;//firestore接続バッファ
  newChat: number = 0;
  loadUpd: Date;//最初にチャットロードした時間
  newUpds = [];//新着メッセージ
  latest: boolean;//最新表示
  mentionTop: number = 0; mentionBtm: number = 0;
  Y: number = 0;//現在のスクロール位置
  H: number = 0;//現在の画面高さ
  cursor: Date;//chat読込の基準日付
  newchatSb: Subscription; chatSb: Subscription;
  height: number;
  pf: string;
  sendable: boolean = false;
  constructor(private readonly db: AngularFirestore, private platform: Platform) { }

  ngOnInit() {
    this.cursor = new Date("2019/9/19 15:0:0");
    this.pf = this.platform.is("mobile") ? "mobile," : "";
    this.pf += this.platform.is("mobileweb") ? "mobileweb," : "";
    this.pf += this.platform.is("tablet") ? "tablet," : "";
    this.pf += this.platform.is("android") ? "android," : "";
    this.pf += this.platform.is("ios") ? "ios," : "";
  }
  ngAfterViewInit() {
    this.chatInit(2);
  }
  tinyfocus() {
    setTimeout(() => {
      this.height = this.platform.height();
    }, (1000));
  }
  tinyblur() {
    setTimeout(() => {
      this.height = this.platform.height();
    }, (1000));
  }
  chatInit(rid: number) {
    this.chats = []; this.Y = 0; this.newUpds = []; this.loadUpd = new Date();
    this.dbcon = this.db.collection('room').doc(rid.toString());
    this.chatLoad(false, "btm", this.cursor); //this.chatLoad(false, this.data.room.csd || this.cursor ? "btm" : "top", this.cursor);
    if (this.newchatSb) this.newchatSb.unsubscribe();
    this.newchatSb = this.dbcon.collection('chat', ref => ref.where('upd', '>', this.loadUpd)).stateChanges(['added']).
      subscribe(action => {//チャットロード以降の書き込み 
        let chat = action[0].payload.doc.data();
        this.dbcon.collection('chat', ref => ref.where('upd', "<", chat.upd).orderBy('upd', 'desc').
          limit(1)).get().toPromise().then(query => {//書き込み直前のチャットを取得
            if (query.docs.length) {//初回書き込みでない
              if (query.docs[0].data().upd.toDate().getTime() === this.chats[this.chats.length - 1].upd.toDate().getTime()) {//読込済最新チャットの次の投稿
                this.chatDivs.changes.pipe(take(1)).toPromise().then(t => {//this.chats.push(chat)の結果が描写後に発火
                  let chatDiv: HTMLDivElement = this.chatDivs.toArray()[this.chats.length - 1].nativeElement;//新規チャット
                  if (this.Y + this.H > chatDiv.offsetTop) {
                    setTimeout(() => { this.content.nativeElement.scrollToBottom(300); });
                  } else {//画面上に最近のチャットが表示されていない
                    this.newUpds.push(chat.upd.toDate());//新着メッセージを追加
                  }
                });
                this.chats.push(chat);//チャットが連続していれば書き込みを足す
                this.chatChange();
              } else {//読込済最新チャットの次のチャットはない                
                this.newUpds.push(chat.upd.toDate());//新着メッセージを追加                
              }
            } else {//初回書き込み
              this.chats.push(chat);
            }
          });
      });
  }
  chatLoad(e, direction, cursor?: Date) {
    const LIMIT: number = 10; let db; let docs = []; let docs1 = []; let docs2 = [];
    if (!e) {
      this.loading = true;
    } else if (this.loading) {
      e.target.complete();
      console.log("loading stop");
      return;//読込時の自動スクロールにion-infinate-scrollが反応するのを止める。
    }
    let infinate = e ? "infinate" : "init";
    console.log("chatload:" + infinate + " " + direction + " " + cursor);
    if (!cursor) {
      if (this.chats.length) {
        cursor = direction === 'top' ? this.chats[0].upd.toDate() : this.chats[this.chats.length - 1].upd.toDate();
      } else {//初回読込
        cursor = this.loadUpd;
      }
    }
    if (direction === 'top') {
      db = this.dbcon.collection('chat', ref => ref.where('upd', "<", cursor).orderBy('upd', 'desc').limit(LIMIT));//並び替えた後limitされるのでascはダメ
    } else {
      db = this.dbcon.collection('chat', ref => ref.where('upd', ">", cursor).where('upd', '<', this.loadUpd).orderBy('upd', 'asc').limit(LIMIT));
    }
    Promise.resolve(this)
      .then(docsRead1)
      .then(docsRead2)
      .then(() => {
        if (e) {//infinatescrollからの場合、スピナーを止める
          e.target.complete();
          if (!docs.length) e.target.disabled = true;//読み込むchatがなかったら以降infinatescroll無効
        }
        if (this.chats.length || docs.length) {
          if (!this.chats.length) {//新規読込
            this.chatDivs.changes.pipe(take(1)).toPromise().then(() => {//チャット再描写後発火
              if (direction === "top" || !docs1.length) {
                setTimeout(() => { this.content.nativeElement.scrollToBottom().then(() => { scrollFin(this); }); }); //this.data.scroll("btm");
              } else {
                if (docs2.length) {
                  let chatDivs = this.chatDivs.toArray();
                  let cursorTop: number = 0; let cursorHeight: number = 0;
                  for (let i = 0; i < chatDivs.length; i++) {
                    if (this.chats[i].upd.toDate().getTime() >= cursor.getTime()) {
                      cursorTop = chatDivs[i].nativeElement.offsetTop; cursorHeight = chatDivs[i].nativeElement.offsetHeight; break;
                    }
                  }
                  if (chatDivs[0].nativeElement.offsetTop + chatDivs[0].nativeElement.offsetHeight - cursorTop > this.content.nativeElement.scrollHeight) {
                    setTimeout(() => { this.content.nativeElement.scrollToTop().then(() => { scrollFin(this); }); });
                  } else {
                    setTimeout(() => { this.content.nativeElement.scrollToBottom().then(() => { scrollFin(this); }); });/*this.content.getScrollElement().then(content => {content.scrollTop = content.scrollHeight;});*/
                  }
                } else {
                  this.content.nativeElement.scrollByPoint(0, 20, 300).then(() => { scrollFin(this); });;
                }
              }
            });
          } else {
            scrollFin(this);
          }
          if (direction === 'top') {
            if (docs1.length < LIMIT) { this.top.disabled = true; }
            this.chats.unshift(...docs1.reverse());
          } else {
            this.chats.push(...docs);
            if (docs.length < LIMIT) {
              this.btm.disabled = true;
            }
          }
          this.chatChange();
        } else {//読み込むchatがない

        }
        if (this.chats.length < LIMIT) {
          this.top.disabled = true;
          this.btm.disabled = true;
          console.log("out of chats length :" + this.chats.length);
        }
      }).catch((err) => {
        alert("チャットデーターベースの読込に失敗しました。\r\n" + err.message);
      });
    function docsRead1(that) {
      return new Promise((resolve, reject) => {
        db.get().toPromise().then(query => {
          docs1 = docsPush(query, that);
          let limit: number = direction === 'btm' && !that.chats.length && docs1.length < LIMIT ? LIMIT - docs1.length : 0;
          db = limit ? that.dbcon.collection('chat', ref => ref.where('upd', "<=", cursor).orderBy('upd', 'desc').limit(limit)) : null;
          resolve(that);
        }).catch((err) => {
          reject(err);
        });
      });
    }
    function docsRead2(that) {
      return new Promise((resolve, reject) => {
        if (db) {
          db.get().toPromise().then(query => {
            docs2 = docsPush(query, that);
            docs = docs2.reverse().concat(docs1);
            resolve();
          }).catch((err) => {
            reject(err);
          });
        } else {
          docs = docs1;
          resolve();
        }
      });
    }
    function docsPush(query, that) {//firestoreの返り値を配列へ、同時に既読位置とツイッターがあるか記録
      let docs = [];
      query.forEach(doc => {
        let d = doc.data();
        if (d.upd.toDate().getTime() <= new Date().getTime() && !that.readed) {
          d.readed = true;
          that.readed = true;
        };
        docs.push(d);
      });
      return docs;
    }
    function scrollFin(that) {//無限スクロールを有効にする
      setTimeout(() => { that.loading = false; }, 2000)
    }
  }
  chatChange() {
    if (this.chatSb) this.chatSb.unsubscribe();
    this.chatSb = this.dbcon.collection('chat', ref => ref.where('upd', '>=', this.chats[0].upd).
      where('upd', '<=', this.chats[this.chats.length - 1].upd)).stateChanges(['modified']).
      subscribe(action => {//チャットロード以降の変更 
        let chat = action[0].payload.doc.data();
        for (let i = 0; i < this.chats.length; i++) {
          if (this.chats[i].upd.toDate().getTime() === chat.upd.toDate().getTime()) {
            this.chats[i] = chat;
            break;
          }
        }
      });
  }
  send() {

  }
}
