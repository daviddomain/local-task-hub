"use client";

import * as React from "react";
import { CalendarIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput
} from "@/components/ui/input-group";
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from "@/components/ui/popover";

type TaskDateTimePickerProps = {
	id: string;
	name: string;
	defaultValue: Date | null;
	required?: boolean;
	placeholder?: string;
};

type PickerState = {
	defaultSubmitValue: string;
	selectedDate: Date | null;
	month: Date;
	hour: number;
	minute: number;
};

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = [0, 15, 30, 45] as const;

function padTimePart(value: number) {
	return String(value).padStart(2, "0");
}

function formatSubmitValue(value: Date | null) {
	if (!value) {
		return "";
	}

	const year = value.getFullYear();
	const month = padTimePart(value.getMonth() + 1);
	const day = padTimePart(value.getDate());
	const hours = padTimePart(value.getHours());
	const minutes = padTimePart(value.getMinutes());

	return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDisplayValue(value: Date | null) {
	if (!value) {
		return "";
	}

	const day = padTimePart(value.getDate());
	const month = padTimePart(value.getMonth() + 1);
	const year = value.getFullYear();
	const hours = padTimePart(value.getHours());
	const minutes = padTimePart(value.getMinutes());

	return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function buildState(defaultValue: Date | null): PickerState {
	const selectedDate = defaultValue ? new Date(defaultValue) : null;
	const month = selectedDate ?? new Date();

	return {
		defaultSubmitValue: formatSubmitValue(defaultValue),
		selectedDate,
		month,
		hour: selectedDate?.getHours() ?? 0,
		minute: selectedDate?.getMinutes() ?? 0
	};
}

function withTime(date: Date, hour: number, minute: number) {
	const nextDate = new Date(date);
	nextDate.setHours(hour, minute, 0, 0);
	return nextDate;
}

export function TaskDateTimePicker({
	id,
	name,
	defaultValue,
	required = false,
	placeholder = "Datum und Uhrzeit waehlen"
}: TaskDateTimePickerProps) {
	const [open, setOpen] = React.useState(false);
	const [state, setState] = React.useState(() => buildState(defaultValue));
	const defaultSubmitValue = formatSubmitValue(defaultValue);

	if (state.defaultSubmitValue !== defaultSubmitValue) {
		setState(buildState(defaultValue));
	}

	const selectedDate = state.selectedDate;
	const displayValue = formatDisplayValue(selectedDate);
	const submitValue = formatSubmitValue(selectedDate);

	function updateDate(nextDate: Date | undefined) {
		if (!nextDate) {
			return;
		}

		setState((current) => ({
			...current,
			selectedDate: withTime(nextDate, current.hour, current.minute),
			month: nextDate
		}));
	}

	function updateHour(hour: number) {
		setState((current) => {
			const baseDate = current.selectedDate ?? current.month;

			return {
				...current,
				hour,
				selectedDate: withTime(baseDate, hour, current.minute)
			};
		});
	}

	function updateMinute(minute: number) {
		setState((current) => {
			const baseDate = current.selectedDate ?? current.month;

			return {
				...current,
				minute,
				selectedDate: withTime(baseDate, current.hour, minute)
			};
		});
	}

	function clearValue() {
		if (required) {
			return;
		}

		setState((current) => ({
			...current,
			selectedDate: null
		}));
		setOpen(false);
	}

	return (
		<div>
			<input
				type="hidden"
				name={name}
				value={submitValue}
				data-testid={id + "-value"}
			/>
			<InputGroup className="rounded-md border-border bg-input">
				<InputGroupInput
					id={id}
					value={displayValue}
					placeholder={placeholder}
					readOnly
					required={required}
					className="cursor-pointer font-mono text-xs"
					aria-label={placeholder}
					onClick={() => setOpen(true)}
					onKeyDown={(event) => {
						if (event.key === "ArrowDown" || event.key === "Enter") {
							event.preventDefault();
							setOpen(true);
						}
					}}
				/>
				<InputGroupAddon align="inline-end">
					<Popover
						open={open}
						onOpenChange={setOpen}>
						<PopoverTrigger asChild>
							<InputGroupButton
								variant="ghost"
								size="icon-xs"
								aria-label="Datum und Uhrzeit auswaehlen">
								<CalendarIcon />
							</InputGroupButton>
						</PopoverTrigger>
						<PopoverContent
							align="end"
							className="w-auto gap-3 rounded-md p-3">
							<Calendar
								mode="single"
								selected={selectedDate ?? undefined}
								month={state.month}
								onMonthChange={(month) =>
									setState((current) => ({ ...current, month }))
								}
								onSelect={updateDate}
							/>

							<div className="space-y-2 border-t border-border pt-3">
								<p className="text-xs font-medium text-muted-foreground">
									Hour
								</p>
								<div className="grid grid-cols-6 gap-1">
									{HOURS.map((hour) => (
										<Button
											key={hour}
											type="button"
											size="xs"
											variant={state.hour === hour ? "default" : "ghost"}
											aria-label={`Select hour ${padTimePart(hour)}`}
											onClick={() => updateHour(hour)}>
											{padTimePart(hour)}
										</Button>
									))}
								</div>
							</div>

							<div className="space-y-2">
								<p className="text-xs font-medium text-muted-foreground">
									Minute
								</p>
								<div className="grid grid-cols-4 gap-1">
									{MINUTES.map((minute) => (
										<Button
											key={minute}
											type="button"
											size="xs"
											variant={state.minute === minute ? "default" : "ghost"}
											aria-label={`Select minute ${padTimePart(minute)}`}
											onClick={() => updateMinute(minute)}>
											{padTimePart(minute)}
										</Button>
									))}
								</div>
							</div>

							{required ? null : (
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="w-full"
									onClick={clearValue}>
									<XIcon aria-hidden="true" />
									Clear
								</Button>
							)}
						</PopoverContent>
					</Popover>
				</InputGroupAddon>
			</InputGroup>
		</div>
	);
}
