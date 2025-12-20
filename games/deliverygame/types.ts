export interface Mission {
  id: string;
  addressStreet: string;
  addressNumber: number; // 1-20
  recipient: string;
  packageType: string; // "Pizza", "Bomb", "Vase"
  weight: number; // Consumes cargo space
  baseReward: number;
  timeLimit: number; // Seconds
  description: string;
}

export interface StickerData {
  id: string;
  emoji: string;
  position: [number, number, number]; // x, y, z relative to truck
  rotation: [number, number, number];
  scale: number;
}

export interface PlayerState {
  money: number;
  cargoCapacity: number;
  speedMultiplier: number; // 1.0 base
  timeExtender: number; // Seconds added to base limit
  decorations: string[]; // "bobblehead", "stickers"
  day: number;
  truckColor: string;
  stickers: StickerData[];
}

export interface ActiveDelivery extends Mission {
  startTime: number;
  currentReward: number;
  status: 'active' | 'completed' | 'failed';
}

export interface TruckConfig {
  speed: number;
  turnSpeed: number;
  cargoSpace: number;
}

export enum GamePhase {
  MENU = 'MENU',
  GARAGE = 'GARAGE', // Mission selection & Upgrades
  DRIVING = 'DRIVING',
  SUMMARY = 'SUMMARY'
}

export const PRICES = {
  UPGRADE_SPEED: 500,
  UPGRADE_CAPACITY: 800,
  UPGRADE_TIMER: 600,
  DECO_BOBBLE: 200,
  DECO_STICKER: 100,
  PAINT_JOB: 5,
};