interface BeatEvent {
  time: number;
  strength?: number;
  impact?: number;
  body?: number;
  combo?: string | null;
  dj?: boolean;
  confidence?: number;
  low?: number;
  snap?: number;
  primary?: boolean;
  camera?: boolean;
  index?: number;
  preview?: boolean;
  pulse?: boolean;
  grid?: boolean;
  kickOnly?: boolean;
  mass?: number;
  sharpness?: number;
  step?: number;
  tone?: string;
  grooveEvidence?: number;
  ghost?: boolean;
  sparse?: boolean;
  introPattern?: boolean;
  _sparseScore?: number;
}

interface PodcastBeatCandidate {
  frame: number;
  hitTone: number;
  lowRel: number;
  lowTone: number;
  power: number;
  raw: number;
  score: number;
  time: number;
}

interface OfflineBeatCandidate {
  bodyTone: number; frame: number; lowTone: number; raw: number;
  score: number; snapTone: number; time: number; vocalTone: number;
}

interface PodcastBeatMapResponse {
  error?: string;
  map?: BeatMap;
  ok?: boolean;
}

type BeatEventLike = number | BeatEvent;
type PlaybackQuality = 'jymaster' | 'hires' | 'lossless' | 'exhigh' | 'standard';

interface BeatMap {
  analysisProfile?: string;
  duration?: number;
  gridStep?: number;
  sectionSteps?: number[];
  visualBeatCount?: number;
  analyzedAt?: number;
  partial?: boolean;
  partialUntilSec?: number;
  cameraBeats?: BeatEventLike[];
  beats?: BeatEventLike[];
  kicks?: BeatEventLike[];
  pulseBeats?: BeatEventLike[];
  tempoSource?: string;
}

interface BeatCameraState {
  lookahead: number;
  nextIdx: number;
  events: CameraBeatEvent[];
  punch: number;
  lastTriggerAt: number;
  lastRealtimeAt: number;
  minInterval: number;
  fallbackMinInterval: number;
  realtimeMinInterval: number;
  realtimeMergeWindow: number;
  attack: number;
  hold: number;
  release: number;
  thetaKick: number;
  phiKick: number;
  radiusKick: number;
  rollKick: number;
  prevAudioTime: number;
  stats: Record<string, number>;
}

interface AudioProfileSample {
  energy: number;
  low: number;
  vocal: number;
  melody: number;
  lowOnset?: number;
  energyOnset?: number;
}

interface RealtimeBeatMiss {
  hit: false;
  score: number;
  low: number;
  body: number;
  vocal?: number;
  snap: number;
  tempoConfidence?: number;
}

interface RealtimeBeatHit {
  hit: true;
  time: number;
  strength: number;
  confidence: number;
  low: number;
  body: number;
  vocal?: number;
  snap: number;
  mass?: number;
  sharpness?: number;
  tempoAssist?: boolean;
  tempoGap?: number;
  tempoConfidence?: number;
  combo?: string;
  score: number;
  lowDominance?: number;
  dj?: boolean;
}

type RealtimeBeatSample = RealtimeBeatMiss | RealtimeBeatHit;

interface CameraBeatEvent extends BeatEvent {
  hit: number;
  start: number;
  attack: number;
  amp: number;
  zoomAmp: number;
  thetaAmp: number;
  phiAmp: number;
  rollAmp: number;
  low?: number;
  body?: number;
  snap?: number;
  mode?: string;
  source?: string;
  confidence?: number;
  mass?: number;
  sharpness?: number;
  preview?: boolean;
  primary?: boolean;
  hold: number;
  release: number;
  phase: number;
}

interface CameraBeatTone {
  zoomAmp: number;
  thetaAmp: number;
  phiAmp: number;
  rollAmp?: number;
  low: number;
  body: number;
  snap: number;
  mode?: string;
  dj?: boolean;
}

declare let mid: number;
declare let treble: number;
declare let prevEnergy: number;
declare let smoothTreb: number;
declare let bassPeak: number;
declare let midPeak: number;
declare let treblePeak: number;
declare let energyPeak: number;
declare let beatOnsetFlag: boolean;

declare function cinemaTrackNameHint(song: PlaylistSong): number;
declare function beatBandRms(
  data: Uint8Array,
  sampleRate: number,
  fftSize: number,
  lowHz: number,
  highHz: number
): number;
