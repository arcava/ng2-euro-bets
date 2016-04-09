import {Component} from 'angular2/core';

import {SidenavLayout} from '../core/components/sidenav-layout/sidenav-layout.component'

@Component({
  directives: [SidenavLayout],
  template: `
      <pronos-sidenav-layout>
      Pronos

      TODO</pronos-sidenav-layout>

  `
})
export class PronosCmp {

  constructor() {
    console.log('pronos#init');
  }

  ngOnInit() {
    console.log('pronos#ngOnInit');
  }

}
