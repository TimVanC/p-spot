import { create } from 'zustand';
import { ExifData, Privacy, ScoreResult } from '../types/scoring';

interface SubmitState {
  imageUri: string | null;
  imageBase64: string | null;
  exifData: ExifData | null;
  privacy: Privacy;
  scoreResult: ScoreResult | null;
  submittedSpotId: string | null;

  setImage: (uri: string, base64: string) => void;
  setExifData: (data: ExifData) => void;
  setPrivacy: (privacy: Privacy) => void;
  setScoreResult: (result: ScoreResult) => void;
  setSubmittedSpotId: (id: string) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  imageUri: null,
  imageBase64: null,
  exifData: null,
  privacy: 'public' as Privacy,
  scoreResult: null,
  submittedSpotId: null,
};

export const useSubmitStore = create<SubmitState>((set) => ({
  ...INITIAL_STATE,

  setImage: (uri, base64) => set({ imageUri: uri, imageBase64: base64 }),
  setExifData: (data) => set({ exifData: data }),
  setPrivacy: (privacy) => set({ privacy }),
  setScoreResult: (result) => set({ scoreResult: result }),
  setSubmittedSpotId: (id) => set({ submittedSpotId: id }),
  reset: () => set(INITIAL_STATE),
}));
