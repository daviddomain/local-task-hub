import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Download, Play, Plus, Search, Square } from 'lucide-react';

import {
  createTask,
  getTaskDetail,
  listRecentlyOpenedTasks,
  listTasks,
  recordTaskOpened,
  updateTaskDetail,
  type Task,
  type TaskListFilters,
  type TaskSourceType,
  type TaskTimeRelationFilter
} from '@/lib/server/tasks';
import {
  getTodayTotalTrackedSeconds,
  startTaskTimeTracking,
  stopTaskTimeTracking
} from '@/lib/server/time-tracking';
import { TaskSearchInput } from '@/components/task-search-input';
import { Badge } from '@/components/ui/badge';
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
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { SelectFormField } from '@/components/select-form-field';
import { Textarea } from '@/components/ui/textarea';

const SOURCE_LABELS: Record<TaskSourceType, string> = {
  jira: 'Jira',
  gitlab: 'GitLab',
  github: 'GitHub',
  confluence: 'Confluence',
  other: 'Other'
};

const STATUS_OPTIONS = [
  'open',
  'in_progress',
  'blocked',
  'waiting',
  'review',
  'done'
] as const;

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
      throw new Error(`Invalid started_at value in time sessions: ${startedAtRaw}`);
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
    const durationSeconds = durationRaw ? Number.parseInt(durationRaw, 10) : null;

    if (durationRaw && Number.isNaN(durationSeconds)) {
      throw new Error(
        `Invalid duration_seconds value in time sessions: ${durationRaw}`
      );
    }

    const normalizedDurationSeconds =
      endedAt
        ? (durationSeconds ??
          Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)))
        : durationSeconds;

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

function truncateNote(note: string, maxLength = 140) {
  if (note.length <= maxLength) {
    return note;
  }

  return `${note.slice(0, maxLength).trimEnd()}...`;
}

