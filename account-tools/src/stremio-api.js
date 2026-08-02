const API_BASE = 'https://api.strem.io/api/';

export async function post(path, body) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Stremio API error ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function login(email, password) {
  const data = await post('login', { type: 'Login', email, password, facebook: false });
  const authKey = data?.result?.authKey;
  if (!authKey) throw new Error('Login failed — no auth key returned');
  return authKey;
}

export async function loginWithAuthKey(authKey) {
  const data = await post('addonCollectionGet', { type: 'AddonCollectionGet', authKey, update: true });
  if (!data?.result?.addons) throw new Error('Invalid auth key — could not load addons');
  return data;
}

export async function getAddonCollection(authKey) {
  const data = await post('addonCollectionGet', { type: 'AddonCollectionGet', authKey, update: true });
  if (!data?.result?.addons) throw new Error('Failed to load addon collection');
  return data.result.addons;
}

export async function setAddonCollection(authKey, addons) {
  const data = await post('addonCollectionSet', {
    type: 'AddonCollectionSet',
    authKey,
    addons,
  });
  if (data.error) throw new Error(data.error);
  return data;
}
