export type TeamConfig = {
	slug: string;
	name: string;
	password: string;
	csvUrl?: string;
};

export const TEAMS: Record<string, TeamConfig> = {
	thn: {
		slug: 'thn',
		name: 'THN',
		password: '1'
	}
};

export function getTeam(slug: string): TeamConfig | null {
	return TEAMS[slug] ?? null;
}
