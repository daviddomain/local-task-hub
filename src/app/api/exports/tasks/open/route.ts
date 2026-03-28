import { getTaskDetail, listTasks } from '@/lib/server/tasks';

type ExportedTaskJson = {
  id: number;
  title: string;
  status: 'open' | 'in_progress' | 'blocked' | 'waiting' | 'review' | 'done';
  later: boolean;
  note: string | null;
  tags: string[];
  people: string[];
  links: string[];
  time: {
    running: boolean;
    todayTrackedSeconds: number;
    totalTrackedSeconds: number;
    sessionsCount: number;
  };
  createdAt: string;
  updatedAt: string;
};

export async function GET() {
  const summaries = await listTasks();
  const activeOpenSummaries = summaries.filter((task) => task.status !== 'done');

  const details = await Promise.all(
    activeOpenSummaries.map(async (summary) => {
      const detail = await getTaskDetail(summary.id);
      if (!detail) {
        return null;
      }

      return {
        id: detail.id,
        title: detail.title,
        status: detail.status,
        later: detail.later,
        note: detail.note,
        tags: detail.tags,
        people: detail.people,
        links: detail.links,
        time: {
          running: Boolean(summary.timerStartedAt),
          todayTrackedSeconds: summary.todayTrackedSeconds,
          totalTrackedSeconds: summary.totalTrackedSeconds,
          sessionsCount: detail.timeSessions.length
        },
        createdAt: detail.createdAt.toISOString(),
        updatedAt: detail.updatedAt.toISOString()
      } satisfies ExportedTaskJson;
    })
  );

  const tasks = details.filter((task): task is ExportedTaskJson => task !== null);

  const payload = {
    exportedAt: new Date().toISOString(),
    scope: 'active_open_tasks',
    count: tasks.length,
    tasks
  };

  const filenameDate = new Date().toISOString().slice(0, 10);
  const fileName = `tasks-active-open-${filenameDate}.json`;

  return Response.json(payload, {
    status: 200,
    headers: {
      'content-disposition': `attachment; filename="${fileName}"`,
      'cache-control': 'no-store'
    }
  });
}
