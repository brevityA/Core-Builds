# Clean-room audit materials

This directory documents the public WuPlay APK used to map interoperability behavior. The APK itself is intentionally not included in the update archive because it is an official-release binary and should not be redistributed unless licensing permits it.

## Source

Official latest-release download URL:

```text
https://github.com/wuplayapp/wuplay-releases/releases/latest/download/wuplay-androidtv.apk
```

The analyzed file was version `0.9.0-beta` (version code 43) with SHA-256:

```text
afa5b3599dad10620a532ff7000f40ec01643fd54fdec8bf19902b17b1f42def
```

## Findings used by the adapter

- `POST https://api.wuplay.app/devices/register` serializes device metadata and returns a required string `token`.
- Registration is excluded from the native auth interceptor.
- `GET https://api.wuplay.app/sync/{profileKey}` optionally accepts `since` and uses the profile key in the URL.
- The native interceptor adds `X-Wuplay-Profile-Key` to authenticated backend calls.
- The native client sends `Authorization: Bearer {deviceToken}` when no explicit Authorization header exists.
- `PATCH /sync/{profileKey}/hubs/{hubId}` sends `{detailViewType}`.
- `PATCH /sync/{profileKey}/screens/{screenId}` sends `{viewType}`.
- `PATCH /sync/{profileKey}/profile` accepts the nullable profile fields and the merged `settings` object.
- `SyncResponse.profile.profileKey` is returned by the API and must be removed from exported snapshots.
- The TV client does not provide a confirmed catalog-row create/toggle route; the Genie keeps that operation guided/bookmarklet-based.

## Relevant classes

```text
app.wuplay.androidtv.network.BackendAuthInterceptor
app.wuplay.androidtv.network.BackendHttpClient$registerDevice$2
app.wuplay.androidtv.network.BackendHttpClient$getSync$$inlined$safeApiCall$default$1
app.wuplay.androidtv.network.BackendHttpClient$patchHubLayout$2
app.wuplay.androidtv.network.BackendHttpClient$patchProfile$$inlined$safeApiCall$1
app.wuplay.androidtv.network.DeviceRegisterRequest
app.wuplay.androidtv.network.DeviceRegisterResponse
app.wuplay.androidtv.network.SyncResponse
app.wuplay.androidtv.network.ProfileUpdateRequest
app.wuplay.androidtv.network.HubLayoutUpdateRequest
app.wuplay.androidtv.network.ScreenLayoutUpdateRequest
```

## Audit boundary

This was a clean-room interoperability audit of public client behavior. It does not authorize bypassing authentication, defeating PIN protection, extracting secrets, or automating accounts the operator does not own. No profile key was used for the audit, and no authenticated account request is part of the package validation.
