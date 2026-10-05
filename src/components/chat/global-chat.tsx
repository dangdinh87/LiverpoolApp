"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { X, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

// The panel (assistant-ui + AI SDK + markdown, ~250 KB gzip) is fetched on the
// first click instead of shipping in the shared bundle of every route.
const GlobalChatPanel = dynamic(() => import("./global-chat-panel"), { ssr: false });

export function GlobalChat() {
	const t = useTranslations("chat.widget");
	const pathname = usePathname();
	const { user } = useAuthStore();
	const [isOpen, setIsOpen] = useState(false);
	// Stays mounted after the first open so closing keeps the conversation.
	const [hasOpened, setHasOpened] = useState(false);
	const fabRef = useRef<HTMLButtonElement>(null);

	const visible = pathname !== "/chat" && !!user;

	// Tell other fixed controls (scroll-to-top) to stack above the chat button.
	useEffect(() => {
		if (!visible) return;
		const root = document.documentElement;
		root.style.setProperty("--fab-offset", "4.25rem");
		return () => {
			root.style.removeProperty("--fab-offset");
		};
	}, [visible]);

	// Hide on dedicated chat page and when not logged in
	if (!visible) return null;

	const close = () => {
		setIsOpen(false);
		// Return focus to the trigger (it is only covered, never unmounted).
		fabRef.current?.focus();
	};

	return (
		<>
			{/* Trigger — bottom right, clear of the home indicator */}
			<button
				ref={fabRef}
				type="button"
				onClick={() => {
					if (isOpen) return close();
					setHasOpened(true);
					setIsOpen(true);
				}}
				className={cn(
					"safe-bottom safe-right fixed z-[70] flex size-14 items-center justify-center rounded-full text-white",
					"transition-[background-color,box-shadow,filter] duration-200 hover:brightness-110 active:brightness-95",
					isOpen
						? "bg-stadium-surface border border-[var(--line-strong)] shadow-lg"
						: "bg-lfc-red shadow-[0_0_24px_rgba(200,16,46,0.4)]"
				)}
				aria-label={isOpen ? t("close") : t("open")}
				aria-expanded={isOpen}
				aria-haspopup="dialog"
			>
				{isOpen ? <X className="size-6" aria-hidden /> : <MessageCircle className="size-7" aria-hidden />}
			</button>

			{hasOpened && <GlobalChatPanel isOpen={isOpen} onClose={close} />}
		</>
	);
}
