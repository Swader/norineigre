import type { Mission } from "../types";

type MissionsFileV1 = {
  version?: number;
  perDay?: number;
  missions?: Mission[];
};

let cached:
  | {
      perDay: number;
      missions: Mission[];
    }
  | undefined;

async function loadMissions() {
  if (cached) return cached;

  // Resolve relative to the current page (works for /games/deliverygame/ and /games/deliverygame/index.html).
  const url = new URL("missions.json", window.location.href);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load missions.json: HTTP ${res.status}`);
  }

  const data: unknown = await res.json();
  if (Array.isArray(data)) {
    cached = { perDay: 5, missions: data as Mission[] };
    return cached;
  }

  if (typeof data === "object" && data !== null) {
    const file = data as MissionsFileV1;
    const missions = Array.isArray(file.missions) ? file.missions : [];
    const perDay = typeof file.perDay === "number" && file.perDay > 0 ? file.perDay : 5;
    cached = { perDay, missions };
    return cached;
  }

  throw new Error("Invalid missions.json format");
}

export const generateMissions = async (
  day: number,
  count?: number,
): Promise<Mission[]> => {
  try {
    const { perDay, missions } = await loadMissions();
    const take = typeof count === "number" && count > 0 ? count : perDay;

    if (missions.length === 0) return [];

    const effectivePerDay = perDay > 0 ? perDay : take;
    const totalDays = Math.max(1, Math.floor(missions.length / effectivePerDay));
    const normalizedDay = Math.max(1, day);
    const dayIdx = (normalizedDay - 1) % totalDays;

    const start = dayIdx * effectivePerDay;
    return missions.slice(start, start + effectivePerDay).slice(0, take);
  } catch (_err) {
    // Final safety net if missions.json can't be fetched (shouldn't happen in normal static hosting).
    return [
      {
        id: "fallback-1",
        addressStreet: "ST 1",
        addressNumber: 5,
        recipient: "Mr. Offline",
        packageType: "Emergency Pizza",
        weight: 1,
        baseReward: 100,
        timeLimit: 60,
        description: "The internet is down, deliver this manually.",
      },
    ];
  }
};