export enum AppState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  ERROR = 'ERROR',
  SUMMARY = 'SUMMARY'
}

export interface LogEntry {
  id: string;
  timestamp: number;
  db: number;
  type: 'WARNING' | 'EXPLOSION';
  message: string;
  animal: string;       // New field: The name of the animal (e.g., '河东狮')
  animalEmoji: string;  // New field: The emoji of the animal (e.g., '🦁')
}

export interface EmotionResult {
  emotion: string;
  emoji: string;
  advice: string;
  animal: string;
  animalEmoji: string;
}

export const THRESHOLDS = {
  PEACEFUL: 70,
  WARNING: 85,
  EXPLOSION: 100,
  MAX: 120
};

export const MESSAGES = {
  WARNING: {
    main: "亲爱的，声音再大就要扰民了哦 🤫",
    sub: "隔壁邻居可能正在休息"
  },
  EXPLOSION: {
    main: "亲爱的，消消气 ❤️ 我们坐下来喝口水，慢慢说",
    sub: "深呼吸"
  }
};