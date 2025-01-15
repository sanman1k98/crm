/**
 * @see https://datatracker.ietf.org/doc/html/rfc6350#autoid-41
 */

import { db, eq, sql, VCard } from 'astro:db';
import ICAL from 'ical.js';

type JCalComponent = [
	Name: string,
	JCalProperyList: Record<string, any>,
	JCalComponentList: JCalComponent[],
];

/**
 * Purpose: To specify the components of the name of the object the vCard represents.
 * @see https://datatracker.ietf.org/doc/html/rfc6350#section-6.2.2
 */
type JCardNValue = [
	FamilyName: string,
	GivenName: string,
	AdditionalName: string,
	HonorificPrefix: string,
	HonorificSuffix: string,
];

interface JCardPropValues {
	/**
	 * Purpose: To specify the formatted text corresponding to the name of the object the vCard
	 * represents.
	 */
	fn: string;
	/** */
	n: JCardNValue;
	note: string;
	categories: string[];
	nickname: string[];
	bday: string | Date;
	anniversary: string | Date;
	/**
	 * To specify the components of the sex and gender identity of the object the vCard represents.
	 * The components correspond, in sequence, to the sex (biological), and gender identity.  Each
	 * component is optional.
	 * Sex component:
	 *	A single letter. M stands for "male", F stands for "female", O stands for "other", N stands
	 *	for "none or not applicable", U stands for "unknown".
	 * Gender identity component:
	 *	Free-form text.
	 */
	gender: [Sex: string, GenderIdentity: string];
}

interface JCardInit {
	lastName: string;
	firstName: string;
	note: string;
	categories: string[];
}

export function createJCard(opts: JCardInit) {
	const { firstName, lastName } = opts;
	const fn = [firstName, lastName].join(' ');
}
