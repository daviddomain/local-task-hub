import Link from 'next/link';

import type { RecentlyOpenedTask } from '@/lib/server/tasks';
import { Badge } from '@/components/ui/badge';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card';

type RecentlyOpenedTasksProps = {
	recentlyOpenedTasks: RecentlyOpenedTask[];
	taskLinkParams: string;
};

export function RecentlyOpenedTasks({
	recentlyOpenedTasks,
	taskLinkParams
}: RecentlyOpenedTasksProps) {
	return (
		<Card aria-label='Recently opened tasks'>
			<CardHeader className='border-b border-border'>
				<CardTitle className='text-base tracking-tight'>Recently opened</CardTitle>
				<CardDescription>Latest task detail views (up to 5).</CardDescription>
			</CardHeader>
			<CardContent>
				{recentlyOpenedTasks.length === 0 ?
					<p className='text-sm text-muted-foreground'>
						No recently opened tasks yet.
					</p>
				:	<ul className='space-y-2'>
						{recentlyOpenedTasks.map((task) => {
							const taskHrefParams = new URLSearchParams(taskLinkParams);
							taskHrefParams.set('taskId', String(task.id));

							return (
								<li
									key={`recent-${task.id}`}
									className='flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2'>
									<Link
										href={`/?${taskHrefParams.toString()}#task-detail`}
										className='truncate text-sm underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
										{task.title}
									</Link>
									<div className='flex shrink-0 items-center gap-2'>
										{task.later ?
											<Badge
												variant='outline'
												className='text-[10px]'>
												later
											</Badge>
										:	null}
										<Badge
											variant='outline'
											className='text-[10px]'>
											{task.status}
										</Badge>
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
