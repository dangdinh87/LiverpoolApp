# Chat Page UI Structure & Components — Complete Audit

## Overview
The chat page is branded as **"The Kop AI"** — Liverpool FC themed chat interface with multi-source news search, conversation history, and LFC-centric styling using the Dark Stadium design system.

**Architecture**: Next.js 16 App Router + `@assistant-ui/react` + Groq LLM API

---

## 1. Page Structure

### File: `/src/app/chat/page.tsx` (Chat Page Wrapper)
**Purpose**: Main chat page component — handles auth, sidebar, conversation management, message history.

**Key Features**:
- Auth gating (redirects to login if not authenticated)
- Sidebar with conversation history + search
- ChatInterface wrapper around Thread component
- Floating toggle button for collapsed sidebar (mobile)
- Query-based conversation/history fetching

**Styling Classes**:
```
- `.relative .z-10` — layering
- `.flex .h-full .overflow-hidden` — layout container
- `.flex-1 .flex .flex-col .overflow-hidden .min-w-0 .relative` — chat area container
- `.fixed .top-2 .left-2 .z-20` — floating sidebar toggle
```

**Key State**:
- `currentConversationId` — selected conversation
- `sidebarCollapsed` — mobile sidebar toggle
- `chatKey` — force re-render on conversation switch
- `isNewThread` — track if new vs. historical conversation
- Query hooks: `conversations`, `conversationHistory`

**Not Logged In UI** (lines 172–200):
```
Displays hero with LFC crest, "The Kop AI" title, subtitle, login button
Classes: text-gradient-red, glow-red, drop-shadow-[0_0_20px_rgba(200,16,46,0.4)]
```

---

### File: `/src/app/chat/layout.tsx` (Chat Layout Wrapper)
**Purpose**: Fixed full-screen layout for all chat routes.

**Styling**:
```tsx
<div className="fixed inset-0 z-60 bg-stadium-bg flex flex-col font-barlow">
  <Image src="/assets/fan_made/background_1.jpg" opacity-[0.07] />
  {children}
</div>
```

**Key Props**:
- `bg-stadium-bg` — dark stadium background (`#0D0D0D`)
- `opacity-[0.07]` — subtle texture overlay
- `z-60` — above other page content
- `font-barlow` — Barlow Condensed font

---

## 2. Main Chat Components

### File: `/src/components/assistant-ui/thread.tsx` (Thread Component)
**Purpose**: Core chat interface — messages, composer, welcome screen, suggestions.

**Main Components**:
1. **ThreadPrimitive.Root** — Root container
   - `aui-root aui-thread-root @container`
   - `flex h-full flex-col bg-transparent`

2. **ThreadPrimitive.Viewport** — Scrollable message area
   - `aui-thread-viewport`
   - `flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth px-4 pt-4`
   - Custom scrollbar styling in globals.css

3. **ThreadWelcome** — Welcome screen (only shown when thread is empty)
4. **ThreadPrimitive.Messages** — Message list
5. **ThreadPrimitive.ViewportFooter** — Composer area
   - `aui-thread-viewport-footer`
   - `sticky bottom-0 mx-auto mt-auto flex w-full max-w-3xl flex-col gap-4 overflow-visible rounded-t-3xl bg-stadium-bg/80 backdrop-blur-md pb-4 md:pb-6`

#### ThreadWelcome Component
**Structure**:
```
- LFC Crest image (56x56px, drop shadow glow effect)
- Welcome text: "Hey Red! 👋" (text-gradient-red, font-bebas)
- Subtitle: "Ask me anything about Liverpool FC" (text-muted-foreground)
- Instruction box: Blue-gray background with border (bg-stadium-surface/60)
- Suggestions grid (2 columns on md+)
```

**Suggestion Cards**:
4 pre-built suggestions with titles + labels:
1. "Who is Liverpool's" / "all-time top scorer?" → Full prompt
2. "Tell me about" / "the Istanbul miracle"
3. "Compare Salah" / "with other LFC legends"
4. "What trophies has" / "Liverpool won?"

