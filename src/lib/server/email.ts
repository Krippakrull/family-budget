import { env } from '$env/dynamic/private';
import { Resend } from 'resend';

const resend = new Resend(env.RESEND_API_KEY);

export async function sendInviteEmail(
	to: string,
	inviterName: string,
	familyName: string,
	token: string,
	language: 'sv' | 'en'
): Promise<void> {
	const baseUrl = env.BASE_URL;
	const link = `${baseUrl}/invite/${token}`;

	const subject =
		language === 'sv'
			? `${inviterName} bjuder in dig till ${familyName}`
			: `${inviterName} invites you to join ${familyName}`;

	const body =
		language === 'sv'
			? `<p>Hej!</p><p>${inviterName} vill att du ska gå med i familjens budget \"${familyName}\".</p><p><a href=\"${link}\">Klicka här för att gå med</a></p><p>Länken är giltig i 7 dagar.</p>`
			: `<p>Hi!</p><p>${inviterName} wants you to join the family budget \"${familyName}\".</p><p><a href=\"${link}\">Click here to join</a></p><p>This link is valid for 7 days.</p>`;

	await resend.emails.send({
		from: 'Family Budget <noreply@yourdomain.com>',
		to,
		subject,
		html: body
	});
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

	await resend.emails.send({
		from: 'Family Budget <noreply@yourdomain.com>',
		to,
		subject,
		html: body
	});
}
