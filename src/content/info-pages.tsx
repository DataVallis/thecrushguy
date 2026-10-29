/**
 * Static info pages (TASK-012b). English for now; other locales fall back to English and stay unpublished
 * (ADR-012). Facts only — weights come from the scoring code, operator data from content/legal.ts.
 */
import { WEIGHTS } from "@/lib/public/scoring";
import { LEGAL_ENTITY, LEGAL_TEXTS_REVIEWED, missingLegalFacts } from "./legal";

import { INFO_PAGES, type InfoPage } from "./info-page-names";

export { INFO_PAGES, type InfoPage };

export type InfoContent = { title: string; description: string; indexable: boolean; body: React.ReactNode };

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mt-6 font-display text-xl font-extrabold">{children}</h2>
);
const mail = (
  <a href={`mailto:${LEGAL_ENTITY.email}`} className="underline">
    {LEGAL_ENTITY.email}
  </a>
);
const DraftNote = () =>
  LEGAL_TEXTS_REVIEWED ? null : (
    <p className="rounded-xl bg-blush p-3 text-sm">Draft — this text is being reviewed by a lawyer and may change.</p>
  );

const criteria: [keyof typeof WEIGHTS, string, string][] = [
  ["conversation", "Conversation", "How natural, coherent and in-character the replies are over a long chat."],
  ["memory", "Memory", "Whether it remembers names, facts and earlier conversations across days."],
  ["customization", "Customization", "How far you can shape personality, look, voice and scenario."],
  ["media", "Media", "Quality and limits of voice messages, calls and image generation."],
  ["value", "Value for money", "What the free tier allows and what paid plans really cost, including tokens/credits."],
  ["privacy", "Privacy & safety", "Data retention and deletion, training on chats, billing discretion, who runs it."],
];

