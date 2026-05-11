"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

const faqItems = [
  {
    question: "How does the audit process work?",
    answer:
      "SpendScope connects to your workspace and finance tools in read-only mode, maps AI subscriptions to team usage, and highlights duplicate or underused licenses with recommended actions.",
  },
  {
    question: "Is my financial data secure?",
    answer:
      "Yes. Data connections are encrypted in transit and at rest, and SpendScope only requests scoped read permissions needed to generate your spend analysis.",
  },
  {
    question: "Which tools do you detect?",
    answer:
      "We detect major AI products and seats across engineering, design, and operations stacks, including direct vendor contracts and marketplace-managed subscriptions.",
  },
  {
    question: "How long does it take to see results?",
    answer:
      "Most teams get a full baseline report in under 60 seconds, with deeper optimization insights arriving as additional spend and license metadata syncs.",
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
