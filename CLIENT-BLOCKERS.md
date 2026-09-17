# CLIENT-BLOCKERS.md

Phase 2 of KuumbaPro is built and staged. It cannot go live until Dr. Hinton opens the accounts below and hands back a few pieces of information. Everything on the KuumbaPro side is coded to a placeholder and will switch on the moment those values arrive.

## 1. Kit (email service, for the weekly note)

**What to do.** Create a Kit account under the Kuumba, LLC email address.

Sign up here: https://app.kit.com/users/signup

- Plan. The Newsletter (free) plan is fine to launch. It supports one signup form, one sequence, and unlimited broadcasts. Upgrade to Creator when the list crosses the free limit or when we want visual automations.
- Business info during signup. Use Kuumba, LLC as the sender name. Use the Kuumba, LLC mailing address as the physical postal address. Kit requires a real postal address on every email for CAN-SPAM compliance.
- Create one Form. Name it Joy Up Guide Signup. Set the incentive to the Joy Up guide PDF so Kit sends the guide automatically on confirm.
- Create one Sequence. Name it KuumbaPro Weekly. The nine emails are already written and formatted in the sequence markdown file the KuumbaPro build produced. Paste them in one at a time, one per Kit sequence email, seven days apart.
- Connect the Form to the Sequence so a new subscriber lands in the sequence at Week 1.

**What I need back from Dr. Hinton.**

- The Kit form ID. It is the numeric string in the form embed URL, for example `https://app.kit.com/forms/1234567/subscriptions`. The number is the form ID.
- The Kit account ID (data-uid). Kit shows it in the embed code for the form.

Once those arrive, I swap the three PLACEHOLDER strings in `src/pages/guide.html` for the real values and remove the mailto fallback.

## 2. MemberSpace (member gating, sign in, and Stripe billing)

**What to do.** Create a MemberSpace account and connect it to the kuumbapro.org site.

Sign up here: https://www.memberspace.com/pricing/

- Plan. Starter is fine to launch. Standard has better protection rules if we grow to more than one member tier.
- Site setup. When MemberSpace asks for the site URL, use https://www.kuumbapro.org. MemberSpace assigns a subdomain like `kuumbapro.customer.memberspace.com`. Save that subdomain, I need it to activate the embed.
- Create one Plan. Name it KuumbaPro Membership. Price it at $19 per month, recurring. Set the currency to USD.
- Protect these URLs from anonymous visitors:
  - /library.html
  - /live.html
- Do not protect /login.html. That page is the sign in mount.
- Do not protect /members.html. That page is the public sales page.

**What I need back from Dr. Hinton.**

- The MemberSpace subdomain (the `YOUR_SUBDOMAIN` piece of the widget script).
- Confirmation that /library.html and /live.html are set to Members Only inside MemberSpace.

Once those arrive, I uncomment the MemberSpace embed script that is already placed in `src/layout.html` and swap YOUR_SUBDOMAIN for the real value. Sign in, checkout, and gate protection all activate at that point.

## 3. Stripe (payment processing, via MemberSpace)

**What to do.** MemberSpace connects to Stripe with one click inside MemberSpace settings. There is nothing to build separately.

Sign up here (if there is no existing Kuumba, LLC Stripe account yet): https://dashboard.stripe.com/register

- Use Kuumba, LLC as the business name. Use the Kuumba, LLC EIN. Use the Kuumba, LLC bank account for payouts.
- Once the Stripe account is created, open MemberSpace, go to Payments, and click Connect Stripe. MemberSpace will run the OAuth handshake. That is the entire integration.
- Test with Stripe test mode first. MemberSpace has a toggle for test mode inside the same Payments panel.

**What I need back from Dr. Hinton.**

- Confirmation that Stripe is connected inside MemberSpace and shows the Kuumba, LLC business name.
- The Stripe publishable key, live mode, in `pk_live_...` format. I do not need the secret key. The publishable key is only needed if we ever add a Stripe element outside of MemberSpace. For a MemberSpace-only setup, this is optional.

There is nothing for me to swap on the KuumbaPro pages for this piece. Stripe checkout renders inside the MemberSpace mount on /login.html.

## 4. Video hosting (for the on-demand library and recorded drop-ins)

**What to do.** Pick one of the two options below. Both are professional grade. The choice is a preference, not a technical fork.

Option A. Mux. https://www.mux.com/pricing

- Strengths. Simple pricing. Excellent player quality. Very good analytics. Popular with independent creator platforms.
- Costs. Storage is about $0.003 per minute per month. Streaming is about $0.00096 per minute delivered. A one-hour session watched by fifty members over a month costs a few dollars.
- Downside. Separate vendor to manage. Separate invoice.

Option B. Cloudflare Stream. https://developers.cloudflare.com/stream/pricing/

- Strengths. Flat pricing. Storage and streaming bundled at $5 per one thousand minutes stored and $1 per one thousand minutes delivered. Easier to predict monthly cost. Same vendor as the DNS and the website, one login.
- Downside. Player is slightly less polished out of the box than Mux, but embed is clean.

**My recommendation.** Cloudflare Stream. Same vendor stack the site already lives on. Predictable flat pricing at this scale. Easier for Dr. Hinton to reason about the monthly bill.

**What I need back from Dr. Hinton.**

- Which one he wants. If Cloudflare Stream, I turn it on inside the existing Cloudflare account. If Mux, he creates a Mux account and hands back an API access token.

Video does not block launch. The library page will show a locked teaser to non-members and a placeholder message to signed-in members until at least one recorded session exists. First live drop-in becomes the first library asset.

## 5. Summary. What throws the switch on Phase 2

The exact values I need from Dr. Hinton to move Phase 2 from staged to live:

1. Kit form ID and Kit account (data-uid).
2. MemberSpace subdomain, plus confirmation that /library.html and /live.html are set to Members Only.
3. Stripe connected inside MemberSpace under Kuumba, LLC. Publishable key optional.
4. Video provider choice, Cloudflare Stream or Mux.

Once those five items land, the guide form, the members page, the login mount, and the two gated pages all activate together in one deploy. The nine-week Kit sequence is already written and ready to paste.

Nothing on this list is code work on Dr. Hinton's side. Every item is an account signup or a configuration choice.
