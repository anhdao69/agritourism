"use client";

import React, { useMemo, useState } from "react";

/* ---------- Helper UI bits ---------- */
const Container = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 ${className}`}>
    {children}
  </div>
);

const Pill = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
    {children}
  </span>
);

const Button = ({ children, className = "", as = "button", ...props }: any) => {
  const Comp = as as any;
  return (
    <Comp
      className={`rounded-lg border border-green-700 bg-green-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 ${className}`}
      {...props}
    >
      {children}
    </Comp>
  );
};

const OutlineButton = ({ children, className = "", as = "button", ...props }: any) => {
  const Comp = as as any;
  return (
    <Comp
      className={`rounded-lg border border-green-700 bg-white px-3 py-2 text-sm font-semibold text-green-800 shadow-sm transition hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 ${className}`}
      {...props}
    >
      {children}
    </Comp>
  );
};

/* ---------- Data ---------- */
const DIRECTORIES = [
  {
    key: "agritourism",
    title: "Agritourism",
    listings: 14580,
    blurb:
      "Discover a wide variety of farm-to-table, u-pick, corn mazes, and Christmas tree farms near you.",
    cta: "Find a farm",
    img: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=1600&auto=format&fit=crop",
  },
  {
    key: "csa",
    title: "CSA",
    listings: 4460,
    blurb:
      "Subscribe to a 'share' in local farms to get fresh, in-season produce directly from the farmer.",
    cta: "Find a CSA",
    img: "https://images.unsplash.com/photo-1517263904808-5dc91e3e7044?q=80&w=1600&auto=format&fit=crop",
  },
  {
    key: "farmers-market",
    title: "Farmers Market",
    listings: 7680,
    blurb: "Looking for local, seasonal foods from nearby farmers & makers?",
    cta: "Find a market",
    img: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?q=80&w=1600&auto=format&fit=crop",
  },
  {
    key: "food-hub",
    title: "Food Hub",
    listings: 470,
    blurb:
      "Search food hubs that aggregate, distribute, and coordinate local food for businesses.",
    cta: "Find a food hub",
    img: "https://images.unsplash.com/photo-1484980972926-edee96e0960d?q=80&w=1600&auto=format&fit=crop",
  },
  {
    key: "on-farm-market",
    title: "On-Farm Market",
    listings: 4140,
    blurb:
      "Choose self-serve, specialty produce, and products directly at a consumer-facing on-farm store.",
    cta: "Find a market",
    img: "https://images.unsplash.com/photo-1506806732259-39c2d0268443?q=80&w=1600&auto=format&fit=crop",
  },
];

/* ---------- Main ---------- */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#eef6e6] text-slate-800">
       <Hero />
       <DirectoryGrid />
       <Contact />
    </div>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [directory, setDirectory] = useState("all");

  return (
    <section id="hero" className="relative w-full border-b border-slate-200">
      <div className="absolute inset-0 -z-10">
        <div className="grid h-[320px] w-full grid-cols-3 gap-0 overflow-hidden md:h-[360px] lg:h-[420px]">
          <div
            className="h-full w-full bg-cover bg-center"
            style={{
              backgroundImage:
                "url(https://images.unsplash.com/photo-1536412597336-ade7c1ae77b3?q=80&w=2400&auto=format&fit=crop)",
            }}
          >
            <div className="h-full w-full bg-gradient-to-r from-black/40 to-black/0" />
          </div>
          <div
            className="h-full w-full bg-cover bg-center"
            style={{
              backgroundImage:
                "url(https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=2400&auto=format&fit=crop)",
            }}
          >
            <div className="h-full w-full bg-black/25" />
          </div>
          <div
            className="h-full w-full bg-cover bg-center"
            style={{
              backgroundImage:
                "url(https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=2400&auto=format&fit=crop)",
            }}
          >
            <div className="h-full w-full bg-gradient-to-l from-black/40 to-black/0" />
          </div>
        </div>
      </div>

      <Container className="relative">
        <div className="pt-16 md:pt-20 lg:pt-24" />
        <div className="mx-auto w-full rounded-xl border border-white/40 bg-white/80 p-2 shadow-lg ring-1 ring-black/5 backdrop-blur md:flex md:items-center md:gap-2">
          <div className="flex-1">
            <label htmlFor="q" className="sr-only">
              What are you looking for?
            </label>
            <input
              id="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What are you looking for?"
              className="w-full rounded-lg border-0 bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
          <div className="h-px w-full bg-slate-200 md:h-8 md:w-px" />
          <div className="w-full md:w-56">
            <label htmlFor="loc" className="sr-only">
              Location
            </label>
            <input
              id="loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="w-full rounded-lg border-0 bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
          <div className="h-px w-full bg-slate-200 md:h-8 md:w-px" />
          <div className="w-full md:w-56">
            <label htmlFor="dir" className="sr-only">
              Select directory
            </label>
            <select
              id="dir"
              value={directory}
              onChange={(e) => setDirectory(e.target.value)}
              className="w-full rounded-lg border-0 bg-transparent px-3 py-2 text-sm text-slate-900 focus:outline-none"
            >
              <option value="all">Select directory</option>
              {DIRECTORIES.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 flex justify-end md:mt-0">
            <Button className="w-full md:w-auto">Search</Button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 pb-10 text-xs text-slate-100 drop-shadow md:pb-14">
          <span>Farms, farmers markets and food hubs near you</span>
          <span title="This is a demo replica UI.">•</span>
        </div>
      </Container>
    </section>
  );
}

/* ---------- Directory Grid ---------- */
function DirectoryGrid() {
  return (
    <section id="directories" className="py-6 md:py-10">
      <Container>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {DIRECTORIES.map(({ key: id, ...props }) => (
            <DirectoryCard key={id} {...props} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function DirectoryCard({
  title,
  listings,
  blurb,
  cta,
  img,
}: {
  title: string;
  listings: number;
  blurb: string;
  cta: string;
  img: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-green-700/30 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative h-28 w-full overflow-hidden bg-slate-100">
        <img src={img} alt="" className="h-full w-full object-cover blur-[1px] scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute top-2 left-2">
          <Pill className="bg-green-700/90 text-white">{title}</Pill>
        </div>
      </div>
      <div className="space-y-2 p-3 text-xs">
        <div className="text-[11px] text-slate-500">
          Total <span className="font-semibold">{listings.toLocaleString()}</span> listings
        </div>
        <p className="min-h-[40px] leading-relaxed text-slate-700">{blurb}</p>
        <Button as="a" href="#" className="mt-1 w-full text-center text-xs">
          {cta}
        </Button>
      </div>
    </div>
  );
}

/* ---------- Contact ---------- */
function Contact() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const challenge = useMemo(() => ({ a: 5, b: 1, sum: 6 }), []);
  const [answer, setAnswer] = useState("");
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];
    if (!email) errs.push("Email is required");
    if (!subject) errs.push("Subject is required");
    if (!message) errs.push("Message is required");
    if (parseInt(answer, 10) !== challenge.sum) errs.push("Captcha incorrect");
    setErrors(errs);
    if (errs.length === 0) setSent(true);
  };

  return (
    <section id="contact" className="py-8 md:py-12">
      <Container>
        <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-center text-sm font-semibold text-slate-800">Contact Us</h3>
          {sent ? (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              Thanks! Your message has been submitted (demo). We will get back to you soon.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-2 text-xs">
              <label className="block">
                <span className="mb-1 block font-medium text-slate-700">Email*</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-green-600 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-medium text-slate-700">Phone Number</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-green-600 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-medium text-slate-700">Subject*</span>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-green-600 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-medium text-slate-700">Message*</span>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-green-600 focus:outline-none"
                />
              </label>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-slate-700">
                  Please solve this equation before submitting the message*
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700">
                  {challenge.a} + {challenge.b} =
                </div>
                <input
                  inputMode="numeric"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="h-9 w-20 rounded-lg border border-slate-300 px-3 focus:border-green-600 focus:outline-none"
                />
                <span className="text-xs text-slate-500">* required fields</span>
              </div>
              {errors.length > 0 && (
                <ul className="list-inside list-disc rounded-lg bg-red-50 p-2 text-[11px] text-red-700">
                  {errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
              <div className="flex justify-end pt-1">
                <Button type="submit" className="px-4 py-2">
                  Send Message
                </Button>
              </div>
              <p className="pt-2 text-center text-[11px] text-slate-500">
                You can also send messages to{" "}
                <a className="font-medium text-green-700 underline" href="mailto:directory@localfood.example">
                  directory@localfood.example
                </a>
              </p>
            </form>
          )}
        </div>
      </Container>
    </section>
  );
}
