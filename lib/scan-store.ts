'use client';

import { create } from 'zustand';

export interface CapturedPhoto {
    stepId: string;
    dataUrl: string;        // Base64 JPEG data URL
    capturedAt: number;     // epoch ms
    qualityScore?: number;  // 0-1, computed on-device
}

export interface ReportFinding {
    type: string;
    location: string;
    severity: 'mild' | 'moderate' | 'severe';
    confidence: number;
    evidence: string;
    bounding_box: [number, number, number, number];
    angle: string;
}

export interface ReportPhoto {
    angle: string;
    url: string;
}

export interface Report {
    assessmentId: string;
    triageLevel: 'routine' | 'soon' | 'urgent';
    summary: string;
    findings: ReportFinding[];
    alert: string | null;
    disclaimer: string;
    imagesAnalyzed: number;
    imagesSkipped: number;
    skippedAngles?: string[];
    photos?: ReportPhoto[];
    email?: string | null;   // ← add this
}

type Screen =
    | 'landing'
    | 'preparation'
    | 'capture'
    | 'review'
    | 'analyzing'
    | 'report'
    | 'booking';

interface ScanState {
    // Navigation
    screen: Screen;
    setScreen: (s: Screen) => void;

    // Capture progress
    currentStepIndex: number;
    setCurrentStepIndex: (i: number) => void;

    // Photos
    photos: CapturedPhoto[];
    addPhoto: (p: CapturedPhoto) => void;
    removePhoto: (stepId: string) => void;
    clearPhotos: () => void;

    // Report
    report: Report | null;
    setReport: (r: Report | null) => void;

    // Email (optional capture)
    email: string;
    setEmail: (e: string) => void;

    // Reset
    reset: () => void;
}

export const useScanStore = create<ScanState>((set) => ({
    screen: 'landing',
    setScreen: (screen) => set({ screen }),

    currentStepIndex: 0,
    setCurrentStepIndex: (currentStepIndex) => set({ currentStepIndex }),

    photos: [],
    addPhoto: (p) =>
        set((s) => ({
            photos: [...s.photos.filter((x) => x.stepId !== p.stepId), p],
        })),
    removePhoto: (stepId) =>
        set((s) => ({ photos: s.photos.filter((p) => p.stepId !== stepId) })),
    clearPhotos: () => set({ photos: [] }),

    report: null,
    setReport: (report) => set({ report }),

    email: '',
    setEmail: (email) => set({ email }),

    reset: () =>
        set({
            screen: 'landing',
            currentStepIndex: 0,
            photos: [],
            report: null,
            email: '',
        }),
}));