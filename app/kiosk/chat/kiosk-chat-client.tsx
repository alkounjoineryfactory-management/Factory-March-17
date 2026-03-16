"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, X, Image as ImageIcon, Film, Music, FileText, Camera, ChevronLeft, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getMessages, sendMessage, markMessagesAsRead, getAdminUsers } from "@/app/actions";
import { uploadFile } from "@/app/actions/upload";
import { AudioRecorder } from "@/components/ui/audio-recorder";
import { compressImage } from "@/lib/compression";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function KioskChatClient({ employeeId }: { employeeId: string }) {
    const [admins, setAdmins] = useState<any[]>([]);
    const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [viewingAttachment, setViewingAttachment] = useState<{ url: string; type: string } | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    // Fetch Admins on mount
    useEffect(() => {
        getAdminUsers().then(setAdmins);
    }, []);

    // Chat polling
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (selectedAdminId) {
            const fetchMessages = async () => {
                const msgs = await getMessages(selectedAdminId); // For employee, targetId is AdminId
                setMessages(msgs);
                await markMessagesAsRead(selectedAdminId, "ADMIN"); // We are reading Admin's messages
            };

            fetchMessages();
            interval = setInterval(fetchMessages, 3000);
        }
        return () => clearInterval(interval);
    }, [selectedAdminId, employeeId]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && !selectedFile) || !selectedAdminId) return;

        let attachmentUrl = undefined;
        let attachmentType: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" | undefined = undefined;

        if (selectedFile) {
            setIsUploading(true);
            try {
                let fileToUpload = selectedFile;
                // Compress if image
                if (selectedFile.type.startsWith('image/')) {
                    try {
                        fileToUpload = await compressImage(selectedFile);
                    } catch (compErr) {
                        console.warn("Compression failed, uploading original", compErr);
                    }
                }

                const formData = new FormData();
                formData.append("file", fileToUpload);

                attachmentUrl = await uploadFile(formData);

                if (selectedFile.type.startsWith("image/")) attachmentType = "IMAGE";
                else if (selectedFile.type.startsWith("video/")) attachmentType = "VIDEO";
                else if (selectedFile.type.startsWith("audio/")) attachmentType = "AUDIO";
                else attachmentType = "DOCUMENT";

            } catch (err) {
                console.error("Upload failed", err);
                alert(`Upload failed: ${err instanceof Error ? err.message : "Unknown error"}`);
                setIsUploading(false);
                return;
            }
            setIsUploading(false);
            setSelectedFile(null);
        }

        await sendMessage(selectedAdminId, "ADMIN", newMessage, attachmentUrl, attachmentType);
        setNewMessage("");

        // Optimistic refresh
        const msgs = await getMessages(selectedAdminId);
        setMessages(msgs);
    };

    const renderAttachment = (m: any) => {
        if (!m.attachmentUrl) return null;

        if (m.attachmentType === 'IMAGE') {
            return (
                <div onClick={() => setViewingAttachment({ url: m.attachmentUrl, type: 'IMAGE' })} className="cursor-pointer">
                    <img
                        src={m.attachmentUrl}
                        alt="Attachment"
                        className="max-w-[250px] max-h-[250px] object-cover rounded-lg mt-2 border border-black/10 hover:opacity-90 transition-opacity"
                        loading="lazy"
                    />
                </div>
            );
        }
        if (m.attachmentType === 'VIDEO') {
            return (
                <div onClick={() => setViewingAttachment({ url: m.attachmentUrl, type: 'VIDEO' })} className="cursor-pointer relative group max-w-[250px] mt-2">
                    <video src={m.attachmentUrl} className="rounded-lg bg-black w-full" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors rounded-lg">
                        <div className="bg-white/80 p-2 rounded-full">
                            <Film className="w-6 h-6 text-black" />
                        </div>
                    </div>
                </div>
            );
        }
        if (m.attachmentType === 'AUDIO') {
            return <audio src={m.attachmentUrl} controls className="max-w-[250px] mt-2" />;
        }
        return (
            <a
                href={m.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                    "flex items-center gap-2 mt-2 p-2 rounded-md text-xs font-medium transition-colors",
                    m.senderType === 'EMPLOYEE' ? "bg-indigo-700/50 text-indigo-100 hover:bg-indigo-700" : "bg-slate-900/50 text-slate-300 hover:bg-slate-900"
                )}
            >
                <Paperclip className="h-3 w-3" />
                Download Document
            </a>
        );
    };

    if (!selectedAdminId) {
        return (
            <div className="flex flex-col h-full bg-slate-950 p-6">
                <h2 className="text-xl font-bold text-white mb-6">Select Admin to Chat</h2>
                <div className="grid gap-3">
                    {admins.map(admin => (
                        <Button
                            key={admin.id}
                            variant="outline"
                            className="bg-slate-900 border-slate-800 text-slate-100 hover:bg-slate-800 hover:text-white h-auto py-4 justify-start gap-4"
                            onClick={() => setSelectedAdminId(admin.id)}
                        >
                            <Avatar className="h-10 w-10 border border-slate-700">
                                <AvatarFallback className="bg-slate-800 text-slate-300">
                                    {admin.username.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="text-left">
                                <div className="font-semibold">{admin.username}</div>
                                <div className="text-xs text-slate-400">{admin.role}</div>
                            </div>
                        </Button>
                    ))}
                    {admins.length === 0 && (
                        <div className="text-slate-500 text-center py-10">No admins found.</div>
                    )}
                </div>
            </div>
        );
    }

    const selectedAdmin = admins.find(a => a.id === selectedAdminId);

    return (
        <div className="flex flex-col h-full bg-slate-950">
            {/* Header */}
            <div className="h-14 border-b border-slate-800 flex items-center px-4 gap-3 bg-slate-900/50">
                <Button variant="ghost" size="icon" onClick={() => setSelectedAdminId(null)} className="text-slate-400 -ml-2">
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <Avatar className="h-8 w-8 border border-slate-700">
                    <AvatarFallback className="bg-slate-800 text-slate-300 text-xs">
                        {selectedAdmin?.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className="font-medium text-slate-100">
                    {selectedAdmin?.username}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="text-center text-slate-600 text-sm py-10">
                        No messages yet. Start the conversation!
                    </div>
                )}
                {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.senderType === 'EMPLOYEE' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${m.senderType === 'EMPLOYEE'
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                            }`}>
                            {m.content}
                            {renderAttachment(m)}
                            <div className={`text-[10px] mt-1 text-right ${m.senderType === 'EMPLOYEE' ? 'text-indigo-200' : 'text-slate-400'}`}>
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800">
                {selectedFile && (
                    <div className="flex items-center justify-between p-2 mb-2 bg-slate-800 border border-slate-700 rounded-md">
                        <span className="text-xs text-indigo-300 truncate max-w-[200px] font-medium flex items-center gap-2">
                            <Paperclip className="h-3 w-3" />
                            {selectedFile.name}
                        </span>
                        <button onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-slate-200">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    <input
                        type="file"
                        ref={cameraInputRef}
                        className="hidden"
                        accept="image/*"
                        // @ts-ignore - React types might conflict with capture string
                        capture="environment"
                        onChange={handleFileSelect}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-indigo-400 hover:bg-slate-800"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Paperclip className="h-5 w-5" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-indigo-400 hover:bg-slate-800"
                        onClick={() => {
                            if (cameraInputRef.current) {
                                cameraInputRef.current.value = ''; // Reset to allow retaking same photo
                                cameraInputRef.current.click();
                            }
                        }}
                    >
                        <Camera className="h-5 w-5" />
                    </Button>

                    <AudioRecorder
                        className="text-slate-400 hover:text-indigo-400 hover:bg-slate-800"
                        onRecordingComplete={(file) => setSelectedFile(file)}
                    />

                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={(!newMessage.trim() && !selectedFile) || isUploading}
                        className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                        {isUploading ? (
                            <span className="animate-spin">⏳</span>
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </form>
            </div>

            <Dialog open={!!viewingAttachment} onOpenChange={(open) => !open && setViewingAttachment(null)}>
                <DialogContent className="max-w-4xl p-0 bg-transparent border-none shadow-none flex items-center justify-center">
                    <DialogTitle className="sr-only">Media Viewer</DialogTitle>
                    <div className="relative">
                        <button
                            onClick={() => setViewingAttachment(null)}
                            className="absolute -top-12 right-0 p-2 bg-black/10 dark:bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        {viewingAttachment?.type === 'IMAGE' && (
                            <img
                                src={viewingAttachment.url}
                                alt="Full size"
                                className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
                            />
                        )}
                        {viewingAttachment?.type === 'VIDEO' && (
                            <video
                                src={viewingAttachment.url}
                                controls
                                autoPlay
                                className="max-h-[85vh] max-w-[90vw] rounded-lg shadow-2xl bg-black"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
