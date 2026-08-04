export type Shift = {
	startMin: number;
	endMin: number;
};

export type TeamMember = {
	id: string;
	name: string;
	email: string;
	imgUrl: string | null;
	offsetMinutes: number;
	offsetLabel: string;
	shifts: [Shift] | [Shift, Shift];
	role: 'owner' | 'editor' | 'viewer';
	userId: string | null;
};

export type Team = {
	id: string;
	slug: string;
	name: string;
	ownerId: string;
	shareEnabled: boolean;
	sharePassword: string | null;
};

export type ViewerRef = {
	offsetMinutes: number;
	label: string;
	source: 'detected' | 'manual';
};
