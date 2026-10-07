#!/usr/bin/env python3
"""
Build data/live.json from the five monitored KOI accounts using OP.GG's
public web-facing endpoints.

Important:
- OP.GG does not publish this endpoint as a stable public developer API.
- This integration intentionally keeps the source isolated in one script so
  it can be replaced cleanly if OP.GG changes its internal endpoints.
- No Riot API key is required.
"""

from __future__ import annotations

import json
import math
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "data" / "monitored.json"
LIVE_PATH = ROOT / "data" / "live.json"

OPGG_API = "https://lol-api-summoner.op.gg/api"
OPGG_SEARCH = "https://lol-api-summoner.op.gg/api/v3/{region}/summoners"
OPGG_SUMMARY = "https://lol-api-summoner.op.gg/api/{region}/summoners/{summoner_id}/summary"
OPGG_GAMES = "https://lol-api-summoner.op.gg/api/{region}/summoners/{summoner_id}/games"

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/140.0 Safari/537.36"
)


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def http_json(url: str, timeout: int = 20) -> Any:
    request = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://op.gg/",
        },
    )
    with urlopen(request, timeout=timeout) as response:
        raw = response.read().decode("utf-8")
        return json.loads(raw)


def safe_int(value: Any, default: int = 0) -> int:
    try:
        if isinstance(value, bool):
            return int(value)
        return int(float(value))
    except (TypeError, ValueError):
        return default


def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        number = float(value)
        return number if math.isfinite(number) else default
    except (TypeError, ValueError):
        return default


def walk(value: Any):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def first_present(mapping: dict[str, Any], keys: tuple[str, ...], default: Any = None) -> Any:
    for key in keys:
        if key in mapping and mapping[key] is not None:
            return mapping[key]
    return default


def normalize_name(value: Any) -> str:
    return re.sub(r"\s+", "", str(value or "")).casefold()


def search_summoner(region: str, game_name: str, tag_line: str) -> dict[str, Any]:
    riot_id = f"{game_name}#{tag_line}"
    query = urlencode({"riot_id": riot_id, "hl": "en_US"})
    payload = http_json(f"{OPGG_SEARCH.format(region=region)}?{query}")

    candidates: list[dict[str, Any]] = []
    if isinstance(payload, list):
        candidates = [item for item in payload if isinstance(item, dict)]
    elif isinstance(payload, dict):
        for key in ("data", "summoners", "results", "items"):
            if isinstance(payload.get(key), list):
                candidates = [item for item in payload[key] if isinstance(item, dict)]
                if candidates:
                    break

    exact = None
    target_name = normalize_name(game_name)
    target_tag = normalize_name(tag_line)

    for candidate in candidates:
        nested = candidate.get("summoner") if isinstance(candidate.get("summoner"), dict) else candidate
        name = first_present(nested, ("game_name", "gameName", "name"), "")
        tag = first_present(nested, ("tagline", "tag_line", "tag"), "")
        if normalize_name(name) == target_name and normalize_name(tag) == target_tag:
            exact = candidate
            break

    chosen = exact or (candidates[0] if candidates else {})
    nested = chosen.get("summoner") if isinstance(chosen.get("summoner"), dict) else chosen
    summoner_id = first_present(nested, ("summoner_id", "summonerId", "id"))
    if not summoner_id:
        raise RuntimeError(f"OP.GG no devolvió summoner_id para {riot_id}")

    return {
        "id": str(summoner_id),
        "name": first_present(nested, ("game_name", "gameName", "name"), game_name),
        "tag": first_present(nested, ("tagline", "tag_line", "tag"), tag_line),
        "raw": chosen,
    }


