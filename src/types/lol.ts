export type Role = 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';

export type Tier = 'IRON' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'EMERALD' | 'DIAMOND' | 'MASTER' | 'GRANDMASTER' | 'CHALLENGER';

export interface ChampionStat {
  championName: string;
  championId: string;
  games: number;
  wins: number;
  losses: number;
  winrate: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  csPerMin: number;
}

export interface MatchParticipantItem {
  id: number;
  name: string;
}

export interface MatchRecord {
  matchId: string;
  gameCreation: number;
  gameDurationSeconds: number;
  queueType: string;
  win: boolean;
  championName: string;
  championId: string;
  champLevel: number;
  role: Role;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  cs: number;
  csPerMin: number;
  killParticipationPct: number;
  damageDealt: number;
  damagePct: number;
  visionScore: number;
  spells: [string, string];
  items: number[];
  laneOpponentChamp?: string;
  tags?: ('MVP' | 'ACE' | 'Hypercarry' | 'Comeback' | 'First Blood')[];
}

export interface LPSnapshot {
  timestamp: number;
  tier: Tier;
  division: string;
  lp: number;
  wins: number;
  losses: number;
  note?: string;
}

export interface PlayerProfile {
  id: string;
  proName: string;
  realName: string;
  riotId: string;
  gameName: string;
  tagLine: string;
  region: string;
  team: string;
  role: Role;
  profileIconId: number;
  tier: Tier;
  division: string;
  lp: number;
  wins: number;
  losses: number;
  winrate: number;
  streak: number; // positive for win streak, negative for loss streak
  avgKda: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgCsPerMin: number;
  avgKillParticipationPct: number;
  champions: ChampionStat[];
  recentMatches: MatchRecord[];
  snapshots: LPSnapshot[];
  formRank: number;
  eloRank: number;
  statusBadge: string;
  analystSummary: string;
}

export interface TeamOverviewReport {
  timestamp: number;
  headline: string;
  executiveSummary: string;
  formRankingOrder: string[];
  eloRankingOrder: string[];
  formRankingRationale: string;
  eloRankingRationale: string;
  mvpOfSession: string;
  keyInsights: {
    title: string;
    description: string;
    tag: 'STREAK' | 'LADDER' | 'CHAMPION_POOL' | 'BOTLANE' | 'JUNGLE';
  }[];
  coachTakeaways: string[];
}

export interface AnalystChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  suggestedFollowUps?: string[];
}


export interface LiveTrackerPayload {
  generatedAt: string | null;
  source: string;
  sourceType?: string;
  status: 'ok' | 'partial' | 'waiting_for_first_sync';
  players: PlayerProfile[];
  errors: string[];
  meta?: {
    team?: string;
    region?: string;
    accountCount?: number;
    successfulCount?: number;
    summonerIds?: Record<string, string>;
    message?: string;
  };
}
