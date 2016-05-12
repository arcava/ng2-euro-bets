export interface League {
  slug: string;
  name: string;
  description: string;
  owner: string;
  img?: string;
  members: Members;
}

export interface Members {
  [index: string]: boolean;
}

export interface LeagueHolder {
  league: League;
  membersCount: number;
  actions: LeagueActions;
}

export interface LeagueActions {
  canJoin: boolean;
  canLeave: boolean;
  canAlter: boolean;
}