def find_rank(payload: Any) -> dict[str, Any]:
    ranked_candidates: list[dict[str, Any]] = []

    for obj in walk(payload):
        tier_info = obj.get("tier_info")
        if not isinstance(tier_info, dict) or "lp" not in tier_info:
            continue

        game_type = str(first_present(obj, ("game_type", "queue_type", "queue", "type"), "")).lower()
        score = 0
        if "solo" in game_type or "soloranked" in game_type:
            score += 100
        if "rank" in game_type:
            score += 25
        if "flex" in game_type:
            score -= 100
        ranked_candidates.append({"score": score, "obj": obj, "tier": tier_info})

    if not ranked_candidates:
        raise RuntimeError("OP.GG no devolvió una entrada de ranked con tier_info")

    ranked_candidates.sort(key=lambda item: item["score"], reverse=True)
    selected = ranked_candidates[0]
    obj = selected["obj"]
    tier_info = selected["tier"]

    tier_raw = str(first_present(tier_info, ("tier", "tier_name"), "")).upper()
    division_raw = str(first_present(tier_info, ("division", "rank"), "I")).upper()
    lp = safe_int(first_present(tier_info, ("lp", "league_points"), 0))

    wins = safe_int(first_present(obj, ("win", "wins"), 0))
    losses = safe_int(first_present(obj, ("lose", "losses"), 0))
    total = max(1, wins + losses)

    return {
        "tier": tier_raw or "UNRANKED",
        "division": division_raw or "I",
        "lp": lp,
        "wins": wins,
        "losses": losses,
        "winrate": round((wins / total) * 100, 1),
    }


def find_game_list(payload: Any) -> list[dict[str, Any]]:
    lists: list[list[dict[str, Any]]] = []

    def collect(value: Any):
        if isinstance(value, list):
            items = [item for item in value if isinstance(item, dict)]
            if items and any(isinstance(item.get("my_data"), dict) for item in items):
                lists.append(items)
            for item in value:
                collect(item)
        elif isinstance(value, dict):
            for child in value.values():
                collect(child)

    collect(payload)
    if lists:
        lists.sort(key=len, reverse=True)
        return lists[0]
    return []


def get_stat(stats: dict[str, Any], *keys: str, default: int = 0) -> int:
    value = first_present(stats, keys, default)
    return safe_int(value, default)


def champion_name(champion_data: Any, champion_id: str) -> str:
    target = str(champion_id)

    for obj in walk(champion_data):
        if not isinstance(obj, dict):
            continue
        if str(obj.get("key", "")) == target and obj.get("name"):
            return str(obj["name"])
        if str(obj.get("id", "")) == target and obj.get("name"):
            return str(obj["name"])
    return target


def normalize_result(stats: dict[str, Any], game: dict[str, Any]) -> bool:
    raw = str(first_present(stats, ("result", "win", "outcome"), "")).lower()
    if raw in {"win", "victory", "won", "true", "1"}:
        return True
    if raw in {"loss", "lose", "defeat", "lost", "false", "0"}:
        return False

    raw_game = str(first_present(game, ("result", "outcome"), "")).lower()
    return raw_game in {"win", "victory", "won", "true", "1"}


