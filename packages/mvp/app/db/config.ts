/**
 * @file Define database tables for a single tenant CRM application.
 * @todo Define tables using multiple files.
 *
 * @see https://docs.astro.build/en/guides/astro-db/
 * @see https://docs.astro.build/en/guides/integrations-guide/db/
 */
import { column, defineDb, defineTable, NOW } from 'astro:db';

// @ts-expect-error Type imports are used by JSDoc links.
import type { OpportunityStageEnum, OrgRoleValueEnum, TaskStatusEnum } from '@/lib/enums';

// "User" and "Session" table definitions are adapted from "lucia-adapter-astrodb".
// https://github.com/pilcrowOnPaper/lucia-adapter-astrodb

/**
 *
 * TODO: Consider supporting email-based auth and multiple OAuth providers.
 * @see https://lucia-auth.com/guides/email-and-password/
 * @see https://arcticjs.dev
 */
const User = defineTable({
	columns: {
		id: column.text({ primaryKey: true }),
		username: column.text({ unique: true }),
		password_hash: column.text(),
		fullname: column.text(),
		org: column.text({ optional: true }),
	},
});

/**
 * Used by Lucia to keep track of user sessions.
 *
 * @see https://lucia-auth.com/database/
 * @see https://lucia-auth.com/reference/main/Adapter
 * @see https://github.com/pilcrowOnPaper/lucia-adapter-astrodb
 */
const Session = defineTable({
	columns: {
		id: column.text({ primaryKey: true }),
		userId: column.text({ references: () => User.columns.id }),
		expiresAt: column.date(),
	},
});

// TODO: Integrations?? How should we do integrations?
// What level should integrations be at:
// - the org level?
// - the member level?
// - the user level?

/**
 * Defines relationships between "Organizations" and "Users".
 *
 * - a role is tied to a single "User"
 * - a role is tied to an "Organization"
 * - a role has a set of permissions
 *
 * @summary Use to check what org a user belongs to.
 * @todo Should we have a separate table containing different types of roles?
 */
const OrgRole = defineTable({
	columns: {
		user: column.text({ references: () => User.columns.id }),
		/** @see {@link OrgRoleValueEnum} */
		role: column.number({ default: 0 }),
	},
});

/**
 * - "Account" can also mean "Customer" or "Company"
 * - an "Account" represents the other organizations that interact with your
 *   business.
 * - an account can be created within an "Organization"
 * - keep track of "activity"; i.e., comments that members of the org can post
 * - an account can be associated with one or more "Deals"
 * @deprecated Use `Company` instead.
 */
const Account = defineTable({
	columns: {
		id: column.number({ primaryKey: true }),
		name: column.text(),
		description: column.text(),
		email: column.text(),
		address: column.text(),
	},
});

const Company = defineTable({
	columns: {
		id: column.number({ primaryKey: true }),
		name: column.text({ unique: true }),
		industry: column.text({ optional: true }),
		market: column.text({ optional: true }),
		region: column.text({ optional: true }),
		emails: column.json({ optional: true }),
		phones: column.json({ optional: true }),
		/** Websites and socials. */
		links: column.json({ optional: true }),
		addresses: column.json({ optional: true }),
		note: column.text({ optional: true }),
	},
});

/**
 * Referenced by `Leads`.
 */
const Contact = defineTable({
	columns: {
		id: column.number({ primaryKey: true }),
		company: column.number({ references: () => Company.columns.id, optional: true }),
		jobTitle: column.text({ optional: true }),
		firstName: column.text(),
		lastName: column.text(),
		emails: column.json({ optional: true }),
		phones: column.json({ optional: true }),
		addresses: column.json({ optional: true }),
		/** Websites and socials. */
		links: column.json({ optional: true }),
		note: column.text({ optional: true }),
	},
});

const VCard = defineTable({
	columns: {
		/**
		 * jCard data.
		 * @see https://github.com/kewisch/ical.js
		 */
		data: column.json({}),
	},
});

/**
 * Leads are gathered from various sources such as websites, mailing lists, conferences, LinkedIn,
 * etc. A lead can become a deal when all of the qualification criteria are met.
 *
 * Leads are managed by sales development representatives (SDRs). An SDR manages leads in bulk,
 * updating hundreds at a time.
 */
const Lead = defineTable({
	columns: {
		id: column.number({ primaryKey: true }),
		author: column.text({ references: () => User.columns.id }),
		contact: column.number({ references: () => Contact.columns.id }),
		status: column.text({ optional: true }),
		created: column.date({ default: NOW }),
		updated: column.date({ default: NOW }),
		/**
		 * An arbitrary number based on vibes.
		 *
		 * "Lead scoring will give your sales team the visibility to chase the right leads, right away.
		 * Reps can work on “hot” leads and those that make buying decisions, while marketing automation
		 * can do the less urgent task of nurturing the warm and colder leads under the supervision of
		 * the marketing team."
		 *
		 * @see https://www.pipedrive.com/en/blog/lead-qualification#the-best-benefits-of-a-quality-lead-scoring-process
		 */
		score: column.number({ default: 0 }),
	},
});

/**
 * Used to label leads, just like how labels are used in GitHub Issues.
 */
const Label = defineTable({
	columns: {
		id: column.number({ primaryKey: true }),
		name: column.text({ unique: true }),
		description: column.text(),
		/** RGB hex value. */
		color: column.text(),
	},
});

/**
 * Additional metadata for leads; defines many-to-many relationships.
 */
const LeadsMeta = defineTable({
	columns: {
		lead: column.number({ references: () => Lead.columns.id }),
		label: column.number({ references: () => Label.columns.id, optional: true }),
	},
});

/**
 * Deals are created from leads.
 *
 * Once a Lead is qualified, we create a new row in this table reference the original Lead, along
 * with additional information.
 */
const Deal = defineTable({
	columns: {
		id: column.number({ primaryKey: true }),
		/** The original lead. */
		lead: column.number({ references: () => Lead.columns.id }),
		company: column.number({ optional: true, references: () => Company.columns.id }),
		/** Amount of money for this deal. */
		amount: column.number(),
		currency: column.text(),
	},
});

/**
 * - an "Opportunity" is tied to a single "Account"
 * - can be commented on by "Members"
 * - can be assigned to a "Member"
 * @deprecated Use `Deal` and `Lead` instead.
 */
const Opportunity = defineTable({
	columns: {
		id: column.number({ primaryKey: true }),
		account: column.number({ references: () => Account.columns.id }),
		author: column.text({ references: () => User.columns.id }),
		name: column.text(),
		/** @see {@link OpportunityStageEnum} */
		stage: column.number({ default: 0 }),
		amount: column.number(),
	},
});

/**
 * - a task is can be created by a member of an org
 * - can be associated with a deal
 * - can be assigned to a member
 */
const Task = defineTable({
	columns: {
		id: column.number({ primaryKey: true }),
		created: column.date({ default: NOW }),
		author: column.text({ references: () => User.columns.id }),
		title: column.text(),
		body: column.text({ optional: true }),
		/**
		 * @see {@link TaskStatusEnum}
		 */
		status: column.number({ default: 0 }),
		opportunity: column.number({ references: () => Opportunity.columns.id }),
	},
});

export default defineDb({
	tables: {
		User,
		Session,
		OrgRole,
		Account,
		Opportunity,
		Company,
		Contact,
		VCard,
		Lead,
		Label,
		LeadsMeta,
		Deal,
		Task,
	},
});
