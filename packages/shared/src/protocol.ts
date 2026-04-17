export type PlayerId = string;
export type RoomId = string;

export type Player = {
  id: PlayerId;
  name: string;
  color: string;
};

export type Cell = {
  letter: string | null;
  filledBy: PlayerId | null;
};

export type ClientMessage =
  | { type: 'join'; roomId: RoomId; playerId: PlayerId; name: string }
  | { type: 'select'; row: number; col: number }
  | { type: 'fill'; row: number; col: number; letter: string }
  | { type: 'chat'; text: string };

export type ServerMessage =
  | { type: 'state'; players: Player[]; cells: Cell[][] }
  | { type: 'playerJoined'; player: Player }
  | { type: 'playerLeft'; playerId: PlayerId }
  | {
      type: 'cellUpdate';
      row: number;
      col: number;
      letter: string;
      by: PlayerId;
    }
  | { type: 'cursor'; playerId: PlayerId; row: number; col: number }
  | { type: 'wordSolved'; word: string; by: PlayerId }
  | { type: 'chat'; from: PlayerId; text: string; timestamp: number }
  | { type: 'error'; message: string };
