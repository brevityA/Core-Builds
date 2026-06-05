# Resetting Your AIOStreams Instance

Sometimes a template import goes wrong, credentials get stuck in a broken state, or you simply want to start completely fresh. This guide covers every reset scenario from a soft config wipe to a full account deletion.

---

## Before You Reset -- Back Up First

If your instance is still accessible, export your current configuration before doing anything else. You can always re-import a backup if the reset causes more problems than it solves.

1. Open your AIOStreams dashboard
2. Go to the **Template** section
3. Tap the **Export** icon (box with outward arrow)
4. Save the JSON file somewhere safe

---

## Choosing the Right Reset

| Situation | What to do |
|---|---|
| Template imported wrong settings | Soft reset -- re-import over existing config |
| Config is broken but you can still log in | Soft reset or hard reset |
| Forgotten password | Hard reset -- Delete User |
| Stremio showing errors after config change | Re-install manifest only |
| Want to switch templates entirely | Soft reset -- re-import new template |
| Something is fundamentally broken | Hard reset -- Delete User |

---

## Option 1 -- Soft Reset (Re-Import a Template)

Re-importing a template replaces your entire configuration without deleting your account or credentials. This is the quickest fix for most problems.

1. Open your AIOStreams dashboard
2. Go to the **Template** section
3. Tap the **Import** icon
4. Paste the raw GitHub URL for your chosen template or select a local file
5. Enter your credentials when prompted
6. Tap **Load Template**
7. Review that services and addons look correct
8. Tap **Save**
9. Copy the new manifest URL and reinstall in Stremio or WuPlay

> The re-import replaces all filter settings, addons, sort criteria, and formatter settings. Your password is not affected.

---

## Option 2 -- Hard Reset (Delete User)

Deletes your entire account and configuration. Use this when a soft reset is not enough or when you have forgotten your password.

### Step 1 -- Note your manifest URL (if possible)

If Stremio still has the addon installed, you will need to uninstall it after the reset. Having the old URL makes this easier, but it is not required.

### Step 2 -- Delete your user account

1. Open your AIOStreams host in a browser
2. Scroll to the very bottom of the configuration page
3. Tap **Delete User**
4. Confirm the deletion

> This permanently removes your account, password, and all saved configuration. It cannot be undone.

### Step 3 -- Create a new account

1. Refresh the page -- you will be returned to the initial setup screen
2. Enter a new password (or the same one)
3. Tap **Create User** or **Register**

### Step 4 -- Re-import your template

Follow the steps in the [Import Guide](./IMPORT_GUIDE.md) to load a fresh template and enter your API keys.

### Step 5 -- Uninstall the old addon from Stremio

1. Open Stremio
2. Go to **Addons**
3. Find the old AIOStreams entry and tap **Uninstall**
4. Tap **Install** on the new manifest URL from your fresh setup

---

## Option 3 -- Password Reset

If you have forgotten your password and cannot log in, a full Delete User is the only option on most hosted instances -- there is no password recovery email flow. Follow Option 2 above.

> On self-hosted Docker instances, you can reset the password by clearing the relevant environment variable or database entry and restarting the container. Check your host's documentation for the exact procedure.

---

## Reinstalling in Stremio After Any Reset

Any time you reset or change your AIOStreams configuration, your manifest URL changes. The old URL in Stremio will stop returning results. You must reinstall.

**Stremio:**
1. Go to Addons
2. Find the old AIOStreams entry -- tap Uninstall
3. Open your AIOStreams dashboard and copy the new manifest URL
4. Paste it into Stremio's addon search bar or tap Install from the dashboard

**WuPlay:**
1. Open WuPlay configurer
2. Navigate to Add-ons
3. Remove the old AIOStreams manifest URL
4. Paste the new URL and confirm

---

## Reinstalling in Stremio After a Soft Reset

If you did a soft reset (re-imported a template) and your manifest URL did not change, you do not need to reinstall. Stremio will pick up the updated configuration automatically on the next stream request. A full app restart speeds this up.

---

## Common Problems After a Reset

**Import fails with HTTP 404**
The template URL is wrong or the file does not exist at that path on GitHub. Check the URL carefully -- folder names and filenames are case-sensitive.

**Import fails with "Invalid template"**
The JSON file is malformed. Validate it at [jsonlint.com](https://jsonlint.com) before importing.

**Stremio still showing the old stream list**
The old manifest is still installed. Uninstall it from the Stremio addon manager and reinstall with the new URL.

**Credentials modal does not appear after re-import**
Some hosts cache the credential state. Try logging out and back in, or clearing your browser cache, then re-importing.

**NZBGeek still not working after reset (Hybrid template)**
The NZBGeek API key is not entered in the credentials modal -- it must be configured in the Addons section after loading. See the [Import Guide](./IMPORT_GUIDE.md) for the full NZBGeek setup step.

---

## Host-Specific Notes

| Host | Delete User location | Password reset |
|---|---|---|
| ElfHosted | Bottom of config page | Delete User and re-register |
| Yeb's (ForTheWeak) | Bottom of config page | Delete User and re-register |
| Midnight's | Bottom of config page | Delete User and re-register |
| Viren's | Bottom of config page | Delete User and re-register |
| Kuu's | Bottom of config page | Delete User and re-register |
| Self-hosted Docker | Delete User in UI or wipe volume | Edit environment variables |

---

*Return to the [Main README](../README.md) -- [Import Guide](./IMPORT_GUIDE.md) -- [Advanced Editing](./ADVANCED_EDITING.md)*
