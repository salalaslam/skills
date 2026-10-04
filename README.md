# Agent skills

Personal skills shared across Codex, Claude Code, and other agents.

| Skill | Purpose | Credit |
| --- | --- | --- |
| [anti-sycophancy](anti-sycophancy/SKILL.md) | Give candid, evidence-based feedback. | |
| [codex-delegation](codex-delegation/SKILL.md) | Delegate tasks and run Codex from scripts. | |
| [recall](recall/SKILL.md) | Rebuild working context across Claude Code, Codex, and T3 history. | Adapted from Lauren Tan, [pstack](https://github.com/cursor/plugins/tree/main/pstack) |
| [blast-radius](blast-radius/SKILL.md) | Trace downstream regression risks and verify safety assumptions. | Adapted from Lauren Tan, [pstack](https://github.com/cursor/plugins/tree/main/pstack) |
| [openrouter-error-handling](openrouter-error-handling/SKILL.md) | Handle API errors, streaming failures, and retries. | |
| [unslop](unslop/SKILL.md) | Remove common AI writing patterns. | Lauren Tan, [pstack](https://github.com/cursor/plugins/tree/main/pstack) |
| [bro](bro/SKILL.md) | Restate the last reply in plain language. | Lauren Tan, [pstack](https://github.com/cursor/plugins/tree/main/pstack) |
| [interrogate](interrogate/SKILL.md) | Adversarial review of changes by Claude and Codex reviewers. | Adapted from Lauren Tan, [pstack](https://github.com/cursor/plugins/tree/main/pstack) |
| [grilling](grilling/SKILL.md) | Stress-test plans and decisions through questions. | [Matt Pocock](https://github.com/mattpocock/skills) |
| [test-audit](test-audit/SKILL.md) | Evaluate test value, remove redundant coverage, and guide test authoring. | OpenClaw |

## Install

Each skill is a folder with a `SKILL.md`. Clone the repo once and symlink the skills you want into each agent's skills directory:

```sh
git clone https://github.com/salalaslam/skills.git ~/skills

# Claude Code
ln -s ~/skills/grilling ~/.claude/skills/grilling

# Codex
ln -s ~/skills/grilling ~/.codex/skills/grilling

# Other agents that read ~/.agents/skills
ln -s ~/skills/grilling ~/.agents/skills/grilling
```

Symlinks keep every agent on the same copy, so a `git pull` updates them all. For a single project, link into the project's `.claude/skills/` instead.

## Use

Agents pick up a skill automatically when a task matches its description. To call one directly, ask for it by name, for example `/grilling` in Claude Code or "use the grilling skill" in Codex.

## License

MIT, see [LICENSE](LICENSE). Skills credited above keep their upstream MIT license, included in their folders.
