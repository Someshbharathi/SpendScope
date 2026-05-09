"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Check,
  Code2,
  DollarSign,
  Github,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";

type Step = 1 | 2;
type ToolId = "chatgpt" | "claude" | "cursor" | "copilot" | "gemini";

type Tool = {
  id: ToolId;
  name: string;
  provider: string;
  icon: React.ComponentType<{ className?: string }>;
};

const tools: Tool[] = [
  { id: "chatgpt", name: "ChatGPT Plus", provider: "OpenAI", icon: Bot },
  { id: "claude", name: "Claude Pro", provider: "Anthropic", icon: MessageSquare },
  { id: "cursor", name: "Cursor IDE", provider: "Anysphere", icon: Code2 },
  { id: "copilot", name: "GitHub Copilot", provider: "GitHub", icon: Github },
  { id: "gemini", name: "Gemini Advanced", provider: "Google", icon: Sparkles },
];

const stepVariants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

export function Audit() {
  const [step, setStep] = useState<Step>(1);
  const [selectedTools, setSelectedTools] = useState<ToolId[]>([]);
  const [department, setDepartment] = useState("");
  const [monthlySpend, setMonthlySpend] = useState("");
  const [totalSeats, setTotalSeats] = useState("");

  const hasChatgptClaude = useMemo(
    () => selectedTools.includes("chatgpt") && selectedTools.includes("claude"),
    [selectedTools],
  );

  const toggleTool = (toolId: ToolId) => {
    setSelectedTools((prev) =>
      prev.includes(toolId) ? prev.filter((item) => item !== toolId) : [...prev, toolId],
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Placeholder submit: wire this to backend processing when API is ready.
    console.log("Audit payload", {
      selectedTools,
      department,
      monthlySpend,
      totalSeats,
    });
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0B0F19] px-6 py-10 text-white md:px-10 lg:px-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-20 h-72 w-72 rounded-full bg-blue-500/20 blur-[140px]" />
        <div className="absolute -right-28 top-1/3 h-80 w-80 rounded-full bg-violet-500/20 blur-[160px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <header className="mb-8 space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">AI Spend Audit</h1>
            <p className="mt-2 text-base text-white/70">
              Share your current stack and we&apos;ll surface overlap, risk, and savings potential.
            </p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-white/5 bg-[#121827]/80 p-6 backdrop-blur-xl lg:col-span-2"
          >
            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-white/60">
                <span className={step >= 1 ? "text-blue-200" : ""}>Step 1</span>
                <span className={step >= 2 ? "text-blue-200" : ""}>Step 2</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={false}
                  animate={{ width: step === 1 ? "50%" : "100%" }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-400"
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step-1"
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <h2 className="text-2xl font-semibold">Which AI tools does your team use?</h2>
                  <p className="mt-2 text-sm text-white/65">
                    Select all tools currently active across your organization.
                  </p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {tools.map((tool) => {
                      const selected = selectedTools.includes(tool.id);
                      const Icon = tool.icon;

                      return (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => toggleTool(tool.id)}
                          className={`relative rounded-2xl border p-4 text-left transition ${
                            selected
                              ? "border-blue-300/70 bg-blue-500/10 shadow-[0_0_26px_rgba(59,130,246,0.25)]"
                              : "border-white/10 bg-[#101625] hover:border-white/20"
                          }`}
                        >
                          {selected ? (
                            <span className="absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-400 text-[#0B0F19]">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          ) : null}
                          <Icon className="h-5 w-5 text-blue-200" />
                          <p className="mt-3 font-medium">{tool.name}</p>
                          <p className="text-sm text-white/60">{tool.provider}</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-8">
                    <button
                      type="button"
                      disabled={selectedTools.length === 0}
                      onClick={() => setStep(2)}
                      className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(99,102,241,0.35)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Continue Details
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step-2"
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <h2 className="text-2xl font-semibold">Usage details</h2>
                  <p className="mt-2 text-sm text-white/65">
                    Help us calibrate your baseline and identify cost anomalies.
                  </p>

                  <div className="mt-6 space-y-5">
                    <label className="block">
                      <span className="mb-2 block text-sm text-white/70">Primary Department</span>
                      <select
                        value={department}
                        onChange={(event) => setDepartment(event.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#0E1422] px-4 py-3 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_30px_rgba(0,0,0,0.35)] outline-none transition focus:border-blue-300/60"
                        required
                      >
                        <option value="" disabled>
                          Select a department
                        </option>
                        <option value="engineering">Engineering</option>
                        <option value="design">Design</option>
                        <option value="marketing">Marketing</option>
                        <option value="company-wide">Company-wide</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm text-white/70">Avg. Monthly Spend</span>
                      <div className="relative">
                        <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                        <input
                          type="number"
                          min={0}
                          value={monthlySpend}
                          onChange={(event) => setMonthlySpend(event.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[#0E1422] py-3 pl-10 pr-4 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_30px_rgba(0,0,0,0.35)] outline-none transition focus:border-blue-300/60"
                          placeholder="5000"
                          required
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm text-white/70">Total Seats / Users</span>
                      <div className="relative">
                        <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                        <input
                          type="number"
                          min={1}
                          value={totalSeats}
                          onChange={(event) => setTotalSeats(event.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[#0E1422] py-3 pl-10 pr-4 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_30px_rgba(0,0,0,0.35)] outline-none transition focus:border-blue-300/60"
                          placeholder="45"
                          required
                        />
                      </div>
                    </label>
                  </div>

                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium transition hover:bg-white/10"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-gradient-to-r from-blue-400 to-violet-400 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_32px_rgba(96,136,255,0.5)] transition hover:translate-y-[-1px]"
                    >
                      Analyze My Spend
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          <aside className="rounded-3xl border border-white/5 bg-[#121827]/80 p-6 backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-200" />
              <h3 className="text-lg font-semibold">Live Insights</h3>
            </div>

            {hasChatgptClaude ? (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4">
                <p className="text-sm font-semibold text-amber-200">Consolidation Opportunity</p>
                <p className="mt-2 text-sm leading-6 text-amber-100/85">
                  Selecting multiple conversational AI models often results in redundant spend.
                  Average teams save 30% by consolidating.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">Stack Check</p>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  Select the tools your team uses to uncover potential overlap.
                </p>
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-blue-300/20 bg-blue-500/10 p-4">
              <p className="text-sm font-semibold text-blue-200">Estimated Savings</p>
              <p className="mt-2 text-sm leading-6 text-blue-100/80">
                A focused spend audit can reduce software costs by up to{" "}
                <span className="font-semibold text-blue-100">$4,200 annually</span>.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
