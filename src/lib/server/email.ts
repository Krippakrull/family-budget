import { env } from '$env/dynamic/private';
import { Resend } from 'resend';
import { getMailFromAddress } from './email-from.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const isPlaceholderKey =
	!env.RESEND_API_KEY || env.RESEND_API_KEY.startsWith('re_example') || env.RESEND_API_KEY.startsWith('re_your');

async function sendEmail(payload: { to: string; subject: string; html: string }): Promise<void> {
	if (isPlaceholderKey) {
		if (env.NODE_ENV === 'production') {
			throw new Error('RESEND_API_KEY is missing or placeholder in production');
		}

		console.warn('Skipping email send because RESEND_API_KEY is not configured');
		return;
	}

	if (!resend) {
		throw new Error('Failed to initialize Resend client');
	}

	await resend.emails.send({
		from: getMailFromAddress(env),
		...payload
	});
}

export async function sendInviteEmail(
	to: string,
	inviterName: string,
	familyName: string,
	token: string,
	language: 'sv' | 'en'
): Promise<void> {
	const baseUrl = env.BASE_URL || 'http://localhost:5173';
	const link = `${baseUrl}/invite/${token}`;

	const subject =
		language === 'sv'
			? `${inviterName} bjuder in dig till ${familyName}`
			: `${inviterName} invites you to join ${familyName}`;

	const body =
		language === 'sv'
			? `<p>Hej!</p><p>${inviterName} vill att du ska gå med i familjens budget \"${familyName}\".</p><p><a href=\"${link}\">Klicka här för att gå med</a></p><p>Länken är giltig i 7 dagar.</p>`
			: `<p>Hi!</p><p>${inviterName} wants you to join the family budget \"${familyName}\".</p><p><a href=\"${link}\">Click here to join</a></p><p>This link is valid for 7 days.</p>`;

	await sendEmail({ to, subject, html: body });
}

export async function sendReminderEmail(
	to: string,
	name: string,
	monthName: string,
	year: number,
	budgetUrl: string,
	language: 'sv' | 'en'
): Promise<void> {
	const subject =
		language === 'sv'
			? `Påminnelse: Fyll i din budget för ${monthName} ${year}`
			: `Reminder: Fill in your budget for ${monthName} ${year}`;

	const body =
		language === 'sv'
			? `<p>Hej ${name}!</p><p>Du har inte godkänt din budget för ${monthName} ${year} ännu.</p><p><a href=\"${budgetUrl}\">Klicka här för att fylla i den</a></p>`
			: `<p>Hi ${name}!</p><p>You haven't approved your budget for ${monthName} ${year} yet.</p><p><a href=\"${budgetUrl}\">Click here to fill it in</a></p>`;

	await sendEmail({ to, subject, html: body });
}

const monthNames = {
	sv: ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'],
	en: [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	]
} as const;

export async function sendApprovalSummaryEmail(
	to: string,
	name: string,
	familyName: string,
	month: number,
	year: number,
	totalIncome: number,
	totalExpenses: number,
	summaryUrl: string,
	language: 'sv' | 'en'
): Promise<void> {
	const monthName = monthNames[language][month - 1] ?? `${month}`;
	const locale = language === 'sv' ? 'sv-SE' : 'en-US';
	const formattedIncome = new Intl.NumberFormat(locale, { style: 'currency', currency: 'SEK' }).format(totalIncome / 100);
	const formattedExpenses = new Intl.NumberFormat(locale, { style: 'currency', currency: 'SEK' }).format(totalExpenses / 100);
	const formattedRemaining = new Intl.NumberFormat(locale, { style: 'currency', currency: 'SEK' }).format(
		(totalIncome - totalExpenses) / 100
	);

	const subject =
		language === 'sv'
			? `Budgetsammanfattning för ${monthName} ${year}`
			: `Budget summary for ${monthName} ${year}`;

	const body =
		language === 'sv'
			? `<p>Hej ${name}!</p><p>Alla i ${familyName} har nu godkänt budgeten för ${monthName} ${year}.</p><p>Inkomster: ${formattedIncome}<br/>Utgifter: ${formattedExpenses}<br/>Kvar: ${formattedRemaining}</p><p><a href="${summaryUrl}">Öppna sammanfattning</a></p>`
			: `<p>Hi ${name}!</p><p>Everyone in ${familyName} has now approved the budget for ${monthName} ${year}.</p><p>Income: ${formattedIncome}<br/>Expenses: ${formattedExpenses}<br/>Remaining: ${formattedRemaining}</p><p><a href="${summaryUrl}">Open summary</a></p>`;

	await sendEmail({ to, subject, html: body });
}
