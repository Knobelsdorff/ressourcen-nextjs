// Läuft im Browser vor der App (Next.js ≥ 15.3). PostHog sendet erst nach
// Einwilligung – siehe src/lib/product-analytics/client.ts.
import { initProductAnalytics } from '@/lib/product-analytics/client';
import { guardAgainstDomTranslation } from '@/lib/dom-translation-guard';

// Vor dem ersten Rendern: Seiten-Übersetzung darf React nicht zum Absturz bringen.
guardAgainstDomTranslation();
initProductAnalytics();
