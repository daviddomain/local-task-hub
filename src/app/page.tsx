import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Download, Plus } from 'lucide-react';

import {
	createTask,
	getTaskDetail,
	listRecentlyOpenedTasks,
	listTasks,
	listTodayWorkedSummary,
	recordTaskOpened,
	updateTaskDetail,
	type TaskListFilters,
	type TaskSourceType,
	type TaskTimeRelationFilter
} from '@/lib/server/tasks';
import {
	getTodayTotalTrackedSeconds,
	startTaskTimeTracking,
	stopTaskTimeTracking
} from '@/lib/server/time-tracking';
import { RecentlyOpenedTasks } from '@/components/recently-opened-tasks';
import { TaskFilters } from '@/components/task-filters';
import { TaskList } from '@/components/task-list';
import { TaskSearchInput } from '@/components/task-search-input';
import { SOURCE_LABELS } from '@/components/task-display-helpers';
import { TodayWorkedSummary } from '@/components/today-worked-summary';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { SelectFormField } from '@/components/select-form-field';
import { Textarea } from '@/components/ui/textarea';

const STATUS_OPTIONS = [
	'open',
	'in_progress',
	'blocked',
	'waiting',
	'review',
	'done'
] as const;

const TODAY_WORKED_SUMMARY_VISIBLE_LIMIT = 5;

async function createTaskAction(formData: FormData) {
	'use server';

	const title = String(formData.get('title') ?? '');
	const note = String(formData.get('note') ?? '');
	const firstLink = String(formData.get('firstLink') ?? '');
	const tagsRaw = String(formData.get('tags') ?? '');
	const peopleRaw = String(formData.get('people') ?? '');
	const startTrackingNow = formData.get('startTrackingNow') === 'on';

	const tags = tagsRaw
		.split(',')
		.map((value) => value.trim())
		.filter(Boolean);

	const people = peopleRaw
		.split(',')
		.map((value) => value.trim())
		.filter(Boolean);

	await createTask({
		title,
		note,
		firstLink,
		tags,
		people,
		startTrackingNow
	});

	revalidatePath('/');
}

async function startTrackingAction(formData: FormData) {
	'use server';

	const taskId = Number.parseInt(String(formData.get('taskId') ?? ''), 10);
	if (Number.isNaN(taskId)) {
		throw new Error('Invalid task id');
	}

	await startTaskTimeTracking(taskId);
	revalidatePath('/');
}

async function stopTrackingAction(formData: FormData) {
	'use server';

	const taskId = Number.parseInt(String(formData.get('taskId') ?? ''), 10);
	if (Number.isNaN(taskId)) {
		throw new Error('Invalid task id');
	}

	await stopTaskTimeTracking(taskId);
	revalidatePath('/');
}

function parseListInput(value: string, separator: ',' | '\n') {
	return value
		.split(separator)
		.map((item) => item.trim())
		.filter(Boolean);
}

function parseTimeSessionsInput(formData: FormData) {
	const count = Number.parseInt(
		String(formData.get('detailTimeSessionCount') ?? '0'),
		10
	);

	if (Number.isNaN(count) || count < 0) {
		throw new Error('Invalid time session count');
	}

	const sessions: Array<{
		startedAt: Date;
		endedAt: Date | null;
		durationSeconds: number | null;
	}> = [];

	for (let index = 0; index < count; index += 1) {
		if (formData.get('detailTimeSessionRemove_' + index)) {
			continue;
		}

		const startedAtRaw = String(
			formData.get('detailTimeSessionStartedAt_' + index) ?? ''
		).trim();

		if (!startedAtRaw) {
			throw new Error('Missing started_at value in time sessions');
		}

		const startedAt = new Date(startedAtRaw);
		if (Number.isNaN(startedAt.getTime())) {
			throw new Error(
				`Invalid started_at value in time sessions: ${startedAtRaw}`
			);
		}

		const endedAtRaw = String(
			formData.get('detailTimeSessionEndedAt_' + index) ?? ''
		).trim();
		const endedAt = endedAtRaw ? new Date(endedAtRaw) : null;

		if (endedAt && Number.isNaN(endedAt.getTime())) {
			throw new Error(`Invalid ended_at value in time sessions: ${endedAtRaw}`);
		}

		const durationRaw = String(
			formData.get('detailTimeSessionDuration_' + index) ?? ''
		).trim();
		const durationSeconds =
			durationRaw ? Number.parseInt(durationRaw, 10) : null;

		if (durationRaw && Number.isNaN(durationSeconds)) {
			throw new Error(
				`Invalid duration_seconds value in time sessions: ${durationRaw}`
			);
		}

		const normalizedDurationSeconds =
			endedAt ?
				(durationSeconds ??
				Math.max(
					0,
					Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)
				))
			:	durationSeconds;

		sessions.push({
			startedAt,
			endedAt,
			durationSeconds: normalizedDurationSeconds
		});
	}

	return sessions;
}

