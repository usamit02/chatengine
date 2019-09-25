import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as encoding from 'encoding-japanese';
//import { Core as YubinBangoCore } from 'yubinbango-core';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  constructor(private http: HttpClient, ) { }
  ngOnInit() {

  }
  downCSV() {
    let params = { uid: "" };
    this.http.get("http://localhost/public_html/owner/customer.php", { params: params }).subscribe((res: any) => {
      let csv = this.ObjToCSV(res);
      this.download(csv, "customer");
    });
  }
  ObjToCSV(objArray) {
    let array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
    let str: string = '';
    let row: string = '';
    for (let index in objArray[0]) {
      row += index + ',';//Now convert each value to string and comma-separated
    }
    row = row.slice(0, -1);
    str += row + '\r\n';//append Label row with line break
    for (let i = 0; i < array.length; i++) {
      let line = '';
      for (let index in array[i]) {
        if (line != '') line += ',';
        if (array[i][index] !== null) line += array[i][index];
      }
      str += line + '\r\n';
    }
    let utfArray = [];
    for (let i = 0; i < str.length; i++) {
      utfArray.push(str.charCodeAt(i));
    }
    let sjisArray = encoding.convert(utfArray, "SJIS", "UNICODE");
    return new Uint8Array(sjisArray);
  }
  download(data, name) {
    const anchor: any = document.createElement('a');
    if (window.navigator.msSaveBlob) {  //edge      
      const blob = new Blob([data], { type: 'text/csv' });
      window.navigator.msSaveBlob(blob, name);
    } else if (window.URL && anchor.download !== undefined) {    //chrome,safari,firefox
      const blob = new Blob([data], { type: 'text/csv' });
      anchor.download = name + ".csv"; // window.URL.createObjectURLを利用 https://developer.mozilla.org/ja/docs/Web/API/URL/createObjectURL
      anchor.href = window.URL.createObjectURL(blob);// これでも可 anchor.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(bom + data);
      document.body.appendChild(anchor); // firefoxでは一度addしないと動かない
      anchor.click();
      anchor.parentNode.removeChild(anchor);
    } else {
      alert("このブラウザでは出力できません。chromeかedgeがおすすめです。");
    }
  }
  postToAddr() {
    // new YubinBangoCore("3260101", addr => {
    //   let a = addr;
    // });

  }
}