**Styling**:
```css
.aui-thread-welcome-suggestion {
  rounded-2xl border border-stadium-border 
  bg-stadium-surface/40 backdrop-blur-sm 
  px-4 py-3 text-left text-sm
  hover:bg-lfc-red/10 hover:border-lfc-red/30
}
```

**Animations**:
- `fade-in slide-in-from-bottom-1 animate-in duration-200`
- Staggered: `animationDelay: ${100 + index * 50}ms`
- Hidden on mobile (nth-[n+3]:hidden), shown on md (nth-[n+3]:block @md)

#### Composer Component
**Structure**:
```
ComposerPrimitive.Root
  ├─ AttachmentDropzone (rounded-2xl border with focus ring)
  │   ├─ ComposerAttachments (previous file previews)
  │   └─ ComposerPrimitive.Input (textarea, resize-none)
  └─ ComposerAction (flex items-center justify-between)
      ├─ ComposerAddAttachment (+icon button)
      └─ Send button (rounded-full, size-8)
```

**Input Placeholder**:
- EN: "Ask about Liverpool FC..."
- VI: (Vietnamese equivalent in messages/vi.json)

**Send Button**:
- **Not Running**: Blue arrow-up icon, clickable
- **Running**: Disabled, opacity-50, cursor-not-allowed

#### Message Components

**AssistantMessage**:
```css
.aui-assistant-message-root {
  fade-in slide-in-from-bottom-1 animate-in duration-150
  mx-auto w-full max-w-3xl py-3
  data-role="assistant"
}
```

- Content: wrapped in `.aui-assistant-message-content` (px-2)
- ActionBar: copy, export markdown, regenerate buttons
- Tool results rendered via `MessagePrimitive.Parts`

**UserMessage**:
```css
.aui-user-message-root {
  mx-auto grid w-full max-w-3xl auto-rows-auto grid-cols-[minmax(72px,1fr)_auto]
  gap-y-2 px-2 py-3 [&:where(>*)]:col-start-2
  data-role="user"
}
```

- User message bubble: `rounded-2xl bg-muted px-4 py-2.5`
- Branch picker (for alternate generations)
- Edit action button (pencil icon)

**EditComposer**:
```css
.aui-edit-composer-root {
  ml-auto w-full max-w-[85%] flex-col rounded-2xl bg-muted
}
```

- Input: `min-h-14 w-full resize-none bg-transparent p-4`
- Footer: Cancel + Update buttons (self-end)

#### Scroll to Bottom Button
```css
.aui-thread-scroll-to-bottom {
  -top-12 absolute z-10 self-center rounded-full p-4 disabled:invisible
  dark:bg-background dark:hover:bg-accent
}
```

---

### File: `/src/components/chat/chat-history-panel.tsx` (ChatSidebar)
**Purpose**: Left sidebar — conversation history, search, new chat button.

**Structure**:

**Header Section** (px-3 py-3):
- LFC crest + "The Kop AI" title (font-bebas text-lg text-gradient-red)
- Action buttons:
  - Home button (arrow-left)
  - Close sidebar button (panel-left-close)
- "New Chat" button (outline variant, glow effect)

**Search Section** (px-2 py-2):
- Search input with magnifying glass icon
- Placeholder: "Search..." (or translated)

**Conversation List** (ScrollArea):
- Grouped by time: Today, Yesterday, Last 7 Days, Older
- Each conversation:
  - Hover shows delete menu (MoreHorizontal → Trash2)
  - Current: `bg-lfc-red/15 text-white` + font-medium
  - Inactive: `text-stadium-muted hover:bg-white/5`

**Empty State**:
- MessageSquare icon (text-stadium-muted/30)
- "No conversations yet. Start a new chat!" or "No results found"

**Styling**:
```css
.aside {
  fixed inset-y-0 left-0 md:relative z-[66]
  flex flex-col bg-stadium-surface border-r border-stadium-border
  transition-all duration-300 ease-in-out
  
  /* Collapsed: hidden on mobile, width 0 on desktop */
  collapsed ? -translate-x-full md:w-0 : translate-x-0 w-72
}
```

**Mobile Overlay**:
- Semi-transparent backdrop (bg-black/50) when sidebar open
- Closes on click

---

## 3. Supporting UI Components

