"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { Check, Copy, ExternalLink, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  catalogDigest,
  buildAttestation,
  verifySignature,
  explorerTx,
  explorerAddress,
  memoText,
  MEMO_PROGRAM_ID,
  type VerifiedAttestation,
} from "@/lib/attest";
import { counts, catalog } from "@/lib/catalog";

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="break-all font-mono text-[0.78rem] text-brass-300">{children}</span>;
}

function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
      aria-label="Copy to clipboard"
      className="grid size-7 shrink-0 place-items-center rounded-lg border border-white/10 text-stone-300 transition hover:border-white/25 hover:text-stone-50"
    >
      {done ? <Check className="size-3.5 text-verdigris-400" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-white/8 bg-shadow-800/50 p-6"
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-7 place-items-center rounded-full border border-brass-400/40 bg-brass-400/12 font-mono text-[0.75rem] text-brass-300">
          {n}
        </span>
        <h2 className="font-display text-[1.15rem] text-stone-50">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}

export function VerifyPanel() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();

  const [digest, setDigest] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<VerifiedAttestation | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  useEffect(() => {
    catalogDigest().then(setDigest).catch(() => setDigest(null));
  }, []);

  async function anchor() {
    if (!publicKey || !digest) return;
    setSigning(true);
    setError(null);
    try {
      const tx = buildAttestation(publicKey, digest);
      const sig = await sendTransaction(tx, connection);
      const latest = await connection.getLatestBlockhash("confirmed");
      await connection.confirmTransaction({ signature: sig, ...latest }, "confirmed");
      setSignature(sig);
      setQuery(sig);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The wallet refused the transaction.");
    } finally {
      setSigning(false);
    }
  }

  async function check() {
    const sig = query.trim();
    if (!sig || !digest) return;
    setChecking(true);
    setCheckError(null);
    setResult(null);
    try {
      const found = await verifySignature(connection, sig, digest);
      if (!found) {
        setCheckError(
          "Devnet has no confirmed Colonnade attestation under that signature. Devnet is also pruned periodically, so older ones can disappear."
        );
      } else {
        setResult(found);
      }
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : "Could not reach the devnet endpoint.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="mx-auto w-[min(52rem,92vw)] pb-20 pt-12">
      <header className="mb-10">
        <h1 className="font-display text-[clamp(2rem,4.6vw,3rem)] font-light leading-tight tracking-[-0.025em] text-stone-50">
          Proof the shelf has not moved
        </h1>
        <p className="mt-4 text-[0.98rem] leading-relaxed text-stone-200/85">
          A catalogue is only worth something if it cannot be quietly edited after the fact. Every
          listing here is folded into one SHA-256 fingerprint. Write that fingerprint to Solana
          devnet and it acquires a timestamp nobody controls, including me.
        </p>
      </header>

      <div className="space-y-5">
        <Step n={1} title="Fold the catalogue into one number">
          <p className="mb-4 text-[0.88rem] leading-relaxed text-stone-200/85">
            Three fields per listing go into the hash: its slug, the address it opens at, and when
            it last changed. Wording and layout are left out on purpose, so fixing a typo does not
            invalidate an attestation you made last week.
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-shadow-900/70 p-3.5">
            {digest ? <Mono>{digest}</Mono> : <span className="text-[0.8rem] text-stone-300">Computing…</span>}
            {digest ? <CopyButton value={digest} /> : null}
          </div>
          <p className="mt-3 text-[0.76rem] text-stone-300">
            Computed in your browser, right now, from {counts.listed} listings. Nothing was fetched
            to produce it.
          </p>
        </Step>

        <Step n={2} title="Write it to devnet">
          <p className="mb-4 text-[0.88rem] leading-relaxed text-stone-200/85">
            The fingerprint goes into a single SPL Memo instruction as{" "}
            <span className="font-mono text-[0.8rem] text-stone-100">colonnade:v1:&lt;digest&gt;</span>.
            No program was deployed for this and no account is created — the memo lives in the
            transaction, and the transaction is the record.
          </p>

          {publicKey ? (
            <button
              onClick={anchor}
              disabled={signing || !digest}
              className="inline-flex items-center gap-2 rounded-xl bg-brass-400 px-5 py-2.5 text-[0.88rem] font-medium text-shadow-900 transition hover:bg-brass-300 disabled:opacity-60"
            >
              {signing ? <Loader2 className="size-4 animate-spin" /> : null}
              {signing ? "Waiting for confirmation" : "Sign the attestation"}
            </button>
          ) : (
            <button
              onClick={() => setVisible(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/12 px-5 py-2.5 text-[0.88rem] text-stone-100 transition hover:border-white/30 hover:bg-white/4"
            >
              Connect a devnet wallet first
            </button>
          )}

          <p className="mt-3 text-[0.76rem] text-stone-300">
            Devnet SOL only. If the wallet is empty, any devnet faucet will top it up — including{" "}
            <a href="https://spigot.vercel.app" target="_blank" rel="noreferrer noopener" className="text-brass-300 hover:underline">
              Spigot
            </a>
            , which is itself on this shelf.
          </p>

          {error ? (
            <p className="mt-4 rounded-xl border border-red-500/25 bg-red-500/8 p-3 text-[0.82rem] text-red-300">
              {error}
            </p>
          ) : null}

          {signature ? (
            <div className="mt-4 rounded-xl border border-verdigris-500/30 bg-verdigris-500/8 p-4">
              <p className="mb-2 flex items-center gap-2 text-[0.85rem] text-verdigris-400">
                <ShieldCheck className="size-4" />
                Confirmed on devnet.
              </p>
              <div className="flex items-center gap-2">
                <Mono>{signature}</Mono>
                <CopyButton value={signature} />
              </div>
              <a
                href={explorerTx(signature)}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-3 inline-flex items-center gap-1.5 text-[0.82rem] text-brass-300 hover:underline"
              >
                Open in Solana Explorer
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          ) : null}
        </Step>

        <Step n={3} title="Check any attestation against today's shelf">
          <p className="mb-4 text-[0.88rem] leading-relaxed text-stone-200/85">
            Paste a signature. The memo is pulled back off devnet and compared with the fingerprint
            computed above. Agreement means the catalogue is byte-for-byte what it was when that
            transaction landed.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && check()}
              placeholder="Transaction signature"
              spellCheck={false}
              className="w-full rounded-xl border border-white/10 bg-shadow-900/70 px-3.5 py-2.5 font-mono text-[0.8rem] text-stone-50 outline-none transition placeholder:font-sans placeholder:text-stone-300/60 focus:border-brass-400/50"
            />
            <button
              onClick={check}
              disabled={checking || !query.trim()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/12 px-5 py-2.5 text-[0.88rem] text-stone-100 transition hover:border-white/30 hover:bg-white/4 disabled:opacity-50"
            >
              {checking ? <Loader2 className="size-4 animate-spin" /> : null}
              Check
            </button>
          </div>

          {checkError ? (
            <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/8 p-3 text-[0.82rem] text-amber-200">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              {checkError}
            </p>
          ) : null}

          {result ? (
            <div
              className={`mt-4 rounded-xl border p-4 ${
                result.matchesCurrentCatalog
                  ? "border-verdigris-500/30 bg-verdigris-500/8"
                  : "border-amber-500/30 bg-amber-500/8"
              }`}
            >
              <p
                className={`mb-3 flex items-center gap-2 text-[0.88rem] ${
                  result.matchesCurrentCatalog ? "text-verdigris-400" : "text-amber-200"
                }`}
              >
                {result.matchesCurrentCatalog ? <ShieldCheck className="size-4" /> : <ShieldAlert className="size-4" />}
                {result.matchesCurrentCatalog
                  ? "Match. The shelf is exactly as attested."
                  : "The shelf has changed since this was signed."}
              </p>

              <dl className="space-y-2 text-[0.8rem]">
                <div className="flex flex-wrap gap-x-3">
                  <dt className="w-24 shrink-0 text-stone-300">Digest</dt>
                  <dd><Mono>{result.digest}</Mono></dd>
                </div>
                <div className="flex flex-wrap gap-x-3">
                  <dt className="w-24 shrink-0 text-stone-300">Signed by</dt>
                  <dd>
                    {result.signer ? (
                      <a href={explorerAddress(result.signer)} target="_blank" rel="noreferrer noopener" className="font-mono text-[0.78rem] text-brass-300 hover:underline">
                        {result.signer}
                      </a>
                    ) : (
                      <span className="text-stone-300">unknown</span>
                    )}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-x-3">
                  <dt className="w-24 shrink-0 text-stone-300">Landed</dt>
                  <dd className="text-stone-100">
                    {result.blockTime
                      ? new Date(result.blockTime * 1000).toLocaleString("en-GB")
                      : `slot ${result.slot}`}
                  </dd>
                </div>
              </dl>

              {!result.matchesCurrentCatalog ? (
                <p className="mt-3 text-[0.78rem] leading-relaxed text-stone-200/80">
                  That is expected behaviour, not a failure: the shelf rebuilds from GitHub on every
                  deploy, so a listing that moved changes the fingerprint. The attestation still
                  proves what the catalogue said at that moment.
                </p>
              ) : null}
            </div>
          ) : null}
        </Step>
      </div>

      <footer className="mt-10 rounded-2xl border border-white/8 bg-shadow-800/30 p-6 text-[0.82rem] leading-relaxed text-stone-300">
        <p className="mb-3 font-display text-[1rem] text-stone-50">What this does and does not show</p>
        <p className="mb-2">
          It shows that a specific wallet asserted a specific catalogue state at a specific slot on
          devnet. That is a real, checkable claim about custody and time.
        </p>
        <p>
          It does not vouch for the software behind any listing, and devnet carries no economic
          weight. Anyone reading this should treat it as a tamper-evident seal on the index, not as
          an endorsement of what sits behind each door. Memo program:{" "}
          <a href={explorerAddress(MEMO_PROGRAM_ID.toBase58())} target="_blank" rel="noreferrer noopener" className="font-mono text-[0.76rem] text-brass-300 hover:underline">
            {MEMO_PROGRAM_ID.toBase58()}
          </a>
          . Shelf built {new Date(catalog.generatedAt).toLocaleDateString("en-GB")}; a sample memo
          reads <span className="font-mono text-[0.75rem] text-stone-200">{memoText("…").slice(0, 14)}</span>.
        </p>
      </footer>
    </div>
  );
}
