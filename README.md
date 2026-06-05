# PalmWise AI

AI-powered palm reading dapp on Ritual Chain testnet. Upload a palm photo, get a private on-chain personality reading.

## Stack

- **Frontend**: Next.js 16, TypeScript, TailwindCSS, wagmi v2, RainbowKit
- **AI**: Gemini Vision (palm feature extraction) + GLM-4.7-FP8 via Ritual TEE
- **Privacy**: ECIES-encrypted readings, decrypted only in your browser
- **Blockchain**: Ritual Chain (chain ID 1979)
- **Storage**: Neon Postgres + on-chain provenance hash

## Getting Started

```bash
npm run dev
```

## Contributors

- [Generis2001](https://github.com/Generis2001)
