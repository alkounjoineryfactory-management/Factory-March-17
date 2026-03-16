"use client";

import React, { useState, useEffect, Fragment } from "react";
import { format } from "date-fns";
import { Search, Plus, Calendar as CalendarIcon, Users, FileText, Bot, ChevronDown, ChevronUp, Download, CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreateMeetingDialog } from "./create-meeting-dialog";
import { getMeetings } from "@/app/actions/meetings";
import jsPDF from "jspdf";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownPlugins = [remarkGfm];

export function MeetingSummaryClient() {
    const [meetings, setMeetings] = useState<any[]>([]);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5; 

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const fetchMeetingData = async () => {
        setIsLoading(true);
        const res = await getMeetings({ page: currentPage, limit: itemsPerPage, search: searchTerm });
        if (res.success && res.meetings) {
            setMeetings(res.meetings);
            setHasNextPage(res.hasNextPage || false);
        } else {
            toast.error(res.error || "Failed to load meetings.");
            setMeetings([]);
            setHasNextPage(false);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchMeetingData();
        }, 300);
        return () => clearTimeout(timeout);
    }, [currentPage, searchTerm]);

    const toggleExpand = (id: string) => {
        setExpandedRows(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleDownloadPDF = (meeting: any, e: React.MouseEvent) => {
        e.stopPropagation();
        const doc = new jsPDF("p", "mm", "a4");
        const pageWidth = doc.internal.pageSize.width;

        const primaryColor: [number, number, number] = [15, 23, 42]; 

        // Header Background
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageWidth, 40, "F");

        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("MEETING SUMMARY", 14, 25);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(200, 200, 200);
        doc.text(`Recorded On: ${format(new Date(meeting.createdAt), "dd MMM yyyy")}`, 14, 32);
        
        doc.setFillColor(248, 250, 252);
        doc.rect(14, 45, pageWidth - 28, 30, "F");
        doc.setDrawColor(226, 232, 240);
        doc.rect(14, 45, pageWidth - 28, 30, "S");

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text("TITLE", 19, 53);
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(meeting.title, 19, 59);

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "normal");
        doc.text("MEETING DATE", 19, 68);
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(format(new Date(meeting.date), "dd MMM yyyy"), 19, 73);

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "normal");
        doc.text("ATTENDEES", pageWidth / 2, 68);
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(meeting.attendees || "Not specified", pageWidth / 2, 73);

        // Summary Text
        let pY = 90;
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.text("Minutes & Key Points:", 14, pY);

        pY += 8;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);

        const splitText = doc.splitTextToSize(meeting.summary, pageWidth - 28);
        doc.text(splitText, 14, pY);

        doc.save(`Meeting_${format(new Date(meeting.date), 'ddMMyyyy')}_${meeting.title.substring(0, 10)}.pdf`);
    };

    const handleCopy = (text: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        toast.success("Meeting summary copied to clipboard!");
    };

    return (
        <div className="space-y-6">
            
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card/60 backdrop-blur-xl border border-border/50 p-4 rounded-2xl shadow-sm">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search meetings by title..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="pl-9 w-full bg-background/50 border-border/50 h-10 rounded-xl"
                    />
                </div>
                
                <Button
                    onClick={() => setIsCreateOpen(true)}
                    className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg shadow-primary/20 h-10 rounded-xl transition-all duration-300"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Meeting
                </Button>
            </div>

            {/* Simple List Layout */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="p-12 text-center text-muted-foreground bg-card/30 rounded-2xl border border-dashed border-border/50">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                        <span className="text-sm font-medium">Loading history...</span>
                    </div>
                ) : meetings.length === 0 ? (
                    <div className="p-10 text-center bg-card/30 rounded-2xl border border-dashed border-border/50">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mb-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <h3 className="text-sm font-semibold">No results found</h3>
                        <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or add a new meeting.</p>
                    </div>
                ) : (
                    meetings.map((meeting) => {
                        const isExpanded = expandedRows[meeting.id];
                        return (
                            <div key={meeting.id} className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm transition-all duration-200">
                                {/* Compact Card Header */}
                                <div 
                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                                    onClick={() => toggleExpand(meeting.id)}
                                >
                                    <div className="flex-1 min-w-0 flex items-center gap-4">
                                        <div className="shrink-0 h-10 w-10 flex items-center justify-center bg-muted/50 rounded-lg">
                                            {meeting.source === "AUDIO" ? (
                                                <Bot className="h-5 w-5 text-indigo-500" />
                                            ) : (
                                                <FileText className="h-5 w-5 text-slate-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 pr-4">
                                            <h4 className="text-base font-semibold text-foreground truncate">{meeting.title}</h4>
                                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <CalendarIcon className="w-3.5 h-3.5" />
                                                    {format(new Date(meeting.date), "dd MMM yyyy")}
                                                </div>
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <Users className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="truncate">{meeting.attendees || "No specifics"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-3">
                                        {meeting.source === "AUDIO" ? (
                                            <Badge variant="outline" className="hidden sm:inline-flex bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50">
                                                AI Audio
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="hidden sm:inline-flex">
                                                Manual
                                            </Badge>
                                        )}
                                        <div className="p-1.5 text-muted-foreground">
                                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Detail Pane */}
                                {isExpanded && (
                                    <div className="border-t border-border/50 bg-muted/10 p-5 sm:p-6 animate-in slide-in-from-top-2 duration-200">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-border/30 pb-4">
                                            <div className="flex items-center gap-2">
                                                {meeting.source === "AUDIO" ? (
                                                    <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50">
                                                        <Bot className="w-4 h-4 mr-1.5" /> AI TRANSCRIBED SUMMARY
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary">
                                                        <CheckCircle2 className="w-4 h-4 mr-1.5" /> MANUAL ENTRY
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button size="sm" variant="outline" className="h-8 bg-background/50" onClick={(e) => handleCopy(meeting.summary, e)}>
                                                    <Copy className="w-3.5 h-3.5 mr-2" /> Copy
                                                </Button>
                                                <Button size="sm" variant="outline" className="h-8 bg-background/50 border-primary/20 text-primary hover:text-primary hover:bg-primary/5" onClick={(e) => handleDownloadPDF(meeting, e)}>
                                                    <Download className="w-3.5 h-3.5 mr-2" /> PDF
                                                </Button>
                                            </div>
                                        </div>
                                        
                                        <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-muted-foreground prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary marker:text-primary">
                                            <ReactMarkdown remarkPlugins={markdownPlugins}>
                                                {meeting.summary}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
                
                {/* Pagination */}
                {meetings.length > 0 && (
                    <div className="flex items-center justify-between pt-4 pb-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-card shadow-sm h-9 px-4"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-sm font-medium text-muted-foreground">
                            Page {currentPage}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-card shadow-sm h-9 px-4"
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            disabled={!hasNextPage}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </div>

            <CreateMeetingDialog
                open={isCreateOpen}
                onOpenChange={(open: boolean) => {
                    setIsCreateOpen(open);
                    if (!open) fetchMeetingData();
                }}
            />
        </div>
    );
}

