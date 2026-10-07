import type { Env } from '../types';

export const copy = {
  welcome: (env: Env) => `Welcome to Growx Chitra.\n\nSend a product photo and Growx Chitra will turn it into a clean business-ready image.\n\nYou have 5 free images to try.${env.TERMS_URL ? `\n\nTerms: ${env.TERMS_URL}` : ''}${env.PRIVACY_URL ? `\nPrivacy: ${env.PRIVACY_URL}` : ''}`,
  help: 'Growx Chitra\n\nSend a product photo to create a clean business-ready image.\n\nCommands: credits, plans, buy, brand, privacy, terms, support, delete my data',
  privacy: (env: Env) => `Growx Chitra processes the images and account data needed to provide the service.${env.PRIVACY_URL ? `\n\nPrivacy Policy:\n${env.PRIVACY_URL}` : ''}\n\nTo request deletion, send: DELETE MY DATA`,
  terms: (env: Env) => `Growx Chitra service terms.${env.TERMS_URL ? `\n\n${env.TERMS_URL}` : '\nTerms link is not configured yet.'}`,
  deletionConfirm: 'This will permanently delete your Growx Chitra account data and stored images, except records we may be required to retain for payments or legal obligations.\n\nReply CONFIRM DELETE to continue.',
  deletionDone: 'Your deletion request is confirmed. We are removing your account data and stored images. Payment records required for reconciliation may be retained.',
  suspended: (env: Env) => `Growx Chitra is currently unavailable for this account. Please contact support${env.SUPPORT_CONTACT ? `: ${env.SUPPORT_CONTACT}` : '.'}`,
  rateLimit: 'You’re sending messages a little quickly. Please try again shortly.',
  imageLarge: 'This image is too large to process. Please send a smaller product photo.',
};