def to_match_record(game: dict[str, Any], player_role: str, champ_lookup: Any) -> dict[str, Any]:
    my_data = game.get("my_data") if isinstance(game.get("my_data"), dict) else {}
    stats = my_data.get("stats") if isinstance(my_data.get("stats"), dict) else {}

    game_length = safe_int(
        first_present(game, ("game_length_second", "gameLengthSecond", "duration"), 0)
    )
    created_raw = first_present(game, ("created_at", "game_creation", "gameCreation", "timestamp"), 0)
    if isinstance(created_raw, str):
        try:
            created_ts = int(datetime.fromisoformat(created_raw.replace("Z", "+00:00")).timestamp() * 1000)
        except ValueError:
            created_ts = int(time.time() * 1000)
    else:
        created_ts = safe_int(created_raw)
        if created_ts and created_ts < 10_000_000_000:
            created_ts *= 1000

    champion = my_data.get("champion") if isinstance(my_data.get("champion"), dict) else {}
    champ_id = str(
        first_present(
            my_data,
            ("champion_id", "championId"),
            first_present(champion, ("id", "key"), "0"),
        )
    )
    champ_name = str(first_present(champion, ("name",), champion_name(champ_lookup, champ_id)))

    kills = get_stat(stats, "kill", "kills")
    deaths = get_stat(stats, "death", "deaths")
    assists = get_stat(stats, "assist", "assists")
    cs = get_stat(stats, "minion_kill", "minionKill", "cs", "total_minions_killed")
    kda = round((kills + assists) / max(1, deaths), 2)
    cs_per_min = round(cs / max(1, game_length / 60), 1) if game_length else 0

    items_raw = first_present(my_data, ("items", "item",), [])
    items: list[int] = []
    if isinstance(items_raw, list):
        for item in items_raw[:7]:
            if isinstance(item, dict):
                items.append(safe_int(first_present(item, ("id", "item_id"), 0)))
            else:
                items.append(safe_int(item))
    else:
        for key in ("item0", "item1", "item2", "item3", "item4", "item5", "item6"):
            if key in my_data:
                items.append(safe_int(my_data[key]))

    return {
        "matchId": str(first_present(game, ("game_id", "gameId", "id"), f"OPGG_{created_ts}")),
        "gameCreation": created_ts or int(time.time() * 1000),
        "gameDurationSeconds": game_length,
        "queueType": str(first_present(game, ("game_type", "queue_type", "type"), "Ranked Solo/Duo")),
        "win": normalize_result(stats, game),
        "championName": champ_name,
        "championId": champ_id,
        "champLevel": get_stat(stats, "level", "champ_level", default=0),
        "role": str(first_present(my_data, ("position", "role"), player_role)).upper() or player_role,
        "kills": kills,
        "deaths": deaths,
        "assists": assists,
        "kda": kda,
        "cs": cs,
        "csPerMin": cs_per_min,
        "killParticipationPct": round(safe_float(first_present(stats, ("kill_participation", "killParticipation"), 0)), 1),
        "damageDealt": get_stat(stats, "total_damage_to_champions", "damage_to_champions", "damage"),
        "damagePct": round(safe_float(first_present(stats, ("damage_share", "damage_pct"), 0)), 1),
        "visionScore": get_stat(stats, "vision_score", "visionScore", "ward_score"),
        "spells": ["", ""],
        "items": items,
        "laneOpponentChamp": None,
        "tags": [],
    }


def streak_from_matches(matches: list[dict[str, Any]]) -> int:
    if not matches:
        return 0
    first = bool(matches[0].get("win"))
    count = 0
    for match in matches:
        if bool(match.get("win")) != first:
            break
        count += 1
    return count if first else -count


