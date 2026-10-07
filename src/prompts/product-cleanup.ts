import type { BrandProfile } from '../types';

const PRODUCT_CLEANUP = `Create a clean commercial catalog photograph from the supplied product image.
Preserve the actual product: its physical shape, proportions, visible material, product color,
packaging, printed labels, existing logos, and visible product details.
Do not redesign the product. Do not invent new product parts, buttons, features, or packaging text.
Do not add people, hands, faces, bodies, or unrelated objects.
Remove distracting background elements. Improve presentation, lighting, and clarity.
Place the product in a clean professional catalog-style environment.
The result must remain recognizably the same real product as the source photograph.
Do not add a business logo or watermark; branding is applied separately.`;

// Only system-owned options enter prompts; arbitrary DB text / captions are never prompts.
export function productCleanupPrompt(brand: BrandProfile | null): string {
  const backgrounds: Record<string,string> = {
    white: 'Use a plain white catalog background.',
    neutral: 'Use a neutral light gray catalog background.',
    studio: 'Use a simple softly lit studio background.'
  };
  return `${PRODUCT_CLEANUP}\n${backgrounds[brand?.background_style ?? ''] ?? backgrounds.white}`;
}
