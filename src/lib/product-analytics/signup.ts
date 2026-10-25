import type { FunnelEventProps } from './events';

interface SignupUser {
  id: string;
  created_at: string;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
}

/**
 * Ein signup_completed pro Account: gleiche UUID und gleicher Zeitpunkt
 * (Anlage des Accounts), egal ob es aus /willkommen oder dem Browser kommt.
 */
export function signupEventFor(user: SignupUser) {
  const method = String(user.user_metadata?.signup_method || user.app_metadata?.provider || 'email');
  const props: FunnelEventProps['signup_completed'] = {
    method,
    flow: method === 'first_story' ? 'angel' : 'regular',
  };
  return {
    props,
    options: {
      distinctId: user.id,
      timestamp: user.created_at,
      dedupeKey: `signup_completed:${user.id}`,
      $set: { signup_method: method },
    },
  };
}
