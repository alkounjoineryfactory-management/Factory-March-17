import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

export type Option = {
    label: string
    value: string
    disabled?: boolean
}

interface MultiSelectProps {
    options: Option[]
    selected: string[]
    onChange: (values: string[]) => void
    placeholder?: string
}

export function MultiSelect({
    options,
    selected,
    onChange,
    placeholder = "Select options...",
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")

    const toggleOption = (value: string) => {
        const newSelected = selected.includes(value)
            ? selected.filter((item) => item !== value)
            : [...selected, value]
        onChange(newSelected)
    }

    const selectedLabels = React.useMemo(() => {
        return selected
            .map((val) => options.find((opt) => opt.value === val)?.label)
            .filter(Boolean) as string[]
    }, [selected, options])

    const filteredOptions = React.useMemo(() => {
        if (!searchQuery) return options;
        return options.filter(option => option.label.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [options, searchQuery])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal min-h-10 h-auto py-2 text-left"
                >
                    <div className="flex flex-wrap gap-1">
                        {selectedLabels.length === 0 && (
                            <span className="text-muted-foreground">{placeholder}</span>
                        )}
                        {selectedLabels.map((label) => (
                            <Badge variant="secondary" key={label} className="font-normal text-xs mr-1 mb-1">
                                {label}
                            </Badge>
                        ))}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shadow-md z-[100]" align="start">
                <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-3">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <input
                        className="flex h-9 w-full bg-transparent py-3 text-sm outline-none placeholder:text-zinc-500 dark:placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 border-none focus:ring-0 text-zinc-900 dark:text-zinc-100"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                            }
                        }}
                    />
                </div>
                <ScrollArea className="h-[200px] w-full">
                    <div className="p-1 space-y-0.5">
                        {filteredOptions.length === 0 ? (
                            <p className="p-2 text-sm text-zinc-500 dark:text-zinc-400 text-center">No options found.</p>
                        ) : (
                            filteredOptions.map((option) => {
                                const isSelected = selected.includes(option.value)
                                return (
                                    <div
                                        key={option.value}
                                        className={cn(
                                            "flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm transition-colors",
                                            option.disabled
                                                ? "opacity-50 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500"
                                                : "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-50",
                                            isSelected && !option.disabled ? "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-50 font-medium" : (!option.disabled ? "text-zinc-700 dark:text-zinc-300" : "")
                                        )}
                                        onClick={() => {
                                            if (!option.disabled) toggleOption(option.value)
                                        }}
                                    >
                                        <div
                                            className={cn(
                                                "flex h-4 w-4 items-center justify-center rounded-sm border",
                                                isSelected
                                                    ? "bg-primary border-primary text-primary-foreground"
                                                    : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 opacity-50 hover:opacity-100"
                                            )}
                                        >
                                            {isSelected && <Check className="h-3 w-3" strokeWidth={3} color="white" />}
                                        </div>
                                        <span>{option.label}</span>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}
