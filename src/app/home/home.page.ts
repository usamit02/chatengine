import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../service/user.Service';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  userSb: Subscription;
  constructor(private router: Router, public user: UserService, ) { }
  ngOnInit() {
    this.userSb = this.user.login();
  }
  login() {
    this.router.navigate(["login"]);
  }
  logout() {
    this.user.logout();
  }
  ngOnDestroy() {
    this.userSb.unsubscribe();
  }
}
