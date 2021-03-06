import {Component, EventEmitter, ElementRef, Input, Output, ViewEncapsulation} from 'angular2/core';

import {MdDialog, MdDialogRef, Media} from 'ng2-material/all';

import {LeagueHolder} from '../models/league.models';
import {League} from '../models/league.models';

import {LeaguesStore} from '../services/leagues-store.service';
import {LeagueInviteDialogCmp} from '../invite-dialog/invite-dialog.component';
import {LeagueDialogConfig} from '../delete-dialog/dialog-config.model';
import {LeagueDeleteDialogCmp} from '../delete-dialog/delete-dialog.component';
import {LeagueActionsHandler} from "../services/league-actions-handler.service";
import {LeagueImgCmp} from "../league-image/image.component";
import {} from "angular2/core";

@Component({
  selector: 'league-card-item',
  directives: [LeagueImgCmp],
  template: require('./league-card-item.html'),
  styles: [require('./league-card-item.scss')]
})
export class LeagueCardItemCmp {
  @Input()
  private leagueHolder:LeagueHolder;
  @Input()
  private elementRef:ElementRef;
  @Output()
  private onEdit = new EventEmitter<League>();

  constructor(public leagueActionsHandler:LeagueActionsHandler) {
  }

  edit(league:League) {
    console.log('league card @ edit', league);

    this.onEdit.emit(league);
  }

}
