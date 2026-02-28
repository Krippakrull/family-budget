import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCurrencyInput } from '../currency.js';

test('parses whole SEK as whole units by default', () => {
	assert.equal(parseCurrencyInput('1000', 'sv'), 100000);
	assert.equal(parseCurrencyInput('1000', 'en'), 100000);
});

test('parses decimals with comma for sv', () => {
	assert.equal(parseCurrencyInput('1000,5', 'sv'), 100050);
	assert.equal(parseCurrencyInput('1000,50', 'sv'), 100050);
});

test('parses decimals with dot for en', () => {
	assert.equal(parseCurrencyInput('1000.5', 'en'), 100050);
	assert.equal(parseCurrencyInput('1000.50', 'en'), 100050);
});

test('supports grouping separators for both locales', () => {
	assert.equal(parseCurrencyInput('1.000', 'sv'), 100000);
	assert.equal(parseCurrencyInput('1,000', 'en'), 100000);
});

test('rejects invalid values', () => {
	assert.equal(parseCurrencyInput('', 'sv'), null);
	assert.equal(parseCurrencyInput('abc', 'en'), null);
	assert.equal(parseCurrencyInput('-1', 'sv'), null);
});