function formatDuration(totalSeconds: number) {
  if (totalSeconds <= 0) {
    return '0m';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function getSourceBadgeLabel(task: Task) {
  if (!task.firstLink) {
    return 'Local';
  }

  if (!task.firstLinkSourceType) {
    return SOURCE_LABELS.other;
  }

  return SOURCE_LABELS[task.firstLinkSourceType];
}

function getTaskTodayLabel(task: Task) {
  return task.todayTrackedSeconds > 0 ? formatDuration(task.todayTrackedSeconds) : '0m';
}

function getTaskTotalLabel(task: Task) {
  return task.totalTrackedSeconds > 0 ? formatDuration(task.totalTrackedSeconds) : '0m';
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
  const taskIdParam = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId;
  const queryParam = Array.isArray(params.q) ? params.q[0] : params.q;
  const statusParam = Array.isArray(params.status) ? params.status[0] : params.status;
  const laterParam = Array.isArray(params.later) ? params.later[0] : params.later;
  const personParam = Array.isArray(params.person) ? params.person[0] : params.person;
  const tagParam = Array.isArray(params.tag) ? params.tag[0] : params.tag;
  const timeParam = Array.isArray(params.time) ? params.time[0] : params.time;
  const sourceParam = Array.isArray(params.source) ? params.source[0] : params.source;

  const selectedTaskId = Number.parseInt(taskIdParam ?? '', 10);

  const filters: TaskListFilters = {
    query: queryParam?.trim() || undefined,
    status:
      statusParam && STATUS_OPTIONS.includes(statusParam as (typeof STATUS_OPTIONS)[number])
        ? (statusParam as (typeof STATUS_OPTIONS)[number])
        : undefined,
    later: laterParam === 'only' || laterParam === 'exclude' ? laterParam : undefined,
    person: personParam?.trim() || undefined,
    tag: tagParam?.trim() || undefined,
    timeRelation:
      timeParam === 'today' ||
      timeParam === 'this_week' ||
      timeParam === 'no_time' ||
      timeParam === 'recently_updated'
        ? (timeParam as TaskTimeRelationFilter)
        : undefined,
    source:
      sourceParam === 'jira' ||
      sourceParam === 'gitlab' ||
      sourceParam === 'github' ||
      sourceParam === 'confluence' ||
      sourceParam === 'other'
        ? (sourceParam as TaskSourceType)
        : undefined
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

  const peopleOptions = [...new Set(allTasks.flatMap((task) => task.people))].sort((a, b) =>
    a.localeCompare(b)
  );
  const tagOptions = [...new Set(allTasks.flatMap((task) => task.tags))].sort((a, b) =>
    a.localeCompare(b)
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
        <section className='space-y-6' aria-label='Task workspace'>
          <Card>
            <CardHeader className='border-b border-border'>
              <CardTitle className='text-xl tracking-tight'>Local Task Hub</CardTitle>
              <CardDescription>
                Desktop-first task workspace with live search and combinable filters.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-5'>
              <div className='grid gap-4 lg:grid-cols-[1fr_auto]'>
                <div className='space-y-2'>
                  <label htmlFor='task-search' className='text-sm font-medium'>
                    Search tasks
                  </label>
                  <TaskSearchInput />
                </div>

                <div className='flex flex-wrap items-end gap-2'>
                  <Button asChild className='w-full lg:w-auto'>
                    <a href='#quick-add'>
                      <Plus aria-hidden='true' className='size-4' />
                      Create task
                    </a>
                  </Button>
                  <Button asChild variant='outline' className='w-full lg:w-auto'>
                    <a href='/api/exports/tasks/open'>
                      <Download aria-hidden='true' className='size-4' />
                      Export open JSON
                    </a>
                  </Button>
                </div>
              </div>

              <p className='text-sm text-muted-foreground'>
                Today total tracked:{' '}
                <span className='font-medium text-foreground'>
                  {formatDuration(todayTotalTrackedSeconds)}
                </span>
              </p>

              <fieldset className='space-y-3' aria-label='Task filters'>
                <legend className='text-sm font-medium'>Filters</legend>
                <form className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3' method='get'>
                  {filters.query ? <input type='hidden' name='q' value={filters.query} /> : null}

                  <div className='space-y-1'>
                    <label htmlFor='status' className='text-xs text-muted-foreground'>
                      Status
                    </label>
                    <SelectFormField
                      id='status'
                      name='status'
                      value={filters.status ?? ''}
                      placeholder='All statuses'
                      options={[
                        { value: '', label: 'All statuses' },
                        ...STATUS_OPTIONS.map((statusOption) => ({
                          value: statusOption,
                          label: statusOption
                        }))
                      ]}
                    />
                  </div>

                  <div className='space-y-1'>
                    <label htmlFor='later' className='text-xs text-muted-foreground'>
                      Later
                    </label>
                    <SelectFormField
                      id='later'
                      name='later'
                      value={filters.later ?? ''}
                      placeholder='Any'
                      options={[
                        { value: '', label: 'Any' },
                        { value: 'only', label: 'Later only' },
                        { value: 'exclude', label: 'Exclude later' }
                      ]}
                    />
                  </div>

                  <div className='space-y-1'>
                    <label htmlFor='person' className='text-xs text-muted-foreground'>
                      Person
                    </label>
                    <SelectFormField
                      id='person'
                      name='person'
                      value={filters.person ?? ''}
                      placeholder='Any person'
                      options={[
                        { value: '', label: 'Any person' },
                        ...peopleOptions.map((person) => ({
                          value: person,
                          label: person
                        }))
                      ]}
                    />
                  </div>

                  <div className='space-y-1'>
                    <label htmlFor='tag' className='text-xs text-muted-foreground'>
                      Tag
                    </label>
                    <SelectFormField
                      id='tag'
                      name='tag'
                      value={filters.tag ?? ''}
                      placeholder='Any tag'
                      options={[
                        { value: '', label: 'Any tag' },
                        ...tagOptions.map((tag) => ({
                          value: tag,
                          label: tag
                        }))
                      ]}
                    />
                  </div>

                  <div className='space-y-1'>
                    <label htmlFor='time' className='text-xs text-muted-foreground'>
                      Time relation
                    </label>
                    <SelectFormField
                      id='time'
                      name='time'
                      value={filters.timeRelation ?? ''}
                      placeholder='Any time'
                      options={[
                        { value: '', label: 'Any time' },
                        { value: 'today', label: 'Today' },
                        { value: 'this_week', label: 'This week' },
                        { value: 'no_time', label: 'No time' },
                        { value: 'recently_updated', label: 'Recently updated' }
                      ]}
                    />
                  </div>

                  <div className='space-y-1'>
                    <label htmlFor='source' className='text-xs text-muted-foreground'>
                      Source
                    </label>
                    <SelectFormField
                      id='source'
                      name='source'
                      value={filters.source ?? ''}
                      placeholder='Any source'
                      options={[
                        { value: '', label: 'Any source' },
                        { value: 'jira', label: 'Jira' },
                        { value: 'gitlab', label: 'GitLab' },
                        { value: 'github', label: 'GitHub' },
                        { value: 'confluence', label: 'Confluence' },
                        { value: 'other', label: 'Other' }
                      ]}
                    />
                  </div>

                  <div className='sm:col-span-2 xl:col-span-3 flex items-center gap-2'>
                    <Button type='submit' variant='secondary'>
                      Apply filters
                    </Button>
                    <Button asChild type='button' variant='ghost'>
                      <Link href='/'>Clear</Link>
                    </Button>
                  </div>
                </form>

                {activeFilterLabels.length > 0 ? (
                  <div className='flex flex-wrap gap-2' aria-label='Active filters'>
                    {activeFilterLabels.map((label) => (
                      <Badge key={label} variant='outline' className='px-3 py-1'>
                        {label}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </fieldset>
            </CardContent>
          </Card>

          <Card aria-label='Recently opened tasks'>
            <CardHeader className='border-b border-border'>
              <CardTitle className='text-base tracking-tight'>Recently opened</CardTitle>
              <CardDescription>Latest task detail views (up to 5).</CardDescription>
            </CardHeader>
            <CardContent>
              {recentlyOpenedTasks.length === 0 ? (
                <p className='text-sm text-muted-foreground'>No recently opened tasks yet.</p>
              ) : (
                <ul className='space-y-2'>
                  {recentlyOpenedTasks.map((task) => {
                    const taskHrefParams = new URLSearchParams(taskLinkParams.toString());
                    taskHrefParams.set('taskId', String(task.id));

                    return (
                      <li
                        key={`recent-${task.id}`}
                        className='flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2'
                      >
                        <Link
                          href={`/?${taskHrefParams.toString()}#task-detail`}
                          className='truncate text-sm underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                        >
                          {task.title}
                        </Link>
                        <div className='flex shrink-0 items-center gap-2'>
                          {task.later ? (
                            <Badge variant='outline' className='text-[10px]'>
                              later
                            </Badge>
                          ) : null}
                          <Badge variant='outline' className='text-[10px]'>
                            {task.status}
                          </Badge>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className='min-h-[420px]'>
            <CardHeader className='border-b border-border'>
              <CardTitle className='text-base tracking-tight'>Task list</CardTitle>
              <CardDescription>
                Showing {tasks.length} task{tasks.length === 1 ? '' : 's'} matching current
                search and filters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <Empty className='border border-dashed border-border bg-muted/20'>
                  <EmptyHeader>
                    <EmptyMedia variant='icon'>
                      <Search className='size-5' aria-hidden='true' />
                    </EmptyMedia>
                    <EmptyTitle>No matching tasks</EmptyTitle>
                    <EmptyDescription>
                      Adjust search or filters, or create a new task from Quick Add.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button asChild type='button' variant='secondary'>
                      <a href='#quick-add'>
                        <Plus aria-hidden='true' className='size-4' />
                        Open quick add
                      </a>
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                <ul className='space-y-3' aria-label='Main task list' data-testid='main-task-list'>
                  {tasks.map((task) => {
                    const isSelected = selectedTask?.id === task.id;
                    const taskHrefParams = new URLSearchParams(taskLinkParams.toString());
                    taskHrefParams.set('taskId', String(task.id));
                    const taskHref = `/?${taskHrefParams.toString()}#task-detail`;

                    return (
                      <li key={task.id} className='rounded-xl border border-border p-3'>
                        <div className='flex items-start justify-between gap-3'>
                          <p className='font-medium'>
                            <Link
                              href={taskHref}
                              className='underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                            >
                              {task.title}
                            </Link>
                          </p>
                          <div className='flex flex-wrap items-center justify-end gap-2'>
                            {isSelected ? (
                              <Badge variant='secondary' className='text-xs'>
                                selected
                              </Badge>
                            ) : null}
                            <Badge variant='outline' className='text-xs'>
                              {task.status}
                            </Badge>
                            <Badge variant='secondary' className='text-xs'>
                              {getSourceBadgeLabel(task)}
                            </Badge>
                          </div>
                        </div>

                        <div className='mt-2 flex flex-wrap gap-2'>
                          {task.later ? (
                            <Badge variant='outline' className='text-xs'>
                              later
                            </Badge>
                          ) : null}

                          {task.tags.map((tag) => (
                            <Badge key={`${task.id}-tag-${tag}`} variant='outline' className='text-xs'>
                              #{tag}
                            </Badge>
                          ))}

                          {task.people.map((person) => (
                            <Badge
                              key={`${task.id}-person-${person}`}
                              variant='outline'
                              className='text-xs'
                            >
                              {person}
                            </Badge>
                          ))}
                        </div>

                        {task.note ? (
                          <p className='mt-2 text-sm text-muted-foreground'>
                            {truncateNote(task.note)}
                          </p>
                        ) : null}

                        <div className='mt-2 space-y-2'>
                          <p className='text-xs text-muted-foreground'>
                            {task.timerStartedAt ? 'Running now' : 'Stopped'} � Today:{' '}
                            {getTaskTodayLabel(task)} � Total: {getTaskTotalLabel(task)}
                          </p>
                          <form
                            action={task.timerStartedAt ? stopTrackingAction : startTrackingAction}
                          >
                            <input type='hidden' name='taskId' value={task.id} />
                            {task.timerStartedAt ? (
                              <Button type='submit' size='sm' variant='secondary'>
                                <Square aria-hidden='true' className='size-3.5' />
                                Stop tracking
                              </Button>
                            ) : (
                              <Button type='submit' size='sm' variant='outline'>
                                <Play aria-hidden='true' className='size-3.5' />
                                Start tracking
                              </Button>
                            )}
                          </form>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        <aside className='space-y-6 lg:sticky lg:top-8 lg:self-start' aria-label='Task detail and quick add'>
          <Card id='task-detail'>
            <CardHeader className='border-b border-border'>
              <CardTitle className='text-base tracking-tight'>Task detail</CardTitle>
              <CardDescription>
                {selectedTask
                  ? 'Phase 1 task payload fields are editable and persisted in MySQL.'
                  : 'Select a task title from the list to open details.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedTask ? (
                <form
                  action={updateTaskDetailAction.bind(null, selectedTask.id)}
                  className='space-y-4'
                >
                  <div className='space-y-1.5'>
                    <label htmlFor='detailTitle' className='text-sm font-medium'>
                      Title
                    </label>
                    <Input id='detailTitle' name='detailTitle' defaultValue={selectedTask.title} required />
                  </div>

                  <div className='grid gap-3 sm:grid-cols-2'>
                    <div className='space-y-1.5'>
                      <label htmlFor='detailStatus' className='text-sm font-medium'>
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
                    <label htmlFor='detailNote' className='text-sm font-medium'>
                      Note (markdown text)
                    </label>
                    <Textarea
                      id='detailNote'
                      name='detailNote'
                      defaultValue={selectedTask.note ?? ''}
                      className='min-h-28'
                    />
                    {selectedTask.note ? (
                      <pre className='max-h-24 overflow-auto rounded-md border border-border bg-muted/20 p-2 text-xs text-muted-foreground'>
                        {selectedTask.note}
                      </pre>
                    ) : null}
                  </div>

                  <div className='space-y-1.5'>
                    <label htmlFor='detailLinks' className='text-sm font-medium'>
                      Links (one URL per line)
                    </label>
                    <Textarea
                      id='detailLinks'
                      name='detailLinks'
                      defaultValue={selectedTask.links.join('\n')}
                      className='min-h-24'
                    />
                    {selectedTask.links.length > 0 ? (
                      <ul
                        className='space-y-1 rounded-md border border-border bg-muted/20 p-2 text-sm'
                        aria-label='Attached links'
                      >
                        {selectedTask.links.map((link) => {
                          const domainHint = getLinkDomainHint(link);

                          return (
                            <li key={link} className='flex items-center justify-between gap-3'>
                              <a
                                href={link}
                                target='_blank'
                                rel='noreferrer noopener'
                                className='truncate text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                              >
                                {truncateLinkLabel(link)}
                              </a>
                              {domainHint ? (
                                <span className='shrink-0 text-xs text-muted-foreground'>
                                  {domainHint}
                                </span>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>

                  <div className='space-y-1.5'>
                    <label htmlFor='detailTags' className='text-sm font-medium'>
                      Tags (comma-separated)
                    </label>
                    <Input
                      id='detailTags'
                      name='detailTags'
                      defaultValue={selectedTask.tags.join(', ')}
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <label htmlFor='detailPeople' className='text-sm font-medium'>
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
                    {selectedTask.timeSessions.length > 0 ? (
                      <ul className='space-y-2' aria-label='Time sessions'>
                        {selectedTask.timeSessions.map((session, index) => (
                          <li
                            key={'time-session-' + index}
                            className='rounded-md border border-border bg-muted/20 p-3'
                            data-testid='time-session-row'
                          >
                            <div className='grid gap-2 sm:grid-cols-3'>
                              <div className='space-y-1'>
                                <label
                                  htmlFor={'detailTimeSessionStartedAt-' + index}
                                  className='text-xs font-medium text-muted-foreground'
                                >
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
                                  className='text-xs font-medium text-muted-foreground'
                                >
                                  Ended at
                                </label>
                                <Input
                                  id={'detailTimeSessionEndedAt-' + index}
                                  name={'detailTimeSessionEndedAt_' + index}
                                  defaultValue={session.endedAt ? session.endedAt.toISOString() : ''}
                                  className='font-mono text-xs'
                                />
                              </div>
                              <div className='space-y-1'>
                                <label
                                  htmlFor={'detailTimeSessionDuration-' + index}
                                  className='text-xs font-medium text-muted-foreground'
                                >
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
                                className='inline-flex items-center gap-2 text-xs text-muted-foreground'
                              >
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
                    ) : (
                      <p className='rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground'>
                        No time sessions yet.
                      </p>
                    )}
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
                    <Button type='submit' className='flex-1'>
                      Save detail
                    </Button>
                    <Button asChild type='button' variant='outline'>
                      <a href={`/api/exports/task/${selectedTask.id}/markdown`}>
                        <Download aria-hidden='true' className='size-4' />
                        Export markdown
                      </a>
                    </Button>
                    {selectedTask.status === 'done' ? (
                      <Button
                        type='submit'
                        name='detailStatusTransition'
                        value='reopen'
                        variant='secondary'
                      >
                        Reopen task
                      </Button>
                    ) : (
                      <Button
                        type='submit'
                        name='detailStatusTransition'
                        value='done'
                        variant='secondary'
                      >
                        Mark done
                      </Button>
                    )}
                    <Button asChild type='button' variant='outline'>
                      <Link href='/'>Close</Link>
                    </Button>
                  </div>
                </form>
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>No task selected</EmptyTitle>
                    <EmptyDescription>
                      Choose a task from the list to view and edit detail fields.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>

          <Card id='quick-add' aria-label='Quick add'>
            <CardHeader className='border-b border-border'>
              <CardTitle className='text-base tracking-tight'>Quick add</CardTitle>
              <CardDescription>Only title is required.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createTaskAction} className='space-y-4'>
                <div className='space-y-1.5'>
                  <label htmlFor='title' className='text-sm font-medium'>
                    Title <span className='text-destructive'>*</span>
                  </label>
                  <Input id='title' name='title' required placeholder='Add task title' />
                </div>

                <div className='space-y-1.5'>
                  <label htmlFor='note' className='text-sm font-medium'>
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
                  <label htmlFor='firstLink' className='text-sm font-medium'>
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
                  <label htmlFor='tags' className='text-sm font-medium'>
                    First tags (optional)
                  </label>
                  <Input id='tags' name='tags' placeholder='bug, frontend, review' />
                </div>

                <div className='space-y-1.5'>
                  <label htmlFor='people' className='text-sm font-medium'>
                    First person references (optional)
                  </label>
                  <Input id='people' name='people' placeholder='@anna, @max' />
                </div>

                <label className='flex items-center gap-2 text-sm' htmlFor='startTrackingNow'>
                  <Checkbox id='startTrackingNow' name='startTrackingNow' />
                  Start time tracking now
                </label>

                <Button type='submit' className='w-full'>
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

