"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ChevronDown,
    Sparkles,
    Zap,
    Crown,
    Building2,
    Search,
    Check,
    Bot,
    Cpu,
    Brain,
    Flame,
    Lock,
    AlertCircle,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ModelInfo = {
    id?: string;
    name: string;
    tier: string;
    provider: string;
    contextWindow?: number;
};

type ModelSelectorProps<T extends string> = {
    models: Record<T, ModelInfo>;
    selectedModel: T;
    onModelChange: (model: T) => void;
};

const tierConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string; description: string; requiresUpgrade: boolean }> = {
    Economy: {
        icon: <Zap className="h-4 w-4" />,
        color: "text-emerald-500",
        bgColor: "bg-emerald-500/10 border-emerald-500/20",
        description: "Fast & affordable",
        requiresUpgrade: false,
    },
    Standard: {
        icon: <Sparkles className="h-4 w-4" />,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10 border-blue-500/20",
        description: "Balanced performance",
        requiresUpgrade: false,
    },
    Premium: {
        icon: <Crown className="h-4 w-4" />,
        color: "text-purple-500",
        bgColor: "bg-purple-500/10 border-purple-500/20",
        description: "Requires Premium tier",
        requiresUpgrade: true,
    },
    Enterprise: {
        icon: <Building2 className="h-4 w-4" />,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10 border-amber-500/20",
        description: "Requires Enterprise tier",
        requiresUpgrade: true,
    },
};

const providerConfig: Record<string, { icon: React.ReactNode; color: string }> = {
    OpenAI: { icon: <Brain className="h-3.5 w-3.5" />, color: "text-green-500" },
    Anthropic: { icon: <Bot className="h-3.5 w-3.5" />, color: "text-orange-500" },
    Google: { icon: <Sparkles className="h-3.5 w-3.5" />, color: "text-blue-500" },
    Mistral: { icon: <Flame className="h-3.5 w-3.5" />, color: "text-cyan-500" },
    "Open Source": { icon: <Cpu className="h-3.5 w-3.5" />, color: "text-violet-500" },
    Other: { icon: <Cpu className="h-3.5 w-3.5" />, color: "text-gray-500" },
};

const tiers = ["Economy", "Standard", "Premium", "Enterprise"] as const;

