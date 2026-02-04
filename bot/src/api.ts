/**
 * API Client — communicates with the NestJS backend.
 *
 * All game state mutations go through this client.
 * Auth uses Telegram initData → JWT.
 */

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

let accessToken: string | null = null;
let refreshToken: string | null = null;

/* ── HTTP helpers ──────────────────────────────────────── */

async function request<T = any>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Auto-refresh on 401
  if (res.status === 401 && refreshToken) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${accessToken}`;
      res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    }
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new ApiError(res.status, errBody.message || res.statusText);
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

async function tryRefreshToken(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    accessToken = data.accessToken;
    return true;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function get<T = any>(path: string): Promise<T> {
  return request<T>("GET", path);
}

function post<T = any>(path: string, body?: unknown): Promise<T> {
  return request<T>("POST", path, body);
}

function put<T = any>(path: string, body?: unknown): Promise<T> {
  return request<T>("PUT", path, body);
}

function del<T = any>(path: string): Promise<T> {
  return request<T>("DELETE", path);
}

/* ── Auth ──────────────────────────────────────────────── */

export const auth = {
  async login(initData: string) {
    const data = await post<{
      accessToken: string;
      refreshToken: string;
      player: {
        telegramId: string;
        username: string | null;
        firstName: string | null;
        activeLeagueId: string | null;
        gameVersion: number;
      };
    }>("/auth/telegram", { initData });
    accessToken = data.accessToken;
    refreshToken = data.refreshToken;
    return data;
  },

  async refresh() {
    return tryRefreshToken();
  },

  isAuthenticated() {
    return !!accessToken;
  },
};

/* ── Player ────────────────────────────────────────────── */

export const player = {
  getState() {
    return get("/player");
  },

  claimOfflineGold() {
    return post<{ offlineGold: number; seconds: number; gold?: string }>(
      "/player/claim-offline",
    );
  },
};

/* ── Characters ────────────────────────────────────────── */

export const characters = {
  list() {
    return get("/characters");
  },

  create(nickname: string, classId: string, leagueId?: string) {
    return post("/characters", { nickname, classId, leagueId });
  },

  get(id: string) {
    return get(`/characters/${id}`);
  },

  activate(id: string) {
    return post(`/characters/${id}/activate`);
  },

  changeSkin(id: string, skinId: string) {
    return put(`/characters/${id}/skin`, { skinId });
  },
};

/* ── Combat ────────────────────────────────────────────── */

export const combat = {
  startLocation(locationId: string, waves: any[], order: number, act: number) {
    return post<{
      sessionId: string;
      totalMonsters: number;
      currentMonster: any;
    }>("/combat/start-location", { locationId, waves, order, act });
  },

  startMap(mapKeyItemId: string, direction?: string) {
    return post<{
      sessionId: string;
      totalMonsters: number;
      currentMonster: any;
    }>("/combat/start-map", { mapKeyItemId, direction });
  },

  tap(sessionId: string) {
    return post<{
      damage: number;
      damageBreakdown?: import("@shared/types").DamageBreakdown;
      isCrit: boolean;
      monsterHp: number;
      monsterMaxHp: number;
      killed: boolean;
      isComplete: boolean;
      currentMonster: any;
      monstersRemaining: number;
    }>("/combat/tap", { sessionId });
  },

  complete(sessionId: string) {
    return post<{
      totalGold: number;
      totalXp: number;
      totalTaps: number;
      monstersKilled: number;
      level?: number;
      xp?: number;
      xpToNext?: number;
      gold?: number;
      mapDrops?: any[];
      locationId?: string;
    }>("/combat/complete", { sessionId });
  },

  flee(sessionId: string) {
    return post<{ success: boolean }>("/combat/flee", { sessionId });
  },
};

/* ── Leagues ───────────────────────────────────────────── */

export const leagues = {
  list() {
    return get<{ leagues: any[] }>("/leagues");
  },

  getMyLeagues() {
    return get<{ playerLeagues: any[] }>("/leagues/my");
  },

  join(leagueId: string) {
    return post(`/leagues/${leagueId}/join`);
  },

  switch(leagueId: string) {
    return post("/leagues/switch", { leagueId });
  },
};

/* ── Endgame ───────────────────────────────────────────── */

export const endgame = {
  checkUnlock(characterId: string) {
    return post<{
      unlocked: boolean;
      alreadyUnlocked?: boolean;
      starterKeys?: number;
    }>(`/endgame/check-unlock?characterId=${characterId}`);
  },

  status(characterId: string) {
    return get(`/endgame/status?characterId=${characterId}`);
  },
};

/* ── Loot ──────────────────────────────────────────────── */

export const loot = {
  getBag() {
    return get("/loot/bag");
  },

  discardItem(itemId: string) {
    return del(`/loot/bag/${itemId}`);
  },
};

/* ── Skill Tree ────────────────────────────────────────── */

export const skillTree = {
  get(characterId: string) {
    return get<{ allocated: number[] }>(`/skill-tree?characterId=${characterId}`);
  },

  accept(characterId: string, allocated: number[]) {
    return post<{ allocated: number[] }>("/skill-tree/accept", { characterId, allocated });
  },

  reset(characterId: string) {
    return post<{ cost: number; allocated: number[] }>("/skill-tree/reset", { characterId });
  },
};

/* ── Default export ────────────────────────────────────── */

export const api = {
  auth,
  player,
  characters,
  combat,
  leagues,
  endgame,
  loot,
  skillTree,
};
