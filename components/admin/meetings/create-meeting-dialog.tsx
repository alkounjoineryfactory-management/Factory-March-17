"use client";

import React, { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, FileText, UploadCloud, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createMeeting, getStaff } from "@/app/actions/meetings";
import { Check } from "lucide-react";

interface CreateMeetingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateMeetingDialog({ open, onOpenChange }: CreateMeetingDialogProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("manual");
    
    // Manual Form State
    const [title, setTitle] = useState("");
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
    const [summary, setSummary] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    
    // Staff Data
    const [staff, setStaff] = useState<Awaited<ReturnType<typeof getStaff>>>([]);
    const [isStaffLoading, setIsStaffLoading] = useState(false);
    
    useEffect(() => {
        if (open) {
            const fetchStaff = async () => {
                setIsStaffLoading(true);
                const res = await getStaff();
                if (res) {
                    setStaff(res);
                }
                setIsStaffLoading(false);
            };
            fetchStaff();
        }
    }, [open]);

    // Audio Form State
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [sourceType, setSourceType] = useState("MANUAL");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetForm = () => {
        setTitle("");
        setDate(format(new Date(), "yyyy-MM-dd"));
        setSelectedAttendees([]);
        setSummary("");
        setAudioFile(null);
        setSourceType("MANUAL");
        setActiveTab("manual");
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) resetForm();
        onOpenChange(newOpen);
    };

    const handleSave = async () => {
        if (!title.trim() || !summary.trim()) {
            toast.error("Title and Summary are required fields.");
            return;
        }

        setIsSubmitting(true);
        const attendeesStr = selectedAttendees.length > 0 ? selectedAttendees.join(", ") : "";
        const res = await createMeeting({
            title,
            date: new Date(date),
            attendees: attendeesStr,
            summary,
            source: sourceType
        });

        if (res.success) {
            toast.success("Meeting summary saved successfully!");
            handleOpenChange(false);
        } else {
            toast.error(res.error || "Failed to save meeting summary.");
        }
        setIsSubmitting(false);
    };

    const handleAudioUpload = async () => {
        if (!audioFile) return;

        setIsTranscribing(true);
        const loadingToast = toast.loading("Processing audio... This may take a minute depending on file size.", {
            duration: 120000
        });

        try {
            const formData = new FormData();
            formData.append("file", audioFile);

            const res = await fetch("/api/transcribe-meeting", {
                method: "POST",
                body: formData
            });

            const data = await res.json();
            
            toast.dismiss(loadingToast);

            if (data.success && data.summary) {
                toast.success("Audio transcribed and summarized successfully!");
                setSummary(data.summary);
                setSourceType("AUDIO");
                
                // If title is empty, generate a temporary one
                if (!title) setTitle(`Meeting Recording - ${format(new Date(), "dd MMM")}`);
                
                // Switch to manual tab for review
                setActiveTab("manual");
                setAudioFile(null);
            } else {
                if (data.error?.includes("Missing Gemini API Key")) {
                    toast.error(data.error, {
                        action: {
                            label: "Go to Settings",
                            onClick: () => {
                                handleOpenChange(false);
                                router.push("/admin/settings");
                            }
                        },
                        duration: 10000
                    });
                } else {
                    toast.error(data.error || "Failed to transcribe audio.");
                }
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error("An unexpected error occurred during transcription.");
            console.error(error);
        } finally {
            setIsTranscribing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[700px] p-0 bg-card overflow-hidden border-white/10 shadow-2xl">
                
                <div className="px-6 py-6 pb-4 border-b border-border/50 bg-muted/20">
                    <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Record Meeting Summary
                    </DialogTitle>
                    <DialogDescription className="mt-2 text-muted-foreground">
                        Document official meeting minutes. Choose manual entry or let our Gemini AI transcribe and summarize an audio recording.
                    </DialogDescription>
                </div>

                <div className="p-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1 rounded-xl">
                            <TabsTrigger value="manual" className="rounded-lg py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                <FileText className="w-4 h-4 mr-2" />
                                Manual Entry
                            </TabsTrigger>
                            <TabsTrigger value="audio" className="rounded-lg py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                <Mic className="w-4 h-4 mr-2" />
                                AI Transcription
                            </TabsTrigger>
                        </TabsList>

                        <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar pb-2">
                            <TabsContent value="manual" className="space-y-6 mt-0">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 col-span-2 sm:col-span-1">
                                        <Label>Meeting Title <span className="text-red-500">*</span></Label>
                                        <Input
                                            placeholder="e.g. Weekly Procurement Sync"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="bg-background/50"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2 sm:col-span-1">
                                        <Label>Date <span className="text-red-500">*</span></Label>
                                        <Input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="bg-background/50"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Attendees</Label>
                                    <div className="bg-background/50 border border-input rounded-md p-2 max-h-48 overflow-y-auto custom-scrollbar">
                                        {isStaffLoading ? (
                                            <div className="text-secondary-foreground/50 text-xs p-2">Loading staff list...</div>
                                        ) : !staff || staff.length === 0 ? (
                                            <div className="text-secondary-foreground/50 text-xs p-2">No staff found.</div>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {staff.map((member: any) => {
                                                    const displayName = member.name || member.username;
                                                    const isSelected = selectedAttendees.includes(displayName);
                                                    return (
                                                        <div
                                                            key={member.id}
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setSelectedAttendees(prev => prev.filter(a => a !== displayName));
                                                                } else {
                                                                    setSelectedAttendees(prev => [...prev, displayName]);
                                                                }
                                                            }}
                                                            className={`text-xs px-2.5 py-1.5 rounded-full border cursor-pointer transition-colors flex items-center gap-1.5 ${
                                                                isSelected 
                                                                    ? "bg-primary text-primary-foreground border-primary" 
                                                                    : "bg-background/80 hover:bg-muted text-muted-foreground border-border/50"
                                                            }`}
                                                        >
                                                            {displayName}
                                                            {isSelected && <Check className="w-3 h-3" />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Select the staff members involved in the meeting.</p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Summary / Minutes <span className="text-red-500">*</span></Label>
                                        {sourceType === "AUDIO" && (
                                            <Badge variant="outline" className="bg-indigo-50/50 text-indigo-500 border-indigo-200">
                                                <Sparkles className="w-3 h-3 mr-1" />
                                                AI Generated - Please Review
                                            </Badge>
                                        )}
                                    </div>
                                    <Textarea
                                        placeholder="Record the key points, decisions made, and action items..."
                                        className="min-h-[250px] bg-background/50 font-mono text-sm resize-y"
                                        value={summary}
                                        onChange={(e) => setSummary(e.target.value)}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="audio" className="mt-0">
                                <div className="border-2 border-dashed border-border/50 rounded-2xl p-8 bg-muted/10 text-center space-y-4 hover:bg-muted/30 transition-colors mx-2">
                                    
                                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                        <UploadCloud className="w-8 h-8 text-primary" />
                                    </div>
                                    
                                    <h3 className="text-lg font-semibold">Upload Meeting Recording</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                        Upload an MP3, WAV, or M4A audio file. Our Gemini AI will listen, transcribe, and automatically generate a structured meeting summary.
                                    </p>

                                    <div className="pt-4 flex flex-col items-center gap-4">
                                        <Input
                                            type="file"
                                            accept="audio/*,video/*"
                                            className="hidden"
                                            ref={fileInputRef}
                                            onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                                            disabled={isTranscribing}
                                        />
                                        
                                        {!audioFile ? (
                                            <Button 
                                                variant="outline" 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="bg-background"
                                            >
                                                Select Audio File
                                            </Button>
                                        ) : (
                                            <div className="flex flex-col items-center gap-4 w-full px-8">
                                                <div className="w-full bg-background rounded-lg p-3 border border-border/50 flex items-center justify-between">
                                                    <div className="flex items-center gap-3 truncate">
                                                        <Mic className="w-4 h-4 text-primary shrink-0" />
                                                        <span className="text-sm font-medium truncate">{audioFile.name}</span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground ml-3 shrink-0">
                                                        {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                                                    </span>
                                                </div>
                                                
                                                <div className="flex gap-2">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={() => setAudioFile(null)}
                                                        disabled={isTranscribing}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button 
                                                        onClick={handleAudioUpload}
                                                        disabled={isTranscribing}
                                                        className="bg-primary hover:bg-primary/90 min-w-[150px]"
                                                    >
                                                        {isTranscribing ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                Transcribing...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Sparkles className="w-4 h-4 mr-2" />
                                                                Generate Summary
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mx-2">
                                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-600/90 dark:text-amber-500/90 leading-relaxed">
                                        <strong>Privacy Notice:</strong> Audio files are sent directly to Google Gemini for transcription processing. The resulting text is returned to this form so you can review and edit it before saving it permanently to your database.
                                    </p>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                {activeTab === "manual" && (
                    <div className="px-6 py-4 border-t border-border/50 bg-muted/20 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => handleOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : "Save Meeting Summary"}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

