'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type MarkdownEditorProps = {
	value: string;
	onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
};

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
	return (
		<Tabs
			defaultValue='edit'
			className='flex flex-col w-full h-full min-h-[300px] border rounded-md bg-background'>
			<div className='border-b px-3 py-2 flex items-center'>
				<TabsList className='grid w-[200px] grid-cols-2'>
					<TabsTrigger value='edit'>Edit</TabsTrigger>
					<TabsTrigger value='preview'>Preview</TabsTrigger>
				</TabsList>
			</div>

			<TabsContent
				value='edit'
				className='flex-1 m-0 data-[state=active]:flex'>
				<Textarea
					value={value}
					onChange={onChange}
					placeholder='Schreib hier deinen Text rein...'
					className='flex-1 resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none shadow-none'
				/>
			</TabsContent>

			<TabsContent
				value='preview'
				className='flex-1 m-0 p-4 overflow-auto'>
				<div className='text-muted-foreground whitespace-pre-wrap'>
					{value ? value : 'Nichts zum Anzeigen...'}
				</div>
			</TabsContent>
		</Tabs>
	);
}
