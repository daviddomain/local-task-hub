import type { TodayWorkedSummaryItem } from '@/lib/server/tasks';
import {
	formatDuration,
	getTodayWorkedSummarySessionLabel
} from '@/components/task-display-helpers';

type TodayWorkedSummaryProps = {
	todayTotalTrackedSeconds: number;
	todayWorkedSummary: TodayWorkedSummaryItem[];
	visibleLimit: number;
};

export function TodayWorkedSummary({
	todayTotalTrackedSeconds,
	todayWorkedSummary,
	visibleLimit
}: TodayWorkedSummaryProps) {
	const visibleTodayWorkedSummary = todayWorkedSummary.slice(0, visibleLimit);
	const hiddenTodayWorkedSummaryCount = Math.max(
		0,
		todayWorkedSummary.length - visibleTodayWorkedSummary.length
	);

	return (
		<div className='space-y-3'>
			<p className='text-sm text-muted-foreground'>
				Today total tracked:{' '}
				<span className='font-medium text-foreground'>
					{formatDuration(todayTotalTrackedSeconds)}
				</span>
			</p>

			<div
				className='rounded-lg border border-border bg-muted/20 p-3'
				aria-label='Today worked summary'
				data-testid='today-worked-summary'>
				<div className='flex items-center justify-between gap-3'>
					<div>
						<p className='text-sm font-medium text-foreground'>
							Today worked summary
						</p>
						<p className='text-xs text-muted-foreground'>
							Current day only, grouped by task.
						</p>
					</div>
					<p className='text-sm font-medium text-foreground'>
						{formatDuration(todayTotalTrackedSeconds)}
					</p>
				</div>

				{todayWorkedSummary.length === 0 ?
					<p className='mt-3 text-sm text-muted-foreground'>
						No tracked time recorded for today yet.
					</p>
				:	<>
						<ul className='mt-3 space-y-2'>
							{visibleTodayWorkedSummary.map((item) => (
								<li
									key={item.taskId}
									className='flex items-center justify-between gap-3 rounded-md border border-border/70 bg-background/60 px-3 py-2'>
									<div className='min-w-0'>
										<p className='truncate text-sm font-medium text-foreground'>
											{item.title}
										</p>
										<p className='text-xs text-muted-foreground'>
											{getTodayWorkedSummarySessionLabel(item)}
										</p>
									</div>
									<p className='shrink-0 text-sm font-medium text-foreground'>
										{formatDuration(item.trackedSeconds)}
									</p>
								</li>
							))}
						</ul>

						{hiddenTodayWorkedSummaryCount > 0 ?
							<p className='mt-2 text-xs text-muted-foreground'>
								{hiddenTodayWorkedSummaryCount === 1 ?
									'+ 1 more task tracked today'
								:	`+ ${hiddenTodayWorkedSummaryCount} more tasks tracked today`}
							</p>
						:	null}
					</>
				}
			</div>
		</div>
	);
}
