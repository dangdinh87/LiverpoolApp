import Image from "next/image";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-60 bg-stadium-bg flex flex-col font-barlow">
      {/* Background image */}
      <Image
        src="/assets/fan_made/background_1.jpg"
        alt=""
        fill
        className="object-cover opacity-[0.07] pointer-events-none select-none"
        priority
      />
      {children}
    </div>
  );
}
