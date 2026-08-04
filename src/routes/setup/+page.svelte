<script lang="ts">
	import { onMount } from 'svelte';
	import { createClient } from '@supabase/supabase-js';
	import Button from '$lib/components/Button.svelte';
	import TextInput from '$lib/components/TextInput.svelte';
	import { saveSupabaseConfig, SUPABASE_URL } from '$lib/db/client';
	import { APP_NAME } from '$lib/config';
	import sqlSchema from '../../../supabase.sql?raw';

	let urlInput = '';
	let keyInput = '';
	let copied: 'sql' | null = null;
	let importing = false;

	type TestStatus =
		| 'idle'
		| 'testing'
		| 'ok-ready'
		| 'ok-no-schema'
		| 'fail-key'
		| 'fail-network';

	let testStatus: TestStatus = 'idle';
	let testError = '';
	let testTimer: ReturnType<typeof setTimeout> | null = null;
	let lastTestedUrl = '';
	let lastTestedKey = '';

	onMount(() => {
		const hash = window.location.hash.replace(/^#/, '');
		if (hash) {
			const params = new URLSearchParams(hash);
			const u = (params.get('u') ?? '').trim().replace(/\/$/, '');
			const k = (params.get('k') ?? '').trim();
			if (u && k && isValidUrl(u) && isValidKey(k) && !looksLikeSecret(k)) {
				importing = true;
				saveSupabaseConfig(u, k);
				history.replaceState(null, '', '/setup');
				window.location.replace('/');
				return;
			}
		}

		urlInput = SUPABASE_URL;
		try {
			const k = window.localStorage.getItem('teamtime.supabase_anon_key') ?? '';
			if (k) keyInput = k;
		} catch {
			// ignore
		}
	});

	function isValidUrl(v: string): boolean {
		return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(v.trim());
	}

	function isValidKey(v: string): boolean {
		const t = v.trim();
		if (/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(t)) return true;
		if (t.length > 40 && t.split('.').length === 3 && t.startsWith('eyJ')) return true;
		return false;
	}

	function looksLikeSecret(v: string): boolean {
		const t = v.trim();
		return t.startsWith('sb_secret_') || /"role":"service_role"/.test(t);
	}

	function projectRef(u: string): string | null {
		const m = u.trim().match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
		return m ? m[1] : null;
	}

	$: url = urlInput.trim().replace(/\/$/, '');
	$: anonKey = keyInput.trim();
	$: urlValid = isValidUrl(url);
	$: keyValid = isValidKey(anonKey);
	$: configValid = urlValid && keyValid && !looksLikeSecret(anonKey);
	$: sqlEditorUrl = projectRef(url)
		? `https://supabase.com/dashboard/project/${projectRef(url)}/sql/new`
		: 'https://supabase.com/dashboard';

	$: scheduleTest(url, anonKey, configValid);

	function scheduleTest(u: string, k: string, ok: boolean) {
		if (testTimer) {
			clearTimeout(testTimer);
			testTimer = null;
		}
		if (!ok) {
			testStatus = 'idle';
			testError = '';
			return;
		}
		if (u === lastTestedUrl && k === lastTestedKey && testStatus !== 'idle') return;
		testStatus = 'testing';
		testTimer = setTimeout(() => runTest(u, k), 500);
	}

	async function runTest(u: string, k: string) {
		lastTestedUrl = u;
		lastTestedKey = k;
		try {
			const client = createClient(u, k, { auth: { persistSession: false } });
			const { error } = await client.from('teams').select('id').limit(1);
			if (!error) {
				testStatus = 'ok-ready';
				testError = '';
				return;
			}
			const msg = (error.message || '').toLowerCase();
			if (
				error.code === 'PGRST205' ||
				msg.includes('does not exist') ||
				msg.includes('schema cache') ||
				msg.includes('could not find the table')
			) {
				testStatus = 'ok-no-schema';
				testError = '';
				return;
			}
			if (msg.includes('jwt') || msg.includes('api key') || msg.includes('unauthor')) {
				testStatus = 'fail-key';
				testError = error.message;
				return;
			}
			testStatus = 'fail-network';
			testError = error.message;
		} catch (e) {
			const m = e instanceof Error ? e.message : String(e);
			testStatus = 'fail-network';
			testError = /failed to fetch|networkerror|load failed/i.test(m)
				? "Couldn't reach the project. New projects take ~30s to provision — wait and try again."
				: m;
		}
	}

	async function copySql() {
		try {
			await navigator.clipboard.writeText(sqlSchema);
			copied = 'sql';
			setTimeout(() => (copied = null), 1500);
		} catch {
			// ignore
		}
	}

	function connect() {
		if (!configValid) return;
		saveSupabaseConfig(url, anonKey);
		window.location.replace('/');
	}
</script>

<svelte:head>
	<title>Set up · {APP_NAME}</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 md:px-8 py-8 md:py-12 text-white">
	{#if importing}
		<p class="text-sm text-white/70">Importing your setup link…</p>
	{:else}
		<div class="mb-1 text-xs uppercase tracking-wide text-sky-300">{APP_NAME}</div>
		<h1 class="text-2xl md:text-3xl font-semibold tracking-tight mb-6">Connect your database</h1>

		<!-- Database picker -->
		<div class="mb-6">
			<p class="text-xs uppercase tracking-wide text-white/50 mb-2">Choose your database</p>
			<div class="grid grid-cols-2 gap-3 max-w-md">
				<button
					type="button"
					class="rounded-lg border border-sky-400/40 bg-sky-500/10 px-3 py-2.5 text-left"
					aria-pressed="true"
				>
					<div class="text-sm font-semibold text-white">Supabase</div>
					<div class="text-[10px] uppercase tracking-wide text-sky-300 mt-0.5">Selected</div>
				</button>
				<div class="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 opacity-50 cursor-not-allowed">
					<div class="text-sm font-semibold text-white/70">Firebase</div>
					<div class="text-[10px] uppercase tracking-wide text-white/40 mt-0.5">Coming soon</div>
				</div>
			</div>
			<p class="mt-2 text-[11px] text-white/40 leading-relaxed">
				Open an issue if you'd like to see another provider.
			</p>
		</div>

		<ol class="space-y-4">
			<!-- Step 1: create project -->
			<li class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
				<div class="flex items-baseline gap-3 mb-2">
					<span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-200 text-xs font-semibold">1</span>
					<h2 class="text-base font-semibold">Create a Supabase project</h2>
				</div>
				<p class="text-sm text-white/60 mb-3 leading-relaxed">
					Sign in (GitHub or email) and click <strong>New project</strong>. Name it anything; pick the
					closest region. The free tier never auto-pauses for active projects.
				</p>
				<a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" class="contents">
					<Button variant="secondary" size="sm">Open Supabase dashboard ↗</Button>
				</a>
			</li>

			<!-- Step 2: paste URL + publishable key -->
			<li class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
				<div class="flex items-baseline gap-3 mb-2">
					<span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-200 text-xs font-semibold">2</span>
					<h2 class="text-base font-semibold">Paste your Project URL and publishable key</h2>
				</div>
				<div class="text-sm text-white/65 mb-3 leading-relaxed space-y-2">
					<p>
						<strong class="text-white/85">Project URL</strong> — in your project, click
						<strong>Connect</strong> at the top of the dashboard, choose
						<strong>App Frameworks → .env.local</strong>, and copy the value of
						<code class="text-white/85">NEXT_PUBLIC_SUPABASE_URL</code>
						(everything after the <code>=</code>).
					</p>
					<p>
						<strong class="text-white/85">Publishable key</strong> — go to
						<strong>Project Settings → API Keys</strong> and copy the
						<strong>Publishable key</strong> (<code class="text-white/85">sb_publishable_…</code>).
						<span class="text-rose-200/90">
							Do not copy the <em>secret</em> key — secrets must never live in a browser.
						</span>
					</p>
				</div>
				<div class="space-y-3">
					<label class="block">
						<span class="block text-xs text-white/70 mb-1">Project URL</span>
						<TextInput bind:value={urlInput} placeholder="https://abcdefghijkl.supabase.co" />
						{#if urlInput && !urlValid}
							<p class="mt-1 text-xs text-amber-200">
								Should look like <code class="text-white/80">https://&lt;ref&gt;.supabase.co</code>.
							</p>
						{/if}
					</label>
					<label class="block">
						<span class="block text-xs text-white/70 mb-1">Publishable key</span>
						<TextInput bind:value={keyInput} placeholder="sb_publishable_…" />
						{#if keyInput && looksLikeSecret(keyInput)}
							<p class="mt-1 text-xs text-rose-200">
								That looks like a <strong>secret</strong> key. Use the <strong>publishable</strong>
								key instead.
							</p>
						{:else if keyInput && !keyValid}
							<p class="mt-1 text-xs text-amber-200">
								Doesn't match a publishable key (<code>sb_publishable_…</code>) or a legacy anon JWT.
							</p>
						{/if}
					</label>

					<!-- Connection / schema check -->
					{#if testStatus === 'testing'}
						<p class="text-xs text-white/55">Testing connection…</p>
					{:else if testStatus === 'ok-ready'}
						<p class="text-xs text-emerald-300">
							✓ Connected — schema is already set up. You can skip step 3 and click Connect.
						</p>
					{:else if testStatus === 'ok-no-schema'}
						<p class="text-xs text-amber-200">
							✓ Connected — but the schema isn't set up yet. Run step 3 below first.
						</p>
					{:else if testStatus === 'fail-key'}
						<p class="text-xs text-rose-200">
							Connected, but the key was rejected. Double-check you copied the publishable key
							(not the secret). Details: {testError}
						</p>
					{:else if testStatus === 'fail-network'}
						<p class="text-xs text-rose-200">{testError}</p>
					{/if}
				</div>
			</li>

			<!-- Step 3: run schema -->
			<li class="rounded-xl border border-white/10 bg-white/[0.03] p-4 {testStatus === 'ok-ready' ? 'opacity-60' : ''}">
				<div class="flex items-baseline gap-3 mb-2">
					<span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-200 text-xs font-semibold">3</span>
					<h2 class="text-base font-semibold">Run the schema in SQL Editor (one-time)</h2>
					{#if testStatus === 'ok-ready'}
						<span class="ml-auto text-[11px] text-emerald-300">Already done ✓</span>
					{/if}
				</div>
				<p class="text-sm text-white/60 mb-3 leading-relaxed">
					Copy the SQL, open the <strong>SQL Editor</strong> in your project, paste, click
					<strong>Run</strong>. ~5 seconds.
				</p>

				<div class="flex items-center gap-2 mb-2">
					<a href={sqlEditorUrl} target="_blank" rel="noreferrer" class="contents">
						<Button variant="secondary" size="sm">Open SQL Editor ↗</Button>
					</a>
					<Button size="sm" on:click={copySql}>{copied === 'sql' ? 'Copied!' : 'Copy SQL'}</Button>
				</div>

				<details class="text-[12px] text-white/55">
					<summary class="cursor-pointer hover:text-white/80">Preview the SQL</summary>
					<pre class="mt-2 text-[10px] leading-snug bg-black/50 border border-white/10 rounded-md p-3 max-h-64 overflow-auto text-white/75 font-mono">{sqlSchema}</pre>
				</details>

				<p class="mt-3 text-[11px] text-white/45 leading-relaxed">
					The SQL is idempotent — safe to re-run on a future release.
				</p>
			</li>

			<!-- Step 4 (optional): Enable Google sign-in -->
			<li class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
				<div class="flex items-baseline gap-3 mb-2">
					<span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 border border-white/15 text-white/70 text-xs font-semibold">4</span>
					<h2 class="text-base font-semibold">Enable Google sign-in <span class="text-xs text-white/50 font-normal">(optional)</span></h2>
				</div>
				<p class="text-sm text-white/60 mb-3 leading-relaxed">
					Skip this if you're happy with the magic-link email flow. Enabling Google removes the
					email-rate-limit problem entirely (Supabase's built-in SMTP is capped at 2 emails/hour).
				</p>
				<details class="text-[12px] text-white/65">
					<summary class="cursor-pointer hover:text-white/85 text-sm">Show me the steps</summary>

					<p class="mt-3 mb-2 text-[12px] uppercase tracking-wide text-white/55">Part 1 — Google Cloud Console</p>
					<ol class="space-y-2 list-decimal list-inside leading-relaxed text-white/65">
						<li>Open <a class="text-sky-300 underline" href="https://console.cloud.google.com" target="_blank" rel="noreferrer">console.cloud.google.com</a> → create a project (or pick an existing one).</li>
						<li>Go to <strong>APIs &amp; Services → OAuth consent screen</strong> → choose <strong>External</strong> → fill in app name, support email, developer contact email → Save.</li>
						<li>Go to <strong>APIs &amp; Services → Credentials → Create credentials → OAuth client ID</strong> → type <strong>Web application</strong>. Give it any name.</li>
						<li>
							<strong>Authorized redirect URIs:</strong> click <strong>Add URI</strong>, paste:
							{#if projectRef(url)}
								<br /><code class="break-all text-emerald-300">https://{projectRef(url)}.supabase.co/auth/v1/callback</code>
							{:else}
								<code class="text-white/85">https://&lt;your-project-ref&gt;.supabase.co/auth/v1/callback</code>
							{/if}
						</li>
						<li><strong>Authorized JavaScript origins:</strong> leave empty — Supabase's redirect flow doesn't use it.</li>
						<li>Click <strong>Create</strong>. A modal pops up showing your <strong>Client ID</strong> (ends in <code>.apps.googleusercontent.com</code>) and <strong>Client Secret</strong> (starts with <code>GOCSPX-</code>). Copy both. Save the secret in your password manager.</li>
					</ol>

					<p class="mt-4 mb-2 text-[12px] uppercase tracking-wide text-white/55">Part 2 — Supabase dashboard</p>
					<ol class="space-y-2 list-decimal list-inside leading-relaxed text-white/65" start="7">
						<li>Open your Supabase project → <strong>Authentication → Sign In / Providers</strong>.</li>
						<li>Find <strong>Google</strong> in the list and open it.</li>
						<li>Paste the <strong>Client ID</strong> (the long one ending in <code>.apps.googleusercontent.com</code>).</li>
						<li>Paste the <strong>Client Secret</strong> (starts with <code>GOCSPX-</code>). Don't confuse the two.</li>
						<li><strong>Toggle "Enable Sign in with Google" ON</strong> — this is a separate switch from the Save button. Easy to miss.</li>
						<li>Click <strong>Save</strong>.</li>
					</ol>

					<div class="mt-3 rounded-md border border-amber-400/20 bg-amber-500/5 p-3 text-[11px] text-amber-100/85 leading-relaxed">
						<strong>Common gotchas if it still doesn't work:</strong>
						<ul class="list-disc list-inside mt-1 space-y-0.5">
							<li><em>"Unsupported provider: provider is not enabled"</em> — the toggle in step 11 is off, or you didn't click Save.</li>
							<li><em>"Unsupported provider: missing OAuth secret"</em> — Client Secret field is empty in Supabase. Re-paste and save. The field may appear blank after save (it's still stored), so just paste again and save if unsure.</li>
							<li><em>"redirect_uri_mismatch"</em> from Google — the Authorized redirect URI in step 4 doesn't exactly match Supabase's callback. Copy it character-for-character.</li>
						</ul>
					</div>

					<p class="mt-3 text-[11px] text-white/45 leading-relaxed">
						Google's "testing mode" caps at 100 sign-ins — fine for self-hosted teams. Verification
						(to lift the cap) takes days and isn't needed unless you go public-scale.
					</p>
				</details>
			</li>
		</ol>

		<div class="mt-6 flex items-center justify-between gap-3 px-1">
			<p class="text-[11px] text-white/45 leading-relaxed">
				Saves URL + publishable key to this browser's localStorage. Both are public-by-design;
				row-level security in <code>supabase.sql</code> is what protects your data.
			</p>
			<Button size="sm" on:click={connect} disabled={!configValid}>Connect →</Button>
		</div>
	{/if}
</div>
