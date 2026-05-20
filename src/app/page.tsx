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
import { QuickAddDialogContent } from '@/components/quick-add-dialog-content';
import { RecentlyOpenedTasks } from '@/components/recently-opened-tasks';
import { TaskDetailDialogContent } from '@/components/task-detail-dialog-content';
import { TaskFilters } from '@/components/task-filters';
import { TaskList } from '@/components/task-list';
import { TaskSearchInput } from '@/components/task-search-input';
import { SOURCE_LABELS } from '@/components/task-display-helpers';
import { TodayWorkedSummary } from '@/components/today-worked-summary';
import { UrlDialog } from '@/components/url-dialog';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card';

const STATUS_OPTIONS = [
	'open',
	'in_progress',
	'blocked',
	'waiting',
	'review',
	'done'
] as const;

const TODAY_WORKED_SUMMARY_VISIBLE_LIMIT = 5;

function getSafeRedirectPath(value: FormDataEntryValue | null) {
	const redirectPath = String(value ?? '').trim();

	if (!redirectPath.startsWith('/') || redirectPath.startsWith('//')) {
		return '/';
	}

	return redirectPath;
}

async function createTaskAction(formData: FormData) {
	'use server';

	const title = String(formData.get('title') ?? '');
	const note = String(formData.get('note') ?? '');
	const firstLink = String(formData.get('firstLink') ?? '');
	const tagsRaw = String(formData.get('tags') ?? '');
	const peopleRaw = String(formData.get('people') ?? '');
	const startTrackingNow = formData.get('startTrackingNow') === 'on';
	const returnTo = getSafeRedirectPath(formData.get('returnTo'));

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
	redirect(returnTo);
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
	const detailReturnTo = getSafeRedirectPath(formData.get('detailReturnTo'));

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
	redirect(detailReturnTo);
}

function getFirstParam(
	params: Record<string, string | string[] | undefined>,
	key: string
) {
	const value = params[key];
	return Array.isArray(value) ? value[0] : value;
}

function buildHref(baseParams: URLSearchParams, values: Record<string, string>) {
	const params = new URLSearchParams(baseParams);

	for (const [key, value] of Object.entries(values)) {
		params.set(key, value);
	}

	const query = params.toString();
	return query ? `/?${query}` : '/';
}

export default async function Home({
	searchParams
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const params = await searchParams;
	const taskIdParam = getFirstParam(params, 'taskId');
	const queryParam = getFirstParam(params, 'q');
	const statusParam = getFirstParam(params, 'status');
	const laterParam = getFirstParam(params, 'later');
	const personParam = getFirstParam(params, 'person');
	const tagParam = getFirstParam(params, 'tag');
	const timeParam = getFirstParam(params, 'time');
	const sourceParam = getFirstParam(params, 'source');
	const quickAddParam = getFirstParam(params, 'quickAdd');

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

	const taskListParams = taskLinkParams.toString();
	const closeHref = buildHref(taskLinkParams, {});
	const openQuickAddHref = buildHref(taskLinkParams, { quickAdd: '1' });
	const selectedTaskHref =
		selectedTask ?
			`${buildHref(taskLinkParams, { taskId: String(selectedTask.id) })}#task-detail`
		:	closeHref;

	return (
		<div className='mx-auto min-h-screen w-full max-w-7xl px-6 py-8 lg:px-10'>
			<main className='grid gap-6 lg:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.18fr)]'>
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
							<div className='grid gap-4'>
								<div className='space-y-2'>
									<label
										htmlFor='task-search'
										className='text-sm font-medium'>
										Search tasks
									</label>
									<TaskSearchInput />
								</div>

								<div className='flex flex-wrap gap-2'>
									<Button
										asChild
										className='w-full sm:w-auto'>
										<a href={openQuickAddHref}>
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
										className='w-full sm:w-auto'>
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
						taskLinkParams={taskListParams}
					/>
				</section>

				<section
					className='lg:sticky lg:top-8 lg:self-start'
					aria-label='Task list'>
					<TaskList
						openQuickAddHref={openQuickAddHref}
						selectedTaskId={selectedTask?.id ?? null}
						startTrackingAction={startTrackingAction}
						stopTrackingAction={stopTrackingAction}
						taskLinkParams={taskListParams}
						tasks={tasks}
					/>
				</section>
			</main>

			<UrlDialog
				open={quickAddParam === '1'}
				closeHref={closeHref}
				contentClassName='max-h-[calc(100vh-4rem)] gap-0 overflow-hidden p-0 sm:max-w-xl'
				contentId='quick-add'>
				<QuickAddDialogContent
					closeHref={closeHref}
					createTaskAction={createTaskAction}
				/>
			</UrlDialog>

			{selectedTask ?
				<UrlDialog
					open={true}
					closeHref={closeHref}
					contentClassName='max-h-[calc(100vh-4rem)] gap-0 overflow-hidden p-0 sm:max-w-3xl'
					contentId='task-detail'>
					<TaskDetailDialogContent
						closeHref={closeHref}
						detailReturnTo={selectedTaskHref}
						selectedTask={selectedTask}
						statusOptions={STATUS_OPTIONS}
						updateTaskDetailAction={updateTaskDetailAction}
					/>
				</UrlDialog>
			:	null}
		</div>
	);
}