### File: `/src/components/assistant-ui/markdown-text.tsx` (MarkdownText)
**Purpose**: Render assistant responses with Markdown formatting + code syntax highlighting.

**Features**:
- GitHub-flavored markdown (remark-gfm)
- Code blocks with language header + copy button
- Tables, lists, blockquotes, headings with custom styling
- Inline code with rounded border + bg-muted

**Key Classes**:
```css
h1, h2, h3: scroll-m-20, mb-8/4/6, font-semibold/extrabold, text-4xl/3xl/2xl
p: mt-5 mb-5 leading-7 first:mt-0 last:mb-0
a: font-medium text-primary underline underline-offset-4
code: aui-md-inline-code rounded border bg-muted font-semibold
pre: overflow-x-auto rounded-b-lg bg-black p-4 text-white

table wrapper: overflow-x-auto rounded-lg border
th: bg-muted px-4 py-2.5 font-semibold border-b
td: px-4 py-2.5 text-left border-b
tr:hover: bg-muted/50 transition-colors
```

**CodeHeader**:
```css
div.aui-code-header-root {
  mt-4 flex items-center justify-between gap-4 
  rounded-t-lg bg-muted-foreground/15 px-4 py-2
  dark:bg-muted-foreground/20
}
```

---

### File: `/src/components/assistant-ui/attachment.tsx` (Attachment/File Upload)
**Purpose**: File upload UI — image preview, remove button.

**Components**:
1. **ComposerAddAttachment**: Plus icon button to add files
   - Size: 34px, rounded-full
   - Hover: `hover:bg-muted-foreground/15 dark:hover:bg-muted-foreground/30`

2. **ComposerAttachments**: List of attached files in composer
   - Flex row, gap-2, overflow-x-auto

3. **UserMessageAttachments**: Attached files in user message
   - Col-span-full, flex justify-end

4. **AttachmentUI**: Individual file tile
   - Size: 14px (rounded), 24px (composer)
   - Hover: opacity-75
   - Remove button (absolute top-right, bg-white, hover destructive)

5. **AttachmentPreviewDialog**: Modal for viewing attachment
   - Max height: 80vh
   - Close button: rounded-full, bg-foreground/60, opacity-100

---

### File: `/src/components/assistant-ui/web-search-tool.tsx` (Web Search Tool)
**Purpose**: Display web search progress + results when AI searches the web.

**Structure**:
```
Header (expandable):
  - Status icon: lfc-red/20 (running) or green-500/20 (complete)
  - Loading spinner or check icon
  - "Searching the web..." or "Web search"
  - Query text (truncated)
  - Source count + chevron

Loading Progress:
  - Shimmer bar: `bg-gradient-to-r from-lfc-red/0 via-lfc-red/50 to-lfc-red/0 animate-shimmer`

Expanded Results:
  - List of sources (title, URL, snippet)
  - External link icon per source
  - Hover: `group-hover:text-primary`
```

**Styling**:
```css
.root {
  rounded-xl border border-stadium-border 
  bg-stadium-surface/50 overflow-hidden
}

.header {
  flex w-full items-center gap-3 px-4 py-3 text-left
  hasCompleted && hover:bg-stadium-surface/80 cursor-pointer
}

.status-icon {
  flex size-8 items-center justify-center rounded-full
  isRunning ? bg-lfc-red/20 text-lfc-red : bg-green-500/20 text-green-400
}
```

---

### File: `/src/components/assistant-ui/tool-fallback.tsx` (Tool Fallback)
**Purpose**: Fallback UI for generic tool calls (non-web-search).

**Structure**:
```
Header (collapsible):
  - Check or X icon
  - "Used tool: <name>" or "Cancelled tool: <name>"
  - Expand/collapse chevron

Content (when expanded):
  - Args (pre-formatted, monospace)
  - Result (JSON, pre-formatted)
  - Cancelled reason (if cancelled)
```

**Styling**:
```css
.root {
  mb-4 flex w-full flex-col gap-3 rounded-lg border py-3
  isCancelled && border-muted-foreground/30 bg-muted/30
}

.title {
  aui-tool-fallback-title grow
  isCancelled && text-muted-foreground line-through
}

content: pre { whitespace-pre-wrap }
```

---

