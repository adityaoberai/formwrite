<script lang="ts">
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import Logo from '$lib/components/Logo.svelte';

	const features: { icon: IconName; title: string; body: string }[] = [
		{
			icon: 'layers',
			title: 'A workspace per team',
			body: 'Invite teammates as owners, editors or viewers. Everyone sees the same forms and responses, with the right level of access.'
		},
		{
			icon: 'shield-check',
			title: 'Private by design',
			body: 'Every workspace keeps its forms, responses and files completely separate. Nothing is ever shared between workspaces.'
		},
		{
			icon: 'key-round',
			title: 'One-time codes, no passwords',
			body: 'Sign in with a six-digit code sent to your inbox, protected by a security phrase you can verify.'
		},
		{
			icon: 'layout',
			title: 'Sections and steps',
			body: 'Group questions into sections, then show them all at once or one step at a time with a progress bar.'
		},
		{
			icon: 'paperclip',
			title: 'File uploads built in',
			body: 'Respondents can attach files up to 10 MB. Uploads are encrypted, scanned and kept with the response.'
		},
		{
			icon: 'download',
			title: 'Export any time',
			body: 'Download every response as CSV, or browse them one by one with full detail views.'
		}
	];

	const steps = [
		{
			n: '01',
			title: 'Create a workspace',
			body: 'Name it, invite your team, and you are ready in seconds.'
		},
		{
			n: '02',
			title: 'Build your form',
			body: 'Nine field types, required rules, help text, and a live preview as you go.'
		},
		{
			n: '03',
			title: 'Share the link',
			body: 'Publish when ready. Responses show up instantly for your whole team.'
		}
	];
</script>

<svelte:head>
	<title>Formwrite - Forms for teams that keep their data to themselves</title>
</svelte:head>

