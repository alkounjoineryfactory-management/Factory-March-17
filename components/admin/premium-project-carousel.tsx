"use client";

import React, { useState, useEffect } from "react";
import { Project } from "@prisma/client";
import { ChevronLeft, ChevronRight, Archive, MapPin, Calendar, ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PremiumProjectCarouselProps {
    projects: Project[];
}

export function PremiumProjectCarousel({ projects }: PremiumProjectCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isClient, setIsClient] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const lastScrollTime = React.useRef(0);
    const carouselRef = React.useRef<HTMLDivElement>(null);

    // Sort active projects first
    const sortedProjects = [...projects].sort((a, b) => {
        if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
        if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1;
        return a.name.localeCompare(b.name);
    });

    // Filter by search term
    const filteredProjects = sortedProjects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.projectNumber && p.projectNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    useEffect(() => {
        setIsClient(true);

        // Add non-passive wheel event listener to prevent default page scroll
        const element = carouselRef.current;
        if (!element) return;

        const handleWheelEvent = (e: WheelEvent) => {
            if (filteredProjects.length <= 1) return;

            // Prevent page scrolling when hovering over carousel
            e.preventDefault();

            const now = Date.now();
            if (now - lastScrollTime.current < 400) return; // Throttle scroll to 400ms

            if (Math.abs(e.deltaY) > 20) {
                lastScrollTime.current = now;
                if (e.deltaY > 0) {
                    setActiveIndex((prev) => (prev + 1) % filteredProjects.length);
                } else {
                    setActiveIndex((prev) => (prev - 1 + filteredProjects.length) % filteredProjects.length);
                }
            }
        };

        element.addEventListener('wheel', handleWheelEvent, { passive: false });

        return () => {
            element.removeEventListener('wheel', handleWheelEvent);
        };
    }, [filteredProjects.length, isClient]);
    const nextSlide = () => {
        setActiveIndex((prev) => (prev + 1) % filteredProjects.length);
    };

    const prevSlide = () => {
        setActiveIndex((prev) => (prev - 1 + filteredProjects.length) % filteredProjects.length);
    };

    const handleCardClick = (index: number) => {
        setActiveIndex(index);
    };

    if (!projects || projects.length === 0) {
        return (
            <div className="py-20 flex flex-col items-center justify-center text-center animate-pulse">
                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-full mb-6">
                    <Archive className="w-12 h-12 text-indigo-400" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">No Projects Found</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                    Create a project first to see it displayed in your workspace.
                </p>
            </div>
        );
    }



    if (!isClient) return <div className="h-[400px] w-full flex items-center justify-center"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div ref={carouselRef} className="relative w-full py-8 px-4">

            {/* Search Bar */}
            <div className="max-w-md mx-auto mb-10 relative z-30">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search projects by name or #..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setActiveIndex(0); // Reset index on search
                        }}
                        className="pl-10 h-12 rounded-2xl bg-card/60 backdrop-blur-xl border-black/5 dark:border-white/10 focus-visible:ring-indigo-500 shadow-xl"
                    />
                </div>
            </div>

            {filteredProjects.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                    <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-6">
                        <Archive className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">No matching projects</h3>
                    <p className="text-gray-500">Try adjusting your search term.</p>
                </div>
            ) : (
                <div className="relative w-full overflow-hidden" style={{ perspective: "1500px" }}>

                    {/* Background ambient glow based on active project status */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-indigo-500/10 dark:bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none transition-all duration-1000"></div>

                    <div className="relative flex items-center justify-center min-h-[450px]">
                        {filteredProjects.map((project, index) => {
                            // Calculate visual offset from active index
                            // We need to handle wrapping around the array visually
                            let offset = index - activeIndex;
                            if (offset > Math.floor(filteredProjects.length / 2)) {
                                offset -= filteredProjects.length;
                            } else if (offset < -Math.floor(filteredProjects.length / 2)) {
                                offset += filteredProjects.length;
                            }

                            const isActive = offset === 0;

                            // Determine layout values based on offset
                            const translateX = offset * 220; // Spread cards horizontally
                            const rotateY = offset * -35;     // Rotate towards the center
                            const scale = isActive ? 1 : 0.75;
                            const zIndex = 100 - Math.abs(offset);
                            const opacity = Math.abs(offset) > 2 ? 0 : isActive ? 1 : 0.6; // Hide completely if extremely far

                            return (
                                <div
                                    key={project.id}
                                    onClick={() => !isActive && handleCardClick(index)}
                                    className={`absolute transition-all duration-500 ease-out flex flex-col
                                ${isActive ? "cursor-default" : "cursor-pointer hover:opacity-80"}
                            `}
                                    style={{
                                        transform: `translateX(${translateX}px) translateZ(${isActive ? '50px' : '-100px'}) rotateY(${rotateY}deg) scale(${scale})`,
                                        zIndex: zIndex,
                                        opacity: opacity,
                                        width: '380px',
                                        // Disable pointer events if it's completely invisible to prevent invisible clicks
                                        pointerEvents: opacity === 0 ? 'none' : 'auto'
                                    }}
                                >
                                    {/* Card Content Wrapper */}
                                    <div className={`
                                w-full h-[400px] rounded-3xl overflow-hidden flex flex-col p-1
                                transition-all duration-500 
                                ${isActive ? 'bg-gradient-to-b from-indigo-500/20 to-blue-500/5 shadow-[0_20px_50px_rgba(79,70,229,0.3)] dark:shadow-[0_20px_50px_rgba(79,70,229,0.15)] ring-1 ring-white/20 dark:ring-white/10'
                                            : 'bg-white/50 dark:bg-gray-800/40 shadow-xl border border-black/5 dark:border-white/5 backdrop-blur-sm grayscale-[30%]'}
                            `}>
                                        {/* Inner Card matching our ultra-premium glass look */}
                                        <div className="w-full h-full rounded-[22px] bg-card/60 dark:bg-[#0f0f11]/80 backdrop-blur-2xl p-6 flex flex-col relative overflow-hidden group">

                                            {isActive && (
                                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent pointer-events-none"></div>
                                            )}

                                            {/* Card Header & Status */}
                                            <div className="flex justify-between items-start mb-6 relative z-10">
                                                <div className={`p-3 rounded-xl ${isActive ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'} transition-colors duration-500`}>
                                                    <Archive className="w-6 h-6" />
                                                </div>
                                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${project.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-gray-500/10 text-gray-600 border-gray-500/20'}`}>
                                                    {project.status}
                                                </span>
                                            </div>

                                            {/* Project Details */}
                                            <div className="space-y-4 flex-1 relative z-10">
                                                <div>
                                                    <h3 className={`font-bold leading-tight line-clamp-2 transition-colors duration-500 ${isActive ? 'text-2xl text-foreground' : 'text-xl text-muted-foreground'}`}>
                                                        {project.name}
                                                    </h3>
                                                    {project.projectNumber && (
                                                        <p className="text-sm font-mono text-muted-foreground mt-1 tracking-wider opacity-80">
                                                            #{project.projectNumber}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="space-y-2 mt-6">
                                                    {project.client && (
                                                        <div className="text-sm text-gray-500 flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                                                            <span className="truncate">{project.client}</span>
                                                        </div>
                                                    )}
                                                    {project.location && (
                                                        <div className="text-sm text-gray-500 flex items-center gap-2">
                                                            <MapPin className="w-4 h-4 opacity-70" />
                                                            <span className="truncate">{project.location}</span>
                                                        </div>
                                                    )}
                                                    {project.startingDate && (
                                                        <div className="text-sm text-gray-500 flex items-center gap-2">
                                                            <Calendar className="w-4 h-4 opacity-70" />
                                                            <span className="truncate">
                                                                {new Date(project.startingDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Button - Only visible and clickable if active */}
                                            <div className={`pt-6 mt-auto border-t border-black/5 dark:border-white/5 transition-all duration-500 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                                                <Link href={`/admin/projects/${project.id}`} className="w-full">
                                                    <Button className="w-full h-12 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all">
                                                        <span>Enter Workspace</span>
                                                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                                    </Button>
                                                </Link>
                                            </div>

                                            {/* Click Overlay for inactive cards to capture clicks easily */}
                                            {!isActive && (
                                                <div className="absolute inset-0 z-20" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Navigation Controls */}
            {filteredProjects.length > 1 && (
                <div className="flex items-center justify-center gap-6 mt-8">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={prevSlide}
                        className="rounded-full w-12 h-12 bg-background/50 backdrop-blur-md border-white/10 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/20 dark:hover:border-indigo-500/50 transition-all shadow-sm"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>

                    <div className="flex gap-2">
                        {filteredProjects.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleCardClick(idx)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeIndex
                                    ? 'w-6 bg-indigo-600 dark:bg-indigo-500'
                                    : 'w-1.5 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600'
                                    }`}
                                aria-label={`Go to slide ${idx + 1}`}
                            />
                        ))}
                    </div>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={nextSlide}
                        className="rounded-full w-12 h-12 bg-background/50 backdrop-blur-md border-white/10 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/20 dark:hover:border-indigo-500/50 transition-all shadow-sm"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </Button>
                </div>
            )}
        </div>
    );
}
