import {localTruckProfileStore} from '../src/storage/AsyncStorageProfileStore';

const mockNative = {getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn()};
jest.mock('@react-native-async-storage/async-storage', () => ({
  createAsyncStorage: jest.fn(() => mockNative),
}));

it('uses the named native database and reports native failures through the store interface', async () => {
  mockNative.getItem.mockResolvedValueOnce(null);
  expect(await localTruckProfileStore.load()).toEqual({status: 'empty'});
  const {createAsyncStorage} = jest.requireMock('@react-native-async-storage/async-storage');
  expect(createAsyncStorage).toHaveBeenCalledWith('truckprofiles');
  mockNative.getItem.mockRejectedValueOnce(new Error('Native module unavailable'));
  expect(await localTruckProfileStore.load()).toEqual({status: 'unavailable'});
  mockNative.removeItem.mockResolvedValueOnce(undefined);
  expect(await localTruckProfileStore.remove()).toEqual({ok: true});
  expect(mockNative.removeItem).toHaveBeenCalledWith('truck-route-savings.saved-profile');
});
