const PLACEHOLDER_DOMAIN = 'yourdomain.com';

/**
	* @param {Record<string, string | undefined>} privateEnv
 */
export function getMailFromAddress(privateEnv) {
	const configuredDomain = privateEnv.MAIL_FROM_DOMAIN?.trim() ?? '';
	const isPlaceholderDomain = !configuredDomain || configuredDomain === PLACEHOLDER_DOMAIN;

	if (isPlaceholderDomain && privateEnv.NODE_ENV === 'production') {
		throw new Error('MAIL_FROM_DOMAIN is missing or placeholder in production');
	}

	const domain = isPlaceholderDomain ? PLACEHOLDER_DOMAIN : configuredDomain;
	return `Family Budget <noreply@${domain}>`;
}
