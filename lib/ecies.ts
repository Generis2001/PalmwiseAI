// ECIES helpers for Ritual Chain secret encryption
// CRITICAL: symmetricNonceLength MUST be 12 — 16 causes silent failures
import { ECIES_CONFIG, encrypt, decrypt, PrivateKey } from "eciesjs";
import type { Hex } from "viem";

ECIES_CONFIG.symmetricNonceLength = 12;

export function eciesEncrypt(pubKeyHex: string, plaintext: string): Hex {
  // pubKeyHex may be compressed (33 bytes) or uncompressed (65 bytes)
  const pubKeyBytes = Buffer.from(pubKeyHex.replace(/^0x/, ""), "hex");
  const cipherBytes = encrypt(pubKeyBytes, Buffer.from(plaintext, "utf-8"));
  return `0x${Buffer.from(cipherBytes).toString("hex")}`;
}

export function eciesDecrypt(privKeyHex: Hex, cipherHex: Hex): string {
  const privKeyBytes = Uint8Array.from(
    Buffer.from(privKeyHex.replace(/^0x/, ""), "hex")
  );
  const cipherBytes = Uint8Array.from(
    Buffer.from(cipherHex.replace(/^0x/, ""), "hex")
  );
  const decrypted = decrypt(privKeyBytes, cipherBytes);
  return Buffer.from(decrypted).toString("utf-8");
}

// Returns raw decrypted bytes as Hex (for ABI-encoded payloads, not UTF-8 strings)
export function eciesDecryptRaw(privKeyHex: Hex, cipherHex: Hex): Hex {
  const privKeyBytes = Uint8Array.from(
    Buffer.from(privKeyHex.replace(/^0x/, ""), "hex")
  );
  const cipherBytes = Uint8Array.from(
    Buffer.from(cipherHex.replace(/^0x/, ""), "hex")
  );
  const decrypted = decrypt(privKeyBytes, cipherBytes);
  return `0x${Buffer.from(decrypted).toString("hex")}`;
}

export function generateEphemeralKeypair(): {
  publicKey: Hex; // 65-byte uncompressed (0x04 prefix + 64 bytes) for Ritual
  privateKey: Hex;
} {
  const privateKey = new PrivateKey();
  // toBytes(false) = uncompressed 65-byte secp256k1 public key (0x04 prefix)
  const pubKeyBytes = privateKey.publicKey.toBytes(false);
  return {
    publicKey: `0x${Buffer.from(pubKeyBytes).toString("hex")}`,
    privateKey: `0x${Buffer.from(privateKey.secret as Uint8Array).toString("hex")}`,
  };
}
