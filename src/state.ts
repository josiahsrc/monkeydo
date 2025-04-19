import { BehaviorSubject } from "rxjs";
import { Snapshot } from "./types";

const isRecording$ = new BehaviorSubject<boolean>(false);
export const getIsRecording = () => isRecording$.value;
export const watchIsRecording = () => isRecording$.asObservable();
export const setIsRecording = (value: boolean) => isRecording$.next(value);

const snapshots$ = new BehaviorSubject<Snapshot[]>([]);
export const getSnapshots = () => snapshots$.value;
export const watchSnapshots = () => snapshots$.asObservable();
export const clearSnapshots = () => snapshots$.next([]);
export const pushSnapshot = (value: Snapshot) => snapshots$.next([...snapshots$.value, value]);

const isProcessing$ = new BehaviorSubject<boolean>(false);
export const getIsProcessing = () => isProcessing$.value;
export const watchIsProcessing = () => isProcessing$.asObservable();
export const setIsProcessing = (value: boolean) => isProcessing$.next(value);

const progress$ = new BehaviorSubject<number>(0);
export const getProgress = () => progress$.value;
export const watchProgress = () => progress$.asObservable();
export const setProgress = (value: number) => progress$.next(value);
