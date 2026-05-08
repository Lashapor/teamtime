import { supabase, SUPABASE_CONFIGURED } from './client';
import { formatOffset } from '../time/offsets';
import type { Shift, TeamMember, Team } from '../types';

function ensureConfigured() {
	if (!SUPABASE_CONFIGURED) {
		throw new Error('Supabase is not configured. Open /setup to connect a project.');
	}
}

export function slugify(input: string): string {
	return input
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
}

// ============================================================================
// Mutations
// ============================================================================

export async function createTeam(args: {
	name: string;
	slugHint?: string;
	sharePassword?: string;
	ownerUserId: string;
}): Promise<{ id: string; slug: string }> {
	ensureConfigured();
	const baseSlug = slugify(args.slugHint || args.name) || 'team';
	const teamSlug = `${baseSlug}-${Math.floor(Math.random() * 1296)
		.toString(36)
		.padStart(2, '0')}`;

	const { data: team, error: teamErr } = await supabase
		.from('teams')
		.insert({
			owner_id: args.ownerUserId,
			slug: teamSlug,
			name: args.name,
			share_enabled: true,
			share_password: args.sharePassword || null
		})
		.select('id, slug')
		.single();
	if (teamErr) throw teamErr;

	return { id: team.id, slug: team.slug };
}

export async function addMember(args: {
	teamId: string;
	name: string;
	email: string;
	offsetMinutes: number;
	imgUrl?: string;
	role?: 'owner' | 'editor' | 'viewer';
	shifts: Shift[];
}): Promise<void> {
	ensureConfigured();
	const { data: member, error: memberErr } = await supabase
		.from('team_members')
		.insert({
			team_id: args.teamId,
			email: args.email.toLowerCase(),
			name: args.name,
			img_url: args.imgUrl ?? null,
			offset_min: args.offsetMinutes,
			role: args.role || 'editor'
		})
		.select('id')
		.single();
	if (memberErr) throw memberErr;

	if (args.shifts.length > 0) {
		const rows = args.shifts.map((s, i) => ({
			team_member_id: member.id,
			start_min: s.startMin,
			end_min: s.endMin,
			ord: i
		}));
		const { error: shiftErr } = await supabase.from('shifts').insert(rows);
		if (shiftErr) throw shiftErr;
	}
}

export async function updateMember(args: {
	memberId: string;
	patch: Partial<{
		name: string;
		offsetMinutes: number;
		imgUrl: string | null;
	}>;
}): Promise<void> {
	ensureConfigured();
	const update: Record<string, unknown> = {};
	if (args.patch.name !== undefined) update.name = args.patch.name;
	if (args.patch.offsetMinutes !== undefined) update.offset_min = args.patch.offsetMinutes;
	if (args.patch.imgUrl !== undefined) update.img_url = args.patch.imgUrl;
	if (Object.keys(update).length === 0) return;
	const { error } = await supabase.from('team_members').update(update).eq('id', args.memberId);
	if (error) throw error;
}

export async function setMemberShifts(args: {
	memberId: string;
	currentShiftIds: string[];
	shifts: Shift[];
}): Promise<void> {
	ensureConfigured();
	const { error: delErr } = await supabase
		.from('shifts')
		.delete()
		.eq('team_member_id', args.memberId);
	if (delErr) throw delErr;

	if (args.shifts.length === 0) return;
	const rows = args.shifts.map((s, i) => ({
		team_member_id: args.memberId,
		start_min: s.startMin,
		end_min: s.endMin,
		ord: i
	}));
	const { error: insErr } = await supabase.from('shifts').insert(rows);
	if (insErr) throw insErr;
}

export async function removeMember(memberId: string): Promise<void> {
	ensureConfigured();
	const { error } = await supabase.from('team_members').delete().eq('id', memberId);
	if (error) throw error;
}

export async function deleteTeam(teamId: string): Promise<void> {
	ensureConfigured();
	const { error } = await supabase.from('teams').delete().eq('id', teamId);
	if (error) throw error;
}

