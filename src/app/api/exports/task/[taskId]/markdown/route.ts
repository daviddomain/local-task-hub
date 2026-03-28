import { listTasks, getTaskDetail } from '@/lib/server/tasks';

function slugifyTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(value);
}

function buildTaskMarkdown(task: Awaited<ReturnType<typeof getTaskDetail>>, summary: Awaited<ReturnType<typeof listTasks>>[number]) {
  if (!task) {
    return '';
  }

  const tagsValue = task.tags.length > 0 ? task.tags.map((tag) => `#${tag}`).join(', ') : 'None';
  const peopleValue = task.people.length > 0 ? task.people.join(', ') : 'None';
  const linksValue = task.links.length > 0 ? task.links : ['None'];
  const noteValue = task.note?.trim() ? task.note.trim() : '_No note_';

  const sessions = task.timeSessions
    .slice()
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
    .map((session) => {
      const endedAt = session.endedAt ? session.endedAt.toISOString() : 'running';
      const duration = session.durationSeconds ?? 'running';
      return `- ${session.startedAt.toISOString()} -> ${endedAt} (${duration}s)`;
    });

  return [
    `# ${task.title}`,
    '',
    '## Task',
    `- ID: ${task.id}`,
    `- Status: ${task.status}`,
    `- Later: ${task.later ? 'yes' : 'no'}`,
    `- Created: ${formatDate(task.createdAt)}`,
    `- Updated: ${formatDate(task.updatedAt)}`,
    '',
    '## Time summary',
    `- Running now: ${summary.timerStartedAt ? 'yes' : 'no'}`,
    `- Today tracked seconds: ${summary.todayTrackedSeconds}`,
    `- Total tracked seconds: ${summary.totalTrackedSeconds}`,
    '',
    '## Tags',
    tagsValue,
    '',
    '## People',
    peopleValue,
    '',
    '## Links',
    ...linksValue.map((link) => `- ${link}`),
    '',
    '## Note',
    noteValue,
    '',
    '## Time sessions',
    ...(sessions.length > 0 ? sessions : ['- None'])
  ].join('\n');
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId: taskIdRaw } = await params;
  const taskId = Number.parseInt(taskIdRaw, 10);

  if (Number.isNaN(taskId)) {
    return new Response('Invalid task id', { status: 400 });
  }

  const [taskSummaryList, taskDetail] = await Promise.all([listTasks(), getTaskDetail(taskId)]);
  const taskSummary = taskSummaryList.find((task) => task.id === taskId);

  if (!taskDetail || !taskSummary) {
    return new Response('Task not found', { status: 404 });
  }

  const markdown = buildTaskMarkdown(taskDetail, taskSummary);
  const fileSlug = slugifyTitle(taskDetail.title) || `task-${taskId}`;
  const fileName = `task-${taskId}-${fileSlug}.md`;

  return new Response(markdown, {
    status: 200,
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': `attachment; filename="${fileName}"`,
      'cache-control': 'no-store'
    }
  });
}
