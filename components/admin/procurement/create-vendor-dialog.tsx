"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createVendor } from "@/app/actions/procurement";

interface CreateVendorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateVendorDialog({ open, onOpenChange }: CreateVendorDialogProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        contactPerson: "",
        email: "",
        phone: "",
        address: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name) {
            toast.error("Vendor Name is required");
            return;
        }

        setIsLoading(true);
        try {
            const result = await createVendor(formData);
            if (result.success) {
                toast.success("Vendor created successfully!");
                onOpenChange(false);
                setFormData({ name: "", contactPerson: "", email: "", phone: "", address: "" });
                router.refresh();
            } else {
                toast.error(result.error || "Failed to create vendor");
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-card/90 backdrop-blur-2xl border-white/10 dark:border-white/5 shadow-2xl">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                            Add New Vendor
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vendor Name *</Label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="eg. Alpha Build Materials"
                                className="bg-background/50 border-black/5 dark:border-white/10"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="contactPerson" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact Person</Label>
                                <Input
                                    id="contactPerson"
                                    name="contactPerson"
                                    value={formData.contactPerson}
                                    onChange={handleChange}
                                    placeholder="eg. John Doe"
                                    className="bg-background/50 border-black/5 dark:border-white/10"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="+974 5555 0000"
                                    className="bg-background/50 border-black/5 dark:border-white/10"
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="contact@vendor.com"
                                className="bg-background/50 border-black/5 dark:border-white/10"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="address" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Address</Label>
                            <Textarea
                                id="address"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                placeholder="Doha, Qatar..."
                                className="bg-background/50 border-black/5 dark:border-white/10 resize-none"
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300"
                        >
                            {isLoading ? "Saving..." : "Save Vendor"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
