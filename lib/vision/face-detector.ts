'use client';

import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let landmarkerInstance: FaceLandmarker | null = null;
let landmarkerPromise: Promise<FaceLandmarker> | null = null;

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';
const MODEL_URL =
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export async function loadFaceLandmarker(): Promise<FaceLandmarker> {
    if (landmarkerInstance) return landmarkerInstance;
    if (landmarkerPromise) return landmarkerPromise;

    landmarkerPromise = (async () => {
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        const landmarker = await FaceLandmarker.createFromOptions(fileset, {
            baseOptions: {
                modelAssetPath: MODEL_URL,
                delegate: 'GPU',
            },
            runningMode: 'IMAGE',
            numFaces: 1,
        });
        landmarkerInstance = landmarker;
        return landmarker;
    })();

    return landmarkerPromise;
}

export interface FaceMetrics {
    faceDetected: boolean;
    faceWidth: number;          // 0-1, face bounding box width / video width
    mouthCenterX: number;       // 0-1
    mouthCenterY: number;       // 0-1
    mouthOpenness: number;      // 0-1, higher = more open
    mouthWidth: number;         // 0-1
}

const NO_FACE: FaceMetrics = {
    faceDetected: false,
    faceWidth: 0,
    mouthCenterX: 0.5,
    mouthCenterY: 0.5,
    mouthOpenness: 0,
    mouthWidth: 0,
};

// A shared offscreen canvas for downscaling frames
let detectionCanvas: HTMLCanvasElement | null = null;
let detectionCtx: CanvasRenderingContext2D | null = null;

function getDetectionCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
    if (!detectionCanvas) {
        detectionCanvas = document.createElement('canvas');
        detectionCanvas.width = 640;
        detectionCanvas.height = 480;
        detectionCtx = detectionCanvas.getContext('2d', { willReadFrequently: true });
    }
    if (!detectionCtx) return null;
    return { canvas: detectionCanvas, ctx: detectionCtx };
}

export function detectFace(
    landmarker: FaceLandmarker,
    video: HTMLVideoElement,
    _timestampMs: number
): FaceMetrics {
    // 1. Guard: video must be fully ready and have real dimensions
    if (
        !video ||
        video.readyState < 2 ||
        !video.videoWidth ||
        !video.videoHeight ||
        video.paused
    ) {
        return NO_FACE;
    }

    // 2. Guard: skip frames that are too small
    if (video.videoWidth < 64 || video.videoHeight < 64) {
        return NO_FACE;
    }

    const dc = getDetectionCanvas();
    if (!dc) return NO_FACE;

    // 3. Draw the video frame to the canvas (normalizes format, strips EXIF orientation issues)
    try {
        dc.ctx.drawImage(video, 0, 0, dc.canvas.width, dc.canvas.height);
    } catch {
        return NO_FACE;
    }

    // 4. Run detection on the canvas (not the raw video)
    try {
        const result = landmarker.detect(dc.canvas);
        if (!result.faceLandmarks?.length) return NO_FACE;

        const lms = result.faceLandmarks[0];

        const upperLip = lms[13];
        const lowerLip = lms[14];
        const leftCorner = lms[61];
        const rightCorner = lms[291];

        const mouthCenterX = (leftCorner.x + rightCorner.x) / 2;
        const mouthCenterY = (upperLip.y + lowerLip.y) / 2;

        const mouthWidth = Math.abs(rightCorner.x - leftCorner.x);
        const mouthHeight = Math.abs(lowerLip.y - upperLip.y);
        const mouthOpenness = mouthHeight / Math.max(mouthWidth, 0.001);

        let minX = 1;
        let maxX = 0;
        for (const lm of lms) {
            if (lm.x < minX) minX = lm.x;
            if (lm.x > maxX) maxX = lm.x;
        }
        const faceWidth = maxX - minX;

        return {
            faceDetected: true,
            faceWidth,
            mouthCenterX,
            mouthCenterY,
            mouthOpenness,
            mouthWidth,
        };
    } catch (e) {
        // The WASM crash can throw synchronously; catch and log without killing the loop.
        console.warn('[face-detector] detection failed, skipping frame:', e);
        return NO_FACE;
    }
}

export function disposeFaceLandmarker() {
    if (landmarkerInstance) {
        landmarkerInstance.close();
        landmarkerInstance = null;
        landmarkerPromise = null;
    }
}