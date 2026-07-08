export function render(payload: Record<string, unknown>) {
  const candidateName = String(payload.candidate_name ?? 'Candidate');
  const onboardingLink = String(payload.onboarding_link ?? '');
  const expiresAt = String(payload.expires_at ?? '');
  const expiryCopy = expiresAt ? new Date(expiresAt).toLocaleString('en-IN') : '';

  return {
    subject: 'Complete your onboarding form',
    text: `Hi ${candidateName},\n\nPlease complete your onboarding form using this secure link:\n${onboardingLink}\n\n${
      expiryCopy ? `This link expires on ${expiryCopy}.\n` : ''
    }You can submit the form only once.`,
    html: `<p>Hi ${candidateName},</p>
<p>Please complete your onboarding form using this secure link:</p>
<p><a href="${onboardingLink}">${onboardingLink}</a></p>
<p>${expiryCopy ? `This link expires on <strong>${expiryCopy}</strong>. ` : ''}You can submit the form only once.</p>`,
  };
}