### File: `/src/components/assistant-ui/tooltip-icon-button.tsx` (TooltipIconButton)
**Purpose**: Reusable icon button with tooltip (used throughout chat UI).

**Props**:
```tsx
{
  tooltip: string;
  side?: "top" | "bottom" | "left" | "right";
  variant?: "default" | "ghost" | "outline";
  size?: "icon" | "sm" | "lg";
  ...ButtonProps
}
```

**Styling**:
```css
button {
  aui-button-icon size-6 p-1
  rounded-full (default for compose buttons)
}

span.aui-sr-only { sr-only } /* Accessibility */
```

---

### File: `/src/components/chat/thinking-indicator.tsx` (ThinkingIndicator & Skeleton)
**Purpose**: Loading states while AI processes response.

**ThinkingIndicator**:
```
Avatar:
  - Normal: LFC crest (size-8, animate-pulse)
  - Searching: Red gradient circle with spinning globe
  - Ping ring: absolute inset-0 animate-ping

Content:
  - Text: "Thinking..." or "Searching the web..."
  - Shimmer bars (2-3 bars with staggered animation)
  - Animations: animate-shimmer (gradient sweep left→right)
```

**ChatHistorySkeleton**:
- 3 pairs of assistant + user message skeletons
- Each with different width variations (w-3/4, w-1/2, etc.)
- Staggered fade-in + slide animations
- Bottom: wave animation (5 dots, 1.2s cycle)

**Styling**:
```css
/* Shimmer animation in globals.css */
@keyframes shimmer {
  0%, 100% { background-position: 200% center; }
  50% { background-position: -200% center; }
}
.animate-shimmer { animation: shimmer 2s infinite; }

/* Wave animation in globals.css */
@keyframes wave {
  0%, 100% { transform: scaleY(1); opacity: 0.4; }
  50% { transform: scaleY(2.2); opacity: 1; }
}
.animate-wave { animation: wave 1.2s ease-in-out infinite; }
```

---

## 4. Styling & Theme

### Custom CSS Classes (globals.css)
```css
/* Assistant-UI thread viewport custom scrollbar */
.aui-thread-viewport {
  scrollbar-width: thin;
  scrollbar-color: hsl(0 0% 20% / 0.5) transparent;
}

.aui-thread-viewport::-webkit-scrollbar {
  width: 8px;
}

.aui-thread-viewport::-webkit-scrollbar-track {
  background: transparent;
}

.aui-thread-viewport::-webkit-scrollbar-thumb {
  background-color: hsl(0 0% 30% / 0.5);
  border-radius: 9999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.aui-thread-viewport::-webkit-scrollbar-thumb:hover {
  background-color: hsl(0 0% 40% / 0.7);
}
```

### Design Tokens (Dark Stadium Theme)
```
Background: bg-stadium-bg = #0D0D0D
Surface: bg-stadium-surface
Surface2: bg-stadium-surface2
Border: border-stadium-border
Muted Text: text-stadium-muted

LFC Red: text-gradient-red, lfc-red = #C8102E
LFC Gold: lfc-gold = #F6EB61

Fonts:
- font-bebas (headlines, "The Kop AI")
- font-barlow (body, chat page)
- font-inter (default body)
```

### Utility Classes Used
```
- text-gradient-red: gradient red text
- glow-red: red glow effect
- drop-shadow-[...]: custom shadows
- backdrop-blur-md: frosted glass effect
- rounded-t-3xl, rounded-b-lg: border radius variants
- @container, @md: container queries
- md:block, md:grid-cols-2: responsive breakpoints
```

---

## 5. Translation Keys (i18n)

**File**: `/src/messages/en.json`