def aggregate_player(base: dict[str, Any], rank: dict[str, Any], matches: list[dict[str, Any]]) -> dict[str, Any]:
    recent = matches[:20]
    wins = rank["wins"]
    losses = rank["losses"]
    total = max(1, len(recent))
    recent_kda = round(sum(safe_float(m.get("kda")) for m in recent) / total, 1)
    avg_kills = round(sum(safe_float(m.get("kills")) for m in recent) / total, 1)
    avg_deaths = round(sum(safe_float(m.get("deaths")) for m in recent) / total, 1)
    avg_assists = round(sum(safe_float(m.get("assists")) for m in recent) / total, 1)
    avg_cs = round(sum(safe_float(m.get("csPerMin")) for m in recent) / total, 1)
    avg_kp = round(sum(safe_float(m.get("killParticipationPct")) for m in recent) / total, 1)

    champion_stats: dict[str, dict[str, Any]] = {}
    for match in recent:
        name = match["championName"]
        row = champion_stats.setdefault(
            name,
            {
                "championName": name,
                "championId": match["championId"],
                "games": 0,
                "wins": 0,
                "losses": 0,
                "winrate": 0,
                "kills": 0,
                "deaths": 0,
                "assists": 0,
                "kda": 0,
                "csPerMin": 0,
            },
        )
        row["games"] += 1
        row["wins"] += 1 if match["win"] else 0
        row["losses"] += 0 if match["win"] else 1
        row["kills"] += safe_int(match["kills"])
        row["deaths"] += safe_int(match["deaths"])
        row["assists"] += safe_int(match["assists"])
        row["csPerMin"] += safe_float(match["csPerMin"])

    champs = list(champion_stats.values())
    for row in champs:
        row["winrate"] = round((row["wins"] / max(1, row["games"])) * 100, 1)
        row["kda"] = round((row["kills"] + row["assists"]) / max(1, row["deaths"]), 1)
        row["csPerMin"] = round(row["csPerMin"] / max(1, row["games"]), 1)
    champs.sort(key=lambda row: (-row["games"], -row["winrate"]))

    streak = streak_from_matches(recent)
    status = f'{rank["tier"]} {rank["division"]} ({rank["lp"]} LP)' if rank["tier"] != "UNRANKED" else "Sin ranking"

    updated = dict(base)
    updated.update(
        {
            "riotId": f'{base["gameName"]}#{base["tagLine"]}',
            "tier": rank["tier"],
            "division": rank["division"],
            "lp": rank["lp"],
            "wins": wins,
            "losses": losses,
            "winrate": rank["winrate"],
            "streak": streak,
            "avgKda": recent_kda,
            "avgKills": avg_kills,
            "avgDeaths": avg_deaths,
            "avgAssists": avg_assists,
            "avgCsPerMin": avg_cs,
            "avgKillParticipationPct": avg_kp,
            "champions": champs,
            "recentMatches": recent,
            "statusBadge": status,
            "analystSummary": (
                f'{base["proName"]}: {rank["tier"]} {rank["division"]} {rank["lp"]} LP · '
                f'{len(recent)} partidas consultadas · {rank["winrate"]}% WR · KDA medio {recent_kda}.'
            ),
        }
    )
    return updated


def recalculate_rankings(players: list[dict[str, Any]]) -> None:
    tier_weight = {
        "CHALLENGER": 10000,
        "GRANDMASTER": 9000,
        "MASTER": 8000,
        "DIAMOND": 7000,
        "EMERALD": 6000,
        "PLATINUM": 5000,
        "GOLD": 4000,
        "SILVER": 3000,
        "BRONZE": 2000,
        "IRON": 1000,
        "UNRANKED": 0,
    }
    div_weight = {"I": 400, "II": 300, "III": 200, "IV": 100}

    def elo_score(player: dict[str, Any]) -> float:
        return (
            tier_weight.get(player.get("tier", "UNRANKED"), 0)
            + div_weight.get(player.get("division", "I"), 0)
            + safe_float(player.get("lp"))
        )

    def form_score(player: dict[str, Any]) -> float:
        wins = safe_float(player.get("wins"))
        losses = safe_float(player.get("losses"))
        return (
            safe_float(player.get("winrate")) * 1.5
            + safe_float(player.get("streak")) * 4
            + safe_float(player.get("avgKda")) * 2.5
            + (wins / max(1, wins + losses)) * 50
        )

    for index, player in enumerate(sorted(players, key=elo_score, reverse=True), start=1):
        player["eloRank"] = index
    for index, player in enumerate(sorted(players, key=form_score, reverse=True), start=1):
        player["formRank"] = index


