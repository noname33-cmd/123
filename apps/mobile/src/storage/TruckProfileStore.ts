import {parseTruckProfile, type TruckProfile} from '@truck/truck-profile';

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
export type LoadProfileResult = {status: 'loaded'; profile: TruckProfile} |
  {status: 'empty' | 'invalid-data' | 'unsupported-version' | 'unavailable'};
export type WriteProfileResult = {ok: true} | {ok: false; code: 'invalid-profile' | 'unavailable'};
export interface TruckProfileStore {
  load(): Promise<LoadProfileResult>;
  save(input: unknown): Promise<WriteProfileResult>;
  remove(): Promise<WriteProfileResult>;
}

const key = 'truck-route-savings.saved-profile';

/** One validated SI snapshot; never stores credentials, locations or unvalidated drafts. */
export class JsonTruckProfileStore implements TruckProfileStore {
  constructor(private readonly storage: KeyValueStorage) {}
  async load(): Promise<LoadProfileResult> {
    let raw: string | null;
    try {raw = await this.storage.getItem(key);} catch {return {status: 'unavailable'};}
    if (raw === null) {return {status: 'empty'};}
    let envelope: unknown;
    try {envelope = JSON.parse(raw);} catch {return {status: 'invalid-data'};}
    if (typeof envelope !== 'object' || envelope === null || Array.isArray(envelope)) {
      return {status: 'invalid-data'};
    }
    const record = envelope as Record<string, unknown>;
    if (!Object.hasOwn(record, 'storageVersion')) {return {status: 'invalid-data'};}
    if (record.storageVersion !== 1) {return {status: 'unsupported-version'};}
    if (Object.keys(record).length !== 2 || !Object.hasOwn(record, 'profile')) {return {status: 'invalid-data'};}
    const parsed = parseTruckProfile(record.profile);
    return parsed.ok ? {status: 'loaded', profile: parsed.value} : {status: 'invalid-data'};
  }
  async save(input: unknown): Promise<WriteProfileResult> {
    const parsed = parseTruckProfile(input);
    if (!parsed.ok) {return {ok: false, code: 'invalid-profile'};}
    try {
      await this.storage.setItem(key, JSON.stringify({storageVersion: 1, profile: parsed.value}));
      return {ok: true};
    } catch {return {ok: false, code: 'unavailable'};}
  }
  async remove(): Promise<WriteProfileResult> {
    try {await this.storage.removeItem(key); return {ok: true};}
    catch {return {ok: false, code: 'unavailable'};}
  }
}
