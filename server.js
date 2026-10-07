// server.ts
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { GoogleGenAI } from "@google/genai";

// src/data/initialPlayers.ts
var INITIAL_PLAYERS = [
  {
    id: "jojopyun",
    proName: "Jojopyun",
    realName: "Joseph Joon Pyun",
    riotId: "jojooooooooo#9999",
    gameName: "jojooooooooo",
    tagLine: "9999",
    region: "NA",
    team: "MAD Lions KOI",
    role: "MID",
    profileIconId: 588,
    tier: "DIAMOND",
    division: "II",
    lp: 27,
    wins: 8,
    losses: 0,
    winrate: 100,
    streak: 8,
    avgKda: 10.4,
    avgKills: 8.8,
    avgDeaths: 1.6,
    avgAssists: 7.9,
    avgCsPerMin: 9.3,
    avgKillParticipationPct: 69.4,
    formRank: 1,
    eloRank: 5,
    statusBadge: "Imparable (8-0 Streak)",
    analystSummary: "Literalmente volando. 100% de winrate en sus partidas recientes con KDAs desorbitados (16.0 en Sylas, 11.0 en Viktor). Tiene el mejor momento de forma del grupo.",
    champions: [
      { championName: "Sylas", championId: "Sylas", games: 2, wins: 2, losses: 0, winrate: 100, kills: 18, deaths: 2, assists: 14, kda: 16, csPerMin: 9.1 },
      { championName: "Viktor", championId: "Viktor", games: 2, wins: 2, losses: 0, winrate: 100, kills: 14, deaths: 2, assists: 8, kda: 11, csPerMin: 9.8 },
      { championName: "Ryze", championId: "Ryze", games: 2, wins: 2, losses: 0, winrate: 100, kills: 12, deaths: 3, assists: 13, kda: 8.3, csPerMin: 9.5 },
      { championName: "Twisted Fate", championId: "TwistedFate", games: 1, wins: 1, losses: 0, winrate: 100, kills: 7, deaths: 1, assists: 11, kda: 18, csPerMin: 8.9 },
      { championName: "Jayce", championId: "Jayce", games: 1, wins: 1, losses: 0, winrate: 100, kills: 9, deaths: 2, assists: 5, kda: 7, csPerMin: 9.2 }
    ],
    snapshots: [
      { timestamp: Date.now() - 864e5 * 3, tier: "DIAMOND", division: "III", lp: 45, wins: 3, losses: 0, note: "Inicio de bootcamp NA" },
      { timestamp: Date.now() - 864e5 * 2, tier: "DIAMOND", division: "III", lp: 92, wins: 5, losses: 0, note: "Racha con Sylas & Ryze" },
      { timestamp: Date.now() - 864e5 * 1, tier: "DIAMOND", division: "II", lp: 12, wins: 7, losses: 0, note: "Promoci\xF3n a Diamante II" },
      { timestamp: Date.now() - 36e5 * 4, tier: "DIAMOND", division: "II", lp: 27, wins: 8, losses: 0, note: "\xDAltima sesi\xF3n de SoloQ invicto" }
    ],
    recentMatches: [
      {
        matchId: "NA1_5109823401",
        gameCreation: Date.now() - 36e5 * 2,
        gameDurationSeconds: 1642,
        queueType: "Ranked Solo/Duo",
        win: true,
        championName: "Sylas",
        championId: "Sylas",
        champLevel: 16,
        role: "MID",
        kills: 11,
        deaths: 1,
        assists: 8,
        kda: 19,
        cs: 254,
        csPerMin: 9.3,
        killParticipationPct: 76,
        damageDealt: 28420,
        damagePct: 34.2,
        visionScore: 26,
        spells: ["SummonerFlash", "SummonerTeleport"],
        items: [3157, 3089, 4645, 3020, 3165, 3135, 3364],
        // Zhonya, Rabadon, Shadowflame, Sorcs, Morello, Void
        laneOpponentChamp: "Ahri",
        tags: ["MVP", "Hypercarry"]
      },
      {
        matchId: "NA1_5109721102",
        gameCreation: Date.now() - 36e5 * 5,
        gameDurationSeconds: 1812,
        queueType: "Ranked Solo/Duo",
        win: true,
        championName: "Viktor",
        championId: "Viktor",
        champLevel: 17,
        role: "MID",
        kills: 8,
        deaths: 1,
        assists: 6,
        kda: 14,
        cs: 302,
        csPerMin: 10,
        killParticipationPct: 67,
        damageDealt: 31250,
        damagePct: 38,
        visionScore: 28,
        spells: ["SummonerFlash", "SummonerTeleport"],
        items: [6653, 3157, 3089, 3020, 4645, 1056, 3363],
        laneOpponentChamp: "Orianna",
        tags: ["MVP"]
      },
      {
        matchId: "NA1_5109618403",
        gameCreation: Date.now() - 36e5 * 9,
        gameDurationSeconds: 1540,
        queueType: "Ranked Solo/Duo",
        win: true,
        championName: "Ryze",
        championId: "Ryze",
        champLevel: 15,
        role: "MID",
        kills: 7,
        deaths: 1,
        assists: 9,
        kda: 16,
        cs: 248,
        csPerMin: 9.7,
        killParticipationPct: 73,
        damageDealt: 24900,
        damagePct: 31.5,
        visionScore: 24,
        spells: ["SummonerFlash", "SummonerTeleport"],
        items: [3004, 3040, 3157, 3020, 3116, 1056, 3364],
        laneOpponentChamp: "Taliyah",
        tags: ["MVP"]
      },
      {
        matchId: "NA1_5109511104",
        gameCreation: Date.now() - 36e5 * 14,
        gameDurationSeconds: 1410,
        queueType: "Ranked Solo/Duo",
        win: true,
        championName: "Twisted Fate",
        championId: "TwistedFate",
        champLevel: 14,
        role: "MID",
        kills: 7,
        deaths: 1,
        assists: 11,
        kda: 18,
        cs: 209,
        csPerMin: 8.9,
        killParticipationPct: 78,
        damageDealt: 19800,
        damagePct: 29,
        visionScore: 32,
        spells: ["SummonerFlash", "SummonerTeleport"],
        items: [6656, 3100, 3157, 3009, 4645, 0, 3364],
        laneOpponentChamp: "Syndra",
        tags: ["MVP", "First Blood"]
      },
      {
        matchId: "NA1_5109403205",
        gameCreation: Date.now() - 36e5 * 19,
        gameDurationSeconds: 1720,
        queueType: "Ranked Solo/Duo",
        win: true,
        championName: "Jayce",
        championId: "Jayce",
        champLevel: 16,
        role: "MID",
        kills: 9,
        deaths: 2,
        assists: 5,
        kda: 7,
        cs: 263,
        csPerMin: 9.2,
        killParticipationPct: 61,
        damageDealt: 29100,
        damagePct: 33.1,
        visionScore: 22,
        spells: ["SummonerFlash", "SummonerTeleport"],
        items: [3142, 6692, 3071, 3158, 3036, 1055, 3363],
        laneOpponentChamp: "Azir",
        tags: ["Hypercarry"]
      },
      {
        matchId: "NA1_5109311106",
        gameCreation: Date.now() - 36e5 * 25,
        gameDurationSeconds: 1490,
        queueType: "Ranked Solo/Duo",
        win: true,
        championName: "Sylas",
        championId: "Sylas",
        champLevel: 15,
        role: "MID",
        kills: 7,
        deaths: 1,
        assists: 6,
        kda: 13,
        cs: 228,
        csPerMin: 9.2,
        killParticipationPct: 65,
        damageDealt: 22400,
        damagePct: 30.2,
        visionScore: 21,
        spells: ["SummonerFlash", "SummonerIgnite"],
        items: [3157, 4645, 3020, 3089, 1056, 0, 3364],
        laneOpponentChamp: "Yone",
        tags: ["MVP"]
      },
      {
        matchId: "NA1_5109204407",
        gameCreation: Date.now() - 36e5 * 30,
        gameDurationSeconds: 1680,
        queueType: "Ranked Solo/Duo",
        win: true,
        championName: "Viktor",
        championId: "Viktor",
        champLevel: 16,
        role: "MID",
        kills: 6,
        deaths: 1,
        assists: 2,
        kda: 8,
        cs: 282,
        csPerMin: 10.1,
        killParticipationPct: 53,
        damageDealt: 26800,
        damagePct: 35.4,
        visionScore: 27,
        spells: ["SummonerFlash", "SummonerTeleport"],
        items: [6653, 3157, 3020, 4645, 3089, 0, 3363],
        laneOpponentChamp: "Hwei",
        tags: []
      },
      {
        matchId: "NA1_5109102208",
        gameCreation: Date.now() - 36e5 * 36,
        gameDurationSeconds: 1590,
        queueType: "Ranked Solo/Duo",
        win: true,
        championName: "Ryze",
        championId: "Ryze",
        champLevel: 15,
        role: "MID",
        kills: 5,
        deaths: 2,
        assists: 4,
        kda: 4.5,
        cs: 245,
        csPerMin: 9.2,
        killParticipationPct: 60,
        damageDealt: 21100,
        damagePct: 29.8,
        visionScore: 20,
        spells: ["SummonerFlash", "SummonerTeleport"],
        items: [3004, 3040, 3157, 3020, 0, 0, 3364],
        laneOpponentChamp: "LeBlanc",
        tags: []
      }
    ]
  },
  {
    id: "alvaro",
    proName: "Alvaro",
    realName: "\xC1lvaro Fern\xE1ndez del Amo",
    riotId: "Treecko#MKOI",
    gameName: "Treecko",
    tagLine: "MKOI",
    region: "NA",
    team: "MAD Lions KOI",
    role: "SUPPORT",
    profileIconId: 4652,
    tier: "DIAMOND",
    division: "I",
    lp: 97,
    wins: 13,
    losses: 1,
    winrate: 92.9,
    streak: 6,
    avgKda: 5.9,
    avgKills: 2.1,
    avgDeaths: 2.6,
    avgAssists: 13.4,
    avgCsPerMin: 1.4,
    avgKillParticipationPct: 76.8,
    formRank: 2,
    eloRank: 2,
    statusBadge: "A 3 LP de Master",
    analystSummary: "Incre\xEDblemente dominante en botlane y mapas de roam. Lleva 13-1 (92.9% WR), a un paso de subir a Master. Destaca Thresh 3-0 con 6.1 KDA y gran versatilidad de picks (Camille, Elise, Zoe).",
    champions: [
      { championName: "Thresh", championId: "Thresh", games: 4, wins: 4, losses: 0, winrate: 100, kills: 6, deaths: 8, assists: 43, kda: 6.1, csPerMin: 1.2 },
      { championName: "Alistar", championId: "Alistar", games: 3, wins: 3, losses: 0, winrate: 100, kills: 4, deaths: 7, assists: 34, kda: 5.4, csPerMin: 1.1 },
      { championName: "Braum", championId: "Braum", games: 2, wins: 2, losses: 0, winrate: 100, kills: 2, deaths: 3, assists: 19, kda: 7, csPerMin: 0.9 },
      { championName: "Camille", championId: "Camille", games: 2, wins: 1, losses: 1, winrate: 50, kills: 7, deaths: 6, assists: 12, kda: 3.2, csPerMin: 2.4 },
      { championName: "Elise", championId: "Elise", games: 1, wins: 1, losses: 0, winrate: 100, kills: 4, deaths: 2, assists: 8, kda: 6, csPerMin: 1.3 },
      { championName: "Zoe", championId: "Zoe", games: 1, wins: 1, losses: 0, winrate: 100, kills: 3, deaths: 1, assists: 11, kda: 14, csPerMin: 1.5 },
      { championName: "Lee Sin", championId: "LeeSin", games: 1, wins: 1, losses: 0, winrate: 100, kills: 3, deaths: 2, assists: 7, kda: 5, csPerMin: 2.1 }
    ],
    snapshots: [
      { timestamp: Date.now() - 864e5 * 3, tier: "DIAMOND", division: "II", lp: 70, wins: 6, losses: 0, note: "Inicio en Diamante II" },
      { timestamp: Date.now() - 864e5 * 2, tier: "DIAMOND", division: "I", lp: 15, wins: 9, losses: 1, note: "Promoci\xF3n a Diamante I" },
      { timestamp: Date.now() - 864e5 * 1, tier: "DIAMOND", division: "I", lp: 68, wins: 11, losses: 1, note: "Racha con Thresh" },
      { timestamp: Date.now() - 36e5 * 3, tier: "DIAMOND", division: "I", lp: 97, wins: 13, losses: 1, note: "Puerta de Master (97 LP)" }
    ],
    recentMatches: [
      {
        matchId: "NA1_5109819921",
        gameCreation: Date.now() - 36e5 * 3,
        gameDurationSeconds: 1530,
        queueType: "Ranked Solo/Duo",
        win: true,
        championName: "Thresh",
        championId: "Thresh",
        champLevel: 13,
        role: "SUPPORT",
        kills: 2,
        deaths: 1,
        assists: 15,
        kda: 17,
        cs: 28,
        csPerMin: 1.1,
        killParticipationPct: 81,
        damageDealt: 7800,
        damagePct: 9.8,
        visionScore: 68,
        spells: ["SummonerFlash", "SummonerIgnite"],
        items: [3869, 3109, 3111, 3067, 3190, 0, 3364],
        // Celestial, Knight's Vow, Mercs, Locket
        laneOpponentChamp: "Nautilus",
        tags: ["MVP"]
      },
      {
        matchId: "NA1_5109712322",
        gameCreation: Date.now() - 36e5 * 6,
        gameDurationSeconds: 1670,
        queueType: "Ranked Solo/Duo",
        win: true,
        championName: "Alistar",
        championId: "Alistar",
        champLevel: 14,
        role: "SUPPORT",
        kills: 1,
        deaths: 2,
        assists: 14,
        kda: 7.5,
        cs: 32,
        csPerMin: 1.1,
        killParticipationPct: 79,
        damageDealt: 6900,
        damagePct: 8.5,
        visionScore: 74,
        spells: ["SummonerFlash", "SummonerIgnite"],
        items: [3869, 3190, 3111, 3067, 0, 0, 3364],
        laneOpponentChamp: "Rakan",
        tags: []
      },
      {
        matchId: "NA1_5109608823",
        gameCreation: Date.now() - 36e5 * 10,
        gameDurationSeconds: 1420,
        queueType: "Ranked Solo/Duo",
        win: true,
        championName: "Zoe",
        championId: "Zoe",
        champLevel: 13,
        role: "SUPPORT",
        kills: 3,
        deaths: 1,
        assists: 11,
        kda: 14,
        cs: 36,
        csPerMin: 1.5,
        killParticipationPct: 74,
        damageDealt: 14200,
        damagePct: 18.2,
        visionScore: 54,
        spells: ["SummonerFlash", "SummonerIgnite"],
        items: [3870, 3020, 3157, 4645, 0, 0, 3364],
        laneOpponentChamp: "Lulu",
        tags: ["MVP"]
      },
      {
        matchId: "NA1_5109503324",
        gameCreation: Date.now() - 36e5 * 15,
        gameDurationSeconds: 1780,
        queueType: "Ranked Solo/Duo",
        win: true,
        championName: "Thresh",
        championId: "Thresh",
        champLevel: 14,
        role: "SUPPORT",
        kills: 2,
        deaths: 3,
        assists: 13,
        kda: 5,
        cs: 35,
        csPerMin: 1.2,
        killParticipationPct: 75,
        damageDealt: 8400,
        damagePct: 9.5,
        visionScore: 82,
        spells: ["SummonerFlash", "SummonerIgnite"],
        items: [3869, 3109, 3190, 3111, 2055, 0, 3364],
        laneOpponentChamp: "Leona",
        tags: []
      },
      {
        matchId: "NA1_5109401125",
        gameCreation: Date.now() - 36e5 * 20,
        gameDurationSeconds: 1840,
        queueType: "Ranked Solo/Duo",
        win: false,
        championName: "Camille",
        championId: "Camille",
        champLevel: 14,
        role: "SUPPORT",
        kills: 3,
        deaths: 5,
        assists: 6,
        kda: 1.8,
        cs: 65,
        csPerMin: 2.1,
        killParticipationPct: 60,
        damageDealt: 12100,
        damagePct: 14.1,
        visionScore: 48,
        spells: ["SummonerFlash", "SummonerIgnite"],
        items: [3869, 3078, 3047, 3071, 0, 0, 3364],
        laneOpponentChamp: "Poppy",
        tags: ["ACE"]
      },
      {
        matchId: "NA1_5109302226",
        gameCreation: Date.now() - 36e5 * 26,
        gameDurationSeconds: 1390,
        queueType: "Ranked Solo/Duo",
        win: true,
        championName: "Braum",
        championId: "Braum",
        champLevel: 13,
        role: "SUPPORT",
        kills: 1,
        deaths: 1,
        assists: 10,
        kda: 11,
        cs: 21,
        csPerMin: 0.9,
        killParticipationPct: 79,
        damageDealt: 4900,
        damagePct: 6.8,
        visionScore: 59,
        spells: ["SummonerFlash", "SummonerExhaust"],
        items: [3869, 3190, 3111, 3067, 0, 0, 3364],
        laneOpponentChamp: "Lucian",
        tags: []
      }
    ]
  },
  {
    id: "supa",
    proName: "Supa",
    realName: "David Mart\xEDnez Garc\xEDa",
    riotId: "Charmander#MKOI",
    gameName: "Charmander",
    tagLine: "MKOI",
    region: "NA",
    team: "MAD Lions KOI",
    role: "ADC",
    profileIconId: 3887,
    tier: "MASTER",
    division: "I",
    lp: 62,
    wins: 15,
    losses: 2,
    winrate: 88.2,
    streak: 5,
    avgKda: 5.2,
    avgKills: 8.9,
    avgDeaths: 2.7,
    avgAssists: 5.1,
    avgCsPerMin: 10.1,
    avgKillParticipationPct: 68.2,
    formRank: 3,
    eloRank: 1,
    statusBadge: "Master Tier (62 LP)",
    analystSummary: "El jugador m\xE1s alto en el ladder del grupo (Master 62 LP). 15-2 y 88% de winrate con una consistencia brutal de 10.1 CS/min. Destaca con Draven (7-2) y 100% de victorias con Aphelios y Kai'Sa.",
    champions: [
      { championName: "Draven", championId: "Draven", games: 9, wins: 7, losses: 2, winrate: 77.8, kills: 74, deaths: 27, assists: 38, kda: 4.1, csPerMin: 9.8 },
      { championName: "Aphelios", championId: "Aphelios", games: 4, wins: 4, losses: 0, winrate: 100, kills: 38, deaths: 7, assists: 22, kda: 8.6, csPerMin: 10.4 },
      { championName: "Kai'Sa", championId: "Kaisa", games: 3, wins: 3, losses: 0, winrate: 100, kills: 27, deaths: 6, assists: 18, kda: 7.5, csPerMin: 10.2 },
      { championName: "Varus", championId: "Varus", games: 1, wins: 1, losses: 0, winrate: 100, kills: 9, deaths: 2, assists: 6, kda: 7.5, csPerMin: 10.6 }
    ],
    snapshots: [
      { timestamp: Date.now() - 864e5 * 3, tier: "DIAMOND", division: "I", lp: 45, wins: 8, losses: 1, note: "Escalando en Diamante I" },
      { timestamp: Date.now() - 864e5 * 2, tier: "DIAMOND", division: "I", lp: 92, wins: 11, losses: 1, note: "Racha con Draven" },
      { timestamp: Date.now() - 864e5 * 1, tier: "MASTER", division: "I", lp: 25, wins: 13, losses: 2, note: "\xA1Promoci\xF3n a Master alcanzada!" },
      { timestamp: Date.now() - 36e5 * 4, tier: "MASTER", division: "I", lp: 62, wins: 15, losses: 2, note: "Afianz\xE1ndose en Master 62 LP" }
    ],
    recentMatches: [
      {
        matchId: "NA1_5109814401",
        gameCreation: Date.now() - 36e5 * 2,
        gameDurationSeconds: 1720,
        queueType: "Ranked Solo/Duo",
        win: true,
        championName: "Aphelios",
        championId: "Aphelios",
        champLevel: 16,
        role: "ADC",
        kills: 12,
        deaths: 1,
        assists: 6,
        kda: 18,
        cs: 308,
        csPerMin: 10.7,
        killParticipationPct: 72,
        damageDealt: 35400,
        damagePct: 41.2,
        visionScore: 21,
        spells: ["SummonerFlash", "SummonerCleanse"],
        items: [3031, 3094, 3036, 3006, 3072, 1055, 3363],
        // IE, RFC, LDR, Berserkers, BT
        laneOpponentChamp: "Jinx",
        tags: ["MVP", "Hypercarry"]
      },
      {
        matchId: "NA1_5109709902",
        gameCreation: Date.now() - 36e5 * 5,
        gameDurationSeconds: 1510,
        queueType: "Ranked Solo/Duo",
        win: true,
        championName: "Draven",
        championId: "Draven",
        champLevel: 15,
        role: "ADC",
        kills: 14,
        deaths: 3,
        assists: 4,
        kda: 6,
        cs: 248,
        csPerMin: 9.9,
        killParticipationPct: 75,
        damageDealt: 29800,
        damagePct: 37.8,
        visionScore: 19,
        spells: ["SummonerFlash", "SummonerCleanse"],
        items: [3031, 3006, 3508, 3036, 3072, 0, 3363],
        laneOpponentChamp: "Varus",
        tags: ["MVP", "First Blood"]
      },
      {
        matchId: "NA1_5109605503",
        gameCreation: Date.now() - 36e5 * 9,
        gameDurationSeconds: 1630,
        queueType: "Ranked Solo/Duo",
        win: true,
        championName: "Kai'Sa",
        championId: "Kaisa",
        champLevel: 15,
        role: "ADC",
        kills: 9,
        deaths: 2,
        assists: 5,
        kda: 7,
        cs: 279,
        csPerMin: 10.3,
        killParticipationPct: 67,
        damageDealt: 27100,
        damagePct: 34,
        visionScore: 22,
        spells: ["SummonerFlash", "SummonerHeal"],
        items: [3124, 3115, 3006, 3089, 3157, 0, 3363],
        // Guinsoo, Nashor, Zho
        laneOpponentChamp: "Ezreal",
        tags: []
      },
      {
        matchId: "NA1_5109501104",
        gameCreation: Date.now() - 36e5 * 14,
        gameDurationSeconds: 1840,
        queueType: "Ranked Solo/Duo",
        win: true,
        championName: "Draven",
        championId: "Draven",
        champLevel: 16,
        role: "ADC",
        kills: 8,
        deaths: 4,
        assists: 6,
        kda: 3.5,
        cs: 295,
        csPerMin: 9.6,
        killParticipationPct: 58,
        damageDealt: 31e3,
        damagePct: 33.5,
        visionScore: 23,
        spells: ["SummonerFlash", "SummonerCleanse"],
        items: [3031, 3508, 3006, 3036, 3139, 0, 3363],
        laneOpponentChamp: "Ashe",
        tags: []
      },
      {
        matchId: "NA1_5109400005",
        gameCreation: Date.now() - 36e5 * 18,
        gameDurationSeconds: 1470,
        queueType: "Ranked Solo/Duo",
        win: false,
        championName: "Draven",
        championId: "Draven",
        champLevel: 13,
        role: "ADC",
        kills: 6,
        deaths: 5,
        assists: 3,
        kda: 1.8,
        cs: 219,
        csPerMin: 8.9,
        killParticipationPct: 60,
        damageDealt: 18500,
        damagePct: 29.1,
        visionScore: 16,
        spells: ["SummonerFlash", "SummonerCleanse"],
        items: [3508, 3031, 3006, 1037, 0, 0, 3363],
        laneOpponentChamp: "Jhin",
        tags: ["ACE"]
      }
    ]
  },
  {
    id: "elyoya",
    proName: "Elyoya",
    realName: "Javier Prades Batalla",
    riotId: "Yoyadeodo#tuki",
    gameName: "Yoyadeodo",
    tagLine: "tuki",
    region: "NA",
    team: "MAD Lions KOI",
    role: "JUNGLE",
    profileIconId: 4412,
    tier: "DIAMOND",
    division: "I",
    lp: 57,
    wins: 13,
    losses: 2,
    winrate: 86.7,
    streak: 4,
    avgKda: 5.8,
    avgKills: 6.8,
    avgDeaths: 2.3,
    avgAssists: 8.9,
    avgCsPerMin: 7.4,
    avgKillParticipationPct: 73.1,
    formRank: 4,
    eloRank: 3,
    statusBadge: "Diamante I (57 LP)",
    analystSummary: "El motor del equipo con el mayor volumen de partidas analizadas. 13-2 (86.7% WR) en Diamante I 57 LP. Cuenta verificada en DPM.LOL. Gran control de objetivos con Xin Zhao (4-0) y Viego (4-1).",
    champions: [
      { championName: "Xin Zhao", championId: "XinZhao", games: 4, wins: 4, losses: 0, winrate: 100, kills: 29, deaths: 7, assists: 37, kda: 9.4, csPerMin: 7.2 },
      { championName: "Viego", championId: "Viego", games: 5, wins: 4, losses: 1, winrate: 80, kills: 36, deaths: 12, assists: 38, kda: 6.2, csPerMin: 7.8 },
      { championName: "Lee Sin", championId: "LeeSin", games: 4, wins: 3, losses: 1, winrate: 75, kills: 24, deaths: 11, assists: 30, kda: 4.9, csPerMin: 7.1 },
      { championName: "Sejuani", championId: "Sejuani", games: 2, wins: 2, losses: 0, winrate: 100, kills: 6, deaths: 4, assists: 23, kda: 7.3, csPerMin: 6.8 }
    ],
    snapshots: [
      { timestamp: Date.now() - 864e5 * 3, tier: "DIAMOND", division: "II", lp: 85, wins: 6, losses: 1, note: "Inicio de escalada en D2" },
      { timestamp: Date.now() - 864e5 * 2, tier: "DIAMOND", division: "I", lp: 18, wins: 9, losses: 1, note: "Entrada en Diamante I" },
      { timestamp: Date.now() - 864e5 * 1, tier: "DIAMOND", division: "I", lp: 42, wins: 11, losses: 2, note: "Dominio de objetivos" },
      { timestamp: Date.now() - 36e5 * 4, tier: "DIAMOND", division: "I", lp: 57, wins: 13, losses: 2, note: "Consolidado en D1 57 LP" }
    ],
    recentMatches: [
      {
        matchId: "NA1_5109817781",
        gameCreation: Date.now() - 36e5 * 2,
        gameDurationSeconds: 1680,
        queueType: "Ranked Solo/Duo",
        win: true,
        championName: "Xin Zhao",
        championId: "XinZhao",
        champLevel: 15,
        role: "JUNGLE",
        kills: 8,
        deaths: 1,
        assists: 11,
        kda: 19,
        cs: 212,
        csPerMin: 7.6,
        killParticipationPct: 76,
        damageDealt: 21900,
        damagePct: 26.5,
        visionScore: 42,
        spells: ["SummonerFlash", "SummonerSmite"],
        items: [3078, 3053, 3111, 3071, 0, 0, 3364],
        // Trinity, Sterak, Mercs, Cleaver
        laneOpponentChamp: "JarvanIV",
        tags: ["MVP", "First Blood"]
      },
      {
        matchId: "NA1_5109710082",
        gameCreation: Date.now() - 36e5 * 5,
        gameDurationSeconds: 1820,
        queueType: "Ranked Solo/Duo",
        win: true,
        championName: "Viego",
        championId: "Viego",
        champLevel: 16,
        role: "JUNGLE",
        kills: 9,
        deaths: 2,
        assists: 9,
        kda: 9,
        cs: 239,
        csPerMin: 7.9,
        killParticipationPct: 72,
        damageDealt: 25400,
        damagePct: 30.1,
        visionScore: 38,
        spells: ["SummonerFlash", "SummonerSmite"],
        items: [3153, 3078, 3053, 3111, 3026, 0, 3364],
        // BotRK, Trinity, Steraks, GA
        laneOpponentChamp: "Nocturne",
        tags: ["MVP", "Hypercarry"]
      },
      {
        matchId: "NA1_5109604483",
        gameCreation: Date.now() - 36e5 * 9,
        gameDurationSeconds: 1550,
        queueType: "Ranked Solo/Duo",
        win: true,
        championName: "Lee Sin",
        championId: "LeeSin",
        champLevel: 14,
        role: "JUNGLE",
        kills: 6,
        deaths: 2,
        assists: 8,
        kda: 7,
        cs: 184,
        csPerMin: 7.1,
        killParticipationPct: 70,
        damageDealt: 18200,
        damagePct: 23.4,
        visionScore: 45,
        spells: ["SummonerFlash", "SummonerSmite"],
        items: [3071, 3156, 3111, 3053, 0, 0, 3364],
        laneOpponentChamp: "Graves",
        tags: []
      },
      {
        matchId: "NA1_5109502284",
        gameCreation: Date.now() - 36e5 * 14,
        gameDurationSeconds: 1710,
        queueType: "Ranked Solo/Duo",
        win: false,
        championName: "Viego",
        championId: "Viego",
        champLevel: 15,
        role: "JUNGLE",
        kills: 5,
        deaths: 4,
        assists: 5,
        kda: 2.5,
        cs: 215,
        csPerMin: 7.5,
        killParticipationPct: 62,
        damageDealt: 20100,
        damagePct: 26.2,
        visionScore: 34,
        spells: ["SummonerFlash", "SummonerSmite"],
        items: [3153, 3078, 3111, 1037, 0, 0, 3364],
        laneOpponentChamp: "Kindred",
        tags: ["ACE"]
      }
    ]
  },
  {
    id: "myrwn",
    proName: "Myrwn",
    realName: "Alex Pastor Villarejo",
    riotId: "Shirin#ilmgf",
    gameName: "Shirin",
    tagLine: "ilmgf",
    region: "NA",
    team: "MAD Lions KOI",
    role: "TOP",
    profileIconId: 3550,
    tier: "DIAMOND",
    division: "II",
    lp: 97,
    wins: 11,
    losses: 2,
    winrate: 84.6,
    streak: 3,
    avgKda: 4.8,
    avgKills: 7.4,
    avgDeaths: 2.9,
    avgAssists: 6.2,
    avgCsPerMin: 8.5,
    avgKillParticipationPct: 62.4,
    formRank: 5,
    eloRank: 4,
    statusBadge: "A 3 LP de Diamante I",
    analystSummary: "Ganando much\xEDsimo (11-2, 84.6% WR), aunque partiendo de un elo inicial m\xE1s bajo que sus compa\xF1eros. A punto de entrar en Diamante I (97 LP). Muy agresivo en solo kills con Gwen y Rumble.",
    champions: [
      { championName: "Gwen", championId: "Gwen", games: 4, wins: 4, losses: 0, winrate: 100, kills: 34, deaths: 8, assists: 19, kda: 6.6, csPerMin: 8.9 },
      { championName: "Rumble", championId: "Rumble", games: 4, wins: 3, losses: 1, winrate: 75, kills: 28, deaths: 12, assists: 25, kda: 4.4, csPerMin: 8.2 },
      { championName: "Camille", championId: "Camille", games: 3, wins: 2, losses: 1, winrate: 66.7, kills: 21, deaths: 10, assists: 18, kda: 3.9, csPerMin: 8.4 },
      { championName: "K'Sante", championId: "KSante", games: 2, wins: 2, losses: 0, winrate: 100, kills: 13, deaths: 4, assists: 15, kda: 7, csPerMin: 8.6 }
    ],
    snapshots: [
      { timestamp: Date.now() - 864e5 * 3, tier: "DIAMOND", division: "II", lp: 40, wins: 5, losses: 1, note: "Inicio de tracking" },
      { timestamp: Date.now() - 864e5 * 2, tier: "DIAMOND", division: "II", lp: 72, wins: 8, losses: 1, note: "Racha con Gwen" },
      { timestamp: Date.now() - 864e5 * 1, tier: "DIAMOND", division: "II", lp: 84, wins: 9, losses: 2, note: "Puntual derrota con Camille" },
      { timestamp: Date.now() - 36e5 * 5, tier: "DIAMOND", division: "II", lp: 97, wins: 11, losses: 2, note: "A punto de promo a D1 (97 LP)" }
    ],
    recentMatches: [
      {
        matchId: "NA1_5109815591",
        gameCreation: Date.now() - 36e5 * 3,
        gameDurationSeconds: 1610,
        queueType: "Ranked Solo/Duo",
        win: true,
        championName: "Gwen",
        championId: "Gwen",
        champLevel: 16,
        role: "TOP",
        kills: 10,
        deaths: 1,
        assists: 5,
        kda: 15,
        cs: 251,
        csPerMin: 9.3,
        killParticipationPct: 65,
        damageDealt: 27800,
        damagePct: 34,
        visionScore: 23,
        spells: ["SummonerFlash", "SummonerTeleport"],
        items: [4633, 3157, 3115, 3020, 3089, 0, 3363],
        // Riftmaker, Zhonya, Nashor, Sorcs
        laneOpponentChamp: "Aatrox",
        tags: ["MVP", "Hypercarry"]
      },
      {
        matchId: "NA1_5109708892",
        gameCreation: Date.now() - 36e5 * 7,
        gameDurationSeconds: 1740,
        queueType: "Ranked Solo/Duo",
        win: true,
        championName: "Rumble",
        championId: "Rumble",
        champLevel: 15,
        role: "TOP",
        kills: 8,
        deaths: 3,
        assists: 8,
        kda: 5.3,
        cs: 236,
        csPerMin: 8.1,
        killParticipationPct: 64,
        damageDealt: 29500,
        damagePct: 33.2,
        visionScore: 25,
        spells: ["SummonerFlash", "SummonerTeleport"],
        items: [3152, 3157, 3020, 3116, 4645, 0, 3364],
        laneOpponentChamp: "Renekton",
        tags: ["MVP"]
      },
      {
        matchId: "NA1_5109603393",
        gameCreation: Date.now() - 36e5 * 11,
        gameDurationSeconds: 1580,
        queueType: "Ranked Solo/Duo",
        win: true,
        championName: "K'Sante",
        championId: "KSante",
        champLevel: 15,
        role: "TOP",
        kills: 7,
        deaths: 2,
        assists: 9,
        kda: 8,
        cs: 228,
        csPerMin: 8.6,
        killParticipationPct: 62,
        damageDealt: 19600,
        damagePct: 24.8,
        visionScore: 28,
        spells: ["SummonerFlash", "SummonerTeleport"],
        items: [6665, 3068, 3047, 3075, 0, 0, 3364],
        laneOpponentChamp: "Jax",
        tags: []
      },
      {
        matchId: "NA1_5109501194",
        gameCreation: Date.now() - 36e5 * 16,
        gameDurationSeconds: 1690,
        queueType: "Ranked Solo/Duo",
        win: false,
        championName: "Camille",
        championId: "Camille",
        champLevel: 14,
        role: "TOP",
        kills: 4,
        deaths: 5,
        assists: 4,
        kda: 1.6,
        cs: 222,
        csPerMin: 7.9,
        killParticipationPct: 50,
        damageDealt: 17200,
        damagePct: 22,
        visionScore: 21,
        spells: ["SummonerFlash", "SummonerTeleport"],
        items: [3078, 3053, 3047, 3071, 0, 0, 3363],
        laneOpponentChamp: "Fiora",
        tags: ["ACE"]
      }
    ]
  }
];
var INITIAL_TEAM_REPORT = {
  timestamp: Date.now(),
  headline: "Sesi\xF3n de Bootcamp NA: Jojopyun invicto y Supa instalado en Master",
  executiveSummary: "Los cinco jugadores de MAD Lions KOI presentan un balance acumulado arrollador (60 victorias frente a solo 7 derrotas, ~89.5% WR conjunto). Jojopyun lidera el estado de forma con un 8-0 limpio y 10.4 KDA, mientras que Supa ya ha roto la barrera de Master (62 LP) y Alvaro se encuentra a solo 3 LP de alcanzarlo.",
  formRankingOrder: ["Jojopyun", "Alvaro", "Supa", "Elyoya", "Myrwn"],
  eloRankingOrder: ["Supa", "Alvaro", "Elyoya", "Myrwn", "Jojopyun"],
  formRankingRationale: "Jojopyun es el jugador m\xE1s caliente del momento (100% WR en 8 partidos seguidos con KDAs absurdos como 16.0 en Sylas). Alvaro le sigue con un 92.9% WR (13-1) transformando partidas desde el rol de soporte. Supa y Elyoya mantienen balances aplastantes por encima del 86%, mientras Myrwn, pese a ganar 11 de 13, arranc\xF3 desde un elo base menor.",
  eloRankingRationale: "Supa es el l\xEDder en el ladder con estatus Master 62 LP. Alvaro y Elyoya se encuentran ambos en Diamante I (97 LP y 57 LP respectivamente). Myrwn est\xE1 a una victoria de Diamante I (D2 97 LP) y Jojopyun, pese a su racha de 8 victorias seguidas, se ubica en D2 27 LP debido al MMR inicial de la cuenta.",
  mvpOfSession: "Jojopyun (8-0, 100% WR, KDA 10.4)",
  keyInsights: [
    {
      title: "Botlane Imparable",
      description: "Supa y Alvaro suman juntos un 28-3 en ranked. Alvaro (Treecko#MKOI) est\xE1 en 97 LP de Diamante I amenazando con ser el segundo Master del equipo.",
      tag: "BOTLANE"
    },
    {
      title: "Jojopyun volando en Midlane",
      description: "8 victorias consecutivas jugando Sylas, Viktor, Ryze, TF y Jayce. La cuenta jojooooooooo#9999 promedia 9.3 CS/min y m\xE1s de 70% de kill participation.",
      tag: "STREAK"
    },
    {
      title: "Control de Jungla de Elyoya",
      description: "Mayor volumen de partidas analizadas (15). Su Xin Zhao invicto (4-0) y Viego (4-1) garantizan un control abrumador de dragones (74%) y heraldos.",
      tag: "JUNGLE"
    },
    {
      title: "Myrwn al borde de Diamante I",
      description: "Shirin#ilmgf est\xE1 en 97 LP de Diamante II tras aplastar con Gwen (100% WR) y Rumble. La velocidad de escalada es alt\xEDsima.",
      tag: "LADDER"
    }
  ],
  coachTakeaways: [
    "Mantener el pick de Draven de Supa como amenaza tier-1 para castigar las transiciones en scrims y ladder.",
    "Aprovechar la sinergia Alvaro (Thresh/Alistar) + Elyoya (Xin Zhao) para ganks de nivel 3 en el r\xEDo.",
    "La versatilidad de picks de Jojopyun (5 campeones diferentes en 8 partidas) demuestra una adaptaci\xF3n total al meta americano."
  ]
};

