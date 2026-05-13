# Building Zek'thar for macOS

## Prerequisites

- **macOS** (required — native modules compile for your host architecture)
- **Node.js** 20+ and npm
- **Xcode Command Line Tools**: `xcode-select --install`

## Quick Build

```bash
# 1. Install all dependencies (this also rebuilds native modules for Electron)
npm install

# 2. Create your .env with API keys
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY and ANAM_API_KEY

# 3. Build the .dmg
npm run build
```

The `.dmg` lands in `dist/`. Double-click to mount, drag Zek'thar to Applications.

## Build Variants

```bash
npm run build          # .dmg (default, both arm64 + x64)
npm run build:dmg      # .dmg only
npm run build:zip      # .zip only (useful for CI / auto-update)
```

To build for a single architecture (faster):

```bash
# Apple Silicon only
npx electron-builder --mac dmg --arm64

# Intel only
npx electron-builder --mac dmg --x64
```

## How API Keys Work in the Packaged App

The app looks for a `.env` file in two places (in order):

1. **User data directory** (recommended for end users):
   - `~/Library/Application Support/Zek'thar/.env`
2. **Bundled with the app** (for personal builds):
   - The `.env` at the project root gets bundled into the app.

For distribution, do **not** bundle your keys. Instead, have users create the
`.env` file in their Application Support folder. The welcome screen can guide
them through this.

## macOS Permissions

On first launch, macOS will prompt for:

1. **Screen Recording** — required for Zek'thar to see your screen
2. **Microphone** — required for voice conversation
3. **Accessibility** — required for Task mode (mouse/keyboard automation)

If screen recording isn't granted, Zek'thar will tell you and link to System
Settings. You must fully quit (Cmd+Q) and relaunch after granting it.

## Code Signing & Notarization

You need three things from your Apple Developer account:

### Step 1 — Create a Developer ID certificate

1. Open **Keychain Access** on your Mac
2. Go to **Keychain Access → Certificate Assistant → Request a Certificate From
   a Certificate Authority**
3. Enter your email, leave CA Email blank, select **Saved to disk**, click
   Continue
4. Go to [developer.apple.com/account/resources/certificates](https://developer.apple.com/account/resources/certificates)
5. Click **+**, select **Developer ID Application**, upload your CSR
6. Download and double-click the `.cer` to install it in your keychain

### Step 2 — Export as .p12

1. In **Keychain Access**, find the certificate under **My Certificates**
   (named "Developer ID Application: Your Name (TEAMID)")
2. Right-click → **Export** → save as `.p12` with a strong password
3. Remember this password — you'll need it for both local builds and CI

### Step 3 — Create an app-specific password

1. Go to [appleid.apple.com](https://appleid.apple.com) → **Sign-In and
   Security** → **App-Specific Passwords**
2. Click **+**, name it "Zekthar Notarization", click Create
3. Copy the generated password (shown once)

### Step 4 — Find your Team ID

Go to [developer.apple.com/account](https://developer.apple.com/account) →
**Membership Details**. Your Team ID is a 10-character alphanumeric string.

### Local builds (signed + notarized)

```bash
# Set environment variables
export APPLE_ID="your@apple.id"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"

# electron-builder finds the Developer ID cert in your keychain automatically.
# If you have multiple, set CSC_NAME to pick one:
# export CSC_NAME="Developer ID Application: Your Name (XXXXXXXXXX)"

npm run build
```

The build will sign every binary, submit to Apple's notarization service (takes
1–3 minutes), and staple the notarization ticket to the `.dmg`. Users
double-click and it just works — no Gatekeeper warnings.

### CI builds (GitHub Actions)

The repo includes `.github/workflows/release.yml`. Push a version tag and it
builds both arm64 and x64 `.dmg` files, then creates a draft GitHub Release.

**Add these secrets** to your repo (Settings → Secrets and variables → Actions):

| Secret                         | Value                                                  |
|-------------------------------|--------------------------------------------------------|
| `CSC_LINK`                    | Base64-encoded .p12: `base64 -i cert.p12 \| pbcopy`    |
| `CSC_KEY_PASSWORD`            | The password you set when exporting the .p12           |
| `APPLE_ID`                    | Your Apple ID email                                    |
| `APPLE_APP_SPECIFIC_PASSWORD` | The app-specific password from Step 3                  |
| `APPLE_TEAM_ID`               | Your 10-character Team ID                              |

**To release:**

```bash
# Bump version in package.json, then:
git add -A && git commit -m "v1.0.0"
git tag v1.0.0
git push origin main --tags
```

The workflow builds both architectures in parallel (~10 min), creates a **draft**
release with the `.dmg` and `.zip` files attached. Review it on GitHub, edit the
release notes, and click **Publish** when ready.

### Verifying your build

After building locally, verify signing and notarization:

```bash
# Check code signature
codesign --verify --deep --strict "dist/mac-arm64/Zek'thar.app"

# Check notarization
spctl --assess --type execute "dist/mac-arm64/Zek'thar.app"
# Should print: accepted

# Check stapled ticket
stapler validate "dist/Zekthar-1.0.0-arm64.dmg"
```

## Development

```bash
# Run in dev mode (server + Electron, both with hot reload)
npm run dev

# Run just the server
npm run dev:server
```

## Troubleshooting

**`@nut-tree-fork/nut-js` fails to build:**
Make sure Xcode CLT is installed. On Apple Silicon, you may need Rosetta:
`softwareupdate --install-rosetta`.

**Screen capture returns blank:**
Grant Screen Recording permission in System Settings → Privacy & Security →
Screen & System Audio Recording, then fully quit and relaunch.

**"App is damaged" on open:**
Run `xattr -cr /Applications/Zek\'thar.app` to strip the quarantine flag.
