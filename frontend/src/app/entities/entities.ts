export interface GameCreationResult {
    game_id: string;
}

export interface LoginResult {
    user_id: string;
}

export interface PlayersResult {
    players: Player[];
}

export interface Player {
    id: string,
    name: string,
    voted?: boolean,
    avatarPath?: string
}

export interface RoundProgress {
    players: Player[];
    gift?: string,
    invalid: boolean;
}

export interface RoundResult {
    roundNumber: number;
    gift: string;
    giftImagePath?: string;
    playerResults: {
        [playerId: string]: PlayerResult
    }
}
export interface PlayerResult {
    name: string;
    votes: number;
    userId: string;
    avatarPath?: string;
}

export interface UserPhaseResult {
    phase: UserPhase
}

export interface UserInfoResult {
    userId: string;
    name: string;
    avatarPath: string;
}

export enum UserPhase {
    WAITING = "WAITING",
    VOTING = "VOTING",
    FINISHED = "FINISHED",
    GIFT_OPENING = "GIFT_OPENING",
    UNREGISTERED = "UNREGISTERED"
}

export interface GameResult {
    name: string;
    userId: string;
    avatarPath?: string;
    gift_score: number;
    vote_score: 0;
    self_vote_score: 0;
    target_correct: 0;
    target_wrong: 0
    sabotage_score: 0
}

export interface PersonalResult {
    self_vote_score: number;
    vote_score: number;
    gift_score: number;
    sabotage_score: number;
    target_correct: number;
    target_wrong: number;
    rounds: PersonalRoundResult[];
}

export interface PersonalRoundResult {
    voted: boolean;
    gift: string;
    valid: boolean;
    target: string;
    correct: boolean;
    sabotage: boolean;
}


export interface PodiumSlot {
    key: string;          // unique per player and context, used for trackBy
    place: 1 | 2 | 3;
    label: string;
    name: string;
    avatarPath?: string;
    stat: string;         // already formatted, e.g. "42%" or "7"
    statLabel?: string;   // e.g. "correcte stemmen"
    delay: number;        // seconds, for the staged reveal
}