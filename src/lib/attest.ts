import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { catalog, type Entry } from "@/lib/catalog";

/** The canonical SPL Memo program. Nothing custom needs deploying for this. */
export const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export const ATTESTATION_PREFIX = "colonnade:v1:";

/**
 * A stable fingerprint of what the catalogue currently claims.
 *
 * Only the three fields that constitute the claim go in: what it is called,
 * where it can be opened, and when it last moved. Cosmetic edits to a tagline
 * do not invalidate an earlier attestation, which is the behaviour you want —
 * otherwise every copy tweak would break the chain of custody.
 */
export function canonicalPayload(entries: Entry[] = catalog.entries): string {
  const rows = entries
    .map((e) => `${e.slug}\t${e.live ?? ""}\t${e.updatedAt}`)
    .sort()
    .join("\n");
  return `colonnade/v1\ncount=${entries.length}\n${rows}\n`;
}

export async function digestHex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  // Copied into a plain ArrayBuffer: TextEncoder's view is typed as possibly
  // SharedArrayBuffer-backed, which SubtleCrypto will not accept.
  const buffer = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(buffer).set(encoded);
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function catalogDigest(): Promise<string> {
  return digestHex(canonicalPayload());
}

export function memoText(digest: string): string {
  return `${ATTESTATION_PREFIX}${digest}`;
}

/** Builds the one-instruction transaction that writes the digest to devnet. */
export function buildAttestation(payer: PublicKey, digest: string): Transaction {
  const ix = new TransactionInstruction({
    keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memoText(digest), "utf8"),
  });
  return new Transaction().add(ix);
}

export type VerifiedAttestation = {
  signature: string;
  digest: string;
  signer: string | null;
  blockTime: number | null;
  slot: number;
  matchesCurrentCatalog: boolean;
};

/**
 * Pulls a signature back off devnet and reads the memo out of it. Returns null
 * when the transaction is absent, unconfirmed, or simply is not one of ours.
 */
export async function verifySignature(
  connection: Connection,
  signature: string,
  currentDigest: string
): Promise<VerifiedAttestation | null> {
  const tx = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
  if (!tx) return null;

  const logMemo = tx.meta?.logMessages
    ?.map((line) => {
      const marker = line.indexOf(ATTESTATION_PREFIX);
      return marker === -1 ? null : line.slice(marker);
    })
    .find(Boolean);

  const raw = logMemo?.replace(/["\s]+$/, "");
  if (!raw?.startsWith(ATTESTATION_PREFIX)) return null;

  const digest = raw.slice(ATTESTATION_PREFIX.length).trim().slice(0, 64);
  if (!/^[0-9a-f]{64}$/.test(digest)) return null;

  const keys = tx.transaction.message.getAccountKeys();
  const signer = keys.get(0)?.toBase58() ?? null;

  return {
    signature,
    digest,
    signer,
    blockTime: tx.blockTime ?? null,
    slot: tx.slot,
    matchesCurrentCatalog: digest === currentDigest,
  };
}

export function explorerTx(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

export function explorerAddress(address: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=devnet`;
}
