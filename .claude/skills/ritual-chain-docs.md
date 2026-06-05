# Ritual Chain Documentation Skill

This skill provides full reference documentation for building on Ritual Chain.

## Chain Quick Reference

| Field | Value |
|-------|-------|
| Chain ID | `1979` |
| Currency | `RITUAL` (18 decimals, testnet) |
| Block Time | ~350ms |
| RPC (HTTP) | `https://rpc.ritualfoundation.org` |
| Explorer | `https://explorer.ritualfoundation.org` |
| Faucet | `https://faucet.ritualfoundation.org` |

## System Contract Addresses

| Contract | Address |
|----------|---------|
| RitualWallet | `0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948` |
| AsyncJobTracker | `0xC069FFCa0389f44eCA2C626e55491b0ab045AEF5` |
| TEEServiceRegistry | `0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F` |
| Scheduler | `0x56e776BAE2DD60664b69Bd5F865F1180ffB7D58B` |
| SecretsAccessControl | `0xf9BF1BC8A3e79B9EBeD0fa2Db70D0513fecE32FD` |
| AsyncDelivery | `0x5A16214fF555848411544b005f7Ac063742f39F6` |
| AgentHeartbeat | `0xEF505E801f1Db392B5289690E2ffc20e840A3aCa` |
| ModelPricingRegistry | `0x7A85F48b971ceBb75491b61abe279728F4c4384f` |

## Precompile Addresses

| Precompile | Address | Type |
|------------|---------|------|
| ONNX (Classical ML) | `0x0800` | Synchronous |
| HTTP | `0x0801` | Short-Running Async (SPC) |
| LLM Inference | `0x0802` | Short-Running Async (SPC) |
| JQ Query | `0x0803` | Synchronous |
| Long-Running HTTP | `0x0805` | Two-Phase Async |
| ZK Proofs | `0x0806` | Two-Phase Async |
| FHE Inference | `0x0807` | Two-Phase Async |
| Image Generation | `0x0818` | Two-Phase Async |
| Audio Generation | `0x0819` | Two-Phase Async |
| Video Generation | `0x081A` | Two-Phase Async |
| DKMS Keys | `0x081B` | Short-Running Async (SPC) |
| Sovereign Agent | `0x080C` | Two-Phase Async |
| Persistent Agent | `0x0820` | Two-Phase Async |
| Ed25519 Verify | `0x0009` | Synchronous |
| SECP256R1 (P-256) | `0x0100` | Synchronous |

## Execution Models

1. **Synchronous** — result in same call frame (ONNX, Ed25519, SECP256R1, JQ)
2. **Short-Running Async (SPC)** — result via `_executePrecompile()` in same tx (HTTP, LLM, DKMS). ONE per tx.
3. **Two-Phase Async** — Phase 1 commits, Phase 2 delivers via callback to consumer contract (Agents, Long HTTP, ZK, FHE, Multimodal). ONE per tx.

## LLM Precompile Key Facts

- Address: `0x0802`
- Model: `zai-org/GLM-4.7-FP8` (64K context, MIT license, hosted in TEE)
- No API keys required
- 25-field ABI (mirrors OpenAI chat completion API)
- Key fields: `messagesJson` (5), `model` (6), `temperature` (22, ×1000), `convoHistory` (29, required)
- Supports SSE streaming with EIP-712 auth
- Response: `(bool hasError, bytes completionData, bytes modelMetadata, string errorMessage, (string,string,string) updatedConvoHistory)`
- `convoHistory` required: e.g. `["gcs", "convos/session.jsonl", "GCS_CREDS"]`

## HTTP Precompile Key Facts

- Address: `0x0801`
- 13-field ABI
- Response: `(uint16 statusCode, string[] headerKeys, string[] headerValues, bytes body, string errorMessage)`
- Body is `bytes`, not `string`
- Set `piiEnabled=true` + `encryptedSecrets` for `{{SECRET_NAME}}` template substitution

## ONNX (Classical ML) Key Facts

- Address: `0x0800`
- Synchronous, no RitualWallet needed
- Model ID format: `hf/owner/repo/file.onnx@<40-char-commit-hash>` (branch names rejected)
- 7-field ABI

## RitualWallet

Must fund BEFORE submitting async calls. Two-phase precompiles check the EOA's wallet, not the contract's.

```solidity
IRitualWallet(0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948).deposit{value: 0.01 ether}(100);
```

## Consumer Patterns

All async contracts should extend `PrecompileConsumer` and use `_executePrecompile()`.

Two-phase callbacks MUST verify: `require(msg.sender == 0x5A16214fF555848411544b005f7Ac063742f39F6, "unauthorized");`

## Viem Chain Config

```typescript
import { defineChain } from "viem";

export const ritualChain = defineChain({
  id: 1979,
  name: "Ritual Chain",
  nativeCurrency: { name: "RITUAL", symbol: "RITUAL", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.ritualfoundation.org"] },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://explorer.ritualfoundation.org" },
  },
});
```

## Key Constraints

- One async precompile call per transaction (SPC or two-phase, any combination)
- One pending async job per EOA at a time (sender lock, enforced by AsyncJobTracker)
- LLM: `convoHistory` field is required
- LLM: PII mode and streaming are mutually exclusive
- ONNX: use full commit hash in model ID, not branch names
- ECIES nonce MUST be 12 bytes (most common integration failure)
- SECP256R1 returns `uint256` (1=valid, 0=invalid), NOT `bool`

## Secrets (ECIES)

Encrypt API keys to executor's public key from TEEServiceRegistry. Reference as `{{SECRET_NAME}}` in URLs/headers. Set `piiEnabled=true`.

```typescript
import { encrypt } from "eciesjs";
const encrypted = encrypt(executorPubKey, Buffer.from(apiKey, "utf-8"));
```

## For PalmWise AI Specifically

Palm image analysis flow on Ritual:
1. Frontend sends palm image to backend
2. Backend encodes image as ONNX input tensor (palm feature detection model) OR uses HTTP precompile to call vision API
3. LLM precompile (`0x0802`) generates personality reading from detected features
4. Results returned to frontend

Relevant precompiles: `0x0802` (LLM for readings), `0x0800` (ONNX for palm feature detection), `0x0801` (HTTP for external vision APIs)
