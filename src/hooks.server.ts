import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { validateSession } from '$lib/server/auth';

const SESSION_COOKIE = 'session';

const authHandle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);

	if (!token) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const result = validateSession(token);

	if (!result) {
		event.cookies.delete(SESSION_COOKIE, { path: '/' });
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	event.locals.user = result.user;
	event.locals.session = result.session;

	event.cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: false,
		expires: result.session.expiresAt
	});

	return resolve(event);
};

const protectedRoutes: Handle = async ({ event, resolve }) => {
	const publicPaths = ['/login', '/register', '/invite'];
	const isPublic = publicPaths.some((path) => event.url.pathname.startsWith(path));

	if (!isPublic && !event.locals.user) {
		return new Response(null, {
			status: 302,
			headers: { Location: '/login' }
		});
	}

	return resolve(event);
};

export const handle = sequence(authHandle, protectedRoutes);
