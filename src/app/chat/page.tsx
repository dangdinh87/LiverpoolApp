"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";

const Spinner = () => (
	<div className="flex h-full items-center justify-center">
		<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
	</div>
);

// The chat app (assistant-ui + AI SDK + markdown + react-query) is only fetched
// for a signed-in visitor; /chat used to ship ~525 KB gzip of JS to everyone,
// including people who only ever see the sign-in prompt below.
const ChatApp = dynamic(() => import("./chat-app"), { ssr: false, loading: Spinner });

export default function ChatPage() {
	const router = useRouter();
	const { user, isLoading: authLoading } = useAuthStore();
	const t = useTranslations();

	if (authLoading) return <Spinner />;

	if (!user) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-4 p-8 relative overflow-hidden">
				<div className="relative z-10 flex flex-col items-center gap-4">
					<div>
						<Image
							src="/assets/lfc/crest.webp"
							alt="LFC"
							width={58}
							height={72}
							priority
							className="h-[72px] w-auto drop-shadow-[0_0_20px_rgba(200,16,46,0.4)]"
						/>
					</div>
					<div className="text-center">
						<h1 className="font-bebas text-3xl tracking-wide text-gradient-red">
							LiverBird AI
						</h1>
						<p className="text-sm text-muted-foreground mt-1 max-w-md" suppressHydrationWarning>
							{t("chat.subtitle")}
						</p>
					</div>
					<Button onClick={() => router.push("/auth/login")} size="lg" className="glow-red">
						<LogIn className="mr-2 h-4 w-4" />
						<span suppressHydrationWarning>{t("auth.pleaseLogin")}</span>
					</Button>
				</div>
			</div>
		);
	}

	return <ChatApp />;
}