export async function updateTeam(args: {
	teamId: string;
	patch: Partial<{
		name: string;
		slug: string;
		share_enabled: boolean;
		share_password: string | null;
	}>;
}): Promise<void> {
	ensureConfigured();
	const update: Record<string, unknown> = {};
	if (args.patch.name !== undefined) update.name = args.patch.name;
	if (args.patch.slug !== undefined) update.slug = args.patch.slug;
	if (args.patch.share_enabled !== undefined) update.share_enabled = args.patch.share_enabled;
	if (args.patch.share_password !== undefined) update.share_password = args.patch.share_password;
	if (Object.keys(update).length === 0) return;
	const { error } = await supabase.from('teams').update(update).eq('id', args.teamId);
	if (error) throw error;
}

// ============================================================================
// Reads
// ============================================================================

export async function fetchMyTeams(ownerUserId: string): Promise<DbTeamRow[]> {
	ensureConfigured();
	const { data, error } = await supabase
		.from('teams')
		.select('id, slug, name, owner_id, share_enabled, share_password, created_at')
		.eq('owner_id', ownerUserId)
		.order('created_at', { ascending: false });
	if (error) throw error;
	return (data || []) as DbTeamRow[];
}

export type FullTeamData = {
	team: DbTeamRow;
	members: DbMemberRow[];
};

export async function fetchTeamFull(slug: string): Promise<FullTeamData | null> {
	ensureConfigured();
	const { data: team, error: teamErr } = await supabase
		.from('teams')
		.select('id, slug, name, owner_id, share_enabled, share_password')
		.eq('slug', slug)
		.maybeSingle();
	if (teamErr) throw teamErr;
	if (!team) return null;

	const { data: members, error: mErr } = await supabase
		.from('team_members')
		.select('id, team_id, user_id, email, name, img_url, offset_min, role, created_at, shifts(id, start_min, end_min, ord)')
		.eq('team_id', team.id)
		.order('created_at', { ascending: true });
	if (mErr) throw mErr;

	return {
		team: team as DbTeamRow,
		members: (members || []) as DbMemberRow[]
	};
}

export async function fetchSharedTeam(slug: string): Promise<FullTeamData | null> {
	ensureConfigured();
	const { data, error } = await supabase.rpc('get_shared_team', { p_slug: slug });
	if (error) throw error;
	if (!data) return null;
	return data as FullTeamData;
}

export async function isSlugAvailable(slug: string): Promise<boolean> {
	ensureConfigured();
	const { data, error } = await supabase.rpc('is_slug_available', { p_slug: slug });
	if (error) throw error;
	return !!data;
}

// ============================================================================
// Mappers
// ============================================================================

export type DbTeamRow = {
	id: string;
	slug: string;
	name: string;
	owner_id: string;
	share_enabled: boolean;
	share_password?: string | null;
};

export type DbMemberRow = {
	id: string;
	team_id?: string;
	user_id?: string | null;
	email: string;
	name: string;
	img_url?: string | null;
	offset_min: number;
	role: string;
	shifts?: Array<{ id: string; start_min: number; end_min: number; ord: number }>;
};

export function toTeam(row: DbTeamRow): Team {
	return {
		id: row.id,
		slug: row.slug,
		name: row.name,
		ownerId: row.owner_id,
		shareEnabled: !!row.share_enabled,
		sharePassword: row.share_password || null
	};
}

export function toMember(row: DbMemberRow): TeamMember {
	const sortedShifts = [...(row.shifts || [])].sort((a, b) => a.ord - b.ord);
	const shiftsArr: Shift[] =
		sortedShifts.length > 0
			? sortedShifts.map((s) => ({ startMin: s.start_min, endMin: s.end_min }))
			: [{ startMin: 540, endMin: 1080 }];
	const shifts: [Shift] | [Shift, Shift] =
		shiftsArr.length >= 2 ? [shiftsArr[0], shiftsArr[1]] : [shiftsArr[0]];
	return {
		id: row.id,
		name: row.name,
		email: row.email,
		imgUrl: row.img_url || null,
		offsetMinutes: row.offset_min,
		offsetLabel: formatOffset(row.offset_min),
		shifts,
		role: (row.role as TeamMember['role']) || 'editor',
		userId: row.user_id ?? null
	};
}

export function memberShiftIds(row: DbMemberRow): string[] {
	return (row.shifts || []).map((s) => s.id);
}
