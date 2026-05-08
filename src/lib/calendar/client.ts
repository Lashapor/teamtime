import { DateTime } from 'luxon';

export type EventInput = {
	summary: string;
	description?: string;
	startIso: string;
	endIso: string;
	timeZone: string;
	attendees: { email: string }[];
	addMeet?: boolean;
};

export type EventResult = {
	htmlLink: string;
	hangoutLink?: string;
	id: string;
};

export async function insertEvent(accessToken: string, input: EventInput): Promise<EventResult> {
	const params = new URLSearchParams({ sendUpdates: 'all' });
	if (input.addMeet) params.set('conferenceDataVersion', '1');
	const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`;
	const body: Record<string, unknown> = {
		summary: input.summary,
		description: input.description,
		start: { dateTime: input.startIso, timeZone: input.timeZone },
		end: { dateTime: input.endIso, timeZone: input.timeZone },
		attendees: input.attendees,
		reminders: { useDefault: true }
	};
	if (input.addMeet) {
		body.conferenceData = {
			createRequest: {
				requestId: `teamtime-${Date.now()}`,
				conferenceSolutionKey: { type: 'hangoutsMeet' }
			}
		};
	}
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});
	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Calendar event creation failed: ${response.status} ${text.slice(0, 200)}`);
	}
	const json = await response.json();
	return { htmlLink: json.htmlLink, hangoutLink: json.hangoutLink, id: json.id };
}

export function buildIso(localDt: DateTime): string {
	return localDt.toISO({ suppressMilliseconds: true, includeOffset: true })!;
}
