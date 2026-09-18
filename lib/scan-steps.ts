export interface ScanStep {
  id: string;                    // Must match backend field name exactly
  order: number;                 // 1-based
  label: string;                 // Short label for progress bar
  title: string;                 // Full title on capture screen
  instruction: string;           // Detailed user instruction
  cameraHint: string;            // Where to hold the camera
  overlayShape: 'wide-oval' | 'top-rect' | 'bottom-rect' | 'side-oval';
  overlaySide?: 'left' | 'right'; // Only for side-oval
}

export const SCAN_STEPS: ScanStep[] = [
  {
    id: 'front-smile',
    order: 1,
    label: 'Front',
    title: 'Smile at the camera',
    instruction:
      'Smile naturally with your lips apart so your front teeth are fully visible. Hold the phone at eye level, about 30 cm from your face.',
    cameraHint: 'Front camera · eye level',
    overlayShape: 'wide-oval',
  },
  {
    id: 'upper-arch',
    order: 2,
    label: 'Upper',
    title: 'Show your upper teeth',
    instruction:
      'Tilt your head back slightly and open your mouth wide. Point the camera down toward your upper teeth so the roof of your mouth is visible.',
    cameraHint: 'Front camera · above eye level',
    overlayShape: 'top-rect',
  },
  {
    id: 'lower-arch',
    order: 3,
    label: 'Lower',
    title: 'Show your lower teeth',
    instruction:
      'Tilt your head down slightly and open your mouth wide. Point the camera up toward your lower teeth so the floor of your mouth is visible.',
    cameraHint: 'Front camera · below mouth',
    overlayShape: 'bottom-rect',
  },
  {
    id: 'left-bite',
    order: 4,
    label: 'Left side',
    title: 'Show your left side',
    instruction:
      'Turn your head to the right so we can see the teeth on your left side. Bite your back teeth together and smile slightly.',
    cameraHint: 'Front camera · eye level, front-left',
    overlayShape: 'side-oval',
    overlaySide: 'left',
  },
  {
    id: 'right-bite',
    order: 5,
    label: 'Right side',
    title: 'Show your right side',
    instruction:
      'Turn your head to the left so we can see the teeth on your right side. Bite your back teeth together and smile slightly.',
    cameraHint: 'Front camera · eye level, front-right',
    overlayShape: 'side-oval',
    overlaySide: 'right',
  },
];