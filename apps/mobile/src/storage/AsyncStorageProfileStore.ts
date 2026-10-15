import {JsonTruckProfileStore, type KeyValueStorage} from './TruckProfileStore';

// Lazy initialization lets a missing native module become a handled storage error.
const open = async () => {
  // Defer native module loading until an explicit storage action.
  const {createAsyncStorage} = require('@react-native-async-storage/async-storage') as typeof import('@react-native-async-storage/async-storage');
  return createAsyncStorage('truckprofiles');
};
const adapter: KeyValueStorage = {
  getItem: async key => (await open()).getItem(key),
  setItem: async (key, value) => (await open()).setItem(key, value),
  removeItem: async key => (await open()).removeItem(key),
};
export const localTruckProfileStore = new JsonTruckProfileStore(adapter);
