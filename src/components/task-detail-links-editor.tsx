'use client';

import { useState } from 'react';

import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput
} from '@/components/ui/input-group';

type TaskDetailLinksEditorProps = {
	defaultLinks: string[];
};

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

export function TaskDetailLinksEditor({
	defaultLinks
}: TaskDetailLinksEditorProps) {
	const [links, setLinks] = useState(defaultLinks);
	const [pendingUrl, setPendingUrl] = useState('');

	function addPendingUrl() {
		const nextUrl = pendingUrl.trim();

		if (!nextUrl) {
			return;
		}

		setLinks((currentLinks) =>
			currentLinks.includes(nextUrl) ? currentLinks : [...currentLinks, nextUrl]
		);
		setPendingUrl('');
	}

	return (
		<div className='space-y-2'>
			<label
				htmlFor='detailLinkInput'
				className='text-sm font-medium'>
				Links
			</label>
			<InputGroup className='rounded-md border-border bg-input'>
				<InputGroupInput
					id='detailLinkInput'
					type='url'
					value={pendingUrl}
					onChange={(event) => setPendingUrl(event.target.value)}
					onKeyDown={(event) => {
						if (event.key !== 'Enter') {
							return;
						}

						event.preventDefault();
						addPendingUrl();
					}}
					placeholder='Add URL'
					aria-label='Link URL'
				/>
				<InputGroupAddon align='inline-end'>
					<InputGroupButton
						type='button'
						variant='secondary'
						onClick={addPendingUrl}>
						Add
					</InputGroupButton>
				</InputGroupAddon>
			</InputGroup>
			<textarea
				id='detailLinks'
				name='detailLinks'
				value={links.join('\n')}
				readOnly
				hidden
			/>
			{links.length > 0 ?
				<ul
					className='space-y-1 rounded-md border border-border bg-muted/20 p-2 text-sm'
					aria-label='Attached links'>
					{links.map((link) => {
						const domainHint = getLinkDomainHint(link);

						return (
							<li
								key={link}
								className='flex items-center justify-between gap-3'>
								<a
									href={link}
									target='_blank'
									rel='noreferrer noopener'
									className='truncate text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
									{truncateLinkLabel(link)}
								</a>
								{domainHint ?
									<span className='shrink-0 text-xs text-muted-foreground'>
										{domainHint}
									</span>
								:	null}
							</li>
						);
					})}
				</ul>
			:	null}
		</div>
	);
}
