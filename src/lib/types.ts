export type Shift = {
	startMin: number;
	endMin: number;
};

export type TeamMember = {
	name: string;
	email: string;
	imgUrl: string | null;
	offsetMinutes: number;
	offsetLabel: string;
	shifts: [Shift] | [Shift, Shift];
	rowIndex: number;
};

export type ViewerRef = {
	offsetMinutes: number;
	label: string;
	source: 'detected' | 'manual';
};

export type SignedInUser = {
	email: string;
	name: string;
	picture: string | null;
	idToken: string;
	accessToken: string;
	accessTokenExpiresAt: number;
};

export type RowPatch = {
	email: string;
	timezone?: string;
	shifts: Shift[];
};
