import test from 'node:test';
import assert from 'node:assert/strict';
import { getMailFromAddress } from './email-from.js';

test('uses MAIL_FROM_DOMAIN in from address', () => {
	assert.equal(
		getMailFromAddress({
			MAIL_FROM_DOMAIN: 'mail.kunnvit.com',
			NODE_ENV: 'production'
		}),
		'Family Budget <noreply@mail.kunnvit.com>'
	);
});

test('throws in production when MAIL_FROM_DOMAIN is placeholder', () => {
	assert.throws(
		() =>
			getMailFromAddress({
				MAIL_FROM_DOMAIN: 'yourdomain.com',
				NODE_ENV: 'production'
			}),
		/MAIL_FROM_DOMAIN is missing or placeholder in production/
	);
});

test('falls back to placeholder domain outside production', () => {
	assert.equal(
		getMailFromAddress({
			MAIL_FROM_DOMAIN: '',
			NODE_ENV: 'development'
		}),
		'Family Budget <noreply@yourdomain.com>'
	);
});
