export const MIRPWORKS_CONTACT_EMAIL='contact@mirpworks.com';
export const APPLICATION_NAME='Why Is There a Hole in the Middle of Town?';

export function feedbackMailtoHref(applicationName=APPLICATION_NAME){
  const subject=`${applicationName} — Feedback`;
  const body=`Sent from: ${applicationName}\n\n[Your message here]`;
  return `mailto:${MIRPWORKS_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
