# AGENTS.md — 给 AI 助手的操作手册 / Operating guide for AI agents

> 你（AI 助手）的任务：帮用户把这个工程渲染成 `film.mp4`。用户不一定懂命令行，请你直接执行命令，
> 每一步完成后用一句话告诉用户结果。不要修改 `tl.js / audio.js / engine.js` 的内容（那是作品本身），
> 除非用户明确要求改片子。

## 0. 项目是什么
《无喉之歌 / The Voice Without a Throat》，4:07 短片，1280×720，24fps，**共 5928 帧**。
画面和声音全部由代码生成，没有任何素材文件。渲染是确定性的：同样的代码永远得到同样的画面。

| 文件 | 说明 |
|---|---|
| `tl.js` | 时间线数据（字幕卡、歌词、片尾）。浏览器和 Node 共用 |
| `audio.js` | Node 纯代码合成器 → `out/audio.wav` + `out/env.js`（画面需要的音频包络，**必须先生成**） |
| `engine.js` | Three.js 渲染引擎，暴露 `window.READY` 和 `window.renderAt(秒, jpeg质量)` → dataURL |
| `index.html` | 加载 tl.js、out/env.js、three（importmap 指向 node_modules） |
| `render.js` | `node render.js <起始帧> <结束帧>`，写 `frames/fNNNNN.jpg`，已存在的帧跳过 |
| `preview.js` | `node preview.js 20,88,190 640` → `prev/*.jpg`，用于快速检查画面 |
| `build.sh` | 本地一键构建 |
| `.github/workflows/render.yml` | GitHub Actions：audio → 分片 render（矩阵）→ assemble |

依赖：Node ≥18、Python 3（只用来起静态服务器 `python3 -m http.server 8123`）、ffmpeg、
Playwright Chromium（`npx playwright install chromium`）、中日文字体 Noto Sans/Serif CJK。

---

## 路线 A：GitHub Actions（推荐）

### A1. 前置检查
```bash
git --version && gh --version && gh auth status
```
- 没有 `gh`：请用户安装 GitHub CLI（https://cli.github.com），然后让用户自己运行 `gh auth login`
  （选 GitHub.com → HTTPS → 浏览器登录）。**不要索要或在聊天里处理用户的密码 / token。**

### A2. 建仓库并推送（在本文件所在目录执行）
确认当前目录里直接有 `build.sh` 和 `.github/workflows/render.yml`（不要多一层 `film/` 目录）。
```bash
git init -b main
git add -A            # 确保 .github/ 被加入：git ls-files | grep workflows
git commit -m "The Voice Without a Throat — source"
gh repo create voice-without-a-throat --public --source=. --push
```
- 公开仓库的 Actions 免费；若用户要求私有，用 `--private`（会消耗约 150–250 分钟免费额度）。
- 若仓库名已存在，换个名字，或用 `git remote add origin ... && git push -u origin main`。

### A3. 触发渲染
```bash
gh workflow run render.yml -f shards=12
sleep 5
gh run list --workflow=render.yml --limit 1
RUN_ID=$(gh run list --workflow=render.yml --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch "$RUN_ID" --interval 60 --exit-status
```
预计耗时 20–40 分钟。`gh run watch` 可能因会话超时中断，可以反复执行 `gh run view "$RUN_ID"` 查看状态。

### A4. 下载成片
```bash
gh run download "$RUN_ID" -n film-the-voice-without-a-throat -D ./result
ls -la result/film.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 result/film.mp4   # 应约为 247 秒
```
把 `result/film.mp4` 的位置告诉用户即可。

### A5. 出错排查
```bash
gh run view "$RUN_ID" --log-failed | tail -80
```
| 现象 | 处理 |
|---|---|
| `audio` job 失败 | 看 `node audio.js` 报错；通常是 Node 版本过低（需 ≥18） |
| 某个 `render (N)` 分片失败 / 超时 | `gh run rerun "$RUN_ID" --failed`（只重跑失败分片） |
| `test $(ls frames ...)` 失败 | 帧数不全，同上重跑；若反复失败，把 shards 调大到 20 再跑 |
| `waitForFunction READY` 超时 | 字体或 three 未装好：确认 `npm install` 成功、apt 安装了 `fonts-noto-cjk` |
| `assemble` 找不到 seg | 有分片没上传成功，先重跑失败分片 |
| 成片字幕是方块 | 缺 CJK 字体，检查 workflow 中 apt 安装 fonts-noto-cjk / fonts-noto-cjk-extra 这一步 |

---

## 路线 B：本机构建
```bash
bash build.sh                       # 全片 → ./film.mp4（CPU 软件渲染，2 核约 90 分钟，8 核约 25 分钟）
GPU=1 bash build.sh                 # 有独立显卡时更快
START=4560 END=4800 bash build.sh   # 只渲染一段：帧号 = 秒 × 24 → clip_4560_4800.mp4
JOBS=4 bash build.sh                # 手动指定并行进程数（默认 CPU 核数的一半）
```
- 中断后直接重跑，已渲染帧会跳过；`out/` 已存在时不会重新合成音频。
- macOS：`brew install node ffmpeg python`。Windows：请在 WSL（Ubuntu）里运行，并先
  `sudo apt install -y ffmpeg fonts-noto-cjk fonts-noto-cjk-extra fonts-liberation`。
- 端口 8123 被占用时：`PORT=8200 bash build.sh`。

## 快速自检（任意路线都可用）
```bash
node audio.js                                   # 约 1 分钟，生成 out/
python3 -m http.server 8123 >/dev/null 2>&1 &
node preview.js 13,23,88,120,196,233 640        # 生成 prev/*.jpg
```
期望画面：13s 粒子隧道；23s 标题「无喉之歌」；88s 青色粒子少女 + 钢琴卷帘；120s 城市演唱会激光；
196s 俯瞰城市中心光球；233s 黑底终端片尾字幕（含 OPUS 5.5）。

## 约定 / 不要做的事
- 不要改总帧数 5928、帧率 24、分辨率 1280×720，否则音画会不同步。
- 不要删掉 `out/env.js` 后直接渲染：画面依赖它，必须先 `node audio.js`。
- 不要提交 `node_modules/ out/ frames/ *.mp4`（已在 .gitignore）。
- 不要在聊天中索取用户的 GitHub 密码或 token；登录一律让用户自己执行 `gh auth login`。