<div class="relative isolate overflow-hidden">
	<div
		class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] bg-[radial-gradient(60%_50%_at_50%_0%,theme(--color-brand-100),transparent_70%)]"
		aria-hidden="true"
	></div>

	<header class="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
		<Logo />
		<nav class="flex items-center gap-2">
			<a href="#how" class="btn btn-ghost hidden sm:inline-flex">How it works</a>
			<a href="#security" class="btn btn-ghost hidden sm:inline-flex">Security</a>
			<a href="/login" class="btn btn-secondary">Sign in</a>
			<a href="/login" class="btn btn-primary">Get started</a>
		</nav>
	</header>

	<main>
		<section
			class="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-14 pb-24 lg:grid-cols-[1.05fr_1fr] lg:pt-20"
		>
			<div class="animate-rise">
				<span class="badge bg-white text-brand-700 ring-1 ring-brand-200">
					<Icon name="sparkles" size={12} /> New: sections, steps and custom themes
				</span>
				<h1 class="mt-5 text-5xl font-semibold tracking-[-0.03em] text-balance sm:text-6xl">
					Forms for teams that keep their data to themselves.
				</h1>
				<p class="mt-6 max-w-lg text-lg text-pretty text-stone-600">
					Build a form, share the link, watch responses arrive. Every workspace keeps its forms,
					responses and files completely separate from everyone else's.
				</p>
				<div class="mt-8 flex flex-wrap gap-3">
					<a href="/login" class="btn btn-primary px-5 py-2.5 text-base">
						Start for free <Icon name="arrow-right" size={16} />
					</a>
					<a href="#how" class="btn btn-secondary px-5 py-2.5 text-base">See how it works</a>
				</div>
				<p class="mt-4 text-sm text-stone-500">No credit card. No password to remember.</p>
			</div>

			<!-- Product mockup -->
			<div class="relative animate-rise [animation-delay:120ms]" aria-hidden="true">
				<div class="card overflow-hidden shadow-pop">
					<div class="flex items-center gap-1.5 border-b border-stone-200 bg-stone-50 px-4 py-2.5">
						<span class="size-2.5 rounded-full bg-stone-300"></span>
						<span class="size-2.5 rounded-full bg-stone-300"></span>
						<span class="size-2.5 rounded-full bg-stone-300"></span>
						<span
							class="ml-3 rounded-md bg-white px-2 py-0.5 text-[11px] text-stone-500 ring-1 ring-stone-200"
						>
							formwrite.app/f/acme/customer-feedback
						</span>
					</div>
					<div class="grid grid-cols-[1fr_1.2fr]">
						<div class="space-y-2 border-r border-stone-200 bg-stone-50/60 p-4">
							<p class="text-[10px] font-medium tracking-wide text-stone-400 uppercase">
								Questions
							</p>
							{#each [['type', 'Your name'], ['mail', 'Work email'], ['circle-dot', 'How did we do?'], ['align-left', 'Anything else?']] as [icon, label], i (label)}
								<div
									class="flex items-center gap-2 rounded-lg border bg-white px-2.5 py-2 text-xs {i ===
									2
										? 'border-brand-300 ring-2 ring-brand-500/20'
										: 'border-stone-200'}"
								>
									<Icon name={icon as IconName} size={12} class="text-stone-400" />
									<span class="text-stone-700">{label}</span>
								</div>
							{/each}
							<div
								class="flex items-center gap-2 rounded-lg border border-dashed border-stone-300 px-2.5 py-2 text-xs text-stone-400"
							>
								<Icon name="plus" size={12} /> Add question
							</div>
						</div>
						<div class="p-5">
							<div class="h-1.5 w-full rounded-full bg-brand-600"></div>
							<p class="mt-4 text-sm font-semibold">Customer feedback</p>
							<p class="mt-1 text-[11px] text-stone-500">Takes about a minute.</p>
							<div class="mt-4 space-y-3">
								<div>
									<p class="text-[11px] font-medium text-stone-700">Your name</p>
									<div
										class="mt-1 h-7 rounded-md border border-stone-300 bg-white px-2 py-1 text-[11px] text-stone-800"
									>
										Ada Lovelace
									</div>
								</div>
								<div>
									<p class="text-[11px] font-medium text-stone-700">How did we do?</p>
									<div class="mt-1 flex gap-1.5">
										{#each ['Great', 'Okay', 'Poor'] as o, i (o)}
											<span
												class="rounded-md border px-2 py-1 text-[11px] {i === 0
													? 'border-brand-600 bg-brand-50 text-brand-800'
													: 'border-stone-300 text-stone-600'}">{o}</span
											>
										{/each}
									</div>
								</div>
								<div
									class="mt-2 inline-flex rounded-md bg-brand-600 px-3 py-1.5 text-[11px] font-medium text-white"
								>
									Submit
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="card absolute -right-4 -bottom-6 flex items-center gap-3 px-4 py-3 shadow-pop">
					<span class="grid size-8 place-items-center rounded-full bg-emerald-100 text-emerald-700">
						<Icon name="check" size={14} />
					</span>
					<div>
						<p class="text-xs font-semibold">New response</p>
						<p class="text-[11px] text-stone-500">Customer feedback, just now</p>
					</div>
				</div>
			</div>
		</section>

		<section class="border-y border-stone-200 bg-white">
			<div class="mx-auto max-w-6xl px-6 py-20">
				<div class="max-w-2xl">
					<p class="text-sm font-semibold text-brand-700">Everything you need</p>
					<h2 class="mt-2 text-3xl font-semibold tracking-tight">
						Small surface, serious boundaries.
					</h2>
					<p class="mt-3 text-stone-600">
						Formwrite does one thing well: collect responses for your team, and keep them yours.
					</p>
				</div>
				<ul class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{#each features as f (f.title)}
						<li
							class="rounded-2xl border border-stone-200 p-6 transition hover:border-stone-300 hover:shadow-card"
						>
							<span
								class="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 ring-inset"
							>
								<Icon name={f.icon} size={18} />
							</span>
							<h3 class="mt-4 font-semibold">{f.title}</h3>
							<p class="mt-1.5 text-sm text-pretty text-stone-600">{f.body}</p>
						</li>
					{/each}
				</ul>
			</div>
		</section>

		<section id="how" class="mx-auto max-w-6xl px-6 py-20">
			<div class="max-w-2xl">
				<p class="text-sm font-semibold text-brand-700">How it works</p>
				<h2 class="mt-2 text-3xl font-semibold tracking-tight">
					From nothing to first response in minutes.
				</h2>
			</div>
			<ol class="mt-12 grid gap-6 md:grid-cols-3">
				{#each steps as s (s.n)}
					<li class="card relative p-6">
						<span class="text-4xl font-semibold tracking-tight text-brand-200">{s.n}</span>
						<h3 class="mt-3 font-semibold">{s.title}</h3>
						<p class="mt-1.5 text-sm text-stone-600">{s.body}</p>
					</li>
				{/each}
			</ol>
		</section>

		<section id="security" class="border-t border-stone-200 bg-ink text-white">
			<div class="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
				<div>
					<p class="text-sm font-semibold text-brand-300">Isolation by design</p>
					<h2 class="mt-2 text-3xl font-semibold tracking-tight">
						Your workspace is a locked room, not a shared drawer.
					</h2>
					<p class="mt-4 text-stone-300">
						Every workspace keeps its forms, responses and uploaded files separate from every other
						workspace. Access is checked on every request, so only members can ever see what
						respondents send you.
					</p>
					<a href="/login" class="btn mt-8 bg-white text-ink hover:bg-stone-200"
						>Create a workspace</a
					>
				</div>
				<div class="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
					<table class="w-full text-sm">
						<thead class="text-left text-xs tracking-wide text-stone-400">
							<tr class="border-b border-white/10">
								<th class="px-4 py-3 font-medium">What</th>
								<th class="px-4 py-3 font-medium">Who can see it</th>
								<th class="px-4 py-3 font-medium">Who can change it</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-white/10 text-[13px]">
							<tr>
								<td class="px-4 py-3">Forms</td>
								<td class="px-4 py-3 text-stone-300">Workspace members</td>
								<td class="px-4 py-3 text-stone-300">Owners and editors</td>
							</tr>
							<tr>
								<td class="px-4 py-3">Responses</td>
								<td class="px-4 py-3 text-stone-300">Workspace members</td>
								<td class="px-4 py-3 text-stone-300">Added by respondents, removed by editors</td>
							</tr>
							<tr>
								<td class="px-4 py-3">Uploaded files</td>
								<td class="px-4 py-3 text-stone-300">Workspace members</td>
								<td class="px-4 py-3 text-stone-300">Added by respondents, removed by editors</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>
	</main>

	<footer
		class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-sm text-stone-500"
	>
		<Logo />
		<p>Forms for teams that keep their data to themselves.</p>
		<a href="/login" class="hover:text-ink">Sign in</a>
	</footer>
</div>
