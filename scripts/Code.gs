/**
 * TeamTime — Sheet writer
 *
 * Deploy this file as a Web App so the frontend can update a row in the
 * Google Sheet that backs TeamTime. The frontend POSTs JSON as text/plain
 * (no preflight) with shape:
 *
 *   {
 *     "secret": "...",      // shared secret (Script Property: SHARED_SECRET)
 *     "idToken": "...",     // Google ID token for the signed-in editor
 *     "patch": {
 *       "email": "...",     // row identifier; must match idToken.email
 *       "timezone": "UTC+4",
 *       "startWorkTime1": "9:00",
 *       "endWorkTime1": "18:00",
 *       "startWorkTime2": "21:30",
 *       "endWorkTime2": "0:00"
 *     }
 *   }
 *
 * Required Script Properties (Project Settings → Script Properties):
 *   - SHARED_SECRET          random string; matches PUBLIC_SHEET_WRITE_SECRET
 *   - SHEET_ID               the spreadsheet's ID
 *   - SHEET_NAME             tab name (e.g., "Sheet1")
 *   - GOOGLE_CLIENT_ID       OAuth Web client ID; same one the frontend uses
 *
 * Deploy: Deploy → New deployment → Web app
 *   - Execute as: Me
 *   - Who has access: Anyone
 *
 * Re-deploy after each code change.
 */

function doPost(e) {
	try {
		var body = JSON.parse(e.postData.contents || '{}');
		var props = PropertiesService.getScriptProperties();
		var expectedSecret = props.getProperty('SHARED_SECRET');
		if (!expectedSecret || body.secret !== expectedSecret) {
			return jsonOut({ ok: false, error: 'Bad secret' });
		}
		var verified = verifyIdToken_(body.idToken, props.getProperty('GOOGLE_CLIENT_ID'));
		if (!verified) return jsonOut({ ok: false, error: 'Bad token' });

		var patch = body.patch || {};
		var patchEmail = (patch.email || '').toLowerCase();
		if (!patchEmail) return jsonOut({ ok: false, error: 'Missing email' });
		if (patchEmail !== verified.email) {
			return jsonOut({ ok: false, error: 'Token does not match row email' });
		}

		var sheet = SpreadsheetApp
			.openById(props.getProperty('SHEET_ID'))
			.getSheetByName(props.getProperty('SHEET_NAME'));
		if (!sheet) return jsonOut({ ok: false, error: 'Sheet not found' });

		var values = sheet.getDataRange().getValues();
		var header = values[0].map(function (h) {
			return String(h).trim().toLowerCase();
		});

		var emailCol = header.indexOf('email');
		if (emailCol < 0) return jsonOut({ ok: false, error: 'No email column' });

		var rowIndex = -1;
		for (var i = 1; i < values.length; i++) {
			if (String(values[i][emailCol]).toLowerCase().trim() === patchEmail) {
				rowIndex = i + 1;
				break;
			}
		}
		if (rowIndex < 0) return jsonOut({ ok: false, error: 'Row not found for email' });

		var tzCol = header.indexOf('timezone');
		var startCols = findAllOccurrences_(header, 'startworktime');
		var endCols = findAllOccurrences_(header, 'endworktime');

		var writes = [];
		if (tzCol >= 0 && patch.timezone) writes.push([rowIndex, tzCol + 1, patch.timezone]);
		if (startCols[0] !== undefined && patch.startWorkTime1 !== undefined) {
			writes.push([rowIndex, startCols[0] + 1, patch.startWorkTime1]);
		}
		if (endCols[0] !== undefined && patch.endWorkTime1 !== undefined) {
			writes.push([rowIndex, endCols[0] + 1, patch.endWorkTime1]);
		}
		if (startCols[1] !== undefined && patch.startWorkTime2 !== undefined) {
			writes.push([rowIndex, startCols[1] + 1, patch.startWorkTime2]);
		}
		if (endCols[1] !== undefined && patch.endWorkTime2 !== undefined) {
			writes.push([rowIndex, endCols[1] + 1, patch.endWorkTime2]);
		}

		writes.forEach(function (w) {
			sheet.getRange(w[0], w[1]).setValue(w[2]);
		});

		return jsonOut({ ok: true, rowIndex: rowIndex, written: writes.length });
	} catch (err) {
		return jsonOut({ ok: false, error: String(err) });
	}
}

function doGet() {
	return jsonOut({ ok: true, name: 'teamtime-writer' });
}

function jsonOut(obj) {
	return ContentService
		.createTextOutput(JSON.stringify(obj))
		.setMimeType(ContentService.MimeType.JSON);
}

function findAllOccurrences_(arr, name) {
	var hits = [];
	for (var i = 0; i < arr.length; i++) if (arr[i] === name) hits.push(i);
	return hits;
}

function verifyIdToken_(idToken, expectedAud) {
	if (!idToken || !expectedAud) return null;
	var resp = UrlFetchApp.fetch(
		'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
		{ muteHttpExceptions: true }
	);
	if (resp.getResponseCode() !== 200) return null;
	var info = JSON.parse(resp.getContentText());
	if (info.aud !== expectedAud) return null;
	if (!info.email || info.email_verified === 'false') return null;
	return { email: String(info.email).toLowerCase() };
}
