declare const router: import("express-serve-static-core").Router;
export declare const CREDIT_TIERS: {
    id: string;
    name: string;
    credits: number;
    price: number;
    description: string;
}[];
export declare const MODEL_CREDIT_COSTS: Record<string, number>;
export declare function getUserCredits(userId: string): Promise<{
    balance: number;
    totalPurchased: number;
    totalUsed: number;
    updatedAt: string;
}>;
export declare function useCredits(userId: string, amount: number): Promise<boolean>;
export declare function addCredits(userId: string, amount: number, amountPaid?: number): Promise<{
    balance: number;
    totalPurchased: number;
    totalUsed: number;
    updatedAt: string;
}>;
export { router as creditRoutes };
//# sourceMappingURL=credits.d.ts.map