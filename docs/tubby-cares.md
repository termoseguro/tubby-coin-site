# Tubby Cares — the donation engine

> Governed by **the three rules** in `roadmap.md`: profit, nothing hackable,
> healthy ecosystem — in that order.

**20% of every creator fee buys supplies for children's care homes in Rio de
Janeiro.** In goods — diapers, formula, medicine, food, hygiene — delivered in
person, photographed, signed for. Never in cash.

Related: `monetization.md` (the shop and the reward pool) · `roadmap.md` (when) ·
`security.md` (how each part gets attacked) · `lib/config.js` (`feeSplit`,
`care`, `milestones` — the numbers themselves)

Last updated: 2026-09-07

---

## 1. Where it comes from

| Bucket | % | Was | |
|---|---|---|---|
| 🧡 **care** | **20** | — | Tubby Cares. Supplies for care homes in Rio. |
| ⚙️ **ops** | 30 | 30 | The team. The profit. |
| 🎁 **treats** | 25 | 25 | The game's reward pool. |
| 🔥 **bite** | 15 | 15 | Buyback & burn. |
| 🎨 **art** | 10 | 30 | The tubby cats brand. |

**The donation was cut out of our own slice.** The art fund went from 30 to 10;
nothing else moved. That is the whole reason the split survives contact with a
hostile thread: when the charity is funded by the founder giving something up,
there is no argument. Fund it out of `treats` or `bite` and the first reply is
"so *I'm* the one donating, not you" — and that reply is correct.

### Fees, never supply

There is no charity token allocation and there never will be. The entire
`/tokenomics` page rests on **0% presale · 0% team · 0% VC · 100% launched on
the curve**, and that is the most expensive trust asset the project owns. A
wallet holding tokens "for charity" is indistinguishable from a team bag on a
block explorer, and the project would spend its life defending the donation
instead of showing it. Fees are a verifiable flow; an allocation is a bag.

---

## 2. The rule that protects everything

> **The amount depends only on creator fees. The game decides where a run goes
> and whose name is on it — never how much.**

No purchase in the game, no pull, no season pass, no amount of play changes the
donation by one lamport. Two reasons, and both are about survival rather than
ethics:

1. **A sale that raises a donation is a charitable solicitation.** It changes
   what every product in the shop legally *is*, and it invites a class of
   scrutiny a memecoin game cannot afford.
2. **It is unfalsifiable to the buyer.** Someone spends $50, watches the care
   wallet, and cannot see their $50 in it. There is no explanation that beats
   the accusation. Keep the number mechanical — a fixed percentage of an
   on-chain fee stream anyone can audit — and there is nothing to accuse.

So the game gets the human half of the job: **which** shelter, **what** the
basket contains, **who** is named on the delivery card. That half is worth more
for engagement than the money half anyway, and it costs nothing.

### The one exception

**A single charity product in the shop, at 100%.** One item — a cosmetic — where
every cent goes to the care wallet, published, permanent. One product at 100% is
a better story than 10% of everything, it lets people who want to give actually
give, and it leaves the rest of the catalogue as clean profit (`monetization.md`
§1: shop revenue is revenue, never a reward pool — and never a donation pool
either, except here, on purpose, once).

---

## 3. Goods, never cash

Non-negotiable, and it is the single best decision in this design.

- **Goods photograph.** A pallet of diapers is content. A bank transfer is a
  screenshot nobody believes.
- **Goods cannot be laundered back.** The most common attack on a charity coin
  is "the NGO wallet is theirs and the money comes home". Buying physical items
  and handing them to an institution that signs for them closes that door.
- **Goods are what shelters actually run out of.** Diapers, formula, medicine,
  cleaning supplies, food staples. They are also the least-donated things,
  because they are boring — everybody donates toys at Christmas.

The care wallet pays for **the items and the logistics of the delivery**
(transport, freight). It never pays a salary, ours or anyone's. Say so publicly;
the alternative is ops quietly subsidising every run until nobody wants to do
one.

---

## 4. The basket and the run

The care wallet's **balance is not a running total.** It empties every time we
go shopping. So the site shows two different numbers and never confuses them:

| Number | Source | Means |
|---|---|---|
| **In the basket** | live `getBalance` on the care wallet | queued for the next run |
| **Delivered so far** | `config.care.deliveries`, summed | actually turned into goods |

Reading "total donated" off a wallet balance would show **zero** immediately
after the most generous week of the project's life. The delivery log is the
real number, and it is hand-maintained precisely because every entry has a
signed receipt behind it.

`config.milestones` are the run targets — deliberately small and frequent. **A
delivery that happens beats a bigger one that is permanently "coming".** The
first target clears fast on purpose: the project needs a real photo of real
supplies as early as possible, because until that photo exists the whole thing
is a paragraph.

⚠ **A milestone never states a quantity.** Not "400 diapers", not "30 food
baskets". What a given amount of SOL buys depends on the SOL price that day, on
what the shops have, and on what the institution is short of that week — none of
which is knowable in advance. Write the *kind* of run instead: "a supply run for
one home — diapers, formula and hygiene".

The exact counts are published **after** the run, in `care.deliveries`, where
they are receipts instead of forecasts. A number promised in advance is a number
someone screenshots, and the first delivery that lands under it becomes the
story instead of the delivery.

---

## 5. What every run must publish

No exceptions. A run without all six is not published as a run:

