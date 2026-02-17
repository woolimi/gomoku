 ---
  Overall Verdict

  Not ready to ship. 6.5/10. The AlphaZero and Minimax technical sections are genuinely strong — probably the best part of this portfolio. But there are concrete errors, broken references, and embarrassingly thin pages that a senior engineer or technical recruiter will catch
  immediately. Fix the blockers first, then the rest.

  ---
  Critical Bugs (Must Fix)

  1. Broken cross-reference in minimax/01.rules-and-serving.md [v]

  Line 53: "The WebSocket protocol specification is documented in the About Gomoku section"

  I read that intro page. The protocol is NOT there. There's no JSON request/response schema documented anywhere in the visible docs. This is either missing content in the intro OR a wrong reference. A developer following this will hit a dead end immediately.

  2. The local dev docs show the wrong env var name [v]

  local-development.md shows:

  DEPLOY_ALPHAZERO_CONFIG=configs/deploy.yaml


  CLAUDE.md says the local env var is ALPHAZERO_CONFIG=configs/local_play.yaml. Different name, different value. One of these is wrong. If someone clones the repo and follows the docs exactly, their local AlphaZero will boot with the production config (20 MCTS searches) instead of
  the local one (200). It won't crash — it'll just behave differently and they won't understand why.

  3. No guidance on getting champion.pt [v]

  local-development.md says: "Local AlphaZero serving uses alphazero/models/champion.pt". That's it. Where does a developer get this file? Is it in git? Is it a separate download? If someone clones the repo and runs dev-up, AlphaZero fails with a missing checkpoint and they have no
  idea what to do. This breaks the onboarding for anyone who isn't you.

  4. P2P Mode mentioned in intro, documented nowhere [v]

  intro.md explicitly mentions "Peer-to-Peer (P2P) Mode" as a feature. The features page has 4 features. P2P is not one of them. You mentioned something doesn't exist in your documentation. This looks like incomplete work.

  ---
  Serious Issues (Should Fix)

  5. Terminology is inconsistent across pages [v]

  Count the variations:
  - "doublethree forbidden move rule" (intro.md)
  - "No double-threes" (basic-rules.md)
  - "Double Three Restriction" (optional-rules.md, game-settings.md)
  - "Enable Double Three Prohibition" (game-settings.md line 17)
  - "double-three restriction" (alphazero docs)

  That last one on game-settings.md is particularly bad — the same page uses both "restriction" in the note and "Prohibition" in the bullet. Pick one term and use it everywhere.

  6. deployment.md in About Project is a placeholder [v]

  This page is 5 sentences and a table. You built GCP + Cloudflare Worker routing + COS VMs + Artifact Registry + startup scripts. That is actual deployment engineering. This page gives it a table with vCPU counts. The Cloudflare Worker path routing, the COS startup scripts, the
  reasoning for infrastructure choices — all of it is in the AlphaZero deployment page (07) but not in the project-level deployment page. The project page should at least link readers there instead of feeling like an afterthought.

  7. Benchmark numbers have no hardware context [v]

  minimax/03.search-algorithms.md: "plain alpha-beta at depth 5 takes ~4s. PVS with TT and killer moves reaches depth 10 in ~2.3s"

  On what machine? A 2015 MacBook? A c4-standard-8? These numbers are meaningless without hardware context. A hiring manager who runs the same benchmark on a different machine and gets different results will think the numbers are fabricated.

  8. Cluster path in training docs is unverified [v]

  02.training-and-config.md references:
  - alphazero/infra/cluster/cluster_elo1800.yaml
  - alphazero/infra/cluster/restart_cluster.sh

  CLAUDE.md describes infra/image/ and infra/deploy/ but mentions no infra/cluster/ subdirectory. If this path is wrong, any developer following the training guide to set up a Ray cluster hits a wall. Verify the paths are real.

  9. Features page: import is missing [ ]

  intro.md says "URL and JSON import/export." The features page shows Export Options with an image. There's no mention of import. Either the import feature exists and isn't documented, or the intro is overselling it. Either way, fix the mismatch.

  ---
  Moderate Issues (Worth Fixing)


  10. PER start_iteration caveat is duplicated [v]

  The caveat that start_iteration isn't wired as an automatic runtime gate appears in both 04.training-pipeline.md and 07.deployment.md. Pick one place. It reads like you pasted it in twice and forgot to clean up.

  11. Training commands inconsistency [v]

  02.training-and-config.md uses: python gomoku/scripts/train.py
  CLAUDE.md uses: python -m gomoku.scripts.train

  Both may work. But picking one form and using it consistently across all docs is basic hygiene.

  13. Right-click only for the evaluation tool [ ]

  features.md: "Right-click on any position on the board to evaluate the move." No mention of mobile/touch. If this app is deployed live and someone opens it on a phone, they have no idea how to access evaluation. Either document the mobile interaction or note the limitation.

  ---
  What's Actually Strong

  The AlphaZero section is the standout. Specifically:

  - 07.deployment.md (Training History) — V1 through V4 is the best piece of writing in the entire docs set. The progression from naive baselines through overfitting, underfitting, rule bugs, and recovery shows genuine engineering maturity. The Day 6 rule bug story, the 1.8%
  contamination measurement, the Dirichlet alpha experiment — this is exactly what a senior ML engineer wants to see. Someone who fails, measures, understands why, and fixes it.
  - 03.search-engine-architecture.md — The virtual loss mechanism explanation, the three-phase loop, error rollback on enqueue failure — this shows you understand asynchronous distributed systems at a level that goes beyond tutorials.
  - 02.evaluation.md (minimax) — The lookup table design is well-explained, the score hierarchy reasoning is solid, and the honest acknowledgment of hand-tuning is refreshing.
  - 01.rules-and-serving.md — "What Worked and What Didn't" section is the right call. Admitting you replaced bitmask pattern matching because it got recursive edge cases wrong is more impressive than pretending you got it right the first time.
  - Lessons Learned in 07.deployment.md — These are non-generic. "A faster system that trains on corrupted data is worse than a slower system that trains correctly" is a real lesson, not a platitude.

  ---
  Priority Fix Order

  1. Fix the WebSocket protocol cross-reference (either add the protocol to intro.md or fix the link)
  2. Fix the env var name in local-development.md
  3. Add champion.pt sourcing instructions to local dev
  4. Document P2P Mode or remove the mention from intro
  5. Standardize the double-three terminology
  6. Add hardware specs to the minimax benchmark numbers
  7. Verify the infra/cluster/ paths exist
  8. Expand optional-rules.md and deployment.md (About Project)
  9. Fix the import/export mismatch
  10. Remove the duplicated PER caveat from one location

  Fix items 1–4 before anyone external looks at this. Items 5–10 before you'd call it truly polished.
