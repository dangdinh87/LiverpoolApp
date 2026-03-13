# Claude Code Architecture — 4 Khái Niệm Chính

> Tài liệu giải thích chi tiết các thành phần cốt lõi của Claude Code, phù hợp để trình bày cho người khác.

---

## 1. Skill (Kỹ năng)

**Bản chất:** File prompt template (`.md`) được load vào context khi gọi.

**Cách hoạt động:**
- Skill = 1 file markdown chứa instructions chi tiết
- Khi user gọi `/commit`, Claude Code đọc file `commit.md`, inject nội dung vào conversation context
- Claude sau đó follow instructions trong file đó để thực hiện task
- Skill **không phải code chạy được** — nó là "bản hướng dẫn" cho AI

**Vị trí lưu trữ:**
```
~/.claude/skills/
├── commit.md          → Hướng dẫn cách tạo git commit chuẩn
├── review-pr.md       → Hướng dẫn cách review pull request
├── plan-hard.md       → Hướng dẫn cách lập kế hoạch phức tạp
└── plan-parallel.md   → Hướng dẫn cách lập kế hoạch song song
```

**Khi nào dùng:** Khi bạn muốn Claude tuân theo 1 quy trình cố định, lặp đi lặp lại. Giống như SOP (Standard Operating Procedure) cho AI.

**So sánh dễ hiểu:** Skill = **công thức nấu ăn**. Mỗi lần gọi, đầu bếp (Claude) đọc công thức và làm theo.

---

## 2. Command (Lệnh tắt)

**Bản chất:** Shortcut để gọi Skill, có thể kèm tham số.

**Cách hoạt động:**
- Command = alias/shortcut trỏ tới 1 Skill cụ thể
- `/commit` là command → gọi skill `commit.md`
- `/plan:hard` là command có variant → gọi skill `plan-hard.md`
- Command có thể nhận arguments: `/review-pr 123` → truyền `123` vào skill

**Mối quan hệ với Skill:**
```
Command "/commit"        ──→  Skill "commit.md"
Command "/plan:hard"     ──→  Skill "plan-hard.md"
Command "/plan:parallel" ──→  Skill "plan-parallel.md"
```

**So sánh dễ hiểu:** Command = **nút bấm trên remote TV**. Mỗi nút (command) kích hoạt 1 chức năng (skill). Bạn bấm nút "Volume Up" thay vì phải nói "tăng âm lượng lên 1 bậc".

---

## 3. Agent (Tác nhân)

**Bản chất:** Subprocess độc lập — 1 phiên Claude riêng biệt chạy song song.

**Cách hoạt động:**
- Agent = Claude Code spawn ra 1 **process con** hoàn toàn mới
- Process con có context riêng, tools riêng, chạy độc lập
- Khi xong, trả kết quả về cho process cha (main conversation)
- Có thể chạy **nhiều agent song song** (parallel execution)

**Các loại agent có sẵn:**

| Agent | Nhiệm vụ |
|-------|----------|
| `researcher` | Nghiên cứu, tìm docs, so sánh công nghệ |
| `tester` | Chạy test, phân tích coverage |
| `code-reviewer` | Review code, tìm bugs, security |
| `debugger` | Debug lỗi, phân tích logs |
| `planner` | Lập kế hoạch implementation |
| `fullstack-developer` | Code backend + frontend |
| `scout` | Tìm file trong codebase lớn |
| `git-manager` | Quản lý git commits |
| `database-admin` | Tối ưu DB, queries |

**Tại sao cần Agent thay vì làm trực tiếp?**
1. **Isolation** — Agent có context riêng, không làm "đầy" context chính
2. **Parallelism** — Chạy 5 agent cùng lúc, nhanh gấp 5 lần
3. **Specialization** — Mỗi agent có toolset riêng phù hợp nhiệm vụ

**So sánh dễ hiểu:** Agent = **nhân viên được giao việc**. Bạn (manager) giao task cho nhân viên, họ tự đi làm và báo cáo kết quả. Bạn có thể giao nhiều nhân viên làm song song.

---

## 4. Workflow (Quy trình)

**Bản chất:** File rule/config (`.md`) được **tự động load** theo điều kiện — không cần user gọi.