1. **Date and institution**, with its **CNPJ**
2. The **signed termo de doação** (the institution's own receipt)
3. The **full item list** with quantities
4. The **funding transaction** from the care wallet
5. **Photos of the goods** — stacked, counted, in the vehicle, at the door
6. **The SOL amount**, so the log sums to a number anyone can check

### Photographing children: don't

**Never publish children's faces, names, or anything that identifies which
shelter a specific child lives in.** Brazilian law protects kids in
institutional care harder than almost anything else — ECA arts. 17 and 18 on
dignity and image, art. 143 on identifying minors in any procedure, with art.
247 penalising publication. Beyond the law: the audience for these photos does
not need a child in them, and a photo of a shelter's staff receiving 400 diapers
is a *better* photo. Shoot the supplies, the delivery, the handshake.

Get written authorisation from the institution before any photo is taken on
their premises, every time, even of empty rooms.

### Strip the file, not just the picture

**Every published image goes through `-strip`.** A phone photo carries EXIF,
and EXIF carries an embedded thumbnail — a copy the camera made at capture time
that resizing does NOT regenerate. Redact a face in an editor and the visible
pixels are covered while that thumbnail may still hold the original.

This was found live: the first drive shipped 7–14 KB of EXIF per file, each with
an embedded JPEG inside. Those particular thumbnails happened to show the hearts
already applied, because the editing app re-saved them — which is the editing
app's behaviour, not a property of the process, and not something to rely on
next time. EXIF also carries GPS on many phones; none of this batch had it, and
nothing was stopping it.

    magick in.jpg -auto-orient -resize 1200x1200\> -quality 78 -strip out.webp

Verify rather than assume: `magick identify -format "%[EXIF:*]" out.webp` must
print nothing, and the file must contain no `ff d8 ff` JPEG header.

**Redaction is not the authorisation.** Covering a face is necessary and it is
not sufficient — the room, the equipment and a wheelchair can still identify a
child and disclose health status. What makes publication lawful is the written
grant from the institution; the redaction is what keeps it decent. Record which
grant each asset is published under, next to the asset
(`drives[].authorisation` in `lib/config.js`), and keep the signed copy
off-repo.

**Anything committed under `/public` is served publicly**, whether or not a page
links to it. A config flag that hides a photo from the page does not hide the
file — the URL still resolves. Un-cleared material stays out of git entirely,
not behind a boolean.

The best frames have no people in them at all. The single most useful photo from
the first drive is a trolley of plush cats parked under the institution's own
street sign: it names the recipient, dates the visit, and shows the goods, with
nobody's privacy in the frame.

### Language that is never used

- ❌ "tax-deductible" — buying $TUBBY gives the buyer no deduction anywhere.
- ❌ any fixed promise in reais or in items per month. The fees decide.
- ❌ "invest in the cause", or any framing where the donation is a reason the
  token goes up. That is investment language wearing a charity hat, and it is
  the fastest route to the worst possible regulator conversation.
- ✅ "20% of creator fees", "goods", "delivered", "receipts".

---

## 6. How the game plugs in

The honest causal chain, and it is enough: **the game brings people, people
trade and hold, trading generates fees, 20% of fees becomes supplies.** The game
is the growth engine of the donation. Nothing has to be invented on top of that
— only made visible.

### The Care House
A building in every player's town. **Cannot be bought, cannot be rushed, cannot
be upgraded with resources.** It levels up when — and only when — a real
delivery goes out. It is the one structure in Tubby Town that the real world
builds, and it makes the donation a permanent part of the player's own town
rather than a banner they scroll past.

### Mutirões (community goals)
Seasonal, town-wide, and **written in items, not in SOL**: "500 diapers + 120
tins of formula for a shelter in Rio." Progress reflects the basket filling.
When it completes, the run happens and the town gets the photos.

Everyone who took part gets a **badge that can never be bought** — not now, not
later, not in a bundle. That un-buyability is the entire reason anyone shows up
for the next one.

### The delivery card
The names of players who took part in the season go on the card that appears in
the delivery photos. **Earned by playing, never by paying.** Selling a place on
a charity plaque is selling indulgences and it reads exactly as badly as it
sounds.

### The delivery log
Replaces the old "project fund transparency" receipt on the site. It is the
artefact that gets screenshotted, quoted and linked — for a crypto audience,
verifiable receipts are the strongest acquisition asset there is, and this is
the rare case where the receipts are also just *good*.

---

## 7. How this gets attacked

Two-pass rule from `security.md` — attacker first.

| Attack | Defence |
|---|---|
| "The charity wallet is theirs, the money comes back" | Goods, not cash. Institution signs. CNPJ published. Items photographed against the receipt. |
| "They promised X and delivered Y" | Never promise a fixed amount. Milestones are funding targets, `items` set from real quotes, under-promised. |
| "The orphanage doesn't exist" | CNPJ published per run; anyone can check it on the Receita's own lookup. |
| "They're using kids for marketing" | No children in any photo, ever. Written authorisation from the institution on file for every visit. |
| "The donation stopped and nobody noticed" | The care wallet is public and the split is a protocol setting — a stopped donation is visible on-chain without us saying anything. |
| "Buy this pack to feed a child" (said by *us*) | §2. The amount never depends on a purchase. This is why. |
| A fake "Tubby Cares" donation address posted by a scammer | The care address lives in `lib/config.js` and is rendered from there on the site and /tokenomics. We never post a donation address anywhere else, and we never ask anyone to donate directly. |

---

## 8. Decisions locked

- 20% of creator fees, taken out of the art fund's old 30. Nobody else's slice moved.
- Fees only. No token allocation for charity, ever.
- Goods only. No cash transfers to anyone, ever.
- The amount never depends on play or spend. One 100%-donation shop product is
  the only exception, and it is a product, not a percentage of the catalogue.
- The care wallet pays for items and delivery logistics. Never a salary.
- Every run publishes all six receipts in §5 or is not published at all.
- No children's faces. No exceptions, no "but they said it was fine".
- No fixed promises in reais, per month, or per milestone.
- The delivery log is hand-maintained from signed receipts, never derived from a
  wallet balance.
