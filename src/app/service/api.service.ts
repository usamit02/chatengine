import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APIURL } from '../../environments/environment';
import { UiService } from './ui.service';
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  token: string = "";
  constructor(private http: HttpClient, private ui: UiService) { }
  get(url: string, params: any, msg?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (msg) this.ui.loading(msg + "...");
      this.http.get(APIURL + url + ".php", { params: params }).toPromise().then((res: any) => {
        if (res.msg === "ok" || url.substr(0, 5) === "owner") {
          resolve(res);
        } else {
          this.ui.alert(res.msg);
          reject();
        }
      }).catch(error => {
        alert("通信エラー  \r\n" + error.message);
        reject();
      }).finally(() => {
        if (msg) this.ui.loadend();
      });
    });
  }
  post(url: string, params: any, msg?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (msg) this.ui.loading(msg + "...");
      let body = new HttpParams;
      for (const key of Object.keys(params)) {
        body = body.append(key, params[key]);
      }
      this.http.post(APIURL + url + ".php", body).toPromise().then((res: any) => {
        if (res.msg === "ok" || url.substr(0, 5) === "owner") {
          resolve(res);
        } else {
          this.ui.alert(res.msg);
          reject();
        }
      }).catch(error => {
        alert("通信エラー  \r\n" + error.message);
        reject();
      }).finally(() => {
        if (msg) this.ui.loadend();
      });
    });
  }
  upload(url: string, formData: any): Observable<Object> {
    let fd = new FormData;
    for (const key of Object.keys(formData)) {
      fd.append(key, formData[key]);
    }
    let params = new HttpParams();
    const req = new HttpRequest('POST', APIURL + url + ".php", fd, { params: params, reportProgress: true });
    return this.http.request(req);//return this.http.post(this.url + url, fd, { reportProgress: true,observe:'events' });    
  }
  getAPI(url: string, params: any, msg?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (msg) this.ui.loading(msg + "...");
      this.http.get(url, { params: params }).toPromise().then((res: any) => {
        resolve(res);
      }).catch(error => {
        this.ui.pop("通信エラー  \r\n" + error.message);
        reject();
      }).finally(() => {
        if (msg) this.ui.loadend();
      });
    });
  }
}
