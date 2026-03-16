import ChatLayout from "@/components/admin/chat-layout";

export default function MessagesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Messages</h2>
                    <p className="text-muted-foreground">Live communication with factory staff.</p>
                </div>
            </div>

            <ChatLayout />
        </div>
    );
}