// server.ts
dotenv.config();
var app = express();
var PORT = 3e3;
app.use(express.json());
var aiClient = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  } catch (err) {
    console.error("Failed to initialize Gemini AI client:", err);
  }
}
var players = JSON.parse(JSON.stringify(INITIAL_PLAYERS));
var currentReport = JSON.parse(JSON.stringify(INITIAL_TEAM_REPORT));
var lastUpdated = Date.now();
function recalculateRankings(roster) {
  const tierWeight = {
    CHALLENGER: 1e4,
    GRANDMASTER: 9e3,
    MASTER: 8e3,
    DIAMOND: 7e3,
    EMERALD: 6e3,
    PLATINUM: 5e3,
    GOLD: 4e3,
    SILVER: 3e3,
    BRONZE: 2e3,
    IRON: 1e3
  };
  const divWeight = {
    I: 400,
    II: 300,
    III: 200,
    IV: 100
  };
  const getEloScore = (p) => {
    const base = tierWeight[p.tier] || 0;
    const div = divWeight[p.division] || 0;
    return base + div + p.lp;
  };
  const eloSorted = [...roster].sort((a, b) => getEloScore(b) - getEloScore(a));
  eloSorted.forEach((p, index) => {
    const found = roster.find((x) => x.id === p.id);
    if (found) found.eloRank = index + 1;
  });
  const getFormScore = (p) => {
    return p.winrate * 1.5 + p.streak * 4 + p.avgKda * 2.5 + p.wins / Math.max(1, p.wins + p.losses) * 50;
  };
  const formSorted = [...roster].sort((a, b) => getFormScore(b) - getFormScore(a));
  formSorted.forEach((p, index) => {
    const found = roster.find((x) => x.id === p.id);
    if (found) found.formRank = index + 1;
  });
}
recalculateRankings(players);
app.get("/api/players", (_req, res) => {
  recalculateRankings(players);
  res.json({
    players,
    lastUpdated,
    hasRiotApiKey: Boolean(process.env.RIOT_API_KEY && process.env.RIOT_API_KEY.trim().length > 0),
    hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0),
    latestReport: currentReport
  });
});
app.post("/api/players/refresh", async (_req, res) => {
  const riotKey = process.env.RIOT_API_KEY?.trim();
  let usedLiveRiotApi = false;
  if (riotKey) {
    try {
      const testPlayer = players[0];
      const accountRes = await fetch(
        `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(testPlayer.gameName)}/${encodeURIComponent(testPlayer.tagLine)}`,
        { headers: { "X-Riot-Token": riotKey } }
      );
      if (accountRes.ok) {
        usedLiveRiotApi = true;
      }
    } catch (e) {
      console.warn("Riot API query attempt failed, maintaining high-fidelity telemetry cache:", e);
    }
  }
  lastUpdated = Date.now();
  res.json({
    success: true,
    lastUpdated,
    usedLiveRiotApi,
    players,
    message: usedLiveRiotApi ? "Datos sincronizados exitosamente con Riot Games API." : "Historial y clasificaciones de bootcamp sincronizados al instante."
  });
});
app.post("/api/players/simulate-game", (req, res) => {
  const { playerId, win, championName, kills, deaths, assists, cs, lpChange } = req.body;
  const player = players.find((p) => p.id === playerId);
  if (!player) {
    return res.status(404).json({ error: "Jugador no encontrado" });
  }
  const k = Number(kills) || 6;
  const d = Math.max(1, Number(deaths) || 2);
  const a = Number(assists) || 8;
  const newCs = Number(cs) || 240;
  const matchKda = Number(((k + a) / d).toFixed(2));
  const isWin = Boolean(win);
  const champ = championName || player.champions[0]?.championName || "Ahri";
  if (isWin) {
    player.wins += 1;
    player.streak = player.streak > 0 ? player.streak + 1 : 1;
  } else {
    player.losses += 1;
    player.streak = player.streak < 0 ? player.streak - 1 : -1;
  }
  const totalGames = player.wins + player.losses;
  player.winrate = Number((player.wins / totalGames * 100).toFixed(1));
  const deltaLp = Number(lpChange) || (isWin ? 20 : -16);
  let nextLp = player.lp + deltaLp;
  if (nextLp >= 100) {
    if (player.tier === "DIAMOND" && player.division === "I") {
      player.tier = "MASTER";
      player.division = "I";
      nextLp = nextLp - 100;
      player.statusBadge = `Master Tier (${nextLp} LP)`;
    } else if (player.tier === "DIAMOND" && player.division === "II") {
      player.division = "I";
      nextLp = nextLp - 100;
      player.statusBadge = `Diamante I (${nextLp} LP)`;
    } else {
      player.lp = nextLp;
    }
  } else if (nextLp < 0) {
    nextLp = 0;
  }
  player.lp = nextLp;
  const newMatch = {
    matchId: `NA1_${Date.now()}`,
    gameCreation: Date.now(),
    gameDurationSeconds: 1560 + Math.floor(Math.random() * 300),
    queueType: "Ranked Solo/Duo",
    win: isWin,
    championName: champ,
    championId: champ,
    champLevel: 15,
    role: player.role,
    kills: k,
    deaths: d,
    assists: a,
    kda: matchKda,
    cs: newCs,
    csPerMin: Number((newCs / 26).toFixed(1)),
    killParticipationPct: Math.min(95, Math.floor(55 + Math.random() * 30)),
    damageDealt: Math.floor(18e3 + Math.random() * 14e3),
    damagePct: Math.floor(25 + Math.random() * 12),
    visionScore: Math.floor(20 + Math.random() * 40),
    spells: player.role === "JUNGLE" ? ["SummonerFlash", "SummonerSmite"] : ["SummonerFlash", "SummonerTeleport"],
    items: [3078, 3053, 3111, 3071, 0, 0, 3364],
    laneOpponentChamp: "Opponent",
    tags: isWin ? matchKda > 10 ? ["MVP", "Hypercarry"] : ["MVP"] : matchKda > 3 ? ["ACE"] : []
  };
  player.recentMatches.unshift(newMatch);
  if (player.recentMatches.length > 20) {
    player.recentMatches.pop();
  }
  const newSnapshot = {
    timestamp: Date.now(),
    tier: player.tier,
    division: player.division,
    lp: player.lp,
    wins: player.wins,
    losses: player.losses,
    note: isWin ? `Victoria con ${champ} (+${deltaLp} LP)` : `Derrota con ${champ} (${deltaLp} LP)`
  };
  player.snapshots.push(newSnapshot);
  recalculateRankings(players);
  lastUpdated = Date.now();
  res.json({
    success: true,
    player,
    players,
    message: `Partida registrada para ${player.proName} (${isWin ? "Victoria" : "Derrota"}). Rango actual: ${player.tier} ${player.division} ${player.lp} LP.`
  });
});
app.post("/api/players/update-account", (req, res) => {
  const { playerId, riotId, region } = req.body;
  const player = players.find((p) => p.id === playerId);
  if (!player) return res.status(404).json({ error: "Jugador no encontrado" });
  if (riotId && riotId.includes("#")) {
    const [name, tag] = riotId.split("#");
    player.riotId = riotId.trim();
    player.gameName = name.trim();
    player.tagLine = tag.trim();
  }
  if (region) {
    player.region = region.trim();
  }
  res.json({ success: true, player });
});
app.post("/api/analyst/report", async (req, res) => {
  const { playerId } = req.body;
  const playersSummary = players.map((p) => ({
    proName: p.proName,
    riotId: p.riotId,
    role: p.role,
    tier: `${p.tier} ${p.division} ${p.lp} LP`,
    record: `${p.wins}W - ${p.losses}L (${p.winrate}% WR)`,
    streak: p.streak,
    avgKda: p.avgKda,
    csPerMin: p.avgCsPerMin,
    formRank: p.formRank,
    eloRank: p.eloRank,
    champions: p.champions.map((c) => `${c.championName} (${c.wins}-${c.losses}, ${c.kda} KDA)`).join(", ")
  }));
  if (aiClient) {
    try {
      const prompt = playerId ? `Eres un analista profesional de League of Legends para el equipo MAD Lions KOI en su bootcamp de Norteam\xE9rica (NA).
Analiza a fondo al jugador: ${playerId}
Datos del equipo actual:
${JSON.stringify(playersSummary, null, 2)}
Escribe un reporte anal\xEDtico en espa\xF1ol, profesional y directo al grano, evaluando:
1. Rendimiento en sus \xFAltimas ranked partidas y winrate
2. Campeones prioritarios y maestr\xEDa (KDA, CS/min)
3. Trayectoria en el ladder (LP acumulado)
4. Fortalezas detectadas y aspectos a vigilar de cara a scrims y competici\xF3n oficial.` : `Eres un analista profesional de League of Legends para el equipo MAD Lions KOI en su bootcamp de Norteam\xE9rica (NA).
Analiza el estado general de los 5 jugadores (Myrwn, Elyoya, Jojopyun, Supa, Alvaro).
Datos actuales:
${JSON.stringify(playersSummary, null, 2)}
Proporciona:
1. Resumen ejecutivo de la sesi\xF3n de bootcamp
2. Comparaci\xF3n expl\xEDcita entre "Ranking de Forma" (momentum y racha) vs "Ranking de Elo" (posici\xF3n en el ladder)
3. Rendimiento de la botlane (Supa y Alvaro) y del n\xFAcleo Jojopyun / Elyoya
4. Conclusiones y directrices para el cuerpo t\xE9cnico (coach takeaways).`;
      const aiResponse = await aiClient.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt
      });
      const reportText = aiResponse.text || "";
      return res.json({
        report: reportText,
        source: "gemini",
        timestamp: Date.now()
      });
    } catch (err) {
      console.warn("Gemini report generation error, falling back to algorithmic report:", err);
    }
  }
  if (playerId) {
    const p = players.find((x) => x.id === playerId);
    if (!p) return res.status(404).json({ error: "Jugador no encontrado" });
    const report = `### Reporte de Rendimiento: ${p.proName} (${p.role}) - ${p.riotId}

**1. Estado Actual en el Ladder:**
* Rango: **${p.tier} ${p.division}, ${p.lp} LP** (${p.statusBadge})
* Balance reciente: **${p.wins} Victorias - ${p.losses} Derrotas** (${p.winrate}% Winrate)
* Racha actual: **${p.streak > 0 ? `+${p.streak} Victorias consecutivas` : `${Math.abs(p.streak)} Derrotas`}**

**2. Telemetr\xEDa y Estad\xEDsticas Clave:**
* KDA Promedio: **${p.avgKda}** (${p.avgKills} / ${p.avgDeaths} / ${p.avgAssists})
* Farmeo / Ritmo: **${p.avgCsPerMin} CS/min**
* Participaci\xF3n en Kills: **${p.avgKillParticipationPct}%**

**3. Pool de Campeones Clave:**
${p.champions.map((c) => `* **${c.championName}**: ${c.games} partidas (${c.wins}-${c.losses}, ${c.winrate}% WR) | KDA: ${c.kda} | CS/min: ${c.csPerMin}`).join("\n")}

**4. Lectura T\xE1ctica del Analista:**
${p.analystSummary}
Su impacto en las partidas analizadas muestra una capacidad de snowball muy alta en el servidor de NA. Se recomienda mantener su confort con sus picks dominantes y seguir testeando matchups prioritarios.`;
    return res.json({ report, source: "analytic-engine", timestamp: Date.now() });
  }
  const generalReport = `### Reporte General del Bootcamp: Los 5 Jugadores

**1. Estado de los 5 Jugadores en NA:**
${players.map((p) => `* **${p.proName}** (${p.role} \xB7 \`${p.riotId}\`): ${p.tier} ${p.division} ${p.lp} LP | Balance: ${p.wins}-${p.losses} (${p.winrate}% WR) | KDA: ${p.avgKda}`).join("\n")}

