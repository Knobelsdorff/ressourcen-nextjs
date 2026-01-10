import { redirect } from 'next/navigation';

// Redirect from /example to /ankommen
// Note: Permanent redirect is handled in next.config.ts
export default function ExampleRedirect() {
  redirect('/ankommen');
}
