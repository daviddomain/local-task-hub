import type {
	Task,
	TaskSourceType,
	TodayWorkedSummaryItem
} from '@/lib/server/tasks';

export const SOURCE_LABELS: Record<TaskSourceType, string> = {
	jira: 'Jira',
	gitlab: 'GitLab',
	github: 'GitHub',
	confluence: 'Confluence',
	other: 'Other'
};

export function truncateNote(note: string, maxLength = 140) {
	if (note.length <= maxLength) {
		return note;
	}

	return `${note.slice(0, maxLength).trimEnd()}...`;
}

export function formatDuration(totalSeconds: number) {
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

export function getSourceBadgeLabel(task: Task) {
	if (!task.firstLink) {
		return 'Local';
	}

	if (!task.firstLinkSourceType) {
		return SOURCE_LABELS.other;
	}

	return SOURCE_LABELS[task.firstLinkSourceType];
}

export function getTaskTodayLabel(task: Task) {
	return task.todayTrackedSeconds > 0 ?
			formatDuration(task.todayTrackedSeconds)
		:	'0m';
}

export function getTaskTotalLabel(task: Task) {
	return task.totalTrackedSeconds > 0 ?
			formatDuration(task.totalTrackedSeconds)
		:	'0m';
}

export function getTodayWorkedSummarySessionLabel(
	item: TodayWorkedSummaryItem
) {
	return item.sessionCount === 1 ?
			'1 session'
		:	`${item.sessionCount} sessions`;
}
