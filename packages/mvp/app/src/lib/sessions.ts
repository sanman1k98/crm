/**
 * @file A sessions API adapted from Lucia's docs.
 *
 * @see https://lucia-auth.com
 * @see https://lucia-auth.com/sessions/basic-api/drizzle-orm
 * @see https://lucia-auth.com/sessions/cookies/
 * @see https://lucia-auth.com/sessions/cookies/astro
 */
import type { APIContext } from 'astro';
import type { ActionAPIContext } from 'astro:actions';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import { db, eq, Session, User } from 'astro:db';

export type TUser = Omit<typeof User.$inferSelect, 'password_hash'>;
export type TSession = typeof Session.$inferSelect;

export type SessionValidationResult =
	| { session: TSession; user: TUser }
	| { session: null; user: null };

export function generateSessionToken(): string {
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	const token = encodeBase32LowerCaseNoPadding(bytes);
	return token;
}

export async function createSession(token: string, userId: TUser['id']): Promise<TSession> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const session: TSession = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
	};
	await db.insert(Session).values(session);
	return session;
}

export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const result = await db
		.select({
			user: {
				id: User.id,
				username: User.username,
				fullname: User.fullname,
				org: User.org,
			},
			session: Session,
		})
		.from(Session)
		.innerJoin(User, eq(Session.userId, User.id))
		.where(eq(Session.id, sessionId))
		.get();

	if (!result)
		return { session: null, user: null };

	const { user, session } = result satisfies { user: TUser; session: TSession };

	if (Date.now() >= session.expiresAt.getTime()) {
		await db.delete(Session).where(eq(Session.id, session.id));
		return { session: null, user: null };
	}

	if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
		session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
		await db
			.update(Session)
			.set({
				expiresAt: session.expiresAt,
			})
			.where(eq(Session.id, session.id));
	}

	return { session, user };
}

export async function invalidateSession(sessionId: TSession['id']): Promise<void> {
	await db.delete(Session).where(eq(Session.id, sessionId));
}

export function setSessionTokenCookie(ctx: APIContext | ActionAPIContext, token: string, expiresAt: Date): void {
	ctx.cookies.set('session', token, {
		httpOnly: true,
		sameSite: 'lax',
		secure: import.meta.env.PROD,
		expires: expiresAt,
		path: '/',
	});
}

export function deleteSessionTokenCookie(ctx: APIContext | ActionAPIContext): void {
	ctx.cookies.set('session', '', {
		httpOnly: true,
		sameSite: 'lax',
		secure: import.meta.env.PROD,
		maxAge: 0,
		path: '/',
	});
}
