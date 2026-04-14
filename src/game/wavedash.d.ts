declare namespace WavedashJS {
    interface User {
        username: string;
    }

    interface LeaderboardData {
        id: string;
        name: string;
        created: boolean;
        totalEntries: number;
    }

    interface LeaderboardResponse {
        success: boolean;
        data: LeaderboardData;
    }



    const Events: {
        BACKEND_CONNECTED: string;
        BACKEND_DISCONNECTED: string;
        BACKEND_RECONNECTING: string;
    };

    function init(options?: { debug?: boolean; deferEvents?: boolean }): void;
    function addEventListener(event: string, callback: (e: any) => void): void;
    function readyForEvents(): void;
    function getUser(): User;
    function getUserId(): string;
    function getOrCreateLeaderboard(name: string, sortOrder: number, displayType: number): Promise<LeaderboardResponse>;
    function uploadLeaderboardScore(leaderboardId: string, score: number, keepBest: boolean, ugcId?: string): Promise<{ success: boolean; data: any }>;
}
