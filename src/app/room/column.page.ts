import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { PopoverController, ModalController, AlertController } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { FormControl, FormBuilder, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as firebase from 'firebase';
import { AngularFireDatabase } from '@angular/fire/database';
import { TreeComponent } from './tree/tree.component';
@Component({
  selector: 'app-column',
  templateUrl: './column.page.html',
  styleUrls: ['./column.page.scss'],
})
export class ColumnPage implements OnInit, OnDestroy {
  @ViewChild('content', { read: ElementRef, static: false }) content: ElementRef;
  @ViewChild('basic', { read: ElementRef, static: false }) basic: ElementRef;
  @ViewChild('essay', { read: ElementRef, static: false }) essay: ElementRef;
  na = new FormControl("", [Validators.minLength(2), Validators.maxLength(30), Validators.required]);
  kana = new FormControl("", [Validators.minLength(2), Validators.maxLength(60), Validators.pattern(/^([ぁ-ん]|ー)+$/)]);
  description = new FormControl("", [Validators.minLength(2), Validators.maxLength(300)]);
  parent = new FormControl(null, [Validators.required]);
  rest = new FormControl(0, [Validators.required]);
  chat = new FormControl(1, [Validators.required]);
  columnForm = this.builder.group({
    na: this.na, kana: this.kana, description: this.description, parent: this.parent, rest: this.rest, chat: this.chat
  });
  author: any = { id: "", na: "", avatar: "" };
  column: any = { id: null };
  columns = { drafts: [], requests: [], posts: [], acks: [] };
  allColumns = [];
  place: string = "";
  undoing;
  imgBase64: string;
  currentY: number; scrollH: number; contentH: number; basicY: number; essayY: number;
  private onDestroy$ = new Subject();
  constructor(private builder: FormBuilder, private pop: PopoverController, private modal: ModalController, private alert: AlertController,
    private db: AngularFireDatabase, private router: Router, private route: ActivatedRoute,
  ) { }
  ngOnInit() {

    this.route.params.pipe(takeUntil(this.onDestroy$)).subscribe(async params => {
      if (params.id) {

      } else if (params.parent) {
        this.parent.reset(params.parent);
        this.setPlace();
      }
    });
  }

  setPlace() {
    let parent = Number(this.parent.value); this.place = "";
    while (parent) {
      const column = this.allColumns.filter(col => { return col.id === parent; });
      if (column.length) {
        if (parent === Number(this.parent.value)) {
          this.place = column[0].na;
        } else {
          this.place = `${column[0].na}＞${this.place}`;
        }
        parent = column[0].parent;
      } else {
        parent = 0;
      }
    }
  }
  async popTree() {
    const modal = await this.modal.create({
      component: TreeComponent,
      componentProps: { prop: { user: "", datas: this.allColumns, page: 'colum', id: this.parent.value } },
      //cssClass: 'report'
    });
    return await modal.present().then(() => {
      modal.onDidDismiss().then(event => {
        if (event.data) {
          if (event.data.columns.length) {
            this.allColumns = event.data.columns;
          }
          const id = event.data.id === this.column.id ?
            this.allColumns.filter(column => { return column.id === event.data.id; })[0].parent : event.data.id;
          if (!(id == null || id === Number(this.parent.value))) {
            this.parent.reset(id.toString());
            this.setPlace();
            this.columnForm.markAsDirty();
          }
        }
      });
    });;
  }
  async undo(column) {
    this.undoing = true;
    if (true) {
      const snapshot = await this.db.database.ref(`user/${column.user}`).once('value');
      const user = snapshot.val();
      column.author = { id: snapshot.key, na: user.na, avatar: user.avatar };
    }
    this.column = column;
    const controls = this.columnForm.controls
    for (let key of Object.keys(controls)) {
      if (column[key] == null) {
        controls[key].reset();
      } else {
        if (key === 'chat' || key === 'rest') {
          controls[key].reset(column[key]);
        } else {
          controls[key].reset(column[key].toString());
        }
      }
    }
    this.setPlace();
    setTimeout(() => { this.undoing = false; }, 1000);
  }


  async onScrollEnd() {
    const content = await this.content.nativeElement.getScrollElement();
    this.currentY = content.scrollTop;
    this.contentH = content.offsetHeight;
    this.scrollH = content.scrollHeight;
    this.basicY = this.basic.nativeElement.offsetTop;
    this.essayY = this.essay.nativeElement.offsetTop;
  }
  scroll(target) {
    this.content.nativeElement.scrollToPoint(0, target, 500);
  }
  dateFormat(date = new Date()) {//MySQL用日付文字列作成'yyyy-M-d H:m:s'
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    var d = date.getDate();
    var h = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();
    return y + "-" + m + "-" + d + " " + h + ":" + min + ":" + sec;
  }
  ngOnDestroy() {
    this.onDestroy$.next();
  }
}
