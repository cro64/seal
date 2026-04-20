# Encryption

Client-side encryption for **password-protected share links**. Document content, theme, and mode are encrypted in the browser and stored in the URL hash; only someone with the password can decrypt and view the content.

## Overview

- **Purpose**: Share a link that carries encrypted document + theme + mode; the recipient must enter the correct password to open it.
- **Scope**: All encryption/decryption happens in the browser using the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API). No plaintext or keys are sent to any server.
- **Implementation**: `src/lib/encrypt.js` exports `encryptPayload` and `decryptPayload`; the app uses them when building/parsing the URL hash (see `src/lib/hash.js` and `src/App.svelte`).

## Algorithms and parameters

| Component | Choice | Notes |
|-----------|--------|--------|
| **Symmetric cipher** | AES-256-GCM | Authenticated encryption; 128-bit authentication tag. |
| **Key derivation** | PBKDF2 with SHA-256 | Password → key material; salt is random per encryption. |
| **PBKDF2 iterations** | 100,000 | Stored in code (`PBKDF2_ITERATIONS` in `encrypt.js`). |
| **Salt length** | 16 bytes | New random salt per encryption (`SALT_LEN`). |
| **IV (nonce) length** | 12 bytes | New random IV per encryption (`IV_LEN`). GCM standard. |
| **Encoding** | Base64 | Final blob is base64 for safe use in URL hash. |

Constants are defined at the top of `src/lib/encrypt.js`:

- `SALT_LEN = 16`
- `IV_LEN = 12`
- `PBKDF2_ITERATIONS = 100000`

## Payload format and compression

The payload is a JSON object with up to three fields. Before encryption, this JSON string is **gzip-compressed** (using the same [Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API) as non-encrypted links) so the ciphertext—and thus the URL—is shorter.

The **plaintext** (before compression) is a JSON object with up to three fields:

| Field | Meaning |
|-------|--------|
| `s` | Theme/style config (preset id string or `{ preset, overrides }` object). |
| `d` | Document content (markdown string). |
| `m` | Mode: `"edit"` or `"view"`. |

Example: `{ "s": { "preset": "default", "overrides": {} }, "d": "# Hello", "m": "view" }`.

## Encrypted blob format

The encrypted value stored in the URL is a **single base64 string** that decodes to a byte sequence:

```
[ salt (16 bytes) | iv (12 bytes) | ciphertext (variable) ]
```

- **Salt**: 16 random bytes, used as PBKDF2 salt for key derivation.
- **IV**: 12 random bytes, used as AES-GCM nonce.
- **Ciphertext**: Output of AES-GCM (includes the 16-byte authentication tag). The plaintext fed to AES-GCM is the gzip-compressed JSON payload, so the ciphertext is shorter than raw JSON for typical documents.

So: `decoded = salt || iv || ciphertext`, then the whole thing is base64-encoded for the hash.

## URL hash format

- **Normal (unencrypted) link**: `#s=...&d=...&m=...` (style, document, mode; document/style may be LZ-compressed).
- **Encrypted link**: `#e=<base64-blob>` where `<base64-blob>` is the encrypted blob above, URI-encoded in the hash.

Parsing is in `parseHash()` in `src/lib/hash.js`: if parameter `e` is present, the app treats the page as encrypted and shows the password prompt; after decryption it gets `s`, `d`, and `m` from the decrypted payload.

## API (encrypt.js)

### `encryptPayload(payload, password)`

- **Arguments**:
  - `payload`: `{ s?, d?, m? }` (theme, document, mode).
  - `password`: string (user-chosen).
- **Returns**: `Promise<string>` — base64-encoded blob (salt + iv + ciphertext).
- **Process**: Generate random salt and IV → derive AES-256 key with PBKDF2 → gzip-compress `JSON.stringify(payload)` → encrypt compressed bytes with AES-GCM → concatenate salt, iv, ciphertext → base64.

### `decryptPayload(encoded, password)`

- **Arguments**:
  - `encoded`: base64 string (the blob from the URL).
  - `password`: string (same as used when encrypting).
- **Returns**: `Promise<{ s?, d?, m? }>` — decrypted payload (parsed JSON).
- **Process**: Decode base64 → decrypt ciphertext with AES-GCM → gzip-decompress to string → `JSON.parse`.
- **Throws**: If data is too short, decoding fails, or authentication fails (e.g. wrong password).

## User flow

1. **Creating an encrypted link**  
   User chooses “Encrypted” in the share menu → enters password → app builds `payload = { s: themeConfig, d: markdown, m: mode }`, calls `encryptPayload(payload, password)`, then `buildHash({ encrypted: blob })` → copies URL with `#e=<blob>`.

2. **Opening an encrypted link**  
   App reads hash; `parseHash()` returns `e` set. App shows a password prompt; on submit it calls `decryptPayload(encryptedBlob, password)`. On success it applies `s`, `d`, `m` and replaces the hash with the normal `#s=...&d=...&m=...` form.

## Security notes

- **Key derivation**: PBKDF2 with 100k iterations and a unique salt per encryption reduces risk of brute-force and rainbow tables; the password is never stored.
- **Authenticated encryption**: AES-GCM ensures ciphertext is not tampered with; wrong password or corrupted blob will cause decrypt to throw.
- **No server involvement**: Encryption keys and plaintext stay in the client; only the URL (including the encrypted blob) is shared (e.g. via clipboard or messaging).
- **URL length**: The payload is gzip-compressed before encryption, which significantly shortens the blob for text-heavy documents. Very long documents can still produce a long URL; some environments limit URL length, so “Try a shorter document” is suggested on encryption failure.
- **Password handling**: The app does not store or transmit the password; it is only used in memory for `encryptPayload` / `decryptPayload`.

## Compression

- **Encrypted links**: The JSON payload is gzip-compressed before encryption so the `#e=...` blob is shorter and easier to share.
- **Non-encrypted links**: The style (`s`) and document (`d`) parameters in the URL hash are compressed with **gzip** (native [Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API)) and stored as base64url.

## Files involved

| File | Role |
|------|------|
| `src/lib/encrypt.js` | Key derivation, `encryptPayload`, `decryptPayload`. |
| `src/lib/hash.js` | Gzip compress for hash params; `parseHash` (reads `e`), `buildHash` (writes `#e=...`). |
| `src/App.svelte` | Share encrypted flow, decrypt overlay, calls to encrypt/decrypt and hash. |
| `src/lib/ShareDropdown.svelte` | UI entry for “Encrypted” share option. |
