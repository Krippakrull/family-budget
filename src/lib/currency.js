const DIGITS = /^\d+$/;
const FRACTION_DIGITS = /^\d*$/;

function parseWithSeparator(input, separator) {
	const parts = input.split(separator);
	if (parts.length > 2) return null;

	const whole = parts[0];
	if (!DIGITS.test(whole)) return null;

	if (parts.length === 1) {
		return Number(whole) * 100;
	}

	const fraction = parts[1];
	if (!FRACTION_DIGITS.test(fraction)) return null;

	const normalizedFraction = (fraction + '00').slice(0, 2);
	return Number(whole) * 100 + Number(normalizedFraction);
}

export function parseCurrencyInput(rawInput, language) {
	if (typeof rawInput !== 'string') return null;

	let input = rawInput.trim().replace(/\s+/g, '');
	if (!input || input.startsWith('-')) return null;

	if (language === 'sv') {
		input = input.replace(/\./g, '');
		return parseWithSeparator(input, ',');
	}

	input = input.replace(/,/g, '');
	return parseWithSeparator(input, '.');
}

export function formatCurrencyInputValue(amountInOren, language) {
	if (!Number.isInteger(amountInOren) || amountInOren < 0) return '';

	const whole = Math.trunc(amountInOren / 100);
	const fractional = amountInOren % 100;
	if (fractional === 0) return String(whole);

	const separator = language === 'sv' ? ',' : '.';
	return `${whole}${separator}${String(fractional).padStart(2, '0')}`;
}
