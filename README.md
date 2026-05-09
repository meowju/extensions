# Skills Registry

Our internal skill registry. Only stores skills we authored or have deep ownership of.

## Structure

```
skills/
├── registry/
│   ├── skills-lock.json   # Skill index with hashes (auto-generated, commit this)
│   └── README.md
└── source/                # Local skill implementations
    ├── docx/
    ├── pdf/
    ├── pptx/
    ├── skill-creator/
    ├── skill-security-auditor/
    └── xlsx/
```

## Design

- **Local skills only.** Third-party skills stay in their own repos. We reference them, not store them.
- **skills-lock.json** is the canonical index. Entries have `source`, `sourceType`, `skillPath`, `computedHash`.
- **`origin: local`** in each SKILL.md frontmatter marks it as ours.

## Adding a New Skill

1. Copy skill to `source/<name>/`
2. Ensure SKILL.md has `origin: local` in frontmatter
3. Regenerate `registry/skills-lock.json` with `node scripts/gen-lock.js`
4. Commit and push

## License

Proprietary skills (docx, pdf, pptx, xlsx, skill-creator, skill-security-auditor) are licensed per their individual LICENSE.txt files.

## Remote

https://github.com/meowju/skills