async function updateTaskDetailAction(taskId: number, formData: FormData) {
	'use server';

	const title = String(formData.get('detailTitle') ?? '');
	const status = String(formData.get('detailStatus') ?? '');
	const statusTransition = String(formData.get('detailStatusTransition') ?? '');
	const later = formData.get('detailLater') === 'on';
	const note = String(formData.get('detailNote') ?? '');
	const linksRaw = String(formData.get('detailLinks') ?? '');
	const tagsRaw = String(formData.get('detailTags') ?? '');
	const peopleRaw = String(formData.get('detailPeople') ?? '');

	if (!STATUS_OPTIONS.includes(status as (typeof STATUS_OPTIONS)[number])) {
		throw new Error('Invalid status');
	}

	let statusValue = status as (typeof STATUS_OPTIONS)[number];

	if (statusTransition === 'done') {
		statusValue = 'done';
	} else if (statusTransition === 'reopen') {
		statusValue = 'open';
	}

	await updateTaskDetail({
		taskId,
		title,
		status: statusValue,
		later,
		note,
		links: parseListInput(linksRaw, '\n'),
		tags: parseListInput(tagsRaw, ','),
		people: parseListInput(peopleRaw, ','),
		timeSessions: parseTimeSessionsInput(formData)
	});

	revalidatePath('/');
	redirect(`/?taskId=${taskId}#task-detail`);
}

function formatTimestamp(value: Date) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short'
	}).format(value);
}

function getLinkDomainHint(url: string) {
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return null;
	}
}

function truncateLinkLabel(url: string, maxLength = 96) {
	if (url.length <= maxLength) {
		return url;
	}

	return `${url.slice(0, maxLength).trimEnd()}...`;
}

