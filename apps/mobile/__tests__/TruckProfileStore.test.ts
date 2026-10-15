import {JsonTruckProfileStore, type KeyValueStorage} from '../src/storage/TruckProfileStore';

const profileFixture = (vehicleType = 'rigid-truck') => ({schemaVersion: 1, vehicleType,
  name: 'Synthetic', overallHeightMeters: '4.1148', overallWidthMeters: '2.5908',
  overallLengthMeters: '18.288', currentGrossMassKilograms: '36287.38960000000001', totalAxleCount: 5});

function fixture(raw: string | null = null) {
  const data = new Map<string, string>();
  const port = {
    getItem: jest.fn(async () => raw),
    setItem: jest.fn(async (key: string, value: string) => {data.set(key, value); raw = value;}),
    removeItem: jest.fn(async (key: string) => {data.delete(key); raw = null;}),
  } satisfies KeyValueStorage;
  return {port, data, store: new JsonTruckProfileStore(port)};
}

for (const type of ['rigid-truck', 'tractor-semitrailer']) {
  it(`round-trips ${type} through a new store instance without losing decimal digits`, async () => {
    const {store, port, data} = fixture();
    data.set('other-feature', 'keep');
    expect(await store.load()).toEqual({status: 'empty'});
    const profile = profileFixture(type);
    expect(await store.save(profile)).toEqual({ok: true});
    expect(await new JsonTruckProfileStore(port).load()).toEqual({status: 'loaded', profile});
    expect(await store.remove()).toEqual({ok: true});
    expect(data.get('other-feature')).toBe('keep');
    expect(port.removeItem).toHaveBeenCalledWith(port.setItem.mock.calls[0]![0]);
    expect(await store.load()).toEqual({status: 'empty'});
  });
}

it('refuses invalid writes without touching the saved snapshot', async () => {
  const {store, port} = fixture();
  await store.save(profileFixture());
  const before = await store.load();
  expect(await store.save({...profileFixture(), currentGrossMassKilograms: 80000})).toEqual({ok: false, code: 'invalid-profile'});
  expect(port.setItem).toHaveBeenCalledTimes(1);
  expect(await store.load()).toEqual(before);
});

it('keeps malformed, incompatible and unknown-field data intact on restore', async () => {
  for (const raw of ['not-json', 'null', '[]', '{}',
    JSON.stringify({storageVersion: 1, profile: {...profileFixture(), vehicleType: 'car'}}),
    JSON.stringify({storageVersion: 1, profile: profileFixture(), extra: true}),
    JSON.stringify({storageVersion: 1, profile: {...profileFixture(), schemaVersion: 2}})]) {
    const {store, port} = fixture(raw);
    expect(await store.load()).toEqual({status: 'invalid-data'});
    expect(port.setItem).not.toHaveBeenCalled(); expect(port.removeItem).not.toHaveBeenCalled();
  }
  const {store} = fixture(JSON.stringify({storageVersion: 2, profile: profileFixture()}));
  expect(await store.load()).toEqual({status: 'unsupported-version'});
});

it('reports IO failures without leaking storage errors or claiming success', async () => {
  const {store, port} = fixture();
  port.getItem.mockRejectedValueOnce(new Error('private storage detail'));
  port.setItem.mockRejectedValueOnce(new Error('private storage detail'));
  port.removeItem.mockRejectedValueOnce(new Error('private storage detail'));
  expect(await store.load()).toEqual({status: 'unavailable'});
  expect(await store.save(profileFixture())).toEqual({ok: false, code: 'unavailable'});
  expect(await store.remove()).toEqual({ok: false, code: 'unavailable'});
});
