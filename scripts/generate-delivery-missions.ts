type Mission = {
  id: string;
  addressStreet: string;
  addressNumber: number;
  recipient: string;
  packageType: string;
  weight: number;
  baseReward: number;
  timeLimit: number;
  description: string;
};

type MissionsFileV1 = {
  version: 1;
  generatedAt: string;
  perDay: number;
  missions: Mission[];
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: readonly T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)]!;
}

function makeDescription(
  rnd: () => number,
  recipient: string,
  packageType: string,
  weight: number,
) {
  const openers = [
    "URGENT:",
    "TOP SECRET:",
    "DO NOT ASK QUESTIONS:",
    "HANDLE WITH DRAMA:",
    "DELIVER LIKE YOU MEAN IT:",
  ] as const;

  const quirks = [
    "do not tilt it even a little bit.",
    "knock exactly 3 times.",
    "leave it under the gnome.",
    "if anyone asks, you were never here.",
    "avoid pigeons at all costs.",
    "this package is extremely offended by lateness.",
    "the recipient is \"definitely\" home (probably).",
    "do not make eye contact with the box.",
  ] as const;

  const weightHints = [
    "It feels suspiciously light.",
    "It is heavier than your feelings.",
    "It rattles in a confident way.",
    "It hums quietly (???).",
    "It smells like victory.",
  ] as const;

  const opener = pick(openers, rnd);
  const quirk = pick(quirks, rnd);
  const hint = pick(weightHints, rnd);
  const cargo = weight >= 4 ? "Big cargo" : weight >= 2 ? "Medium cargo" : "Small cargo";

  return `${opener} ${packageType} for ${recipient} • ${cargo}. ${hint} Also: ${quirk}`;
}

async function main() {
  const outPath = "./games/deliverygame/missions.json";

  const streets = Array.from({ length: 10 }, (_, i) => `ST ${i + 1}`);
  const recipients = [
    "Mayor Pixel",
    "Captain Crumbs",
    "Dr. Bleep",
    "Agent Pancake",
    "Grandma Turbo",
    "Sir Honksalot",
    "Professor Vroom",
    "DJ Parcel",
    "The Invisible Neighbor",
    "Princess Sidequest",
    "Mr. Offline",
    "The Pizza Wizard",
    "Count Deliverycula",
    "Nora's Fan Club",
    "The Suspicious Duck",
  ] as const;

  const packageTypes = [
    "Emergency Pizza",
    "Fragile Vase",
    "Mystery Box",
    "Forbidden Sandwich",
    "Haunted Parcel",
    "Wedding Cake (Probably)",
    "Space Rock Sample",
    "Rubber Chicken",
    "Very Normal Package",
    "Bag of Confetti",
    "VIP Burrito",
    "Box of Screws (Emotional)",
  ] as const;

  const perDay = 5;
  const days = 200;
  const baseSeed = 0x4e4f5241; // "NORA"

  const missions: Mission[] = [];

  for (let day = 1; day <= days; day++) {
    const difficulty = (day - 1) / (days - 1); // 0..1
    const rnd = mulberry32(baseSeed ^ Math.imul(day, 0x9e3779b9));
    const usedAddr = new Set<string>();

    for (let i = 0; i < perDay; i++) {
      let addressStreet = "";
      let addressNumber = 1;

      // ensure unique addresses within a day
      for (let tries = 0; tries < 50; tries++) {
        addressStreet = pick(streets, rnd);
        addressNumber = 1 + Math.floor(rnd() * 20);
        const key = `${addressStreet}-${addressNumber}`;
        if (!usedAddr.has(key)) {
          usedAddr.add(key);
          break;
        }
      }

      const recipient = pick(recipients, rnd);
      const packageType = pick(packageTypes, rnd);

      const weight = clamp(1 + Math.floor(rnd() * 2 + difficulty * 4), 1, 5);

      const baseReward = clamp(
        Math.round(50 + difficulty * 220 + rnd() * 40),
        50,
        300,
      );

      const timeLimit = clamp(
        Math.round(120 - difficulty * 70 - weight * 2 + rnd() * 12),
        30,
        120,
      );

      missions.push({
        id: `mission-${day}-${i}`,
        addressStreet,
        addressNumber,
        recipient,
        packageType,
        weight,
        baseReward,
        timeLimit,
        description: makeDescription(rnd, recipient, packageType, weight),
      });
    }
  }

  const payload: MissionsFileV1 = {
    version: 1,
    generatedAt: new Date().toISOString(),
    perDay,
    missions,
  };

  await Bun.write(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${missions.length} missions → ${outPath}`);
}

main();