export default async function Home({
	searchParams
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const params = await searchParams;
	const taskIdParam =
		Array.isArray(params.taskId) ? params.taskId[0] : params.taskId;
	const queryParam = Array.isArray(params.q) ? params.q[0] : params.q;
	const statusParam =
		Array.isArray(params.status) ? params.status[0] : params.status;
	const laterParam =
		Array.isArray(params.later) ? params.later[0] : params.later;
	const personParam =
		Array.isArray(params.person) ? params.person[0] : params.person;
	const tagParam = Array.isArray(params.tag) ? params.tag[0] : params.tag;
	const timeParam = Array.isArray(params.time) ? params.time[0] : params.time;
	const sourceParam =
		Array.isArray(params.source) ? params.source[0] : params.source;

	const selectedTaskId = Number.parseInt(taskIdParam ?? '', 10);

	const filters: TaskListFilters = {
		query: queryParam?.trim() || undefined,
		status:
			(
				statusParam &&
				STATUS_OPTIONS.includes(statusParam as (typeof STATUS_OPTIONS)[number])
			) ?
				(statusParam as (typeof STATUS_OPTIONS)[number])
			:	undefined,
		later:
			laterParam === 'only' || laterParam === 'exclude' ?
				laterParam
			:	undefined,
		person: personParam?.trim() || undefined,
		tag: tagParam?.trim() || undefined,
		timeRelation:
			(
				timeParam === 'today' ||
				timeParam === 'this_week' ||
				timeParam === 'no_time' ||
				timeParam === 'recently_updated'
			) ?
				(timeParam as TaskTimeRelationFilter)
			:	undefined,
		source:
			(
				sourceParam === 'jira' ||
				sourceParam === 'gitlab' ||
				sourceParam === 'github' ||
				sourceParam === 'confluence' ||
				sourceParam === 'other'
			) ?
				(sourceParam as TaskSourceType)
			:	undefined
	};

	const allTasks = await listTasks();
	const tasks = await listTasks(filters);
	const selectedTask =
		Number.isNaN(selectedTaskId) ? null : await getTaskDetail(selectedTaskId);

	if (selectedTask) {
		await recordTaskOpened(selectedTask.id);
	}

	const recentlyOpenedTasks = await listRecentlyOpenedTasks();
	const todayTotalTrackedSeconds = await getTodayTotalTrackedSeconds();
	const todayWorkedSummary = await listTodayWorkedSummary();

	const peopleOptions = [
		...new Set(allTasks.flatMap((task) => task.people))
	].sort((a, b) => a.localeCompare(b));
	const tagOptions = [...new Set(allTasks.flatMap((task) => task.tags))].sort(
		(a, b) => a.localeCompare(b)
	);

	const activeFilterLabels: string[] = [];
	if (filters.status) {
		activeFilterLabels.push(`Status: ${filters.status}`);
	}
	if (filters.later === 'only') {
		activeFilterLabels.push('Later: only');
	}
	if (filters.later === 'exclude') {
		activeFilterLabels.push('Later: exclude');
	}
	if (filters.person) {
		activeFilterLabels.push(`Person: ${filters.person}`);
	}
	if (filters.tag) {
		activeFilterLabels.push(`Tag: #${filters.tag}`);
	}
	if (filters.timeRelation === 'today') {
		activeFilterLabels.push('Time: today');
	}
	if (filters.timeRelation === 'this_week') {
		activeFilterLabels.push('Time: this week');
	}
	if (filters.timeRelation === 'no_time') {
		activeFilterLabels.push('Time: no time');
	}
	if (filters.timeRelation === 'recently_updated') {
		activeFilterLabels.push('Time: recently updated');
	}
	if (filters.source) {
		activeFilterLabels.push(`Source: ${SOURCE_LABELS[filters.source]}`);
	}

	const taskLinkParams = new URLSearchParams();
	if (filters.query) {
		taskLinkParams.set('q', filters.query);
	}
	if (filters.status) {
		taskLinkParams.set('status', filters.status);
	}
	if (filters.later) {
		taskLinkParams.set('later', filters.later);
	}
	if (filters.person) {
		taskLinkParams.set('person', filters.person);
	}
	if (filters.tag) {
		taskLinkParams.set('tag', filters.tag);
	}
	if (filters.timeRelation) {
		taskLinkParams.set('time', filters.timeRelation);
	}
	if (filters.source) {
		taskLinkParams.set('source', filters.source);
	}

	return (
		<div className='mx-auto min-h-screen w-full max-w-7xl px-6 py-8 lg:px-10'>
			<main className='grid gap-6 lg:grid-cols-[1fr_1fr]'>
				<section
					className='space-y-6'
					aria-label='Task workspace'>
					<Card>
						<CardHeader className='border-b border-border'>
							<CardTitle className='text-xl tracking-tight'>
								Local Task Hub
							</CardTitle>
							<CardDescription>
								Desktop-first task workspace with live search and combinable
								filters.
							</CardDescription>
						</CardHeader>
						<CardContent className='space-y-5'>
							<div className='grid gap-4 lg:grid-cols-[1fr_auto]'>
								<div className='space-y-2'>
									<label
										htmlFor='task-search'
										className='text-sm font-medium'>
										Search tasks
									</label>
									<TaskSearchInput />
								</div>

								<div className='flex flex-wrap items-end gap-2'>
									<Button
										asChild
										className='w-full lg:w-auto'>
										<a href='#quick-add'>
											<Plus
												aria-hidden='true'
												className='size-4'
											/>
											Create task
										</a>
									</Button>
									<Button
										asChild
										variant='outline'
										className='w-full lg:w-auto'>
										<a href='/api/exports/tasks/open'>
											<Download
												aria-hidden='true'
												className='size-4'
											/>
											Export open JSON
										</a>
									</Button>
								</div>
							</div>

							<TodayWorkedSummary
								todayTotalTrackedSeconds={todayTotalTrackedSeconds}
								todayWorkedSummary={todayWorkedSummary}
								visibleLimit={TODAY_WORKED_SUMMARY_VISIBLE_LIMIT}
							/>

							<TaskFilters
								activeFilterLabels={activeFilterLabels}
								filters={filters}
								peopleOptions={peopleOptions}
								statusOptions={STATUS_OPTIONS}
								tagOptions={tagOptions}
							/>
						</CardContent>
					</Card>

					<RecentlyOpenedTasks
						recentlyOpenedTasks={recentlyOpenedTasks}
						taskLinkParams={taskLinkParams.toString()}
					/>

					<TaskList
						selectedTaskId={selectedTask?.id ?? null}
						startTrackingAction={startTrackingAction}
						stopTrackingAction={stopTrackingAction}
						taskLinkParams={taskLinkParams.toString()}
						tasks={tasks}
					/>
				</section>

				<aside
					className='space-y-6 lg:sticky lg:top-8 lg:self-start'
					aria-label='Task detail and quick add'>
					<Card id='task-detail'>
						<CardHeader className='border-b border-border'>
							<CardTitle className='text-base tracking-tight'>
								Task detail
							</CardTitle>
							<CardDescription>
								{selectedTask ?
									'Phase 1 task payload fields are editable and persisted in MySQL.'
								:	'Select a task title from the list to open details.'}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{selectedTask ?
								<form
									action={updateTaskDetailAction.bind(null, selectedTask.id)}
									className='space-y-4'>
									<div className='space-y-1.5'>
										<label
											htmlFor='detailTitle'
											className='text-sm font-medium'>
											Title
										</label>
										<Input
											id='detailTitle'
											name='detailTitle'
											defaultValue={selectedTask.title}
											required
										/>
									</div>

									<div className='grid gap-3 sm:grid-cols-2'>
										<div className='space-y-1.5'>
											<label
												htmlFor='detailStatus'
												className='text-sm font-medium'>
												Status
											</label>
											<SelectFormField
												id='detailStatus'
												name='detailStatus'
												ariaLabel='Status'
												value={selectedTask.status}
												placeholder='Status'
												triggerClassName='w-full rounded-md'
												options={STATUS_OPTIONS.map((statusOption) => ({
													value: statusOption,
													label: statusOption
												}))}
											/>
										</div>

										<div className='flex items-end'>
											<label className='flex items-center gap-2 text-sm'>
												<Checkbox
													id='detailLater'
													name='detailLater'
													defaultChecked={selectedTask.later}
												/>
												Later
											</label>
										</div>
									</div>

									<div className='space-y-1.5'>
										<label
											htmlFor='detailNote'
											className='text-sm font-medium'>
											Note (markdown text)
										</label>
										<Textarea
											id='detailNote'
											name='detailNote'
											defaultValue={selectedTask.note ?? ''}
											className='min-h-28'
										/>
										{selectedTask.note ?
											<pre className='max-h-24 overflow-auto rounded-md border border-border bg-muted/20 p-2 text-xs text-muted-foreground'>
												{selectedTask.note}
											</pre>
										:	null}
									</div>

									<div className='space-y-1.5'>
										<label
											htmlFor='detailLinks'
											className='text-sm font-medium'>
											Links (one URL per line)
										</label>
										<Textarea
											id='detailLinks'
											name='detailLinks'
											defaultValue={selectedTask.links.join('\n')}
											className='min-h-24'
										/>
										{selectedTask.links.length > 0 ?
											<ul
												className='space-y-1 rounded-md border border-border bg-muted/20 p-2 text-sm'
												aria-label='Attached links'>
												{selectedTask.links.map((link) => {
													const domainHint = getLinkDomainHint(link);

													return (
														<li
															key={link}
															className='flex items-center justify-between gap-3'>
															<a
																href={link}
																target='_blank'
																rel='noreferrer noopener'
																className='truncate text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
																{truncateLinkLabel(link)}
															</a>
															{domainHint ?
																<span className='shrink-0 text-xs text-muted-foreground'>
																	{domainHint}
																</span>
															:	null}
														</li>
													);
												})}
											</ul>
										:	null}
									</div>

									<div className='space-y-1.5'>
										<label
											htmlFor='detailTags'
											className='text-sm font-medium'>
											Tags (comma-separated)
										</label>
										<Input
											id='detailTags'
											name='detailTags'
											defaultValue={selectedTask.tags.join(', ')}
										/>
									</div>

									<div className='space-y-1.5'>
										<label
											htmlFor='detailPeople'
											className='text-sm font-medium'>
											Person references (comma-separated)
										</label>
										<Input
											id='detailPeople'
											name='detailPeople'
											defaultValue={selectedTask.people.join(', ')}
										/>
									</div>

									<div className='space-y-2'>
										<div className='space-y-1.5'>
											<p className='text-sm font-medium'>Time sessions</p>
											<p className='text-xs text-muted-foreground'>
												Edit each session directly using ISO date-time values.
											</p>
										</div>
										<input
											type='hidden'
											name='detailTimeSessionCount'
											value={selectedTask.timeSessions.length}
										/>
										{selectedTask.timeSessions.length > 0 ?
											<ul
												className='space-y-2'
												aria-label='Time sessions'>
												{selectedTask.timeSessions.map((session, index) => (
													<li
														key={'time-session-' + index}
														className='rounded-md border border-border bg-muted/20 p-3'
														data-testid='time-session-row'>
														<div className='grid gap-2 sm:grid-cols-3'>
															<div className='space-y-1'>
																<label
																	htmlFor={
																		'detailTimeSessionStartedAt-' + index
																	}
																	className='text-xs font-medium text-muted-foreground'>
																	Started at
																</label>
																<Input
																	id={'detailTimeSessionStartedAt-' + index}
																	name={'detailTimeSessionStartedAt_' + index}
																	defaultValue={session.startedAt.toISOString()}
																	className='font-mono text-xs'
																	required
																/>
															</div>
															<div className='space-y-1'>
																<label
																	htmlFor={'detailTimeSessionEndedAt-' + index}
																	className='text-xs font-medium text-muted-foreground'>
																	Ended at
																</label>
																<Input
																	id={'detailTimeSessionEndedAt-' + index}
																	name={'detailTimeSessionEndedAt_' + index}
																	defaultValue={
																		session.endedAt ?
																			session.endedAt.toISOString()
																		:	''
																	}
																	className='font-mono text-xs'
																/>
															</div>
															<div className='space-y-1'>
																<label
																	htmlFor={'detailTimeSessionDuration-' + index}
																	className='text-xs font-medium text-muted-foreground'>
																	Duration (seconds)
																</label>
																<Input
																	id={'detailTimeSessionDuration-' + index}
																	name={'detailTimeSessionDuration_' + index}
																	defaultValue={session.durationSeconds ?? ''}
																	className='font-mono text-xs'
																	inputMode='numeric'
																/>
															</div>
														</div>
														<div className='mt-2'>
															<label
																htmlFor={'detailTimeSessionRemove-' + index}
																className='inline-flex items-center gap-2 text-xs text-muted-foreground'>
																<input
																	id={'detailTimeSessionRemove-' + index}
																	type='checkbox'
																	name={'detailTimeSessionRemove_' + index}
																	value='1'
																	className='size-4 rounded border-border align-middle'
																/>
																Remove this session on save
															</label>
														</div>
													</li>
												))}
											</ul>
										:	<p className='rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground'>
												No time sessions yet.
											</p>
										}
									</div>

									<dl className='space-y-1 rounded-md border border-border bg-muted/20 p-3 text-xs'>
										<div className='flex justify-between gap-3'>
											<dt className='text-muted-foreground'>Created</dt>
											<dd>
												<time dateTime={selectedTask.createdAt.toISOString()}>
													{formatTimestamp(selectedTask.createdAt)}
												</time>
											</dd>
										</div>
										<div className='flex justify-between gap-3'>
											<dt className='text-muted-foreground'>Updated</dt>
											<dd>
												<time dateTime={selectedTask.updatedAt.toISOString()}>
													{formatTimestamp(selectedTask.updatedAt)}
												</time>
											</dd>
										</div>
									</dl>

									<div className='flex flex-wrap gap-2'>
										<Button
											type='submit'
											className='flex-1'>
											Save detail
										</Button>
										<Button
											asChild
											type='button'
											variant='outline'>
											<a href={`/api/exports/task/${selectedTask.id}/markdown`}>
												<Download
													aria-hidden='true'
													className='size-4'
												/>
												Export markdown
											</a>
										</Button>
										{selectedTask.status === 'done' ?
											<Button
												type='submit'
												name='detailStatusTransition'
												value='reopen'
												variant='secondary'>
												Reopen task
											</Button>
										:	<Button
												type='submit'
												name='detailStatusTransition'
												value='done'
												variant='secondary'>
												Mark done
											</Button>
										}
										<Button
											asChild
											type='button'
											variant='outline'>
											<Link href='/'>Close</Link>
										</Button>
									</div>
								</form>
							:	<Empty>
									<EmptyHeader>
										<EmptyTitle>No task selected</EmptyTitle>
										<EmptyDescription>
											Choose a task from the list to view and edit detail
											fields.
										</EmptyDescription>
									</EmptyHeader>
								</Empty>
							}
						</CardContent>
					</Card>

					<Card
						id='quick-add'
						aria-label='Quick add'>
						<CardHeader className='border-b border-border'>
							<CardTitle className='text-base tracking-tight'>
								Quick add
							</CardTitle>
							<CardDescription>Only title is required.</CardDescription>
						</CardHeader>
						<CardContent>
							<form
								action={createTaskAction}
								className='space-y-4'>
								<div className='space-y-1.5'>
									<label
										htmlFor='title'
										className='text-sm font-medium'>
										Title <span className='text-destructive'>*</span>
									</label>
									<Input
										id='title'
										name='title'
										required
										placeholder='Add task title'
									/>
								</div>

								<div className='space-y-1.5'>
									<label
										htmlFor='note'
										className='text-sm font-medium'>
										Note (optional)
									</label>
									<Textarea
										id='note'
										name='note'
										placeholder='Short markdown-friendly note'
										className='min-h-24'
									/>
								</div>

								<div className='space-y-1.5'>
									<label
										htmlFor='firstLink'
										className='text-sm font-medium'>
										First link (optional)
									</label>
									<Input
										id='firstLink'
										name='firstLink'
										type='url'
										placeholder='https://github.com/...'
									/>
								</div>

								<div className='space-y-1.5'>
									<label
										htmlFor='tags'
										className='text-sm font-medium'>
										First tags (optional)
									</label>
									<Input
										id='tags'
										name='tags'
										placeholder='bug, frontend, review'
									/>
								</div>

								<div className='space-y-1.5'>
									<label
										htmlFor='people'
										className='text-sm font-medium'>
										First person references (optional)
									</label>
									<Input
										id='people'
										name='people'
										placeholder='@anna, @max'
									/>
								</div>

								<label
									className='flex items-center gap-2 text-sm'
									htmlFor='startTrackingNow'>
									<Checkbox
										id='startTrackingNow'
										name='startTrackingNow'
									/>
									Start time tracking now
								</label>

								<Button
									type='submit'
									className='w-full'>
									Create task
								</Button>
							</form>
						</CardContent>
					</Card>
				</aside>
			</main>
		</div>
	);
}
