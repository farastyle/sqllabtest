---
name: labsec-design
description: Use this skill to generate well-branded interfaces and assets for Laboratórios de Segurança — a Brazilian cybersecurity education platform. Contains essential design guidelines, colors, type, fonts, and UI kit components for prototyping security lab UIs, educational tech dashboards, and similar developer-facing tools.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Key design facts

- **Primary brand color:** `#667eea` (purple) → `#764ba2` gradient — SQLi identity
- **Lab colors:** SQLi = purple `#667eea`, XSS = green `#28a745`, IDOR = orange `#fd7e14`
- **Font:** IBM Plex Sans (UI) + IBM Plex Mono (code) — Google Fonts
- **Layout:** Either centered card (max-width 800px) or sidebar 280px + flex main
- **Key pattern:** `border-left: 4px solid [color]` info panels with tinted surface
- **Language:** Brazilian Portuguese; emoji used as icons throughout
- **No logo file exists** — text-only `🔬 Laboratórios de Segurança`

## GitHub source
https://github.com/farastyle/sqllabtest
