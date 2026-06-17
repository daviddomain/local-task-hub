'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';

export function TaskSearchInput() {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const searchParamsString = searchParams.toString();
	const urlQueryValue = searchParams.get('q') ?? '';
	const [value, setValue] = useState(urlQueryValue);

	useEffect(() => {
		setValue(urlQueryValue);
	}, [urlQueryValue]);

	useEffect(() => {
		const nextQueryValue = value.trim();

		if (nextQueryValue === urlQueryValue) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			const nextParams = new URLSearchParams(searchParamsString);
			if (nextQueryValue) {
				nextParams.set('q', nextQueryValue);
			} else {
				nextParams.delete('q');
			}

			nextParams.delete('taskId');

			const query = nextParams.toString();
			const nextUrl = query ? `${pathname}?${query}` : pathname;
			router.replace(nextUrl, { scroll: false });
		}, 300);

		return () => window.clearTimeout(timeoutId);
	}, [pathname, router, searchParamsString, urlQueryValue, value]);

	return (
		<div className='relative'>
			<Search
				aria-hidden='true'
				className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
			/>
			<Input
				id='task-search'
				type='search'
				value={value}
				onChange={(event) => setValue(event.target.value)}
				placeholder='Search title, notes, tags, people, or links'
				className='border-border text-sm pl-9'
			/>
		</div>
	);
}
