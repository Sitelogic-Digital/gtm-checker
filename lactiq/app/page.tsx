import Cards from "@/components/Cards";
import Curve from "@/components/Curve";
import Waitlist from "@/components/Waitlist";

const why = [
  ["Who", "I'm a runner training with the Norwegian method, and I've spent a decade selling online."],
  ["The problem", "Lactate meters cost far more than they should, and nobody explains how to use them."],
  ["The plan", "One good meter, strips on subscription, an app, and honest content."],
  ["When", "Spring 2027."],
] as const;

const posts = [
  ["Nov 2026", "Why I’m building this"],
  ["Dec 2026", "Which lactate meter? Four tested"],
  ["Jan 2027", "What my own curve says after six weeks"],
] as const;

export default function Home() {
  return (
    <>
      <header className="wrap pt-6 md:pt-8">
        <a href="/" className="display text-[28px] font-bold leading-none tracking-[-0.02em] no-underline" aria-label="Lactiq home">
          Lactiq
        </a>
      </header>

      <main id="main">
        <section className="wrap pb-12 pt-10 md:pb-16 md:pt-14">
          <h1 className="max-w-[18ch] text-[36px] leading-[1.05] md:text-[56px]">Lactate testing for everyday runners.</h1>
          <p className="mt-6 text-text-2">
            Know your threshold. A meter you can afford, strips delivered, and an app that puts every reading on your training
            calendar. Launching for the spring marathon season.
          </p>
          <div className="mt-8">
            <Waitlist />
          </div>
        </section>

        <Curve />

        <section className="wrap section" aria-labelledby="making">
          <h2 id="making" className="sr-only">What we’re making</h2>
          <Cards />
        </section>

        <section className="wrap section pt-0 md:pt-0" aria-labelledby="why">
          <h2 id="why" className="text-[32px] leading-tight md:text-[40px]">Why Lactiq</h2>
          <dl className="mt-8 grid gap-6 md:gap-8">
            {why.map(([label, text]) => (
              <div key={label} className="grid gap-1 border-t border-line pt-5 md:grid-cols-[160px_1fr] md:gap-8">
                <dt className="display text-[15px] font-semibold uppercase tracking-[0.08em] text-text-2">{label}</dt>
                <dd className="m-0 max-w-[60ch]">{text}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 font-medium">Charlie, founder</p>
        </section>

        <section className="wrap section pt-0 md:pt-0" aria-labelledby="log">
          <h2 id="log" className="text-[32px] leading-tight md:text-[40px]">Building in public</h2>
          <ul className="m-0 mt-8 list-none p-0">
            {posts.map(([date, title]) => (
              <li key={title} className="grid gap-1 border-t border-line py-5 md:grid-cols-[160px_1fr] md:gap-8">
                <span className="text-text-2">{date}</span>
                <span className="font-medium">{title}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-line pt-6">
            <a className="link underline" href="/log">Follow the build-log →</a>
          </p>
        </section>
      </main>
    </>
  );
}