export function ModelSelector<T extends string>({
    models,
    selectedModel,
    onModelChange,
}: ModelSelectorProps<T>) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedTier, setSelectedTier] = useState<string>("all");

    const currentModel = models[selectedModel];
    const currentTier = currentModel?.tier || "Economy";

    // Convert models object to array for easier manipulation
    const modelsArray = useMemo(() => {
        return (Object.entries(models) as [T, ModelInfo][]).map(([id, info]) => ({
            id,
            ...info,
        }));
    }, [models]);

    // Filter models based on search and tier
    const filteredModels = useMemo(() => {
        return modelsArray.filter((model) => {
            const matchesSearch =
                model.name.toLowerCase().includes(search.toLowerCase()) ||
                model.provider.toLowerCase().includes(search.toLowerCase()) ||
                model.id.toLowerCase().includes(search.toLowerCase());
            const matchesTier = selectedTier === "all" || model.tier === selectedTier;
            return matchesSearch && matchesTier;
        });
    }, [modelsArray, search, selectedTier]);

    // Group filtered models by tier
    const modelsByTier = useMemo(() => {
        return tiers.reduce((acc, tier) => {
            acc[tier] = filteredModels.filter((m) => m.tier === tier);
            return acc;
        }, {} as Record<string, typeof filteredModels>);
    }, [filteredModels]);

    // Count models per tier
    const tierCounts = useMemo(() => {
        return tiers.reduce((acc, tier) => {
            acc[tier] = modelsArray.filter((m) => m.tier === tier).length;
            return acc;
        }, {} as Record<string, number>);
    }, [modelsArray]);

    const handleSelect = (modelId: T) => {
        onModelChange(modelId);
        setOpen(false);
        setSearch("");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    className={cn(
                        "gap-2 pl-3 pr-2 transition-all duration-200",
                        "border border-stadium-border bg-stadium-surface/50",
                        "hover:border-lfc-red/30 hover:bg-stadium-surface",
                        "text-white group relative overflow-hidden"
                    )}
                >
                    <span className={cn("flex items-center gap-1.5", tierConfig[currentTier]?.color)}>
                        {tierConfig[currentTier]?.icon}
                    </span>
                    <span className="hidden sm:inline font-medium text-sm max-w-[120px] truncate">
                        {currentModel?.name || "Select Model"}
                    </span>
                    <span className="sm:hidden font-medium text-sm">
                        {currentModel?.provider || "Model"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-stadium-muted shrink-0" />
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden bg-stadium-bg border-stadium-border">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-stadium-border">
                    <DialogTitle className="text-xl font-semibold flex items-center gap-2 text-white">
                        <Bot className="h-5 w-5 text-lfc-red" />
                        Choose AI Model
                    </DialogTitle>
                    <p className="text-sm text-stadium-muted mt-1">
                        Select the AI model that best fits your needs
                    </p>
                </DialogHeader>

                <div className="px-6 py-4 border-b border-stadium-border bg-stadium-surface/30">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stadium-muted" />
                        <Input
                            placeholder="Search models..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-stadium-surface/50 border-stadium-border text-white placeholder:text-stadium-muted focus-visible:ring-lfc-red/30 focus-visible:border-lfc-red/40"
                        />
                    </div>

                    {/* Tier Filter Tabs */}
                    <Tabs value={selectedTier} onValueChange={setSelectedTier} className="mt-4">
                        <TabsList className="w-full h-auto p-1 bg-stadium-surface/50 grid grid-cols-5 gap-1 border border-stadium-border">
                            <TabsTrigger
                                value="all"
                                className="text-xs px-2 py-1.5 text-stadium-muted data-[state=active]:bg-lfc-red data-[state=active]:text-white "
                            >
                                All ({modelsArray.length})
                            </TabsTrigger>
                            {tiers.map((tier) => (
                                <TabsTrigger
                                    key={tier}
                                    value={tier}
                                    disabled={tierCounts[tier] === 0}
                                    className={cn(
                                        "text-xs px-2 py-1.5 gap-1 text-stadium-muted ",
                                        "data-[state=active]:bg-lfc-red data-[state=active]:text-white",
                                        tierCounts[tier] === 0 && "opacity-50"
                                    )}
                                >
                                    <span className={cn("hidden sm:inline", tierConfig[tier].color)}>
                                        {tierConfig[tier].icon}
                                    </span>
                                    <span className="truncate">{tier}</span>
                                    <span className="text-[10px] opacity-70">({tierCounts[tier]})</span>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>

                {/* Models List */}
                <ScrollArea className="max-h-[400px]">
                    <div className="p-4">
                        {filteredModels.length === 0 ? (
                            <div className="text-center py-8 text-stadium-muted">
                                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No models found</p>
                                <p className="text-sm">Try adjusting your search</p>
                            </div>
                        ) : selectedTier === "all" ? (
                            // Grouped by tier view
                            <div className="space-y-6">
                                {tiers.map((tier) => {
                                    const tierModels = modelsByTier[tier];
                                    if (tierModels.length === 0) return null;

                                    return (
                                        <div key={tier}>
                                            <div
                                                className={cn(
                                                    "flex items-center gap-2 mb-3 px-2 py-1.5 ",
                                                    "border",
                                                    tierConfig[tier].bgColor
                                                )}
                                            >
                                                <span className={tierConfig[tier].color}>
                                                    {tierConfig[tier].icon}
                                                </span>
                                                <span className={cn("font-semibold text-sm", tierConfig[tier].color)}>
                                                    {tier}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    • {tierConfig[tier].description}
                                                </span>
                                                <Badge variant="secondary" className="ml-auto text-xs">
                                                    {tierModels.length}
                                                </Badge>
                                            </div>
                                            <div className="grid gap-2">
                                                {tierModels.map((model) => (
                                                    <ModelCard
                                                        key={model.id}
                                                        model={model}
                                                        isSelected={model.id === selectedModel}
                                                        onSelect={() => handleSelect(model.id as T)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            // Flat list for filtered tier
                            <div className="grid gap-2">
                                {filteredModels.map((model) => (
                                    <ModelCard
                                        key={model.id}
                                        model={model}
                                        isSelected={model.id === selectedModel}
                                        onSelect={() => handleSelect(model.id as T)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-stadium-border flex items-center justify-between">
                    <div className="text-xs text-stadium-muted">
                        {filteredModels.length} models available
                    </div>
                    <div className="flex items-center gap-2 text-xs text-stadium-muted">
                        <kbd className="px-1.5 py-0.5 rounded bg-stadium-surface border border-stadium-border text-[10px]">↑↓</kbd>
                        <span>Navigate</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-stadium-surface border border-stadium-border text-[10px]">Enter</kbd>
                        <span>Select</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Separate ModelCard component for cleaner code
function ModelCard({
    model,
    isSelected,
    onSelect,
}: {
    model: { id: string; name: string; tier: string; provider: string; contextWindow?: number };
    isSelected: boolean;
    onSelect: () => void;
}) {
    const provider = providerConfig[model.provider] || providerConfig.Other;
    const tier = tierConfig[model.tier] || tierConfig.Economy;
    const requiresUpgrade = tier.requiresUpgrade;

    const cardContent = (
        <button
            onClick={onSelect}
            className={cn(
                "w-full px-3 py-2.5  border text-left transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-lfc-red/30",
                "group relative cursor-pointer",
                requiresUpgrade
                    ? "opacity-70 hover:opacity-90"
                    : "hover:bg-white/5 hover:border-lfc-red/30",
                isSelected
                    ? "bg-lfc-red/10 border-lfc-red/40"
                    : "bg-stadium-surface/30 border-stadium-border"
            )}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    {/* Provider Icon */}
                    <div
                        className={cn(
                            "shrink-0 w-8 h-8  flex items-center justify-center",
                            "bg-stadium-surface border border-stadium-border",
                            provider.color
                        )}
                    >
                        {provider.icon}
                    </div>

                    {/* Model Info */}
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-white truncate">{model.name}</span>
                            {isSelected && (
                                <Check className="h-4 w-4 text-lfc-red shrink-0" />
                            )}
                            {requiresUpgrade && (
                                <Lock className="h-3 w-3 text-stadium-muted shrink-0" />
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn("text-xs", provider.color)}>
                                {model.provider}
                            </span>
                            <span className="text-stadium-muted text-[10px]">•</span>
                            <span className="text-xs text-stadium-muted truncate">
                                {model.id}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tier Badge */}
                <Badge
                    variant="outline"
                    className={cn(
                        "shrink-0 text-[10px] px-1.5 py-0 h-5 gap-1",
                        tier.color,
                        "border-current/30 bg-current/5"
                    )}
                >
                    {tier.icon}
                    {requiresUpgrade && <Lock className="h-2.5 w-2.5" />}
                </Badge>
            </div>

            {/* Hover effect */}
            <div
                className={cn(
                    "absolute inset-0  opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
                    requiresUpgrade
                        ? "bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5"
                        : "bg-gradient-to-r from-lfc-red/5 via-transparent to-lfc-red/5"
                )}
            />
        </button>
    );

    if (requiresUpgrade) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {cardContent}
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[200px]">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                            <span className="text-sm">
                                {tier.description}. You can still select it, but API may return an error.
                            </span>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return cardContent;
}
