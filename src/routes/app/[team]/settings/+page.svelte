<script lang="ts">
	import { enhance } from '$app/forms';
	import Avatar from '$lib/components/Avatar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { formatDate } from '$lib/format';
	import { ROLE_DESCRIPTIONS, WORKSPACE_ROLES } from '$lib/types';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const owners = $derived(data.members.filter((m) => m.role === 'owner').length);
	const toast = $derived(
		form?.renamed
			? 'Workspace renamed'
			: form?.invited
				? `${form.invited} added`
				: form?.updated
					? 'Role updated'
					: form?.removed
						? 'Member removed'
						: null
	);
</script>

<svelte:head><title>Settings - {data.workspace.name} - Formwrite</title></svelte:head>

<Toast message={toast} />

<div>
	<p class="text-xs font-medium tracking-wide text-stone-500 uppercase">{data.workspace.name}</p>
	<h1 class="mt-1 text-2xl font-semibold tracking-tight">Settings</h1>
</div>

<div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
	<div class="space-y-6">
		<section class="card">
			<div class="flex items-center justify-between border-b border-stone-100 p-5">
				<div>
					<h2 class="flex items-center gap-2 font-semibold">
						<Icon name="users" size={16} /> Members
					</h2>
					<p class="mt-0.5 text-sm text-stone-500">
						Roles decide what each member can see and change in this workspace.
					</p>
				</div>
				<span class="badge bg-stone-100 text-stone-700">{data.members.length}</span>
			</div>

			{#if form?.members}
				<p class="alert-error m-5 mb-0" role="alert">
					<Icon name="alert-circle" size={16} class="mt-0.5" />{form.members}
				</p>
			{/if}

			<ul class="divide-y divide-stone-100">
				{#each data.members as m (m.id)}
					<li class="flex flex-wrap items-center gap-3 px-5 py-3.5">
						<Avatar name={m.name || m.email} />
						<div class="min-w-0 flex-1">
							<p class="flex items-center gap-2 truncate font-medium">
								{m.name || m.email}
								{#if m.isYou}<span class="badge bg-brand-50 text-brand-700">you</span>{/if}
							</p>
							<p class="truncate text-xs text-stone-500">
								{m.email}{m.joined ? ` · joined ${formatDate(m.joined)}` : ''}
							</p>
						</div>
						{#if data.canManage && !m.isYou}
							<form method="POST" action="?/role" use:enhance>
								<input type="hidden" name="membershipId" value={m.id} />
								<select
									class="input w-32 py-1.5 text-xs"
									name="role"
									value={m.role}
									aria-label="Role for {m.email}"
									onchange={(e) => e.currentTarget.form?.requestSubmit()}
								>
									{#each WORKSPACE_ROLES as r (r)}
										<option value={r}>{r}</option>
									{/each}
								</select>
							</form>
							<form
								method="POST"
								action="?/remove"
								use:enhance={({ cancel }) => {
									if (!confirm(`Remove ${m.email} from this workspace?`)) cancel();
								}}
							>
								<input type="hidden" name="membershipId" value={m.id} />
								<input type="hidden" name="userId" value={m.userId} />
								<button
									class="btn btn-ghost btn-icon text-stone-400 hover:text-red-700"
									type="submit"
									aria-label="Remove {m.email}"
									title="Remove"><Icon name="x" size={16} /></button
								>
							</form>
						{:else}
							<span class="badge bg-stone-100 text-stone-700 capitalize">{m.role}</span>
							{#if m.isYou && !(m.role === 'owner' && owners === 1)}
								<form
									method="POST"
									action="?/remove"
									use:enhance={({ cancel }) => {
										if (!confirm('Leave this workspace?')) cancel();
									}}
								>
									<input type="hidden" name="membershipId" value={m.id} />
									<input type="hidden" name="userId" value={m.userId} />
									<button class="btn btn-ghost btn-sm" type="submit"
										><Icon name="log-out" size={14} /> Leave</button
									>
								</form>
							{/if}
						{/if}
					</li>
				{/each}
			</ul>

			{#if data.canManage}
				<form
					method="POST"
					action="?/invite"
					class="border-t border-stone-100 bg-stone-50/60 p-5"
					use:enhance
				>
					<h3 class="flex items-center gap-2 text-sm font-semibold">
						<Icon name="user-plus" size={14} /> Add a member by email
					</h3>
					<div class="mt-3 grid gap-3 sm:grid-cols-[1fr_150px_auto]">
						<input
							class="input"
							id="invite-email"
							name="email"
							type="email"
							required
							placeholder="colleague@company.com"
							aria-label="Email address"
							value={form && 'email' in form ? (form.email ?? '') : ''}
						/>
						<select class="input" id="invite-role" name="role" aria-label="Role">
							<option value="editor">Editor</option>
							<option value="viewer">Viewer</option>
						</select>
						<button class="btn btn-primary" type="submit">Add member</button>
					</div>
					{#if form?.invite}
						<p class="alert-error mt-3" role="alert">
							<Icon name="alert-circle" size={16} class="mt-0.5" />{form.invite}
						</p>
					{:else if form?.invited}
						<p class="alert-success mt-3" role="status">
							<Icon name="check-circle" size={16} class="mt-0.5" />{form.invited} was added and can sign
							in with a one-time code sent to that address.
						</p>
					{/if}
					<dl class="mt-4 grid gap-2 text-xs text-stone-500 sm:grid-cols-3">
						{#each WORKSPACE_ROLES as r (r)}
							<div class="rounded-lg border border-stone-200 bg-white p-2.5">
								<dt class="font-semibold text-stone-700 capitalize">{r}</dt>
								<dd class="mt-0.5">{ROLE_DESCRIPTIONS[r]}</dd>
							</div>
						{/each}
					</dl>
				</form>
			{/if}
		</section>
	</div>

	<aside class="space-y-6">
		<section class="card p-5">
			<h2 class="flex items-center gap-2 font-semibold">
				<Icon name="briefcase" size={16} /> Workspace name
			</h2>
			<form method="POST" action="?/rename" class="mt-3 space-y-3" use:enhance>
				<input
					class="input"
					name="name"
					required
					minlength="2"
					maxlength="80"
					value={data.workspace.name}
					disabled={!data.canManage}
					aria-label="Workspace name"
				/>
				{#if form?.rename}
					<p class="alert-error" role="alert">
						<Icon name="alert-circle" size={16} class="mt-0.5" />{form.rename}
					</p>
				{/if}
				{#if data.canManage}
					<button class="btn btn-secondary w-full" type="submit">Rename</button>
				{/if}
			</form>
		</section>

		<section class="card p-5">
			<h2 class="flex items-center gap-2 font-semibold">
				<Icon name="shield-check" size={16} /> Privacy
			</h2>
			<p class="mt-1 text-sm text-stone-500">
				Forms, responses and uploaded files in this workspace are stored separately from every other
				workspace and are only visible to its members.
			</p>
			<dl class="mt-3 text-xs">
				<dt class="font-medium text-stone-700">Workspace ID</dt>
				<dd class="mt-0.5 rounded-md bg-stone-100 px-2 py-1 font-mono break-all text-stone-600">
					{data.workspace.id}
				</dd>
				<dd class="mt-1 text-stone-500">Quote this if you ever need help with your workspace.</dd>
			</dl>
		</section>

		{#if data.canManage}
			<section class="card border-red-200 p-5">
				<h2 class="flex items-center gap-2 font-semibold text-red-800">
					<Icon name="alert-circle" size={16} /> Delete workspace
				</h2>
				<p class="mt-1 text-sm text-stone-600">
					Permanently removes this workspace, its forms, all responses and every uploaded file.
				</p>
				<form
					method="POST"
					action="?/destroy"
					class="mt-3 space-y-3"
					use:enhance={({ cancel }) => {
						if (!confirm('This cannot be undone. Delete the workspace?')) cancel();
					}}
				>
					<input
						class="input"
						name="confirm"
						required
						placeholder="Type &quot;{data.workspace.name}&quot; to confirm"
						autocomplete="off"
					/>
					{#if form?.destroy}
						<p class="alert-error" role="alert">
							<Icon name="alert-circle" size={16} class="mt-0.5" />{form.destroy}
						</p>
					{/if}
					<button class="btn btn-danger w-full" type="submit"
						><Icon name="trash" size={14} /> Delete workspace</button
					>
				</form>
			</section>
		{/if}
	</aside>
</div>
