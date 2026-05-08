import { describe, expect, it } from 'vitest';
import { parseTeam } from '../parser';
import { tokenizeCsv } from '../csv';

describe('tokenizeCsv', () => {
	it('handles simple rows', () => {
		expect(tokenizeCsv('a,b\n1,2')).toEqual([
			['a', 'b'],
			['1', '2']
		]);
	});
	it('handles quoted commas', () => {
		expect(tokenizeCsv('a,b\n"x,y",z')).toEqual([
			['a', 'b'],
			['x,y', 'z']
		]);
	});
	it('handles doubled quotes', () => {
		expect(tokenizeCsv('a\n"he said ""hi"""')).toEqual([['a'], ['he said "hi"']]);
	});
	it('handles CRLF', () => {
		expect(tokenizeCsv('a,b\r\n1,2\r\n')).toEqual([
			['a', 'b'],
			['1', '2']
		]);
	});
	it('skips fully blank rows', () => {
		expect(tokenizeCsv('a,b\n,,\n1,2')).toEqual([
			['a', 'b'],
			['1', '2']
		]);
	});
});

const NEW_CSV = `name,timezone,imgUrl,startWorkTime,endWorkTime,startWorkTime,endWorkTime,email
Shivam,UTC-4,https://drive.google.com/file/d/1QWgA506wFk5xI2YtmFrqlYC5JXXvfr6R/view?usp=sharing,9:00,18:00,,,shivam@test.com
Lasha,UTC+4,https://ca.slack-edge.com/T03BJG33KJ6-U04M5PUL2SF-d1827c49eabe-512,9:00,18:00,21:30,0:00,lashapor@gmail.com`;

describe('parseTeam', () => {
	it('parses both rows', () => {
		const team = parseTeam(NEW_CSV);
		expect(team).toHaveLength(2);
	});

	it('parses Shivam with single shift, UTC-4, drive thumbnail', () => {
		const [shivam] = parseTeam(NEW_CSV);
		expect(shivam.name).toBe('Shivam');
		expect(shivam.offsetMinutes).toBe(-240);
		expect(shivam.offsetLabel).toBe('UTC-04:00');
		expect(shivam.shifts).toHaveLength(1);
		expect(shivam.shifts[0]).toEqual({ startMin: 540, endMin: 1080 });
		expect(shivam.imgUrl).toBe(
			'https://drive.google.com/thumbnail?id=1QWgA506wFk5xI2YtmFrqlYC5JXXvfr6R&sz=w200'
		);
		expect(shivam.email).toBe('shivam@test.com');
	});

	it('parses Lasha with two shifts (split shift, midnight end)', () => {
		const [, lasha] = parseTeam(NEW_CSV);
		expect(lasha.shifts).toHaveLength(2);
		expect(lasha.shifts[0]).toEqual({ startMin: 540, endMin: 1080 });
		expect(lasha.shifts[1]).toEqual({ startMin: 1290, endMin: 1440 });
	});

	it('preserves 1-based sheet rowIndex (row 2, 3)', () => {
		const team = parseTeam(NEW_CSV);
		expect(team[0].rowIndex).toBe(2);
		expect(team[1].rowIndex).toBe(3);
	});

	it('skips rows without a name', () => {
		const csv = `name,timezone,imgUrl,startWorkTime,endWorkTime,startWorkTime,endWorkTime,email
,UTC-4,,9:00,18:00,,,blank@test.com
Real,UTC+0,,9:00,18:00,,,real@test.com`;
		const team = parseTeam(csv);
		expect(team).toHaveLength(1);
		expect(team[0].name).toBe('Real');
	});

	it('skips rows with unparseable timezone', () => {
		const csv = `name,timezone,imgUrl,startWorkTime,endWorkTime,startWorkTime,endWorkTime,email
Bad,Pacific Time,,9:00,18:00,,,bad@test.com
Good,UTC+0,,9:00,18:00,,,good@test.com`;
		const team = parseTeam(csv);
		expect(team).toHaveLength(1);
		expect(team[0].name).toBe('Good');
	});

	it('handles the real published layout where email is column 2', () => {
		const csv = `name,email,timezone,imgUrl,startWorkTime,endWorkTime,startWorkTime,endWorkTime
Shivam,shiv@zululocums.com,UTC-4,https://drive.google.com/file/d/abc/view?usp=sharing,9:00,18:00,,
Lasha,lashapor@gmail.com,UTC+4,https://example.com/lasha.png,9:00,18:00,21:30,0:00`;
		const team = parseTeam(csv);
		expect(team).toHaveLength(2);
		expect(team[0].email).toBe('shiv@zululocums.com');
		expect(team[1].email).toBe('lashapor@gmail.com');
		expect(team[1].shifts).toHaveLength(2);
	});

	it('handles half-hour offsets', () => {
		const csv = `name,timezone,imgUrl,startWorkTime,endWorkTime,startWorkTime,endWorkTime,email
Mumbai,UTC+5:30,,9:30,18:30,,,m@test.com`;
		const [m] = parseTeam(csv);
		expect(m.offsetMinutes).toBe(330);
		expect(m.offsetLabel).toBe('UTC+05:30');
	});
});
