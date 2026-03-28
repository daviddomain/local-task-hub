import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Play, Plus, Search, Square } from 'lucide-react';

import {
  createTask,
  getTaskDetail,
  listTasks,
  updateTaskDetail,
  type Task,
  type TaskDetail,
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
import {
  NativeSelect,
  NativeSelectOption
} from '@/components/ui/native-select';
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

function serializeTimeSessions(timeSessions: TaskDetail['timeSessions']) {
  return timeSessions
    .map((session) => {
      const startedAt = session.startedAt.toISOString();
      const endedAt = session.endedAt ? session.endedAt.toISOString() : '';
      const durationSeconds = session.durationSeconds ?? '';
      return `${startedAt}|${endedAt}|${durationSeconds}`;
    })
    .join('\n');
}

function parseTimeSessionsInput(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [startedAtRaw = '', endedAtRaw = '', durationRaw = ''] =
        line.split('|');
      const startedAt = new Date(startedAtRaw);
      if (Number.isNaN(startedAt.getTime())) {
        throw new Error(`Invalid started_at value in time sessions: ${startedAtRaw}`);
      }

      const endedAtCandidate = endedAtRaw.trim();
      const endedAt = endedAtCandidate ? new Date(endedAtCandidate) : null;
      if (endedAt && Number.isNaN(endedAt.getTime())) {
        throw new Error(`Invalid ended_at value in time sessions: ${endedAtRaw}`);
      }

      const durationCandidate = durationRaw.trim();
      const durationSeconds =
        durationCandidate ? Number.parseInt(durationCandidate, 10) : null;
      if (durationCandidate && Number.isNaN(durationSeconds)) {
        throw new Error(
          `Invalid duration_seconds value in time sessions: ${durationRaw}`
        );
      }

      const normalizedDurationSeconds =
        endedAt
          ? (durationSeconds ??
            Math.max(
              0,
              Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)
            ))
          : durationSeconds;

      return {
        startedAt,
        endedAt,
        durationSeconds: normalizedDurationSeconds
      };
    });
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
  const timeSessionsRaw = String(formData.get('detailTimeSessions') ?? '');

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
    timeSessions: parseTimeSessionsInput(timeSessionsRaw)
  });

  revalidatePath('/');
  redirect(`/?taskId=${taskId}#task-detail`);
}

function truncateNote(note: string, maxLength = 140) {
  if (note.length <= maxLength) {
    return note;
  }

  return `${note.slice(0, maxLength).trimEnd()}…`;
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

                <div className='flex items-end'>
                  <Button asChild className='w-full lg:w-auto'>
                    <a href='#quick-add'>
                      <Plus aria-hidden='true' className='size-4' />
                      Create task
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
                    <NativeSelect id='status' name='status' defaultValue={filters.status ?? ''}>
                      <NativeSelectOption value=''>All statuses</NativeSelectOption>
                      {STATUS_OPTIONS.map((statusOption) => (
                        <NativeSelectOption key={statusOption} value={statusOption}>
                          {statusOption}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className='space-y-1'>
                    <label htmlFor='later' className='text-xs text-muted-foreground'>
                      Later
                    </label>
                    <NativeSelect id='later' name='later' defaultValue={filters.later ?? ''}>
                      <NativeSelectOption value=''>Any</NativeSelectOption>
                      <NativeSelectOption value='only'>Later only</NativeSelectOption>
                      <NativeSelectOption value='exclude'>Exclude later</NativeSelectOption>
                    </NativeSelect>
                  </div>

                  <div className='space-y-1'>
                    <label htmlFor='person' className='text-xs text-muted-foreground'>
                      Person
                    </label>
                    <NativeSelect id='person' name='person' defaultValue={filters.person ?? ''}>
                      <NativeSelectOption value=''>Any person</NativeSelectOption>
                      {peopleOptions.map((person) => (
                        <NativeSelectOption key={person} value={person}>
                          {person}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className='space-y-1'>
                    <label htmlFor='tag' className='text-xs text-muted-foreground'>
                      Tag
                    </label>
                    <NativeSelect id='tag' name='tag' defaultValue={filters.tag ?? ''}>
                      <NativeSelectOption value=''>Any tag</NativeSelectOption>
                      {tagOptions.map((tag) => (
                        <NativeSelectOption key={tag} value={tag}>
                          {tag}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className='space-y-1'>
                    <label htmlFor='time' className='text-xs text-muted-foreground'>
                      Time relation
                    </label>
                    <NativeSelect
                      id='time'
                      name='time'
                      defaultValue={filters.timeRelation ?? ''}
                    >
                      <NativeSelectOption value=''>Any time</NativeSelectOption>
                      <NativeSelectOption value='today'>Today</NativeSelectOption>
                      <NativeSelectOption value='this_week'>This week</NativeSelectOption>
                      <NativeSelectOption value='no_time'>No time</NativeSelectOption>
                      <NativeSelectOption value='recently_updated'>
                        Recently updated
                      </NativeSelectOption>
                    </NativeSelect>
                  </div>

                  <div className='space-y-1'>
                    <label htmlFor='source' className='text-xs text-muted-foreground'>
                      Source
                    </label>
                    <NativeSelect id='source' name='source' defaultValue={filters.source ?? ''}>
                      <NativeSelectOption value=''>Any source</NativeSelectOption>
                      <NativeSelectOption value='jira'>Jira</NativeSelectOption>
                      <NativeSelectOption value='gitlab'>GitLab</NativeSelectOption>
                      <NativeSelectOption value='github'>GitHub</NativeSelectOption>
                      <NativeSelectOption value='confluence'>Confluence</NativeSelectOption>
                      <NativeSelectOption value='other'>Other</NativeSelectOption>
                    </NativeSelect>
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
                <ul className='space-y-3'>
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
                            {task.timerStartedAt ? 'Running now' : 'Stopped'} · Today:{' '}
                            {getTaskTodayLabel(task)} · Total: {getTaskTotalLabel(task)}
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
                      <NativeSelect
                        id='detailStatus'
                        name='detailStatus'
                        aria-label='Status'
                        defaultValue={selectedTask.status}
                        className='w-full'
                      >
                        {STATUS_OPTIONS.map((statusOption) => (
                          <NativeSelectOption key={statusOption} value={statusOption}>
                            {statusOption}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
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

                  <div className='space-y-1.5'>
                    <label htmlFor='detailTimeSessions' className='text-sm font-medium'>
                      Time sessions (one line: startedAt|endedAt|durationSeconds)
                    </label>
                    <Textarea
                      id='detailTimeSessions'
                      name='detailTimeSessions'
                      defaultValue={serializeTimeSessions(selectedTask.timeSessions)}
                      className='min-h-28 font-mono text-xs'
                    />
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
