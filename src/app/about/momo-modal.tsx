"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

export function MomoModal() {
    const t = useTranslations("About.support");
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 font-barlow font-bold uppercase tracking-[0.12em] text-sm text-white hover:opacity-90 transition-opacity cursor-pointer"
                style={{ backgroundColor: "#ae2070" }}
            >
                MoMo
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="relative bg-white rounded-2xl p-4 max-w-sm mx-4 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setOpen(false)}
                            className="absolute -top-3 -right-3 w-8 h-8 bg-stadium-bg border border-stadium-border rounded-full flex items-center justify-center text-white hover:bg-lfc-red transition-colors z-10"
                        >
                            <X size={16} />
                        </button>
                        <Image
                            src="/assets/momo-qr.png"
                            alt={t("momoAlt")}
                            width={400}
                            height={400}
                            className="rounded-xl"
                        />
                    </div>
                </div>
            )}
        </>
    );
}
