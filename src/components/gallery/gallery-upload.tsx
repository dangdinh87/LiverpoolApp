"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { GALLERY_CATEGORIES } from "@/lib/constants";

interface UploadResult {
  id: string;
  src: string;
  alt: string;
  category: string;
}

interface GalleryUploadProps {
  onUploadComplete: (image: UploadResult) => void;
}

export function GalleryUpload({ onUploadComplete }: GalleryUploadProps) {
  const t = useTranslations("Gallery");
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [alt, setAlt] = useState("");
  const [category, setCategory] = useState<string>("anfield");
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileObjRef = useRef<File | null>(null);

  const categoryLabels: Record<string, string> = {
    anfield: t("categories.anfield"),
    squad: t("categories.squad"),
    matches: t("categories.matches"),
    fans: t("categories.fans"),
    legends: t("categories.legends"),
    trophies: t("categories.trophies"),
    history: t("categories.history"),
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    fileObjRef.current = file;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!fileObjRef.current) return;
    setUploading(true);
    setSuccess(false);

    const formData = new FormData();
    formData.append("file", fileObjRef.current);
    formData.append("alt", alt);
    formData.append("category", category);

    try {
      const res = await fetch("/api/gallery", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.image) {
        setSuccess(true);
        onUploadComplete(data.image);
        setTimeout(() => {
          setPreview(null);
          setAlt("");
          setCategory("anfield");
          setSuccess(false);
          fileObjRef.current = null;
          if (fileRef.current) fileRef.current.value = "";
        }, 1500);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setAlt("");
    setCategory("anfield");
    fileObjRef.current = null;
    if (fileRef.current) fileRef.current.value = "";
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-lfc-red/10 border border-lfc-red/30 text-lfc-red text-xs font-barlow font-bold uppercase tracking-widest hover:bg-lfc-red/20 transition-colors cursor-pointer"
      >
        <Upload size={14} />
        {t("upload.button")}
      </button>
    );
  }

  return (
    <div className="bg-stadium-surface border border-stadium-border p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bebas text-xl text-white tracking-wider">
          {t("upload.title")}
        </h3>
        <button
          onClick={() => { setOpen(false); reset(); }}
          className="text-stadium-muted hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* File picker + preview */}
        <div>
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-48 object-cover border border-stadium-border"
              />
              <button
                onClick={reset}
                className="absolute top-2 right-2 p-1 bg-black/60 text-white hover:bg-black/80 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-stadium-border hover:border-lfc-red/50 transition-colors cursor-pointer">
              <Upload size={24} className="text-stadium-muted mb-2" />
              <span className="text-stadium-muted text-xs font-inter">
                {t("upload.dropzone")}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Form fields */}
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-[10px] font-barlow font-bold uppercase tracking-widest text-stadium-muted mb-1">
              {t("upload.altLabel")}
            </label>
            <input
              type="text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder={t("upload.altPlaceholder")}
              className="w-full px-3 py-2 bg-stadium-bg border border-stadium-border text-white text-sm font-inter placeholder:text-stadium-muted/50 focus:border-lfc-red/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-barlow font-bold uppercase tracking-widest text-stadium-muted mb-1">
              {t("upload.categoryLabel")}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {GALLERY_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1 text-[10px] font-barlow font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                    category === cat
                      ? "bg-lfc-red border-lfc-red text-white"
                      : "bg-transparent border-stadium-border text-stadium-muted hover:border-white/30"
                  }`}
                >
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={!preview || uploading}
            className="mt-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-lfc-red text-white font-barlow font-bold uppercase tracking-widest text-xs hover:bg-lfc-red-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {uploading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {t("upload.uploading")}
              </>
            ) : success ? (
              <>
                <Check size={14} />
                {t("upload.success")}
              </>
            ) : (
              <>
                <Upload size={14} />
                {t("upload.submit")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
