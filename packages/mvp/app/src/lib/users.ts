/**
 * @file CRUD operations for users.
 */
import { hash } from '@node-rs/argon2';
import { generateRandomString, type RandomReader } from '@oslojs/crypto/random';
import { db, eq, OrgRole, sql, User } from 'astro:db';

export const OrgRoleValueEnum = {
	/** Default role for a new user. */
	Member: 0,
	Owner: 1,
} as const;

/** @see {@link OrgRoleValueEnum} */
export type OrgRoleValue = typeof OrgRoleValueEnum[keyof typeof OrgRoleValueEnum];
export type UserInfo = Omit<typeof User.$inferSelect, 'password_hash'>;

export type UserId = UserInfo['id'];
export type UserInit = Omit<typeof User.$inferInsert, 'id' | 'password_hash'> & {
	password: string;
	/** @defaultValue `OrgRoleValueEnum.Member` */
	role?: OrgRoleValue;
};

const alphanumeric = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

const random: RandomReader = {
	read(bytes) {
		crypto.getRandomValues(bytes);
	},
};

function generateUserId() {
	return generateRandomString(random, alphanumeric, 16);
}

async function hashPassword(password: string): Promise<string> {
	return await hash(password, {
		memoryCost: 19456,
		timeCost: 2,
		outputLen: 32,
		parallelism: 1,
	});
}

/**
 * @summary Used to specify which columns in `User` table to query.
 */
const partialUserColumns: Omit<typeof User._.columns, 'password_hash'> = {
	id: User.id,
	username: User.username,
	fullname: User.fullname,
	org: User.org,
};

/**
 * Create a new user and define their role within the given organization.
 *
 * @param opts -
 * An object with properties defining the new user, including an
 * optional `role` property to change from default.
 *
 * @returns
 * The row inserted into the `User` table including the generated `id`, but
 * without the `password_hash` column.
 */
export async function createUser(opts: UserInit): Promise<UserInfo> {
	const newUserId = generateUserId();
	const passwordHash = await hashPassword(opts.password);

	// Insert the new user and get it back.
	const newUser = await db
		.insert(User)
		.values({
			id: newUserId,
			fullname: opts.fullname,
			username: opts.username,
			password_hash: passwordHash,
			org: opts.org ?? null,
		})
		.returning(partialUserColumns)
		.get();

	// Define their role in their primary org.
	await db
		.insert(OrgRole)
		.values({
			user: newUser.id,
			role: opts.role ?? OrgRoleValueEnum.Member,
		});

	// TODO: Return both `UserInfo` and `OrgRole` information.
	return newUser;
};

const selectUser = db
	.select(partialUserColumns)
	.from(User)
	.where(eq(sql.placeholder('id'), User.id))
	.prepare();

/**
 * Get information about the given user.
 *
 * @param id - The `id` of the user.
 * @returns The first matching row from the `User` table if found.
 */
export function getUserInfo(id: UserId): Promise<UserInfo | undefined> {
	return selectUser.get({ id });
}
