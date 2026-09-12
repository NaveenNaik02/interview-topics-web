# Auth check on every request: why it costs a round trip, and when it doesn't have to

Background for a candidate optimization in `proxy.ts` / `lib/supabase/middleware.ts`.
Written 2026-09-11. **Nothing here is applied** — it ends in a decision gate that
needs one fact about the cloud project.

---

## TL;DR

Every request to the app makes a network call to Supabase's auth server just to
answer "is this person logged in?". The answer is already inside the token the
browser sent, and can be verified locally with no network at all — **but only if the
project signs tokens with asymmetric keys.** If it still uses the legacy shared
secret, the optimization silently does nothing.

Check the signing algorithm first. Everything else depends on it.

---

## The problem

Every request passes through `proxy.ts` → `updateSession()`. Its job is small:
decide _serve the page_, or _redirect to `/login`_.

To decide it, `lib/supabase/middleware.ts:38` runs:

```ts
const user = await supabase.auth.getUser();
```

That `await` is **a network request to Supabase's auth server**. The server stops,
sends the token over the internet, waits for a reply, then continues.

It happens on:

- every full page load
- every client-side navigation (Next fetches the RSC payload through the proxy too)
- everything else the matcher in `proxy.ts` catches

So clicking a subtopic in the sidebar costs a round trip to Supabase **before
Next.js starts rendering**. It is pure overhead — the answer is nearly always
"yes, still logged in".

It is the first of the two remaining serial hops on a section navigation:

```
proxy.ts   getUser()                          ← this document
  └─ page  getAllGroups() ─┐
           parseSection() ─┼─ already parallel (fixed 2026-09-11)
           fetchOrder()   ─┘
```

---

## Why it doesn't need to ask

**The answer is already in the token.**

When you log in, Supabase hands the browser a JWT — three base64 chunks joined by
dots:

```
eyJhbGciOiJIUzI1NiJ9  .  eyJzdWIiOiJhYmMiLCJleHAiOjE3...  .  4Xy9k2...
      header                       payload                   signature
```

The **payload** already contains the user id, the expiry, `is_anonymous`, and
`app_metadata.is_admin` — every field `updateSession()` looks at. It is base64, not
encryption. Anyone can read it:

```bash
# the header of the local anon key, decoded
{ "alg": "HS256", "typ": "JWT" }
```

Which raises the obvious problem: if anyone can _read_ it, what stops someone
forging one that says `is_admin: true`?

The **signature**. Supabase computed it over the header and payload using a secret.
Change one byte of the payload and the signature stops matching.

So verifying a token means _recompute the signature and compare_. **That is math,
not a network call.** Nobody needs to be asked.

---

## So why does `getUser()` phone home?

Because of _which kind of secret_ signs the token. This is the crux of the whole
document.

|                              | Signing       | Verifying            | Can your middleware verify alone? |
| ---------------------------- | ------------- | -------------------- | --------------------------------- |
| **Symmetric** (HS256)        | shared secret | _same_ shared secret | **No**                            |
| **Asymmetric** (ES256/RS256) | private key   | **public** key       | **Yes**                           |

**Symmetric** — one secret does both jobs. Whoever can verify can also forge. So
Supabase cannot hand that secret to your middleware; it has to stay server-side, and
asking Supabase is your only option.

**Asymmetric** — a key pair. Supabase signs with the private key and publishes the
public key at a URL anyone may fetch:

```
https://<project>.supabase.co/auth/v1/.well-known/jwks.json
```

The public key can only _verify_, never _sign_. Safe to hand out — so the middleware
can check tokens entirely on its own.

---

## The solution

`getClaims()` does exactly that: decode, check `exp`, verify the signature with
WebCrypto, return the payload. A network round trip becomes a few hundred
microseconds of local math.

Sketch, not finished code:

```ts
// module scope — fetched once per server process, not per request
let jwks: { keys: unknown[] } | null = null;

export async function updateSession(request: NextRequest) {
  // ...build supabaseResponse and the client exactly as today...

  jwks ??= await fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`).then(
    (r) => r.json(),
  );

  const { data } = await supabase.auth.getClaims(undefined, {
    keys: jwks.keys,
  });
  const claims = data?.claims;

  const isAuthed = !!claims && !claims.is_anonymous;
  // ...same redirect logic from here down...
}
```

---

## Two traps

### 1. It silently does nothing on symmetric keys

From `node_modules/@supabase/auth-js/dist/module/GoTrueClient.js`:

```js
const signingKey =
  !header.alg || header.alg.startsWith('HS') || !header.kid
    ? null
    : await this.fetchJwk(...);

if (!signingKey) {
  const { error } = await this.getUser(token); // ← straight back to the network
  ...
}
```

On an HS256 project, `getClaims()` calls `getUser()` internally. The code _looks_
optimized, benchmarks identically, and emits no warning. **This is why the signing
algorithm has to be confirmed before any code is written.**

Note the local Docker stack is HS256 (decoded above) and always will be — so local
timings can never validate this change. It has to be measured against cloud.

### 2. The JWKS cache is per-client-instance

`fetchJwk` caches the public key on `this.jwks` with a TTL — but `updateSession()`
constructs a **fresh client on every request**, so that cache always starts empty.

A naive swap therefore trades one network call (`/auth/v1/user`) for a different one
(`/.well-known/jwks.json`). Cheaper — static, CDN-friendly, no database behind it —
but still a hop. The public key is static, so hoisting it to module scope (as in the
sketch) is what gets this to genuinely zero.

---

## One correctness caveat

`lib/supabase/middleware.ts:36` carries this warning:

> Touching `auth.getUser()` here is what actually refreshes an expiring session
> cookie — do not add logic between client creation and this call.

`getClaims()` calls `getSession()` internally when no JWT is passed, which is the
path that triggers a refresh, so it _should_ hold. **"Should" is not good enough for
a change that logs everyone out if wrong.**

Test before shipping:

1. Sign in.
2. Wait for the access token to pass its expiry (default 1 hour).
3. Navigate.
4. Confirm you are **not** bounced to `/login`.

---

## Decision gate

Everything above reduces to one question: **does the cloud project use asymmetric
signing keys?**

Supabase added them relatively recently. Older projects default to the legacy HS256
shared secret and need a migration in the dashboard.

**How to check** — either:

- Supabase Dashboard → Settings → JWT Keys, or
- `curl -s https://<project>.supabase.co/auth/v1/.well-known/jwks.json` and read
  `keys[].alg`

| Result                       | Verdict                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `ES256` / `RS256`            | Worth doing. Largest remaining per-navigation win — it is on _every_ request.                                            |
| `HS256`, or an empty key set | Not worth doing. Migrating signing keys is the real prerequisite, and that is a bigger decision than a middleware tweak. |

---

## Related

- `OPTIMIZATION_PLAN.md` — the 2026-09-05 audit. This item is not in it; the audit
  never looked at `proxy.ts`.
- `OPTIMIZATION_PLAN.md` § "Out of scope: Next.js 16 Cache Components" — the other
  latency idea considered and declined, for unrelated reasons.
