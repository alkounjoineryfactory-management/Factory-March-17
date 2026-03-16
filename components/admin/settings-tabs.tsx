"use client";

import { Trash2, Plus, KeyRound, Paperclip, Sliders, Phone, User, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    updateAdminPassword,
    createAdminUser, deleteAdminUser, updateAdminUser,
    updateSystemSettings
} from "@/app/actions";
import { uploadFile } from "@/app/actions/upload";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function SettingsTabs({
    adminUsers, systemSettings, storageStats
}: {
    adminUsers: any[], systemSettings: any, storageStats: any
}) {
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [faviconFile, setFaviconFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [kioskEnabled, setKioskEnabled] = useState<boolean>(systemSettings?.kioskJobStartEndEnabled ?? true);
    const [editingUser, setEditingUser] = useState<{ id: string, username: string, name?: string | null, role: string, phoneNumber?: string | null, address?: string | null, basicSalary?: number } | null>(null);

    const handleUpdateSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);

        const formData = new FormData(e.target as HTMLFormElement);
        let logoUrl = systemSettings?.logoUrl;
        let faviconUrl = systemSettings?.faviconUrl;

        if (logoFile) {
            try {
                const uploadFormData = new FormData();
                uploadFormData.append("file", logoFile);
                logoUrl = await uploadFile(uploadFormData);
            } catch (err) {
                alert("Logo upload failed");
                setIsUploading(false);
                return;
            }
        }

        if (faviconFile) {
            try {
                const uploadFormData = new FormData();
                uploadFormData.append("file", faviconFile);
                faviconUrl = await uploadFile(uploadFormData);
            } catch (err) {
                alert("Favicon upload failed");
                setIsUploading(false);
                return;
            }
        }

        const settingsFormData = new FormData();
        settingsFormData.append("factoryName", formData.get("factoryName") as string);
        settingsFormData.append("resourceLink", formData.get("resourceLink") as string);
        settingsFormData.append("themeMode", formData.get("themeMode") as string);
        settingsFormData.append("primaryColor", formData.get("primaryColor") as string);
        
        // Handle Switch boolean explicitly via controlled state
        settingsFormData.append("kioskJobStartEndEnabled", kioskEnabled.toString());
        
        // AI Key
        const geminiApiKey = formData.get("geminiApiKey") as string;
        if (geminiApiKey !== null) settingsFormData.append("geminiApiKey", geminiApiKey);

        if (logoUrl) settingsFormData.append("logoUrl", logoUrl);
        if (faviconUrl) settingsFormData.append("faviconUrl", faviconUrl);

        await updateSystemSettings(settingsFormData);
        setIsUploading(false);
        setLogoFile(null);
        setFaviconFile(null);
        alert("Settings updated successfully!");
    };


    return (
        <Tabs defaultValue="general" className="w-full space-y-6">
            <div className="flex justify-center">
                <TabsList className="grid w-full max-w-xl grid-cols-5 h-14 bg-card/80 border border-black/5 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-full p-1 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-50 pointer-events-none"></div>
                    <TabsTrigger value="general" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold uppercase tracking-wider text-xs transition-all duration-300 data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20">
                        <Sliders className="w-4 h-4 mr-2" /> General
                    </TabsTrigger>

                    <TabsTrigger value="security" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold uppercase tracking-wider text-xs transition-all duration-300 data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20">
                        <KeyRound className="w-4 h-4 mr-2" /> Security
                    </TabsTrigger>
                </TabsList>
            </div>

            {/* GENERAL TAB */}
            <TabsContent value="general" className="animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Branding Settings */}
                    <Card className="rounded-3xl border border-black/5 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden bg-card">
                        <CardHeader className="bg-muted/40 border-b border-black/5 dark:border-white/5 pb-5">
                            <CardTitle className="text-xl font-black tracking-tight text-foreground flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner border border-primary/20">
                                    <Sliders className="w-5 h-5" />
                                </div>
                                System Branding
                            </CardTitle>
                            <CardDescription className="text-xs font-semibold uppercase tracking-wider mt-1 opacity-70">Customize the look of your factory manager.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 relative z-10">
                            <form onSubmit={handleUpdateSettings} className="space-y-5">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Factory Name</Label>
                                    <Input
                                        name="factoryName"
                                        defaultValue={systemSettings?.factoryName}
                                        placeholder="My Factory"
                                        required
                                        className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Chat Resources Link</Label>
                                    <Input
                                        name="resourceLink"
                                        defaultValue={systemSettings?.resourceLink || "/uploads/"}
                                        placeholder="/uploads/"
                                        className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl font-mono text-xs"
                                    />
                                    <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mt-1 opacity-80">URL path where chat attachments are served from.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Primary Color <span className="text-[9px] lowercase opacity-50 font-medium">(Theme)</span></Label>
                                    <div className="flex items-center gap-4 bg-background/30 p-2 rounded-xl border border-black/5 dark:border-white/5 shadow-inner">
                                        <Input
                                            type="color"
                                            name="primaryColor"
                                            defaultValue={systemSettings?.primaryColor || "#01cd74"}
                                            className="w-16 h-12 p-1 cursor-pointer border-black/10 dark:border-white/10 rounded-lg shadow-sm"
                                        />
                                        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mt-1 opacity-80">Main brand color used across the app.</p>
                                    </div>
                                </div>
                                <div className="space-y-2 relative z-50">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Theme Mode</Label>
                                    <Select name="themeMode" defaultValue={systemSettings?.themeMode || "system"}>
                                        <SelectTrigger className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card/95 border-black/10 dark:border-white/10">
                                            <SelectItem value="system">System Default</SelectItem>
                                            <SelectItem value="light">Light Mode</SelectItem>
                                            <SelectItem value="dark">Dark Mode</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-2 relative z-50">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                        Gemini AI API Key
                                        <Badge variant="outline" className="text-[8px] bg-indigo-50/50 text-indigo-500 border-indigo-200 uppercase tracking-widest">v1.5 Flash</Badge>
                                    </Label>
                                    <Input
                                        type="password"
                                        name="geminiApiKey"
                                        defaultValue={systemSettings?.geminiApiKey || ""}
                                        placeholder="AIzaSy..."
                                        className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl font-mono text-xs"
                                    />
                                    <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mt-1 opacity-80">Used for meeting transcriptions and AI summaries. Overrides the .env file.</p>
                                </div>
                                
                                {/* Kiosk Settings Divider */}
                                <div className="pt-4 pb-2">
                                    <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent"></div>
                                </div>

                                <div className="space-y-3 relative z-40 bg-background/30 p-4 rounded-xl border border-black/5 dark:border-white/5 shadow-inner">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-xs font-bold uppercase tracking-wider text-foreground">Allow Kiosk Job Controls</Label>
                                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest opacity-80">
                                                Workers can start and complete jobs directly from the Kiosk.
                                            </p>
                                        </div>
                                        <div className="flex items-center">
                                            <input type="hidden" name="kioskJobStartEndEnabled" value={kioskEnabled ? "on" : "off"} />
                                            <Switch 
                                                checked={kioskEnabled}
                                                onCheckedChange={setKioskEnabled}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Brand Logo</Label>
                                    <div className="flex items-center gap-5 p-3 bg-background/30 rounded-xl border border-black/5 dark:border-white/5 shadow-inner">
                                        {(logoFile || systemSettings?.logoUrl) && (
                                            <div className="w-20 h-20 rounded-2xl border border-black/5 dark:border-white/5 shadow-[0_4px_12px_rgba(0,0,0,0.1)] bg-card/50 flex items-center justify-center overflow-hidden shrink-0 group hover:scale-[1.05] transition-transform">
                                                <img
                                                    src={logoFile ? URL.createObjectURL(logoFile) : systemSettings?.logoUrl}
                                                    alt="Logo"
                                                    className="w-full h-full object-contain p-2"
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1 space-y-2">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                                                className="h-10 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl file:bg-primary file:text-primary-foreground file:font-bold file:border-0 file:rounded-md file:mr-4 file:px-4 cursor-pointer hover:file:bg-primary/90 text-xs"
                                            />
                                            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest opacity-80 mt-1">Recommended: 200x200px PNG transparent.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">App Favicon</Label>
                                    <div className="flex items-center gap-5 p-3 bg-background/30 rounded-xl border border-black/5 dark:border-white/5 shadow-inner">
                                        {(faviconFile || systemSettings?.faviconUrl) && (
                                            <div className="w-12 h-12 rounded-lg border border-black/5 dark:border-white/5 shadow-[0_4px_12px_rgba(0,0,0,0.1)] bg-card/50 flex items-center justify-center overflow-hidden shrink-0 group hover:scale-[1.05] transition-transform">
                                                <img
                                                    src={faviconFile ? URL.createObjectURL(faviconFile) : systemSettings?.faviconUrl}
                                                    alt="Favicon"
                                                    className="w-full h-full object-contain p-2"
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1 space-y-2">
                                            <Input
                                                type="file"
                                                accept="image/x-icon,image/png,image/svg+xml"
                                                onChange={(e) => setFaviconFile(e.target.files?.[0] || null)}
                                                className="h-10 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl file:bg-primary file:text-primary-foreground file:font-bold file:border-0 file:rounded-md file:mr-4 file:px-4 cursor-pointer hover:file:bg-primary/90 text-xs"
                                            />
                                            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest opacity-80 mt-1">Global App Favicon (PNG or ICO).</p>
                                        </div>
                                    </div>
                                </div>
                                <Button type="submit" className="w-full h-12 rounded-xl font-bold uppercase tracking-wider text-xs bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all transform hover:scale-[1.02]" disabled={isUploading}>
                                    {isUploading ? "Uploading..." : "Save Changes"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* System Resources */}
                    <Card className="rounded-3xl border border-black/5 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden bg-card h-fit">
                        <CardHeader className="bg-muted/40 border-b border-black/5 dark:border-white/5 pb-5">
                            <CardTitle className="text-xl font-black tracking-tight text-foreground flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 shadow-inner border border-blue-500/20">
                                    <Paperclip className="w-5 h-5" />
                                </div>
                                System Resources
                            </CardTitle>
                            <CardDescription className="text-xs font-semibold uppercase tracking-wider mt-1 opacity-70">Manage storage and files.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6 relative z-10">
                            <div className="flex items-center justify-between p-5 bg-background/50 rounded-2xl border border-black/5 dark:border-white/5 shadow-inner">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl shadow-inner border border-blue-500/20">
                                        <Paperclip className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-foreground text-sm">Chat Resources</div>
                                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">public/uploads</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-black text-foreground text-xl">{storageStats?.count || 0}</div>
                                    <div className="text-[10px] font-semibold text-emerald-500 uppercase tracking-widest">{storageStats?.sizeMB || "0.00"} MB Used</div>
                                </div>
                            </div>

                            <div className="p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 shadow-inner">
                                <h4 className="font-black text-emerald-600 dark:text-emerald-400 mb-2 uppercase tracking-wide text-xs">Access Information</h4>
                                <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mb-4 font-medium leading-relaxed">
                                    All chat attachments (images, videos, voice notes) are securely stored in the server's designated public folder.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <code className="block bg-muted/80 p-3 rounded-xl text-[10px] font-mono font-bold text-foreground break-all flex-1 shadow-inner border border-black/5 dark:border-white/5">
                                        {typeof window !== 'undefined' ? `${window.location.origin}${systemSettings?.resourceLink || '/uploads/'}` : (systemSettings?.resourceLink || '/uploads/')}
                                    </code>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-10 px-5 rounded-xl font-bold uppercase tracking-wider text-[10px] bg-background/50 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40 transition-all"
                                        onClick={() => window.open(systemSettings?.resourceLink || '/uploads/', '_blank')}
                                    >
                                        Open Directory
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            {/* SECURITY TAB */}
            <TabsContent value="security" className="space-y-6">
                <Card className="rounded-3xl border border-black/5 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden bg-card">
                    <CardHeader className="bg-muted/40 border-b border-black/5 dark:border-white/5 pb-5">
                        <CardTitle className="text-xl font-black tracking-tight text-foreground flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner border border-primary/20">
                                <KeyRound className="w-5 h-5" />
                            </div>
                            Admin Security
                        </CardTitle>
                        <CardDescription className="text-xs font-semibold uppercase tracking-wider mt-1 opacity-70">
                            Update your administrator access credentials.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 relative z-10 w-full md:w-1/2 lg:w-1/3">
                        <form action={async (formData) => {
                            const result = await updateAdminPassword(formData);
                            if (result?.error) {
                                alert(result.error);
                            } else {
                                alert("Password updated successfully!");
                                (document.getElementById("security-form") as HTMLFormElement)?.reset();
                            }
                        }} id="security-form" className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current Password</Label>
                                <Input id="currentPassword" name="currentPassword" type="password" required className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl font-medium tracking-widest" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="newPassword" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">New Password</Label>
                                <Input id="newPassword" name="newPassword" type="password" required className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl font-medium tracking-widest" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Confirm New Password</Label>
                                <Input id="confirmPassword" name="confirmPassword" type="password" required className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl font-medium tracking-widest" />
                            </div>
                            <Button type="submit" className="w-full h-12 rounded-xl font-bold uppercase tracking-wider text-xs bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all transform hover:scale-[1.02]">
                                Update Password
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="rounded-3xl border border-black/5 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden bg-card h-fit">
                        <CardHeader className="bg-muted/40 border-b border-black/5 dark:border-white/5 pb-5">
                            <CardTitle className="text-xl font-black tracking-tight text-foreground flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500 shadow-inner border border-orange-500/20">
                                    <Plus className="w-5 h-5" />
                                </div>
                                Add New Admin
                            </CardTitle>
                            <CardDescription className="text-xs font-semibold uppercase tracking-wider mt-1 opacity-70">Grant admin and management access to a new user.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 relative z-10 w-full md:w-4/5 lg:w-full">
                            <form action={async (formData) => {
                                const result = await createAdminUser(formData);
                                if (result?.error) alert(result.error);
                                else {
                                    alert("Admin user created successfully!");
                                    (document.getElementById("add-admin-form") as HTMLFormElement)?.reset();
                                }
                            }} id="add-admin-form" className="space-y-5">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Username</Label>
                                    <Input name="username" placeholder="admin2" required className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
                                    <Input name="password" type="text" placeholder="Initial Password" required className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                                    <Input name="name" placeholder="John Doe" className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                                        <Input name="phoneNumber" type="tel" placeholder="+1234567890" className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl" />
                                    </div>
                                    <div className="space-y-2 relative z-50">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Role</Label>
                                        <Select name="role" defaultValue="ADMIN">
                                            <SelectTrigger className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card/95 border-black/10 dark:border-white/10 max-h-[300px]">
                                                <SelectItem value="ADMIN" className="font-bold text-primary">Admin</SelectItem>
                                                <SelectItem value="MANAGER" className="font-bold text-blue-500">Manager</SelectItem>
                                                <SelectItem value="FACTORY_MANAGER">Factory Manager</SelectItem>
                                                <SelectItem value="FACTORY_ASST_MANAGER">Factory Assist Manager</SelectItem>
                                                <SelectItem value="PRODUCTION_MANAGER">Production Manager</SelectItem>
                                                <SelectItem value="ASST_PRODUCTION_MANAGER">Asst. Production Manager</SelectItem>
                                                <SelectItem value="PRODUCTION_COORDINATOR">Production Coordinator</SelectItem>
                                                <SelectItem value="ASST_PRODUCTION_COORDINATOR">Asst. Production Coordinator</SelectItem>
                                                <SelectItem value="TECHNICAL_COORDINATOR">Technical Coordinator</SelectItem>
                                                <SelectItem value="ASST_TECHNICAL_COORDINATOR">Assist. Technical Coordinator</SelectItem>
                                                <SelectItem value="GENERAL_SUPERVISOR">General Supervisor</SelectItem>
                                                <SelectItem value="ASST_GENERAL_SUPERVISOR">Asst. General Supervisor</SelectItem>
                                                <SelectItem value="FOREMAN">Foreman</SelectItem>
                                                <SelectItem value="QC_INSPECTOR">QC Inspector</SelectItem>
                                                <SelectItem value="INCHARGER">Incharger</SelectItem>
                                                <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                                                <SelectItem value="HR">HR</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Address</Label>
                                        <Input name="address" placeholder="123 Factory Row" className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Basic Salary (QAR)</Label>
                                        <Input name="basicSalary" type="number" step="0.01" min="0" placeholder="0.00" className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl" />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full h-12 rounded-xl font-bold uppercase tracking-wider text-[10px] bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all transform hover:scale-[1.02]">
                                    <Plus className="w-4 h-4 mr-2" /> Create Management User
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="rounded-3xl border border-black/5 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden bg-card h-fit">
                        <CardHeader className="bg-muted/40 border-b border-black/5 dark:border-white/5 pb-5">
                            <CardTitle className="text-xl font-black tracking-tight text-foreground flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 shadow-inner border border-indigo-500/20">
                                    <User className="w-5 h-5" />
                                </div>
                                Core Application Users
                            </CardTitle>
                            <CardDescription className="text-xs font-semibold uppercase tracking-wider mt-1 opacity-70">Manage existing administrative and management users.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 relative z-10 p-0">
                            <ScrollArea className="h-[450px]">
                                <div className="space-y-1 p-4">
                                    {adminUsers?.map((user) => (
                                        <div key={user.id} className="flex items-center justify-between p-4 border-b last:border-0 border-black/5 dark:border-white/5 hover:bg-white/5 dark:hover:bg-white/5 transition-colors group">
                                            <div>
                                                <div className="font-bold text-foreground text-sm flex items-center gap-2">
                                                    {user.name || user.username}
                                                    {user.name && <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">(@{user.username})</span>}
                                                </div>
                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                    <Badge variant="outline" className={cn(
                                                        "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border-black/10 dark:border-white/10 shadow-sm",
                                                        user.role === 'ADMIN' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-background/50 text-foreground'
                                                    )}>
                                                        {user.role.replace(/_/g, " ")}
                                                    </Badge>
                                                    {user.phoneNumber && (
                                                        <span className="text-[10px] font-semibold text-muted-foreground flex flex-row items-center gap-1 bg-background/30 px-2 py-0.5 rounded-lg border border-black/5 dark:border-white/5">
                                                            <Phone className="w-3 h-3" /> {user.phoneNumber}
                                                        </span>
                                                    )}
                                                </div>
                                                {user.basicSalary > 0 && (
                                                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                                        QAR {user.basicSalary.toLocaleString()}
                                                    </span>
                                                )}
                                                {user.address && (
                                                    <div className="text-[9px] font-medium tracking-wide text-muted-foreground mt-2 opacity-80">{user.address}</div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-xl" onClick={() => setEditingUser(user)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <form action={async (formData) => {
                                                    if (!confirm("Are you sure you want to delete this user?")) return;
                                                    const result = await deleteAdminUser(formData);
                                                    if (result?.error) alert(result.error);
                                                }}>
                                                    <input type="hidden" name="id" value={user.id} />
                                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </form>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            {/* Edit User Dialog */}
            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User Profile</DialogTitle>
                        <DialogDescription>
                            Update management hierarchy, identity, and salary assignments for @{editingUser?.username}
                        </DialogDescription>
                    </DialogHeader>

                    {editingUser && (
                        <form action={async (formData) => {
                            const result = await updateAdminUser(formData);
                            if (result?.error) alert(result.error);
                            else {
                                alert("User profile updated successfully!");
                                setEditingUser(null);
                            }
                        }} className="space-y-4 py-4">
                            <input type="hidden" name="id" value={editingUser.id} />

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                                <Input name="name" defaultValue={editingUser.name || ""} placeholder="John Doe" className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Role</Label>
                                    <Select name="role" defaultValue={editingUser.role}>
                                        <SelectTrigger className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[250px] bg-card/95 border-black/10 dark:border-white/10">
                                            <SelectItem value="ADMIN" className="font-bold text-primary">Admin</SelectItem>
                                            <SelectItem value="MANAGER" className="font-bold text-blue-500">Manager</SelectItem>
                                            <SelectItem value="FACTORY_MANAGER">Factory Manager</SelectItem>
                                            <SelectItem value="FACTORY_ASST_MANAGER">Factory Assist Manager</SelectItem>
                                            <SelectItem value="PRODUCTION_MANAGER">Production Manager</SelectItem>
                                            <SelectItem value="ASST_PRODUCTION_MANAGER">Asst. Production Manager</SelectItem>
                                            <SelectItem value="PRODUCTION_COORDINATOR">Production Coordinator</SelectItem>
                                            <SelectItem value="ASST_PRODUCTION_COORDINATOR">Asst. Production Coordinator</SelectItem>
                                            <SelectItem value="TECHNICAL_COORDINATOR">Technical Coordinator</SelectItem>
                                            <SelectItem value="ASST_TECHNICAL_COORDINATOR">Assist. Technical Coordinator</SelectItem>
                                            <SelectItem value="GENERAL_SUPERVISOR">General Supervisor</SelectItem>
                                            <SelectItem value="ASST_GENERAL_SUPERVISOR">Asst. General Supervisor</SelectItem>
                                            <SelectItem value="FOREMAN">Foreman</SelectItem>
                                            <SelectItem value="QC_INSPECTOR">QC Inspector</SelectItem>
                                            <SelectItem value="INCHARGER">Incharger</SelectItem>
                                            <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                                            <SelectItem value="HR">HR</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                                    <Input name="phoneNumber" type="tel" defaultValue={editingUser.phoneNumber || ""} placeholder="+1234567890" className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Basic Salary (QAR)</Label>
                                    <Input name="basicSalary" type="number" step="0.01" min="0" defaultValue={editingUser.basicSalary || ""} placeholder="0.00" className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Address</Label>
                                    <Input name="address" defaultValue={editingUser.address || ""} placeholder="123 Factory Row" className="h-11 bg-background/50 border-black/10 dark:border-white/10 shadow-inner rounded-xl" />
                                </div>
                            </div>

                            <DialogFooter className="mt-6">
                                <Button type="button" variant="outline" onClick={() => setEditingUser(null)} className="h-11 rounded-xl">Cancel</Button>
                                <Button type="submit" className="h-11 rounded-xl bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] transform transition-all font-bold tracking-wide">
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

        </Tabs>
    );
}
