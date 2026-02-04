export declare const DAILY_REWARD_TABLE: ({
    day: number;
    type: string;
    data: {
        amount: number;
        tier?: undefined;
    };
} | {
    day: number;
    type: string;
    data: {
        tier: number;
        amount?: undefined;
    };
})[];
export declare const ACHIEVEMENTS: ({
    id: string;
    name: string;
    description: string;
    reward: {
        type: string;
        amount: number;
        tier?: undefined;
    };
} | {
    id: string;
    name: string;
    description: string;
    reward: {
        type: string;
        tier: number;
        amount?: undefined;
    };
})[];
