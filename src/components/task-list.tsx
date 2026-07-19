import Link from 'next/link';
import type { ReactNode } from 'react';
import { Play, Plus, Search, Square } from 'lucide-react';

import type { Task } from '@/lib/server/tasks';
import {
	getSourceBadgeItems,
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
import { cn } from '@/lib/utils';

type TaskTrackingAction = (formData: FormData) => Promise<void>;

type TaskListProps = {
	filtersContent?: ReactNode;
	openQuickAddHref: string;
	selectedTaskId: number | null;
	startTrackingAction: TaskTrackingAction;
	stopTrackingAction: TaskTrackingAction;
	taskLinkParams: string;
	tasks: Task[];
};

const badgeBaseClass =
	'h-auto min-h-5 max-w-full justify-start whitespace-normal break-all px-2 py-0.5 text-left text-[11px] leading-tight text-foreground';

const statusBadgeClassByStatus: Record<string, string> = {
	blocked: 'border-product-consul/50 bg-product-consul/20',
	done: 'border-product-nomad/50 bg-product-nomad/20',
	in_progress:
		'border-product-waypoint/50 bg-product-waypoint/20',
	open: 'border-ring/60 bg-ring/20',
	review: 'border-product-terraform/55 bg-product-terraform/20',
	waiting: 'border-product-vault/60 bg-product-vault/20'
};

function getStatusBadgeClass(status: string) {
	return (
		statusBadgeClassByStatus[status] ??
		'border-border bg-secondary text-foreground'
	);
}

export function TaskList({
	filtersContent,
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
				{filtersContent ?
					<div className='mb-5 border-b border-border pb-5'>
						{filtersContent}
					</div>
				:	null}

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
							const sourceBadgeItems = getSourceBadgeItems(task);

							return (
								<li
									key={task.id}
									className={cn(
										'rounded-lg border border-border bg-card p-3 transition-colors',
										isSelected ?
											'border-ring/70 bg-secondary/30'
										:	'hover:bg-secondary/20'
									)}>
									<div className='flex flex-wrap items-start justify-between gap-2 border-b border-border/60 pb-2'>
										<div className='flex min-w-0 flex-1 flex-wrap gap-1.5'>
											{isSelected ?
												<Badge
													variant='secondary'
													className={cn(
														badgeBaseClass,
														'border border-ring/40 bg-ring/15'
													)}>
													selected
												</Badge>
											:	null}
											<Badge
												variant='outline'
												className={cn(
													badgeBaseClass,
													getStatusBadgeClass(task.status)
												)}>
												{task.status}
											</Badge>
											{task.later ?
												<Badge
													variant='outline'
													className={cn(
														badgeBaseClass,
														'border-product-vault/60 bg-product-vault/20'
													)}>
													later
												</Badge>
											:	null}
										</div>

										{task.tags.length > 0 ?
											<div className='flex min-w-0 flex-1 flex-wrap justify-end gap-1.5'>
												{task.tags.map((tag) => (
													<Badge
														key={`${task.id}-tag-${tag}`}
														variant='outline'
														className={cn(
															badgeBaseClass,
															'border-product-terraform/45 bg-product-terraform/15'
														)}>
														#{tag}
													</Badge>
												))}
											</div>
										:	null}
									</div>

									<div className='py-2.5'>
										<p className='break-words text-base font-semibold leading-tight text-foreground'>
											<Link
												href={taskHref}
												className='underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
												{task.title}
											</Link>
										</p>
										{task.note ?
											<p className='mt-1.5 break-words text-sm leading-snug text-muted-foreground'>
												{truncateNote(task.note)}
											</p>
										:	null}
									</div>

									{task.people.length > 0 || sourceBadgeItems.length > 0 ?
										<div className='flex flex-wrap items-start justify-between gap-2 border-t border-border/60 pt-2'>
											{task.people.length > 0 ?
												<div className='flex min-w-0 flex-1 flex-wrap gap-1.5'>
													{task.people.map((person) => (
														<Badge
															key={`${task.id}-person-${person}`}
															variant='outline'
															className={cn(
																badgeBaseClass,
																'border-product-nomad/45 bg-product-nomad/15'
															)}>
															{person}
														</Badge>
													))}
												</div>
											:	null}

											{sourceBadgeItems.length > 0 ?
												<div className='flex min-w-0 flex-1 flex-wrap justify-end gap-1.5'>
													{sourceBadgeItems.map((sourceBadgeItem) => (
														<Badge
															key={`${task.id}-source-${sourceBadgeItem.key}`}
															variant='secondary'
															className={cn(
																badgeBaseClass,
																'border border-product-boundary/45 bg-product-boundary/15'
															)}>
															{sourceBadgeItem.label}
														</Badge>
													))}
												</div>
											:	null}
										</div>
									:	null}

									<div className='mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2'>
										<p className='min-w-0 flex-1 text-xs leading-snug text-muted-foreground'>
											{task.timerStartedAt ? 'Running now' : 'Stopped'} {' / '}
											Today: {getTaskTodayLabel(task)} {' / '} Total:{' '}
											{getTaskTotalLabel(task)}
										</p>
										<form
											className='shrink-0'
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
													variant='default'>
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
