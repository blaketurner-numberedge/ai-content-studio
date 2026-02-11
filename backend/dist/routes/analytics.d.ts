declare const router: import("express-serve-static-core").Router;
interface AnalyticsEvent {
    id: string;
    type: 'image_generated' | 'image_failed' | 'credits_purchased' | 'credits_used' | 'gallery_export' | 'prompt_used';
    userId: string;
    timestamp: string;
    metadata: Record<string, any>;
}
export declare function trackEvent(type: AnalyticsEvent['type'], userId: string, metadata?: Record<string, any>): Promise<void>;
export { router as analyticsRoutes };
//# sourceMappingURL=analytics.d.ts.map