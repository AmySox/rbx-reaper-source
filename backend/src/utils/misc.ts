// =====================
// SECTION | IMPORTS
// =====================
import { isProd, sentryDsn } from '@keys';
import * as Sentry from '@sentry/node';
// =====================!SECTION

// =====================
// SECTION | CONFIG
// =====================
Sentry.init({
  dsn: sentryDsn,
  tracesSampleRate: 1.0,
});
// =====================!SECTION

// =====================
// SECTION | MISC UTILS
// =====================
/**
 * Handle error
 * If in production, will send error to Sentry
 * If not in production, will log error to console
 *
 * @param e - Error to report
 */
export const handleError = async (e: any) => {
  if (isProd) Sentry.captureException(e);
  else console.error(e);
};
// =====================!SECTION