**Cách hoạt động:**
- Workflow = rule files đặt trong `~/.claude/workflows/`
- Được load **tự động** khi match điều kiện (ví dụ: khi đang ở repo nhất định, khi file type nhất định)
- Khác với Skill: Skill phải gọi thủ công, Workflow tự kích hoạt
- Thường dùng để enforce coding standards, conventions, patterns

**Vị trí lưu trữ:**
```
~/.claude/workflows/
├── development-rules.md    → Quy tắc dev chung, auto-load mọi session
├── react-conventions.md    → Auto-load khi làm việc với .tsx files
└── git-workflow.md         → Auto-load khi thao tác git
```

**So sánh dễ hiểu:** Workflow = **nội quy công ty**. Nhân viên (Claude) tự động tuân thủ mà không cần ai nhắc. Skill là "công thức" bạn chủ động mở ra đọc, Workflow là "quy tắc" luôn áp dụng ngầm.

---

## 5. Plugin (MCP Server)

**Bản chất:** Kết nối Claude Code với dịch vụ bên ngoài thông qua Model Context Protocol.

**Cách hoạt động:**
- Plugin = MCP Server chạy background, cung cấp **tools mới** cho Claude
- Ví dụ: Supabase plugin cho phép Claude chạy SQL trực tiếp, Chrome DevTools plugin cho phép chụp screenshot
- Plugin **không phải prompt template** — nó là code thật chạy được, expose API cho Claude gọi

**Các plugin phổ biến:**

| Plugin | Cung cấp |
|--------|----------|
| `supabase` | Chạy SQL, quản lý migrations, deploy edge functions |
| `chrome-devtools` | Chụp screenshot, click elements, chạy JS trong browser |
| `vercel` | Deploy, xem logs, quản lý projects |

**So sánh dễ hiểu:** Plugin = **ổ cắm điện (adapter)**. Cắm vào để Claude có thêm khả năng mới mà bản thân nó không có.

---

## Bảng so sánh tổng hợp

| Khái niệm | Là gì | Trigger | Thực thi | Ví dụ đời thực |
|------------|-------|---------|----------|-----------------|
| **Skill** | Prompt template `.md` | User gọi qua Command | Inject vào context | Công thức nấu ăn |
| **Command** | Shortcut `/tên` | User gõ trực tiếp | Gọi Skill tương ứng | Nút trên remote TV |
| **Agent** | Subprocess độc lập | Auto hoặc manual | Chạy song song, trả kết quả | Nhân viên được giao việc |
| **Workflow** | Rule file `.md` | Tự động theo điều kiện | Áp dụng ngầm suốt session | Nội quy công ty |
| **Plugin** | MCP Server | Luôn sẵn sàng | Code thật, expose tools | Ổ cắm adapter |

---

## Sơ đồ quan hệ

```
┌─────────────────────────────────────────────────────────┐
│                      USER (bạn)                         │
│                                                         │
│  Gõ "/commit"   ──→  Command  ──→  Skill (commit.md)    │
│  Gõ câu hỏi    ──→  Claude tự chọn Agent phù hợp       │
│  Không cần gõ   ──→  Workflow tự load ngầm               │
│  Luôn có sẵn    ──→  Plugin cung cấp tools bên ngoài    │
└─────────────────────────────────────────────────────────┘
```

---

## Flow thực tế — Ví dụ từ LiverpoolApp

**Tình huống:** User gõ `/cook:auto implement like button for news articles`

1. **Command** `/cook:auto` → kích hoạt **Skill** `cook-auto.md`
2. Skill instructions yêu cầu Claude lập kế hoạch → Claude spawn **Agent** `planner`
3. Agent planner trả về plan → Claude spawn **Agent** `fullstack-developer` để code
4. Trong suốt quá trình, **Workflow** `development-rules.md` tự động enforce coding standards
5. Agent fullstack-developer cần chạy SQL → gọi tool từ **Plugin** `supabase`
6. Hoàn thành → Claude spawn **Agent** `tester` để chạy tests

**Kết quả:** 1 command đơn giản kích hoạt chuỗi Skill → Agents → Workflow → Plugin hoạt động phối hợp.
