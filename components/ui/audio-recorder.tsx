"use client";

import { useState, useRef } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioRecorderProps {
    onRecordingComplete: (file: File) => void;
    className?: string;
}

export function AudioRecorder({ onRecordingComplete, className }: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Try to use a more compatible format for mobile/iOS
            let options = { mimeType: 'audio/webm' };
            if (MediaRecorder.isTypeSupported('audio/mp4')) {
                options = { mimeType: 'audio/mp4' };
            } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                options = { mimeType: 'audio/webm;codecs=opus' };
            }

            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const type = options.mimeType.split(';')[0];
                const ext = type.split('/')[1] || 'webm';
                const blob = new Blob(chunksRef.current, { type });
                const file = new File([blob], `recording.${ext}`, { type });
                onRecordingComplete(file);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please ensure permissions are granted.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    return (
        <Button
            type="button"
            variant={isRecording ? "destructive" : "ghost"}
            size="icon"
            className={className}
            onClick={isRecording ? stopRecording : startRecording}
            title={isRecording ? "Stop Recording" : "Record Audio"}
        >
            {isRecording ? (
                <Square className="h-4 w-4 fill-current" />
            ) : (
                <Mic className="h-5 w-5 text-slate-400 hover:text-indigo-600" />
            )}
        </Button>
    );
}
