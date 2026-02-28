import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { i18n } from '$lib/i18n';
import { validateSession } from '$lib/server/auth';

const SESSION_COOKIE = 'session';

const authHandle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);

	if (!token) {
		event.locals.user = null;
		event.locals.session = null;
	} else {
		const result = validateSession(token);

		if (!result) {
			event.cookies.delete(SESSION_COOKIE, { path: '/' });
			event.locals.user = null;
			event.locals.session = null;
		} else {
			event.locals.user = result.user;
			event.locals.session = result.session;

			event.cookies.set(SESSION_COOKIE, token, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: false,
				expires: result.session.expiresAt
			});
		}
	}

	return resolve(event, {
		transformPageChunk: ({ html }) => {
			const theme = event.locals.user?.theme ?? 'light';
			const accent = event.locals.user?.accentColor ?? 'blue';
			const darkClass = theme === 'dark' ? 'dark' : '';

			return html.replace('%theme%', theme).replace('%accent%', accent).replace('%darkclass%', darkClass);
		}
	});
};

const protectedRoutes: Handle = async ({ event, resolve }) => {
	const publicPaths = ['/login', '/register', '/invite'];
	const pathname = event.url.pathname.replace(/^\/(sv|en)(?=\/|$)/, '') || '/';
	const isPublic = publicPaths.some((path) => pathname.startsWith(path));
	const isApi = pathname.startsWith('/api');

	if (!isPublic && !isApi && !event.locals.user) {
		return new Response(null, {
			status: 302,
			headers: { Location: '/login' }
		});
	}

	return resolve(event);
};

export const handle = sequence(authHandle, protectedRoutes, i18n.handle());