def main() -> int:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    previous = {}
    if LIVE_PATH.exists():
        try:
            previous = json.loads(LIVE_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            previous = {}

    monitored_players = config["players"]
    old_players = {
        player.get("id"): player
        for player in previous.get("players", [])
        if isinstance(player, dict) and player.get("id")
    }

    champion_payload: Any = {}
    try:
        versions = http_json("https://ddragon.leagueoflegends.com/api/versions.json")
        latest_version = versions[0] if isinstance(versions, list) and versions else "16.20.1"
        champion_payload = http_json(
            f"https://ddragon.leagueoflegends.com/cdn/{latest_version}/data/en_US/champion.json"
        )
    except Exception:
        pass

    players: list[dict[str, Any]] = []
    errors: list[str] = []
    summoner_ids = dict(previous.get("meta", {}).get("summonerIds", {}))

    for account in monitored_players:
        account_id = account["id"]
        try:
            summoner = search_summoner(config["region"], account["gameName"], account["tagLine"])
            summoner_ids[account_id] = summoner["id"]

            region = config["region"]
            summary_query = urlencode({"hl": "en_US"})
            summary = http_json(
                f"{OPGG_SUMMARY.format(region=region, summoner_id=quote(summoner['id'], safe=''))}?{summary_query}"
            )
            rank = find_rank(summary)

            games_query = urlencode({"limit": 20, "game_type": "soloranked", "hl": "en_US"})
            try:
                games_payload = http_json(
                    f"{OPGG_GAMES.format(region=region, summoner_id=quote(summoner['id'], safe=''))}?{games_query}"
                )
            except Exception:
                fallback_query = urlencode({"limit": 20, "hl": "en_US"})
                games_payload = http_json(
                    f"{OPGG_GAMES.format(region=region, summoner_id=quote(summoner['id'], safe=''))}?{fallback_query}"
                )

            raw_games = find_game_list(games_payload)
            matches = [
                to_match_record(game, account["role"], champion_payload)
                for game in raw_games[:20]
            ]
            matches.sort(key=lambda item: item.get("gameCreation", 0), reverse=True)

            base = {
                "id": account["id"],
                "proName": account["proName"],
                "realName": account["realName"],
                "riotId": f'{account["gameName"]}#{account["tagLine"]}',
                "gameName": account["gameName"],
                "tagLine": account["tagLine"],
                "region": config["region"].upper(),
                "team": config["team"],
                "role": account["role"],
                "profileIconId": safe_int(old_players.get(account_id, {}).get("profileIconId"), 588),
                "snapshots": old_players.get(account_id, {}).get("snapshots", []),
            }

            current = aggregate_player(base, rank, matches)
            previous_player = old_players.get(account_id)
            if previous_player:
                previous_signature = (
                    previous_player.get("tier"),
                    previous_player.get("division"),
                    previous_player.get("lp"),
                )
            else:
                previous_signature = None
            current_signature = (current["tier"], current["division"], current["lp"])

            snapshots = list(current.get("snapshots") or [])
            if previous_signature != current_signature:
                snapshots.append(
                    {
                        "timestamp": int(time.time() * 1000),
                        "tier": current["tier"],
                        "division": current["division"],
                        "lp": current["lp"],
                        "wins": current["wins"],
                        "losses": current["losses"],
                        "note": "Sincronización automática desde OP.GG",
                    }
                )
            current["snapshots"] = snapshots[-250:]
            players.append(current)
        except Exception as exc:
            old = old_players.get(account_id)
            if old:
                players.append(old)
            errors.append(f'{account["proName"]}: {exc}')

    recalculate_rankings(players)

    payload = {
        "generatedAt": now_iso(),
        "source": "OP.GG",
        "sourceType": "opgg-undocumented-api",
        "status": "ok" if not errors and len(players) == len(monitored_players) else "partial",
        "players": players,
        "errors": errors,
        "meta": {
            "team": config["team"],
            "region": config["region"].upper(),
            "accountCount": len(monitored_players),
            "successfulCount": len(players) - len(errors),
            "summonerIds": summoner_ids,
            "message": (
                "Datos sincronizados automáticamente desde OP.GG. "
                "El endpoint utilizado es público pero no documentado como API para terceros."
            ),
        },
    }

    LIVE_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(
        f'Sync complete: {payload["meta"]["successfulCount"]}/{payload["meta"]["accountCount"]} players; '
        f'errors={len(errors)}; generatedAt={payload["generatedAt"]}'
    )

    return 0


if __name__ == "__main__":
    sys.exit(main())
