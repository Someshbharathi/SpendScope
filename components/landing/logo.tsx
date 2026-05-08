import { BrainCircuit } from "lucide-react";

type LogoProps = {
  labelClassName?: string;
};

export function Logo({ labelClassName = "text-lg font-semibold" }: LogoProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 shadow-[0_0_30px_rgba(97,120,255,0.4)]">
        <BrainCircuit className="h-5 w-5 text-white" />
      </div>
      <span className={labelClassName}>Credex</span>
    </div>
  );
}