**Chat-Specific Keys**:
```json
{
  "chat": {
    "thinking": "Thinking...",
    "searching": "Searching the web...",
    "newChat": "New Chat",
    "subtitle": "AI Assistant",
    "historyTitle": "Chat History",
    "noConversations": "No conversations yet. Start a new chat!",
    "deleteConfirmTitle": "Delete conversation?",
    "deleteConfirmDescription": "This action cannot be undone. All messages...",
    "conversationGroups": {
      "older": "Older"
    },
    "thread": {
      "welcome": "Hey Red! 👋",
      "welcomeSubtitle": "Ask me anything about Liverpool FC",
      "instruction": "I can help with LFC history, player stats, match info, transfer news, and more. YNWA!",
      "scrollToBottom": "Scroll to bottom",
      "inputPlaceholder": "Ask about Liverpool FC...",
      "sendMessage": "Send message",
      "generating": "Generating...",
      "error": "Something went wrong",
      "copy": "Copy",
      "exportMarkdown": "Export as Markdown",
      "refresh": "Regenerate",
      "edit": "Edit",
      "cancel": "Cancel",
      "update": "Update",
      "previous": "Previous",
      "next": "Next",
      "suggestions": {
        "topScorer": { "title": "Who is Liverpool's", "label": "all-time top scorer?", "prompt": "..." },
        "istanbul": { "title": "Tell me about", "label": "the Istanbul miracle", "prompt": "..." },
        "salahLegends": { "title": "Compare Salah", "label": "with other LFC legends", "prompt": "..." },
        "trophies": { "title": "What trophies has", "label": "Liverpool won?", "prompt": "..." }
      }
    }
  }
}
```

**Related Keys**:
```json
{
  "history": {
    "dateRange": { "today": "Today", "yesterday": "Yesterday", "last7Days": "Last 7 Days" }
  },
  "common": { "delete": "Delete", "search": "Search...", "cancel": "Cancel", "back": "Back" }
}
```

---

## 6. Data Flow & State Management

### Authentication
- Uses `useAuthStore()` from Zupabase auth
- Redirects to `/auth/login` if not authenticated
- Shows LFC crest + login button in unauthenticated state

### Conversation Management
- **Query**: `conversations` (all user conversations, fetched from `/api/conversations`)
- **Query**: `conversationHistory` (messages for selected conversation)
- **Callbacks**:
  - `onConversationCreated()` — adds new conversation to history
  - `onDeleteConversation()` — removes from query + list
  - `onSelectConversation()` — switches to conversation, closes sidebar on mobile

### Message Flow
1. User types in Composer
2. Sent to `/api/chat-groq` with model + conversationId
3. AssistantRuntime streams response
4. ThreadPrimitive displays messages
5. If web_search tool called → WebSearchTool component renders

---

## 7. Configuration

**File**: `/src/config/constants.ts`

```tsx
export const DEFAULT_CHAT_AI_MODEL = 'llama-3.3-70b-versatile';

export const ALLOWED_CHAT_MODELS: string[] = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'qwen/qwen3-32b',
];
```

---

## 8. Key Files Summary

| File | Purpose | Key Components |
|------|---------|-----------------|
| `src/app/chat/page.tsx` | Main chat page | ChatInterface, ChatSidebar, auth gating |
| `src/app/chat/layout.tsx` | Full-screen layout | Fixed container, texture overlay |
| `src/components/assistant-ui/thread.tsx` | Chat thread UI | ThreadWelcome, ThreadSuggestions, Messages, Composer |
| `src/components/chat/chat-history-panel.tsx` | Sidebar | Conversation list, search, new chat button |
| `src/components/assistant-ui/markdown-text.tsx` | Response rendering | Markdown parsing, code blocks |
| `src/components/assistant-ui/web-search-tool.tsx` | Web search UI | Search progress, source links |
| `src/components/assistant-ui/tool-fallback.tsx` | Generic tool UI | Expandable tool results |
| `src/components/chat/thinking-indicator.tsx` | Loading states | ThinkingIndicator, ChatHistorySkeleton, shimmer animations |

---

## 9. Rebranding Opportunities

**Current Branding**:
- "The Kop AI" title (Bebas Neue font, red gradient)
- LFC crest icon
- Red/gold color scheme
- "Hey Red! 👋" welcome
- "YNWA!" sign-off

**To Rebrand**:
1. Replace "The Kop AI" → custom title
2. Update LFC crest → new icon/logo
3. Modify color palette (sidebar, buttons, text gradients)
4. Update i18n keys (welcome, suggestions, instructions)
5. Change sidebar styling (bg colors, hover states)
6. Update suggestion prompts (Liverpool FC → generic or custom domain)
7. Modify thread welcome message + instruction text

