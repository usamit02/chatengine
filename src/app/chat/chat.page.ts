import { Component, OnInit, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { IonContent, IonInfiniteScroll, Platform } from '@ionic/angular';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
})
export class ChatPage implements OnInit {
  @ViewChild('chatscontent', { static: false }) content: IonContent;
  @ViewChild('top', { static: false }) top: IonInfiniteScroll; @ViewChild('btm', { static: false }) btm: IonInfiniteScroll;
  @ViewChildren('chatItems') chatItems: QueryList<any>;
  @ViewChildren('tiny') tiny: HTMLDivElement;
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

  constructor(private readonly db: AngularFirestore, private platform: Platform) { }

  ngOnInit() {
    this.cursor = new Date("2018/1/1 0:0:0")
  }
  ngAfterViewInit() {
    this.chatInit(2);
  }
  tinyfocus() {
    console.log("html focus");
  }
  tinyblur() {
    console.log("html blur");
  }
  chatInit(rid: number) {
    this.chats = []; this.Y = 0; this.newUpds = []; this.loadUpd = new Date();
    this.dbcon = this.db.collection('room').doc(rid.toString());
    this.chatLoad(false, "btm", this.cursor); //this.chatLoad(false, this.data.room.csd || this.cursor ? "btm" : "top", this.cursor);
    if (this.newchatSb) this.newchatSb.unsubscribe();
    this.newchatSb = this.dbcon.collection('chat', ref => ref.where('upd', '>', this.loadUpd)).stateChanges(['added']).
      subscribe(action => {//チャットロード以降の書き込み 
        let chat = action[0].payload.doc.data();
        let sb = this.dbcon.collection('chat', ref => ref.where('upd', "<", chat.upd).orderBy('upd', 'desc').
          limit(1)).get().subscribe(query => {//書き込み直前のチャットを取得
            sb.unsubscribe();
            if (query.docs.length) {//初回書き込みでない
              if (query.docs[0].data().upd.toDate().getTime() === this.chats[this.chats.length - 1].upd.toDate().getTime()) {//読込済最新チャットの次の投稿
                let sb = this.chatItems.changes.subscribe(t => {//this.chats.push(chat)の結果が描写後に発火
                  sb.unsubscribe();
                  let chatDiv = <HTMLDivElement>document.getElementById('chat' + (this.chats.length - 1).toString());//新規チャット
                  if (this.Y + this.H > chatDiv.offsetTop) {
                    setTimeout(() => { this.content.scrollToBottom(300); });
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
    if (!e) {
      this.loading = true;
    } else if (this.loading) {
      e.target.complete();
      console.log("loading stop");
      return;//読込時の自動スクロールにion-infinate-scrollが反応するのを止める。
    }
    let infinate = e ? "infinate" : "init";
    console.log("chatload:" + infinate + " " + direction + " " + cursor);
    let db;
    if (!cursor) {
      if (this.chats.length) {
        cursor = direction === 'top' ? this.chats[0].upd.toDate() : this.chats[this.chats.length - 1].upd.toDate();
      } else {//初回読込
        cursor = this.loadUpd;
      }
    }
    if (direction === 'top') {
      db = this.dbcon.collection('chat', ref => ref.where('upd', "<", cursor).orderBy('upd', 'desc').limit(20));//並び替えた後limitされるのでascはダメ
    } else {
      db = this.dbcon.collection('chat', ref => ref.where('upd', ">", cursor).where('upd', '<', this.loadUpd).
        orderBy('upd', 'asc').limit(20));
    }
    let sb = db.get().subscribe(query => {
      sb.unsubscribe();
      let docs1 = docsPush(query, this);
      let limit: number = direction === 'btm' && !this.chats.length && docs1.length < 20 ? 20 - docs1.length : 0;
      if (!limit) { limit = 1; cursor = new Date("1/1/1900"); }
      db = this.dbcon.collection('chat', ref => ref.where('upd', "<=", cursor).orderBy('upd', 'desc').limit(limit));
      sb = db.get().subscribe(query => {
        sb.unsubscribe();
        let docs2 = docsPush(query, this);
        let docs = docs2.reverse().concat(docs1);
        if (e) {//infinatescrollからの場合、スピナーを止める
          e.target.complete();
          if (!docs.length) e.target.disabled = true;//読み込むchatがなかったら以降infinatescroll無効
        }
        if (this.chats.length || docs.length) {
          if (!this.chats.length) {//新規読込
            let sb = this.chatItems.changes.subscribe(() => {//チャット再描写後発火
              sb.unsubscribe();
              if (direction === "top" || !docs1.length) {
                setTimeout(() => { this.content.scrollToBottom().then(() => { scrollFin(this); }); }); //this.data.scroll("btm");
              } else {
                if (docs2.length) {
                  let content = <any>document.getElementById('chatscontent');
                  let chatDivs = <any>document.getElementsByClassName('chat');
                  let cursorTop: number = 0; let cursorHeight: number = 0;
                  for (let i = 0; i < chatDivs.length; i++) {
                    if (this.chats[i].upd.toDate().getTime() >= cursor.getTime()) {
                      cursorTop = chatDivs[i].offsetTop; cursorHeight = chatDivs[i].offsetHeight; break;
                    }
                  }
                  if (chatDivs[0].offsetTop + chatDivs[0].offsetHeight - cursorTop > content.scrollHeight) {
                    setTimeout(() => { this.content.scrollToTop().then(() => { scrollFin(this); }); });
                  } else {
                    setTimeout(() => { this.content.scrollToBottom().then(() => { scrollFin(this); }); });/*this.content.getScrollElement().then(content => {content.scrollTop = content.scrollHeight;});*/
                  }
                } else {
                  this.loading = false;
                  this.content.scrollByPoint(0, 20, 300);
                }
              }
            });
          } else {
            scrollFin(this);
          }
          if (direction === 'top') {
            if (docs1.length < 20) { this.top.disabled = true; }
            this.chats.unshift(...docs1.reverse());
          } else {
            this.chats.push(...docs);
            if (docs.length < 20) {
              this.btm.disabled = true;
            }
          }
          this.chatChange();
        } else {//読み込むchatがない

        }
        if (this.chats.length < 20) {
          this.top.disabled = true;
          this.btm.disabled = true;
          console.log("out of chats length :" + this.chats.length);
        }
      });
    });
    function docsPush(query, that) {//firestoreの返り値を配列へ、同時に既読位置とツイッターがあるか記録
      let docs = []
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
}