export const INFO: Record<InfoPage, InfoContent> = {
  about: {
    title: "About The Crush Guy",
    description: "Who we are and why we review AI companion apps.",
    indexable: true,
    body: (
      <>
        <p>
          The Crush Guy is an independent guide to AI companion apps. We collect the facts that matter — prices, free
          plans, features, privacy policies, who runs the app — with a source link and a date for each, and turn them
          into scores with a published formula. Apps we have tested ourselves say so; apps rated from public information
          say that too.
        </p>
        <p>
          Our mascot is the heart with sunglasses. The site is operated by {LEGAL_ENTITY.name} ({LEGAL_ENTITY.country}).
          Our scores are our own editorial opinion and are never for sale.
        </p>
        <p>
          AI companions can be fun, comforting or useful for practice. They are not a replacement for people or for
          professional help — if you are struggling, please talk to someone you trust or a local support service.
        </p>
      </>
    ),
  },
  "how-we-rank": {
    title: "How we rank AI companion apps",
    description:
      "Our scoring method: six criteria, fixed weights, real testing — and why payouts never change a score.",
    indexable: true,
    body: (
      <>
        <p>
          Every app gets up to six sub-scores from 0 to 10. The overall score is a weighted average of the sub-scores
          the app has:
        </p>
        <ul className="list-disc pl-5">
          {criteria.map(([k, name, what]) => (
            <li key={k}>
              <strong>
                {name} — {WEIGHTS[k]}%
              </strong>
              : {what}
            </li>
          ))}
        </ul>
        <H>Two kinds of reviews</H>
        <p>
          <strong>Tested</strong> — we used the app with a real account (at least the free tier) and scored all six
          criteria ourselves. <strong>Rated from public information</strong> — we have not tested it yet; the scores are
          computed by a fixed formula from facts on the app&apos;s own pricing page, privacy policy, terms and store
          listings, each linked on the app page with the date we checked it. Such pages carry a clear label, have no
          Conversation score (chat quality can&apos;t be judged without using the app) and are not marked up as reviews
          for search engines.
        </p>
        <p>The formula for public-information ratings (0–100 per criterion, shown as 0–10):</p>
        <ul className="list-disc pl-5">
          <li>
            <strong>Value</strong>: free plan +40; cheapest monthly plan ≤ $5 +60, ≤ $10 +50, ≤ $15 +40, ≤ $20 +25, ≤
            $30 +15, more +5; extra tokens/credits −10.
          </li>
          <li>
            <strong>Memory</strong>: long-term memory advertised 80, not stated 30, explicitly none 10.
          </li>
          <li>
            <strong>Customization</strong>: create your own characters +70, group chats +30.
          </li>
          <li>
            <strong>Media</strong>: voice messages +30, voice calls +30, image generation +40.
          </li>
          <li>
            <strong>Privacy &amp; safety</strong>: account/data deletion +30, says it doesn&apos;t sell or share data
            for ads +25, chats not used for AI training +25 (opt-out +15), retention period stated +10, operator address
            published +10.
          </li>
        </ul>
        <p>
          Anything the app doesn&apos;t state earns nothing. These numbers say what an app offers on paper, not how well
          it works — that is what a hands-on test adds.
        </p>
        <H>Independence</H>
        <p>
          We earn commissions from some apps (see the affiliate disclosure). Commissions never change a score or the
          order of a ranking. If we ever sell a placement, it is shown separately and labelled “Sponsored” — never
          inside a ranked list.
        </p>
        <H>Facts and freshness</H>
        <p>
          Prices and features come with a source link and the date we checked them. We re-check every app regularly; an
          app not verified for 90 days shows a “being re-checked” badge. Spotted something outdated? Write to {mail}.
        </p>
        <H>What we never list</H>
        <p>
          Apps that allow or market content involving minors, apps built around deepfakes of real people, and apps that
          promote non-consensual or illegal content. We don&apos;t publish ratings, user counts or testimonials we
          didn&apos;t verify.
        </p>
        <H>Use it responsibly</H>
        <p>
          AI companions are entertainment and practice, not a substitute for human relationships or professional
          support.
        </p>
      </>
    ),
  },
  "affiliate-disclosure": {
    title: "Affiliate disclosure",
    description: "How The Crush Guy makes money and what that means for our reviews.",
    indexable: true,
    body: (
      <>
        <p>
          Some links on this site are affiliate links. If you sign up or buy through them, the app or an affiliate
          network may pay us a commission. It costs you nothing extra.
        </p>
        <p>
          Affiliate links are marked as sponsored for search engines and go through <code>/go/…</code> so we can count
          clicks (without storing your IP address — see the privacy policy).
        </p>
        <p>
          Commissions do not affect our scores or rankings. Apps without an affiliate program are reviewed and ranked
          exactly like the others. Paid placements, if any, are labelled “Sponsored” and kept out of ranked lists.
        </p>
        <p>Questions: {mail}.</p>
      </>
    ),
  },
  privacy: {
    title: "Privacy policy",
    description: "What data The Crush Guy processes and why.",
    indexable: LEGAL_TEXTS_REVIEWED,
    body: (
      <>
        <DraftNote />
        <H>Who is responsible</H>
        <p>
          {LEGAL_ENTITY.name}, {LEGAL_ENTITY.country} (full details in the imprint). Contact: {mail}.
        </p>
        <H>No accounts, no advertising cookies</H>
        <p>Readers don&apos;t create accounts. We don&apos;t use advertising cookies.</p>
        <H>Analytics (only with your consent)</H>
        <p>
          If you click &quot;Allow analytics&quot;, we load Google Analytics 4 (Google Ireland Limited) to count visits,
          see which pages are useful and which app links are clicked. Google then sets the <code>_ga</code> cookies (up
          to 2 years) and receives your IP address, which Google uses only to derive an approximate location; data may
          be transferred to the USA under the EU–US Data Privacy Framework. Legal basis: your consent (Art. 6(1)(a)
          GDPR). Without your consent nothing is loaded from Google. You can change your choice any time with
          &quot;Cookie settings&quot; at the bottom of every page.
        </p>
        <H>Cookies we set</H>
        <ul className="list-disc pl-5">
          <li>
            <code>age_ok</code> — remembers that you confirmed you are 18+ for adults-only sections (30 days).
            Functional, set only when you click the confirmation.
          </li>
          <li>
            <code>tcg_admin</code> — sign-in session for our editors on <code>/admin</code> only.
          </li>
          <li>
            <code>tcg_consent</code> — remembers your analytics choice (1 year). Functional.
          </li>
        </ul>
        <H>Outbound clicks</H>
        <p>
          When you follow a link to an app through <code>/go/…</code> we record which app, where on our page the link
          was, the page language, your country (from our CDN), device type (mobile/tablet/desktop), the page you came
          from on our site, and a one-way hash of your IP address that changes every day. We never store your IP address
          itself. We use this to count clicks and prevent abuse.
        </p>
        <p>
          After you leave our site, the app or affiliate network you visit may set its own cookies — their privacy
          policies apply.
        </p>
        <H>Service providers</H>
        <p>
          Our servers are hosted by Hetzner Online GmbH; traffic passes through Cloudflare (content delivery and
          security), which processes your IP address to deliver the site. Email is handled on our own mail server.
        </p>
        <H>Your rights</H>
        <p>
          Under the GDPR you can ask for access, correction or deletion and object to processing; contact {mail}. You
          can also complain to your data-protection authority (in Slovenia: Informacijski pooblaščenec).
        </p>
      </>
    ),
  },
  terms: {
    title: "Terms of use",
    description: "The rules for using The Crush Guy.",
    indexable: LEGAL_TEXTS_REVIEWED,
    body: (
      <>
        <DraftNote />
        <p>
          The Crush Guy publishes independent reviews and comparisons of third-party AI companion apps. Reviews are our
          opinion at the time of testing; apps, prices and features change — always check the provider&apos;s current
          terms before you pay.
        </p>
        <p>
          Adults-only sections are for people aged 18 or over. We don&apos;t operate any of the listed apps and are not
          responsible for their content, billing or data handling.
        </p>
        <p>
          App names and logos belong to their owners and are used only to identify the apps we review. Owners can ask
          for a correction or removal of a logo at {mail}.
        </p>
      </>
    ),
  },
  imprint: {
    title: "Imprint",
    description: "Who operates The Crush Guy.",
    indexable: missingLegalFacts().length === 0,
    body: (
      <>
        <p>
          <strong>{LEGAL_ENTITY.name}</strong>
          <br />
          {LEGAL_ENTITY.address ?? "Address: being added"}
          <br />
          {LEGAL_ENTITY.country}
        </p>
        <p>
          Registration no.: {LEGAL_ENTITY.registrationNo ?? "being added"}
          <br />
          VAT ID: {LEGAL_ENTITY.vatId ?? "being added"}
          <br />
          Email: {mail}
        </p>
      </>
    ),
  },
  contact: {
    title: "Contact",
    description: "How to reach The Crush Guy.",
    indexable: true,
    body: (
      <>
        <p>Corrections, app suggestions, partnership or press questions: {mail}.</p>
        <p>App owners: tell us about outdated facts or ask for a logo removal at the same address.</p>
      </>
    ),
  },
};
