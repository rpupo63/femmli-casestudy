# How to Connect with Oura

This guide covers the environment variables needed to enable the Oura integration
and where to get the values.

## Required environment variables

Add these to a `.env` file in the project root:

```
OURA_CLIENT_ID=your-client-id
OURA_CLIENT_SECRET=your-client-secret
OURA_REDIRECT_URI=http://localhost:5173/oura/callback
```

## How to get these values

1. Create or log into your Oura account at `https://cloud.ouraring.com/`.
2. Open the Oura developer settings and register a new application.
3. Set the redirect URI to match `OURA_REDIRECT_URI` above.
4. Copy the generated Client ID and Client Secret into your `.env` file.

Notes:
- Keep `OURA_CLIENT_SECRET` private and never commit `.env` to git.
- If you change the redirect URI, update both the Oura app settings and your
  local `.env` file.
