type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0B0F19] text-white print:min-h-0 print:bg-[#0B0F19]">
      <div className="pointer-events-none absolute inset-0 print:hidden">
        <div className="absolute left-1/2 top-[-18rem] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-blue-500/25 blur-[170px]" />
        <div className="absolute right-[-10rem] top-[20%] h-[28rem] w-[28rem] rounded-full bg-violet-500/20 blur-[160px]" />
      </div>
      <div className="relative z-10 print:bg-[#0B0F19]">{children}</div>
    </div>
  );
}
