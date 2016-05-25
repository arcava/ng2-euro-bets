import * as moment from 'moment/moment';

import {Inject,Injectable} from 'angular2/core';
import {Control} from 'angular2/common';
import {Router,RouteParams} from 'angular2/router';

import {AngularFire} from 'angularfire2/angularfire2';
import {FirebaseRef} from 'angularfire2/tokens';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/operator/map';

import {Auth} from '../../core/services/firebase/auth.service';
import {Pages, Page} from '../../core/services/navigation/pages.service';
import {Slugifier} from '../../core/services/util/slugifer.helper';
import {UsersStore} from '../../core/services/firebase/users.store.service';
import {UsersService} from '../../core/services/users/users.service';
import {UserData} from '../../core/services/firebase/auth.model';

import {League, LeagueHolder, Members} from '../models/league.models';
import {LeagueMembers} from '../models/league.models';

@Injectable()
export class LeaguesStore {

  constructor(private auth:Auth, private users:UsersService,
              private af:AngularFire, @Inject(FirebaseRef) private ref:Firebase,
              private router:Router) {
  }

  one(leagueSlug:string):Observable<League> {
    return this.af.object(`/leagues/${leagueSlug}`);
  }

  findOnce(leagueSlug:string):Observable<League> {
    return Observable.fromPromise(this.ref.child(`/leagues/${leagueSlug}`).once('value'))
      .map((dataSnapshot:FirebaseDataSnapshot) => dataSnapshot.val());
  }

  find(leagueSlug:string):Observable<League> {
    return this.one(leagueSlug)
      .map((league:League) => {
        if (league === null) {
          console.log('leagues @ league not found:', leagueSlug);

          throw new Error('League not found: ' + leagueSlug);
        }

        return league;
      })
      .catch(_ => Observable.throw(_))
  }

  findWithMembers(leagueSlug:string):Observable<LeagueMembers> {
    return this.find(leagueSlug)
      .map(league => this.mapLeagueToLeagueHolder(league, this.auth.uid))
      .flatMap((leagueHolder:LeagueHolder) => this.combineLeagueWithMembers(leagueHolder));
  }

  private combineLeagueWithMembers(leagueHolder:LeagueHolder) {
    let memberIds = leagueHolder.league.members;

    return this.users.usersOnce$.map(users => {
      let members = _.filter(users, user => {
        return !!memberIds[user.uid];
      });

      return {
        holder: leagueHolder,
        members: _.sortBy(members, 'displayName')
      };
    });
  }

  redirectToLeagues() {
    return this.router.navigate(['Leagues']);
  }

  redirectToLeague(leagueSlug:string) {
    return this.router.navigate(['LeagueDetails', {'leagueSlug': leagueSlug}]);
  }

  list() {
    return this.af.list('/leagues')
      .map((leagues:Array<League>) => {
        console.log('leagues @ map league item');
        return leagues.map((league:League) => this.mapLeagueToLeagueHolder(league, this.auth.uid));
      })
      .map((leagues:Array<LeagueHolder>) => {
        console.log('leagues @ sort teams');

        return _.sortBy(leagues, (leagueHolder:LeagueHolder) => leagueHolder.league.name);
      })
  }

  mapLeagueToLeagueHolder(league:League, userUid:string) {
    let isInLeague = !!league.members[userUid];
    let isOwner = userUid === league.owner;
    let canLeave = isInLeague && !isOwner;
    let canAlter = isInLeague && isOwner;

    return {
      league: league,
      canShowBanner: !_.isEmpty(league.image) && league.imageModerated,
      membersCount: _.keys(league.members).length,
      actions: {
        canJoin: !isInLeague,
        canLeave: canLeave,
        canAlter: canAlter
      }
    };
  }

  attachInvitationCode(league:League, invitationCode) {
    console.log('leagues store @ attach invitation code', league, invitationCode);

    return this.ref.child('/leagues').child(league.slug).update({invitationCode: invitationCode});
  }

  validateExists(leagueName:string, resolve:any) {
    let slug = Slugifier.slugify(leagueName);
    if (_.isEmpty(slug)) {
      resolve({invalidName: true});

      return;
    }

    this.exists(slug, (exists:boolean) => {
      if (exists) {
        resolve({nameTaken: true});

        return;
      }

      resolve(null);
    })
  }

  exists(leagueSlug:string, callback:(foo:boolean) => void) {
    return this.ref.child('/leagues').once('value', (dataSnapshot:FirebaseDataSnapshot) => {
      return callback(dataSnapshot.hasChild(leagueSlug));
    });
  }

  update(league:League, previousLeague:League):Promise<void> {
    console.log('leagues store @', league, 'will replace', previousLeague);

    delete league['$key'];
    league.imageModerated = previousLeague.imageModerated ? league.image === previousLeague.image : false;

    let onDeleteComplete = () => {
      league.members = previousLeague.members;

      return this.save(league);
    };

    return this.ref.child('/leagues').child(previousLeague.slug).remove()
      .then(() => onDeleteComplete());
  }

  save(league:League):Promise<void> {
    league.slug = Slugifier.slugify(league.name);
    league.owner = this.auth.uid;
    league.ownerDisplayName = this.auth.user.displayName;
    league.ownerProfileImageURL = this.auth.user.profileImageURL;
    league.createdAt = Date.now();

    if (!league.members) {
      league.members = {};
    }
    league.members[`${league.owner}`] = true;

    var leagueRef = this.ref.child('/leagues').child(league.slug);

    return leagueRef.set(league)
      .then(() => {
        leagueRef.child('members').child(this.auth.uid).set(true);
      })
      .then(() => {
        return this.attachUserLeague(league);
      });
  }

  join(league:League) {
    return this.ref.child('/leagues').child(league.slug).child('members').child(this.auth.uid).set(true)
      .then(() => this.attachUserLeague(league));
  }

  leave(league:League) {
    return this.ref.child('/leagues').child(league.slug).child('members').child(this.auth.uid).remove()
      .then(() => this.detachUserLeague(league));
  }

  delete(league:League) {
    return this.ref.child('/leagues').child(league.slug).remove()
      .then(() => this.detachUserLeague(league));
  }

  attachUserLeague(league:League) {
    return this.getUserLeague(league).set(true);
  }

  detachUserLeague(league:League) {
    return this.getUserLeague(league).remove();
  }

  getUserLeague(league:League) {
    return this.ref.child(`users/${this.auth.uid}/leagues/${league.slug}`);
  }

}
