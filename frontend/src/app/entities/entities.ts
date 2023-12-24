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
    voted?: boolean
}

export interface RoundProgress {
    players: Player[];
    gift?: string,
    invalid: boolean;
}

export interface UserPhaseResult {
    phase: UserPhase
}

export enum UserPhase {
    WAITING = "WAITING",
    VOTING = "VOTING",
    FINISHED = "FINISHED",
    GIFT_OPENING = "GIFT_OPENING"
}