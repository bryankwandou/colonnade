# Colonnade

A storefront for finished software. It reads every repository on the account,
sorts the results onto two shelves, and gives each one a door you can walk
through.

- **Tools** — software you open and operate: editors, scanners, meters, and the
  rails that sit underneath agents.
- **Projects** — ventures and studies, each built to test a claim about how a
  particular job ought to be done.

A repository earns a listing when there is a public way in: a homepage, a
matched Vercel deployment, or a readable source tree. Private repositories with
no reachable link are counted in the totals but withheld from the shelf.

## Where the data comes from

The catalogue is generated, not hand-maintained:

```
node scripts/build-catalog.mjs
```

Three sources, in order of trust:

1. `src/data/overrides.json` — hand-written curation. Always wins.
2. `gh repo list` — every repository, public and private.
3. `vercel project ls` — production URLs, matched by project name.

Both CLI readers fall back to a committed snapshot, so `next build` still has a
catalogue to render in an environment with no GitHub token and no Vercel
session.

## The devnet attestation

A catalogue is only worth something if it cannot be quietly edited afterwards.
Every listing folds into a single SHA-256 fingerprint over three fields: slug,
live URL, and last-modified date. Wording and layout are excluded on purpose, so
fixing a typo does not invalidate an earlier attestation.

That fingerprint can be written to Solana devnet through the canonical SPL Memo
program as `colonnade:v1:<digest>`. No custom program is deployed and no account
is created — the memo lives inside the transaction, and the transaction is the
record. `/verify` recomputes the digest in the browser and checks any signature
against it.

What that proves: a specific wallet asserted a specific catalogue state at a
specific slot. What it does not prove: anything at all about the quality of the
software behind a listing.

## Running it

```
npm install
npm run catalog   # regenerate from gh + vercel
npm run dev
```

Set `NEXT_PUBLIC_SOLANA_RPC` to use an RPC other than the public devnet
endpoint.

## Stack

Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 4, framer-motion, and
`@solana/wallet-adapter`. Every page is statically generated.
