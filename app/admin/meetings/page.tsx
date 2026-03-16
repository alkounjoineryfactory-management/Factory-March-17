import { Metadata } from "next";
import { MeetingSummaryClient } from "@/components/admin/meetings/meeting-summary-client";

export const metadata: Metadata = {
    title: "Meeting Summary | Factory Manager Pro",
    description: "Manage official meeting minutes and automatically transcribe audio recordings.",
};

export default function MeetingSummaryPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Meeting Summary
                </h1>
                <p className="text-muted-foreground mt-2">
                    Record official meeting minutes manually or upload an audio recording to instantly generate a summarized AI report. 
                </p>
            </div>

            <MeetingSummaryClient />
        </div>
    );
}
