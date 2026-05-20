import Link from 'next/link';
import { Play, Plus, Search, Square } from 'lucide-react';

import type { Task } from '@/lib/server/tasks';
import {
	getSourceBadgeLabel,
	getTaskTodayLabel,
	getTaskTotalLabel,
	truncateNote
} from '@/components/task-display-helpers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card';
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from '@/components/ui/empty';

type TaskTrackingAction = (formData: FormData) => Promise<void>;

type TaskListProps = {
	openQuickAddHref: string;
	selectedTaskId: number | null;
	startTrackingAction: TaskTrackingAction;
	stopTrackingAction: TaskTrackingAction;
	taskLinkParams: string;
	tasks: Task[];
};

export function TaskList({
	openQuickAddHref,
	selectedTaskId,
	startTrackingAction,
	stopTrackingAction,
	taskLinkParams,
	tasks
}: TaskListProps) {
	return (
		<Card className='flex min-h-[520px] lg:h-[calc(100vh-4rem)] flex-col'>
			<CardHeader className='border-b border-border'>
				<CardTitle className='text-base tracking-tight'>Task list</CardTitle>
				<CardDescription>
					Showing {tasks.length} task{tasks.length === 1 ? '' : 's'} matching
					current search and filters.
				</CardDescription>
			</CardHeader>
			<CardContent className='min-h-0 flex-1 overflow-y-auto'>
				{tasks.length === 0 ?
					<Empty className='border border-dashed border-border bg-muted/20'>
						<EmptyHeader>
							<EmptyMedia variant='icon'>
								<Search
									className='size-5'
									aria-hidden='true'
								/>
							</EmptyMedia>
							<EmptyTitle>No matching tasks</EmptyTitle>
							<EmptyDescription>
								Adjust search or filters, or create a new task from Quick Add.
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button
								asChild
								type='button'
								variant='secondary'>
								<a href={openQuickAddHref}>
									<Plus
										aria-hidden='true'
										className='size-4'
									/>
									Open quick add
								</a>
							</Button>
						</EmptyContent>
					</Empty>
				:	<ul
						className='space-y-3'
						aria-label='Main task list'
						data-testid='main-task-list'>
						{tasks.map((task) => {
							const isSelected = selectedTaskId === task.id;
							const taskHrefParams = new URLSearchParams(taskLinkParams);
							taskHrefParams.set('taskId', String(task.id));
							const taskHref = `/?${taskHrefParams.toString()}#task-detail`;

							return (
								<li
									key={task.id}
									className='rounded-xl border border-border p-3'>
									<div className='flex items-start justify-between gap-3'>
										<p className='font-medium'>
											<Link
												href={taskHref}
												className='underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
												{task.title}
											</Link>
										</p>
										<div className='flex flex-wrap items-center justify-end gap-2'>
											{isSelected ?
												<Badge
													variant='secondary'
													className='text-xs'>
													selected
												</Badge>
											:	null}
											<Badge
												variant='outline'
												className='text-xs'>
												{task.status}
											</Badge>
											<Badge
												variant='secondary'
												className='text-xs'>
												{getSourceBadgeLabel(task)}
											</Badge>
										</div>
									</div>

									<div className='mt-2 flex flex-wrap gap-2'>
										{task.later ?
											<Badge
												variant='outline'
												className='text-xs'>
												later
											</Badge>
										:	null}

										{task.tags.map((tag) => (
											<Badge
												key={`${task.id}-tag-${tag}`}
												variant='outline'
												className='text-xs'>
												#{tag}
											</Badge>
										))}

										{task.people.map((person) => (
											<Badge
												key={`${task.id}-person-${person}`}
												variant='outline'
												className='text-xs'>
												{person}
											</Badge>
										))}
									</div>

									{task.note ?
										<p className='mt-2 text-sm text-muted-foreground'>
											{truncateNote(task.note)}
										</p>
									:	null}

									<div className='mt-2 space-y-2'>
										<p className='text-xs text-muted-foreground'>
											{task.timerStartedAt ? 'Running now' : 'Stopped'} �
											Today: {getTaskTodayLabel(task)} � Total:{' '}
											{getTaskTotalLabel(task)}
										</p>
										<form
											action={
												task.timerStartedAt ? stopTrackingAction : (
													startTrackingAction
												)
											}>
											<input
												type='hidden'
												name='taskId'
												value={task.id}
											/>
											{task.timerStartedAt ?
												<Button
													type='submit'
													size='sm'
													variant='secondary'>
													<Square
														aria-hidden='true'
														className='size-3.5'
													/>
													Stop tracking
												</Button>
											:	<Button
													type='submit'
													size='sm'
													variant='outline'>
													<Play
														aria-hidden='true'
														className='size-3.5'
													/>
													Start tracking
												</Button>
											}
										</form>
									</div>
								</li>
							);
						})}
					</ul>
				}
			</CardContent>
		</Card>
	);
}
