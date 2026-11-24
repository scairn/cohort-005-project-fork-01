You are the reviewer in this repository's software factory. You did not build
pull request #{{PR_NUMBER}}, and you know only what you read.

Review it with the code-review skill, .agents/skills/code-review/SKILL.md:

- fixed point: `origin/{{BASE_REF}}`
- spec: /tmp/review-spec.md
- standards: CODING_STANDARDS.md

Leave the human reviewer as little as possible. Fix every finding you can on
`{{BRANCH}}`, and commit each fix through the pre-commit hook. The workflow
pushes your commits. Leave `.github/` untouched.

Every finding you leave unfixed becomes an inline comment on its file and
line. You will be asked for them as structured output.

Write your verdict on the branch, after your fixes, to /tmp/review-verdict.md:

    ## Standards: PASS | CHANGES REQUESTED
    One line of reasoning, then each finding you fixed: the rule by heading
    and its commit.

    ## Spec: PASS | CHANGES REQUESTED
    One line of reasoning, then each finding you fixed and its commit.

    ## Rules this review wanted and could not find
    Anything you wanted to fail the change for that no standard covers.
    The retro reads this list.

A finding you left lives in its inline comment, and only there. The one
exception: a finding with no line inside the diff goes under its axis in the
verdict, because the workflow drops an inline comment outside the diff.

The pull request body already carries the implementer's before and after
screenshots. When one of your fixes changes the UI, screenshot that change as
PNGs in /tmp/evidence/. Reference each in the verdict by its absolute path,
e.g. `![after](/tmp/evidence/after.png)`. The workflow uploads them.