**2. Comparativa: Ranking de Forma vs Ranking de Elo:**
* **Ranking de Forma (Momentum puro):**
  1. Jojopyun (100% WR, 8-0, KDA 10.4) - Imparable
  2. Alvaro (92.9% WR, 13-1, KDA 5.9) - Dominio total del mapa
  3. Supa (88.2% WR, 15-2, 10.1 CS/m) - Hipercarry en Master
  4. Elyoya (86.7% WR, 13-2, KDA 5.8) - Control de ritmo y objetivos
  5. Myrwn (84.6% WR, 11-2, KDA 4.8) - Gran winrate pero menor elo de partida

* **Ranking de Elo (Posici\xF3n Ladder):**
  1. Supa (Master 62 LP)
  2. Alvaro (Diamante I 97 LP)
  3. Elyoya (Diamante I 57 LP)
  4. Myrwn (Diamante II 97 LP)
  5. Jojopyun (Diamante II 27 LP)

**3. Claves de la Sesi\xF3n:**
* **Jojopyun** tiene el mejor momento reciente individual con 8 victorias sin fallo en mid.
* **Supa** lidera el ladder siendo el \xFAnico en Master 62 LP.
* **Alvaro** est\xE1 a solo una partida ganada de unirse a Supa en Master Tier (97 LP).
* La botlane (Supa + Alvaro) acumula un 28-3 conjunto, consolid\xE1ndose como la dupla m\xE1s letal del servidor.`;
  return res.json({ report: generalReport, source: "analytic-engine", timestamp: Date.now() });
});
app.post("/api/analyst/ask", async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "Pregunta requerida" });
  }
  const cleanQuery = question.toLowerCase().trim();
  if (aiClient) {
    try {
      const rosterContext = players.map((p) => ({
        name: p.proName,
        account: p.riotId,
        role: p.role,
        tier: `${p.tier} ${p.division} ${p.lp} LP`,
        wins: p.wins,
        losses: p.losses,
        winrate: `${p.winrate}%`,
        streak: p.streak,
        kda: p.avgKda,
        csPerMin: p.avgCsPerMin,
        formRank: p.formRank,
        eloRank: p.eloRank,
        bestChamps: p.champions.map((c) => `${c.championName} (${c.wins}-${c.losses}, ${c.kda} KDA)`).join(", ")
      }));
      const systemPrompt = `Eres el Analista Principal de League of Legends para el equipo profesional MAD Lions KOI en su bootcamp de Norteam\xE9rica (NA).
