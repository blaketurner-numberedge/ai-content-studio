import OpenAI from 'openai';
export declare const openai: OpenAI;
export type ImageModel = 'dall-e-3' | 'dall-e-2' | 'gpt-image-1' | 'gpt-image-1-mini';
export interface GenerateImageOptions {
    prompt: string;
    model?: ImageModel;
    size?: string;
    quality?: string;
    style?: 'vivid' | 'natural';
    n?: number;
}
export interface GeneratedImage {
    url: string;
    revised_prompt?: string;
    b64_json?: string;
}
export interface VariationOptions {
    imagePath: string;
    n?: number;
    size?: string;
}
export interface EditOptions {
    imagePath: string;
    maskPath?: string;
    prompt: string;
    n?: number;
    size?: string;
}
export declare function generateImage(options: GenerateImageOptions): Promise<GeneratedImage[]>;
export declare function createVariations(options: VariationOptions): Promise<GeneratedImage[]>;
export declare function createEdit(options: EditOptions): Promise<GeneratedImage[]>;
export declare const MODEL_OPTIONS: Record<ImageModel, {
    sizes: string[];
    qualities: string[];
}>;
//# sourceMappingURL=openai.d.ts.map