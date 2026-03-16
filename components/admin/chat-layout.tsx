"use client";

import { useEffect, useState, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Send, Phone, MoreVertical, CheckCheck, Paperclip, X, Image as ImageIcon, Film, Music, FileText, Camera } from "lucide-react";
import { getConversations, getMessages, sendMessage, markMessagesAsRead } from "@/app/actions";
import { uploadFile } from "@/app/actions/upload";
import { AudioRecorder } from "@/components/ui/audio-recorder";
import { compressImage } from "@/lib/compression";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export default function ChatLayout() {
    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputMessage, setInputMessage] = useState("");
    const [viewingAttachment, setViewingAttachment] = useState<{ url: string; type: string } | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const selectedContact = conversations.find(c => c.id === selectedContactId);

    // Poll conversations list (for badges and sorting)
    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const res = await fetch("/api/chat/conversations", { cache: "no-store" });
                if (res.ok) {
                    const data = await res.json();
                    setConversations(data);
                }
            } catch (err) {
                console.error("Failed to fetch conversations", err);
            }
        };
        fetchConversations();
        const interval = setInterval(fetchConversations, 3000);
        return () => clearInterval(interval);
    }, []);

    // Poll active chat messages
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (selectedContact) {
            const fetchMessages = async () => {
                try {
                    const res = await fetch(`/api/chat/messages?contactId=${selectedContact.id}&contactType=${selectedContact.type}`, { cache: "no-store" });
                    if (res.ok) {
                        const msgs = await res.json();
                        setMessages(msgs);
                    }
                } catch (err) {
                    console.error("Failed to fetch messages", err);
                }
            };
            fetchMessages();
            interval = setInterval(fetchMessages, 3000);
        }
        return () => clearInterval(interval);
    }, [selectedContactId, selectedContact]); // Depend on selectedContact to get type

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
        if (!selectedContact || (!inputMessage.trim() && !selectedFile)) return;

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

        await sendMessage(selectedContact.id, selectedContact.type, inputMessage, attachmentUrl, attachmentType);
        setInputMessage("");

        // Optimistic update or fetch immediately
        try {
            const res = await fetch(`/api/chat/messages?contactId=${selectedContact.id}&contactType=${selectedContact.type}`, { cache: "no-store" });
            if (res.ok) {
                const msgs = await res.json();
                setMessages(msgs);
            }
            
            const convRes = await fetch("/api/chat/conversations", { cache: "no-store" });
            if (convRes.ok) {
                const data = await convRes.json();
                setConversations(data);
            }
        } catch (err) {
            console.error("Failed to refresh chat after send", err);
        }
    };

    const filteredConversations = conversations.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                        <div className="bg-background/80 p-2 rounded-full">
                            <Film className="w-6 h-6 text-foreground" />
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
                    m.senderType === 'ADMIN' ? "bg-indigo-700/50 text-indigo-100 hover:bg-indigo-700" : "bg-muted text-foreground hover:bg-accent"
                )}
            >
                <Paperclip className="h-3 w-3" />
                Download Document
            </a>
        );
    };

    return (
        <div className="flex h-[calc(100vh-100px)] bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            {/* Sidebar List */}
            <div className="w-[350px] border-r border-border flex flex-col bg-muted/20">
                {/* ... Sidebar Content ... */}
                <div className="p-4 border-b border-border">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search messages..."
                            className="pl-9 bg-background border-border"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    <div className="flex flex-col">
                        {filteredConversations.map((conv) => (
                            <button
                                key={conv.id}
                                onClick={() => setSelectedContactId(conv.id)}
                                className={cn(
                                    "flex items-start gap-3 p-4 text-left transition-all hover:bg-accent border-l-4",
                                    selectedContactId === conv.id ? "bg-accent border-primary shadow-sm" : "border-transparent"
                                )}
                            >
                                <Avatar className="h-10 w-10 border border-indigo-100">
                                    <AvatarFallback className={cn("font-bold", conv.type === 'ADMIN' ? "bg-purple-100 text-purple-700" : "bg-indigo-50 text-indigo-600")}>
                                        {conv.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <div className="flex items-center gap-2 truncate">
                                            <span className={cn("font-medium", selectedContactId === conv.id ? "text-foreground" : "text-muted-foreground font-semibold")}>
                                                {conv.name}
                                            </span>
                                            {conv.type === 'ADMIN' && (
                                                <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 border-purple-200 text-purple-700 bg-purple-50">Admin</Badge>
                                            )}
                                        </div>
                                        {conv.lastMessage && (
                                            <span className="text-[10px] text-muted-foreground shrink-0">
                                                {new Date(conv.lastMessage.createdAt).toLocaleDateString() === new Date().toLocaleDateString()
                                                    ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                    : new Date(conv.lastMessage.createdAt).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                                            {/* We need to update this check for new schema */}
                                            {(conv.lastMessage?.senderType === 'ADMIN' && conv.lastMessage?.senderAdminId) && <span className="text-muted-foreground/70 mr-1">You:</span>}
                                            {conv.lastMessage?.attachmentType ? (
                                                <span className="flex items-center gap-1">
                                                    {conv.lastMessage.attachmentType === 'IMAGE' && <ImageIcon className="h-3 w-3" />}
                                                    {conv.lastMessage.attachmentType === 'VIDEO' && <Film className="h-3 w-3" />}
                                                    {conv.lastMessage.attachmentType === 'AUDIO' && <Music className="h-3 w-3" />}
                                                    {conv.lastMessage.attachmentType === 'DOCUMENT' && <Paperclip className="h-3 w-3" />}
                                                    {conv.lastMessage.attachmentType}
                                                </span>
                                            ) : (
                                                conv.lastMessage?.content || <span className="italic text-muted-foreground/70">No messages</span>
                                            )}
                                        </span>
                                        {conv.unreadCount > 0 && (
                                            <Badge className="bg-emerald-500 hover:bg-emerald-600 h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full">
                                                {conv.unreadCount}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Chat Area */}
            {selectedContact ? (
                <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
                    {/* Header */}
                    <div className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shadow-sm z-10 shrink-0">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback className={cn("text-primary", selectedContact.type === 'ADMIN' ? "bg-primary/20" : "bg-primary/10")}>
                                    {selectedContact.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="font-semibold text-foreground flex items-center gap-2">
                                    {selectedContact.name}
                                    {selectedContact.type === 'ADMIN' && (
                                        <Badge variant="secondary" className="text-[10px] h-5 bg-purple-100 text-purple-700 hover:bg-purple-200">Admin</Badge>
                                    )}
                                </div>
                                <div className="text-xs text-green-600 flex items-center gap-1">
                                    <span className="block w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                    Online
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedContact.phoneNumber && (
                                <a
                                    href={`tel:${selectedContact.phoneNumber}`}
                                    className="p-2 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-full transition-colors"
                                    title="Call"
                                >
                                    <Phone className="h-5 w-5" />
                                </a>
                            )}
                            <Button variant="ghost" size="icon" className="text-gray-400">
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={scrollRef}>
                        <div className="flex justify-center my-4">
                            <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                Today
                            </span>
                        </div>
                        {messages.map((m) => (
                            <div key={m.id} className={`flex ${m.senderType === 'ADMIN' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] group relative px-4 py-2 shadow-sm text-sm ${m.senderType === 'ADMIN'
                                    ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm'
                                    : 'bg-card text-card-foreground border border-border rounded-2xl rounded-tl-sm'
                                    }`}>
                                    <div>{m.content}</div>
                                    {renderAttachment(m)}
                                    <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${m.senderType === 'ADMIN' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                        }`}>
                                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {m.senderType === 'ADMIN' && m.read && <CheckCheck className="w-3 h-3 text-primary-foreground" />}
                                        {m.senderType === 'ADMIN' && !m.read && <CheckCheck className="w-3 h-3 text-primary-foreground/50" />}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>


                    {/* Input */}
                    <div className="p-4 bg-card border-t border-border shrink-0">
                        {selectedFile && (
                            <div className="flex items-center justify-between p-2 mb-2 bg-indigo-50 border border-indigo-100 rounded-md">
                                <span className="text-xs text-indigo-700 truncate max-w-[200px] font-medium flex items-center gap-2">
                                    <Paperclip className="h-3 w-3" />
                                    {selectedFile.name}
                                </span>
                                <button onClick={() => setSelectedFile(null)} className="text-indigo-400 hover:text-indigo-600">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                        <form onSubmit={handleSendMessage} className="flex gap-3 max-w-4xl mx-auto items-end">
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
                                capture="environment"
                                onChange={handleFileSelect}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-primary"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Paperclip className="h-5 w-5" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-primary"
                                onClick={() => cameraInputRef.current?.click()}
                            >
                                <Camera className="h-5 w-5" />
                            </Button>

                            <AudioRecorder onRecordingComplete={(file) => setSelectedFile(file)} />

                            <Input
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 bg-background border-border focus:bg-background focus:border-primary transition-all shadow-sm"
                                autoFocus
                            />
                            <Button
                                type="submit"
                                disabled={(!inputMessage.trim() && !selectedFile) || isUploading}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                            >
                                {isUploading ? (
                                    <span className="animate-spin mr-2">⏳</span>
                                ) : (
                                    <Send className="h-4 w-4 mr-2" />
                                )}
                                Send
                            </Button>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-background text-center p-8">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                        <Send className="h-10 w-10 text-primary ml-1 opacity-70" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Detailed Message Center</h3>
                    <p className="text-muted-foreground max-w-sm">
                        Select a conversation from the sidebar to view chat history, meaningful metrics, and getting real-time updates.
                    </p>
                </div>
            )}

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
