# CPEVUDM

This is the workflow I use for agent-driven development, including this repo. I also teach it in a workshop I built on responsible gen-AI development. The name is just the steps: Clarify, Plan, Execute, Verify, Understand, Document, Merge.

The mantra behind it: if you are lost at the start, you'll be lost throughout. You won't be able to verify what the LLM has done.

## Where it sits

There is a ladder of how people use AI for code:

1. chat in a browser, copy-paste back
2. inline autocomplete
3. "vibe coding", prompting until it looks right
4. agent-driven, the model runs tools and edits files
5. spec-driven, the agent works from a written plan you approved first

Most of the resistance I have seen to AI coding is really resistance to step 3, and it is deserved. Vibe-coded work is unverifiable by construction. The answer is not to go back down the ladder. It is to go up: give the agent a spec, gate its output, and stay the reviewer. CPEVUDM is how I make step 5 routine.

## The steps

**Clarify.** Before any code, get the intent right. What is the actual problem, who has it, what does done look like, what is out of scope. If I cannot state the task in a few plain sentences, the model has no chance. This is the step people skip, and it is the one the mantra is about.

**Plan.** Turn the clarified intent into a written plan: files to touch, order of work, risks, how it will be verified. Review the plan, not the diff. Fixing a plan costs minutes. Fixing a wrong implementation costs the whole session.

**Execute.** Let the agent implement the approved plan. Small scoped chunks, on a branch, never on main. My rule of thumb on model choice: use the smart expensive model for clarify and plan, drop to a cheaper model for well-specified execution, and come back up for verification. Judgment is expensive, typing is cheap.

**Verify.** Run it. Test it. Read the diff. Never trust a green-sounding summary from the model; trust the output of the commands. This is where the eval harness in this repo lives: for LLM-behavior changes, verification means the golden set and the gate, not eyeballing three examples.

**Understand.** Do not merge code you cannot explain. If the agent used a technique I do not know, I make it teach me before I keep it. This is the step that stops AI from making you dumber. Skipping it turns you back into a vibe coder with extra steps.

**Document.** Update the docs the change touched, in two places with two audiences. See the two-README doctrine below.

**Merge.** PR with a clean history and a human review, even when the human is just me wearing a different hat. No build artifacts, no secrets, no drive-by changes outside the plan. The agent follows the same commit and PR hygiene a person would.

## The two-README doctrine

Every repo gets two entry documents:

- **README.md is for humans.** What this is, why it exists, how to run it, what the tradeoffs are. Written to be read once, top to bottom.
- **agents.md is for the model.** Build commands, layout, conventions, invariants, the things an agent needs to act correctly without re-deriving them every session. Written to be loaded as context, dense and factual.

They are not duplicates. A human wants the why. An agent wants the rules. Mixing them makes a document that serves neither. This repo eats its own dogfood: see [../agents.md](../agents.md).

## Why this order and not another

Each step exists to make the next one possible. You cannot plan what you have not clarified. You cannot verify what you never planned, because you have no definition of correct. You cannot document what you do not understand. And you should not merge anything that has not survived all of the above.