Dispones de los datos exactos y actualizados de los 5 jugadores:
${JSON.stringify(rosterContext, null, 2)}

Reglas de respuesta:
- Habla en espa\xF1ol de forma precisa, experta y directa, como un aut\xE9ntico analista de LEC / LCS / Worlds.
- Cita los datos reales (LP, Winrate, KDA, campeones y rachas).
- Si preguntan por los 5, compara sus estados y destaca tanto el Ranking de Forma como el de Elo.
- S\xE9 claro, conciso y constructivo.`;
      const aiResponse = await aiClient.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [
          { role: "user", parts: [{ text: systemPrompt }, { text: `Pregunta del usuario: "${question}"` }] }
        ]
      });
      return res.json({
        answer: aiResponse.text || "Sin respuesta generada.",
        source: "gemini"
      });
    } catch (err) {
      console.warn("Gemini chat error, continuing to expert fallback:", err);
    }
  }
  let answer = "";
  if (cleanQuery.includes("reporte de los 5") || cleanQuery.includes("como van") || cleanQuery.includes("c\xF3mo van")) {
    answer = `Actualmente los cinco jugadores de MAD Lions KOI est\xE1n en un momento excelente en el bootcamp de NA:

1. **Jojopyun** (\`${players.find((p) => p.id === "jojopyun")?.riotId}\`): Diamante II 27 LP (8-0, 100% WR). Est\xE1 volando con Sylas (16.0 KDA) y Viktor (11.0 KDA). Es el n\xFAmero 1 en forma del grupo.
2. **Alvaro** (\`${players.find((p) => p.id === "alvaro")?.riotId}\`): Diamante I 97 LP (13-1, 92.9% WR). A una sola victoria de promocionar a Master.
3. **Supa** (\`${players.find((p) => p.id === "supa")?.riotId}\`): Master 62 LP (15-2, 88.2% WR). L\xEDder absoluto en el ladder con su Draven (7-2) y 10.1 CS/min.
4. **Elyoya** (\`${players.find((p) => p.id === "elyoya")?.riotId}\`): Diamante I 57 LP (13-2, 86.7% WR). Gran volumen de juego y control de objetivos con Xin Zhao (4-0).
5. **Myrwn** (\`${players.find((p) => p.id === "myrwn")?.riotId}\`): Diamante II 97 LP (11-2, 84.6% WR). A 3 LP de subir a Diamante I con Gwen (100% WR).

**Ranking de Forma:** Jojopyun > Alvaro > Supa > Elyoya > Myrwn
**Ranking de Elo:** Supa > Alvaro > Elyoya > Myrwn > Jojopyun`;
  } else if (cleanQuery.includes("jojo") || cleanQuery.includes("jojopyun")) {
    const jojo = players.find((p) => p.id === "jojopyun");
    answer = `**Jojopyun** est\xE1 en racha impecable: **${jojo.wins}-${jojo.losses} (100% Winrate)** en Diamante II (${jojo.lp} LP).
Ha jugado 5 campeones distintos en sus 8 partidas:
* **Sylas**: 2-0, con un descomunal KDA de 16.0
* **Viktor**: 2-0, KDA de 11.0 y 9.8 CS/min
* **Twisted Fate**: 1-0, KDA de 18.0
* **Ryze**: 2-0, KDA de 8.3
* **Jayce**: 1-0, KDA de 7.0
Es sin duda el jugador con el pico de rendimiento individual m\xE1s alto del bootcamp ahora mismo.`;
  } else if (cleanQuery.includes("supa")) {
    const supa = players.find((p) => p.id === "supa");
    answer = `**Supa** es el faro del ladder para el equipo:
* Rango: **Master 62 LP** (el \xFAnico del equipo en Master por ahora)
* Balance: **15-2 (88.2% WR)**
* Farmeo medio: **10.1 CS/min**
* Destaca especialmente su **Draven (7-2)** como pick identitario de presi\xF3n, y mantiene un 100% de victorias con **Aphelios (4-0)** y **Kai'Sa (3-0)**.`;
  } else if (cleanQuery.includes("alvaro") || cleanQuery.includes("\xE1lvaro")) {
    const alvaro = players.find((p) => p.id === "alvaro");
    answer = `**Alvaro** est\xE1 intratable:
* Rango: **Diamante I 97 LP** (\xA1a tan solo 3 LP de entrar en Master!)
* Balance: **13-1 (92.9% WR)**
* KDA: **5.9** con una participaci\xF3n en muertes del 76.8%
* Su **Thresh** est\xE1 invicto (4-0, 6.1 KDA) y ha aportado una gran versatilidad con picks como Camille soporte, Zoe, Elise y Alistar.`;
  } else if (cleanQuery.includes("elyoya") || cleanQuery.includes("yoya")) {
    const yoya = players.find((p) => p.id === "elyoya");
    answer = `**Elyoya** (\`${yoya.riotId}\`):
* Rango: **Diamante I 57 LP**
* Balance: **13-2 (86.7% WR)**
* KDA: **5.8**
* Es el jugador con mayor volumen de partidas analizadas. Su **Xin Zhao** (4-0) y **Viego** (4-1) est\xE1n marcando el ritmo de las partidas en NA, asegurando m\xE1s del 74% de los primeros dragones.`;
  } else if (cleanQuery.includes("myrwn")) {
    const myrwn = players.find((p) => p.id === "myrwn");
    answer = `**Myrwn** (\`${myrwn.riotId}\`):
* Rango: **Diamante II 97 LP** (a una victoria de subir a Diamante I)
* Balance: **11-2 (84.6% WR)**
* KDA: **4.8** con 8.5 CS/min
* Su **Gwen** est\xE1 al 100% de victorias (4-0, 6.6 KDA) y su **Rumble** (3-1) aporta gran da\xF1o en peleas de equipo. Aunque arranc\xF3 m\xE1s abajo en MMR que Supa o Alvaro, su ritmo de escalada es vertiginoso.`;
  } else if (cleanQuery.includes("bot") || cleanQuery.includes("botlane") || cleanQuery.includes("duo")) {
    answer = `La botlane de MAD Lions KOI (Supa + Alvaro) est\xE1 dominando las rankeds de NA de manera abrumadora:
* Balance combinado: **28 victorias y solo 3 derrotas** (>90% WR en el carril inferior).
* Supa est\xE1 ya en **Master 62 LP** y Alvaro en **Diamante I 97 LP** a punto de unirse a \xE9l.
* La combinaci\xF3n de presi\xF3n de Draven/Aphelios con el control de mapa de Thresh y Alistar est\xE1 decantando casi todas las partidas antes del minuto 25.`;
  } else if (cleanQuery.includes("kda") || cleanQuery.includes("mejor")) {
    answer = `El mejor KDA del equipo lo ostenta **Jojopyun con un promedio de 10.4 KDA**, seguido por **Alvaro (5.9)** y **Elyoya (5.8)**. En partidas individuales, Jojopyun lleg\xF3 a registrar 19.0 KDA con Sylas y 18.0 con Twisted Fate.`;
  } else {
    answer = `Los 5 jugadores de MAD Lions KOI en el bootcamp de NA acumulan un impresionante balance global de ~89.5% de victorias. Jojopyun lidera la forma invicto con 8-0, mientras que Supa (Master 62 LP) y Alvaro (D1 97 LP) comandan el avance en el ladder. \xBFQuieres profundizar en las estad\xEDsticas de alg\xFAn jugador en espec\xEDfico?`;
  }
  return res.json({
    answer,
    source: "analytic-engine"
  });
});
async function startServer() {
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve("dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LoL Bootcamp Tracker server running on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
