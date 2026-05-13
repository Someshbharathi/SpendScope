"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

const faqItems = [
  {
    question: "How does the audit process work?",
    answer:
      "You enter the AI tools you pay for, plans, seats, and rough monthly spend. SpendScope compares that to published list benchmarks in our pricing table and returns recommendations and savings modeled from those inputs—no workspace or billing connection required.",
  },
  {
    question: "Is my financial data secure?",
    answer:
      "Data you submit goes over HTTPS. Saved audits live in our database so share links work; treat anything you wouldn’t put in a shared doc as sensitive. We don’t ask for bank or card access in this MVP.",
  },
  {
    question: "Which tools can I audit?",
    answer:
      "The form supports ChatGPT, Claude, Cursor, GitHub Copilot, and Gemini—each with plan choices aligned to our benchmark table. We don’t auto-detect subscriptions from your accounts; you toggle what applies.",
  },
  {
    question: "How long does it take to see results?",
    answer:
      "Usually under a minute: submit the form, we run the deterministic engine, then optional AI summary and email. There is no background “sync”—rerun when your stack changes.",
  },
];

export function FaqSection() {
  const [activeItem, setActiveItem] = useState(0);

  return (
    <section id="faq" className="px-6 py-24 md:px-10 lg:px-16">
      <div className="mx-auto w-full max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight md:text-5xl">
            Frequently asked questions
          </h2>
        </motion.div>
        <div className="mx-auto w-full max-w-5xl space-y-4">
          {faqItems.map((item, index) => {
            const isOpen = activeItem === index;
            return (
              <motion.div
                key={item.question}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
              >
                <button
                  type="button"
                  onClick={() => setActiveItem(isOpen ? -1 : index)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left"
                >
                  <span className="text-base font-medium md:text-lg">{item.question}</span>
                  <motion.span animate={{ rotate: isOpen ? 180 : 0 }}>
                    <ChevronDown className="h-5 w-5 text-white/70" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <p className="px-6 pb-6 text-sm leading-7 text-white/70 md:text-base">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
