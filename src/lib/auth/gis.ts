import { GOOGLE_CLIENT_ID } from '../config';
import { authError, signedInUser } from '../stores/auth';
import type { SignedInUser } from '../types';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const SCOPE = 'openid email profile https://www.googleapis.com/auth/calendar.events';

declare global {
	interface Window {
		google?: any;
	}
}

let gisLoaded: Promise<void> | null = null;

function loadGis(): Promise<void> {
	if (typeof window === 'undefined') return Promise.reject(new Error('GIS only in browser'));
	if (window.google?.accounts) return Promise.resolve();
	if (gisLoaded) return gisLoaded;
	gisLoaded = new Promise<void>((resolve, reject) => {
		const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
		if (existing) {
			existing.addEventListener('load', () => resolve());
			existing.addEventListener('error', () => reject(new Error('GIS script load failed')));
			return;
		}
		const script = document.createElement('script');
		script.src = GIS_SRC;
		script.async = true;
		script.defer = true;
		script.onload = () => resolve();
		script.onerror = () => reject(new Error('GIS script load failed'));
		document.head.appendChild(script);
	});
	return gisLoaded;
}

function decodeJwtPayload(token: string): { email: string; name: string; picture?: string } | null {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) return null;
		const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
		const payload = JSON.parse(json);
		if (!payload.email) return null;
		return { email: payload.email, name: payload.name || payload.email, picture: payload.picture };
	} catch {
		return null;
	}
}

export async function signIn(): Promise<SignedInUser> {
	if (!GOOGLE_CLIENT_ID) {
		const message = 'PUBLIC_GOOGLE_CLIENT_ID is not configured. Set it in .env to enable sign-in.';
		authError.set(message);
		throw new Error(message);
	}
	authError.set(null);
	await loadGis();
	const idToken = await requestIdToken();
	const decoded = decodeJwtPayload(idToken);
	if (!decoded) throw new Error('Failed to decode Google ID token');
	const accessToken = await requestAccessToken();
	const user: SignedInUser = {
		email: decoded.email.toLowerCase(),
		name: decoded.name,
		picture: decoded.picture ?? null,
		idToken,
		accessToken: accessToken.token,
		accessTokenExpiresAt: Date.now() + (accessToken.expiresIn - 60) * 1000
	};
	signedInUser.set(user);
	return user;
}

function requestIdToken(): Promise<string> {
	return new Promise((resolve, reject) => {
		const google = window.google!;
		try {
			google.accounts.id.initialize({
				client_id: GOOGLE_CLIENT_ID,
				callback: (response: { credential?: string }) => {
					if (!response.credential) {
						reject(new Error('Google sign-in returned no credential'));
						return;
					}
					resolve(response.credential);
				},
				ux_mode: 'popup'
			});
			google.accounts.id.prompt((notification: any) => {
				if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
					reject(
						new Error(
							'Google sign-in was blocked or skipped. Allow third-party cookies and try again.'
						)
					);
				}
			});
		} catch (err) {
			reject(err);
		}
	});
}

function requestAccessToken(): Promise<{ token: string; expiresIn: number }> {
	return new Promise((resolve, reject) => {
		const google = window.google!;
		try {
			const client = google.accounts.oauth2.initTokenClient({
				client_id: GOOGLE_CLIENT_ID,
				scope: SCOPE,
				callback: (response: { access_token?: string; expires_in?: string; error?: string }) => {
					if (response.error || !response.access_token) {
						reject(new Error(response.error || 'Failed to get access token'));
						return;
					}
					resolve({
						token: response.access_token,
						expiresIn: parseInt(String(response.expires_in ?? '3600'), 10)
					});
				}
			});
			client.requestAccessToken({ prompt: 'consent' });
		} catch (err) {
			reject(err);
		}
	});
}

export function signOut() {
	signedInUser.set(null);
}
