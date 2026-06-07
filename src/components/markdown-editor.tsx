'use client';

import * as React from 'react';
import ReactMarkdown from 'react-markdown';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type MarkdownEditorProps = {
	id: string;
	name: string;
	defaultValue: string;
};

export function MarkdownEditor({
	id,
	name,
	defaultValue
}: MarkdownEditorProps) {
	const [value, setValue] = React.useState(defaultValue);

	React.useEffect(() => {
		setValue(defaultValue);
	}, [defaultValue]);

	return (
		<Tabs
			defaultValue='edit'
			className='flex min-h-56 w-full flex-col gap-0 rounded-md border border-border bg-background'>
			<input
				type='hidden'
				name={name}
				value={value}
			/>
			<div className='flex items-center border-b border-border px-3 py-2'>
				<TabsList className='grid w-[200px] grid-cols-2'>
					<TabsTrigger value='edit'>Edit</TabsTrigger>
					<TabsTrigger value='preview'>Preview</TabsTrigger>
				</TabsList>
			</div>

			<TabsContent
				value='edit'
				className='flex-1 m-0 data-[state=active]:flex'>
				<Textarea
					id={id}
					value={value}
					onChange={(event) => setValue(event.target.value)}
					placeholder='Write a markdown note...'
					className='min-h-40 flex-1 resize-y rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0'
				/>
			</TabsContent>

			<TabsContent
				value='preview'
				className='m-0 min-h-40 flex-1 overflow-auto p-4'>
				{value.trim() ?
					<div className='space-y-3 break-words text-sm leading-6 text-foreground [&_a]:break-words [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_code]:break-words [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:break-words [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted/30 [&_pre]:p-3 [&_ul]:list-disc'>
						<ReactMarkdown>{value}</ReactMarkdown>
					</div>
				:	<p className='text-sm text-muted-foreground'>Nothing to preview.</p>}
			</TabsContent>
		</Tabs>
	);
}
