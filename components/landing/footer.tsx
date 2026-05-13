import { Logo } from "./logo";

const footerLinks = {
  Product: ["Features", "Pricing", "Run audit"],
  Company: ["About", "Careers", "Contact"],
  Legal: ["Privacy", "Terms", "Security"],
};

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0A0E18]/95 px-6 pb-8 pt-16 md:px-10 lg:px-16">
      <div className="mx-auto grid w-full max-w-7xl gap-12 md:grid-cols-[1.3fr_2fr]">
        <div>
          <Logo labelClassName="text-xl font-semibold" />
          <p className="mt-4 max-w-sm text-sm leading-7 text-white/65">
            SpendScope helps teams model AI software spend from what they already know,
            compare it to list benchmarks, and walk into renewals with clearer questions.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-8">
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="mb-4 text-sm font-semibold text-white">{title}</h4>
              <ul className="space-y-3 text-sm text-white/65">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="transition-colors hover:text-white">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto mt-14 flex w-full max-w-7xl items-center justify-between border-t border-white/10 pt-6">
        <p className="text-xs text-white/50">
          Copyright {new Date().getFullYear()} SpendScope. All rights reserved.
        </p>
        <div className="flex items-center gap-3">
          <a
            href="#"
            aria-label="Twitter"
            className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 5.8c-.7.3-1.4.5-2.2.6.8-.5 1.4-1.2 1.7-2.1-.7.4-1.6.8-2.5.9A3.8 3.8 0 0 0 12.4 8c0 .3 0 .6.1.8A10.9 10.9 0 0 1 4.6 5a3.8 3.8 0 0 0 1.2 5.1c-.6 0-1.2-.2-1.7-.5v.1c0 1.8 1.3 3.3 3 3.7-.3.1-.7.1-1 .1-.2 0-.5 0-.7-.1.5 1.5 1.9 2.6 3.6 2.6A7.6 7.6 0 0 1 2 18.1a10.8 10.8 0 0 0 5.8 1.7c7 0 10.8-5.8 10.8-10.8v-.5c.7-.5 1.4-1.1 1.9-1.8z" />
            </svg>
          </a>
          <a
            href="#"
            aria-label="GitHub"
            className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 19c-4 1.2-4-2-6-2" />
              <path d="M15 22v-3.1a3.4 3.4 0 0 0-1-2.6c3.3-.4 6.8-1.6 6.8-7A5.5 5.5 0 0 0 19.5 5.4 5.1 5.1 0 0 0 19.4 2s-1.1-.3-3.4 1.3a11.9 11.9 0 0 0-6 0C7.7 1.7 6.6 2 6.6 2a5.1 5.1 0 0 0-.1 3.4A5.5 5.5 0 0 0 5 9.3c0 5.3 3.5 6.5 6.8 7a3.4 3.4 0 0 0-1 2.6V22" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
