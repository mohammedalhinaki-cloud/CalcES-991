# CalcES Upgrade: Architecture Notes and File Structure

## Reference artifact status

The MathDa reference HTML is not present in the checked-out repository or among the files attached to this turn. Therefore, this note does **not** claim source-specific findings about its DOM, scripts, or CSS. It records a conceptual architecture lens for using that reference and maps it to CalcES without copying markup. A source-specific comparison can be added when the HTML is available.

## Conceptual architecture to carry over

Use the reference as a guide to the *organization of the experience*, not as an implementation template:

- **Separate the application shell from tools.** Keep shared navigation, page framing, and persistent global controls outside individual tool views.
- **Make each tool an independent interaction area.** Its inputs, validation messages, and transient view state should belong to that tool rather than the global calculator state.
- **Keep computation behind narrow interfaces.** Inputs flow from the tool UI into a deterministic domain function; the result flows back as data for presentation. Avoid DOM-driven calculation, inline scripts, or copied HTML handlers.
- **Treat shared presentation as a component boundary.** Reuse framing and return navigation, while allowing each tool to own its specialized controls and output.
- **Preserve responsive and offline behavior as requirements.** Translate observed interaction patterns into CalcES-owned responsive styles and locally executed calculations instead of transplanting reference styles or dependencies.

This is an architectural interpretation, not a claim that the unavailable HTML uses any particular framework or internal structure.

## CalcES architecture and upgrade boundaries

CalcES already has suitable boundaries for the upgrade:

- `src/app/App.tsx` composes the language gate, calculator provider, and workspace shell.
- `src/components/workspace/WorkspaceShell.tsx` owns the active workspace view and connects tools to the calculator. `WorkspaceNavigation.tsx` owns workspace navigation.
- `src/features/shared/ToolFrame.tsx` supplies shared educational-tool framing and return navigation.
- Each tool has its own feature module and pure calculation helpers. The graph-expression compiler uses an allowlist over a parsed math AST; it does not evaluate user text with `eval`.
- `src/state/CalculatorProvider.tsx` remains the integration boundary for calculator state. The constant-insertion callback lets the converter request an insertion without coupling its UI to editor internals.
- `src/i18n/` and `src/app/styles.css` remain the shared localization and visual-system boundaries.

Keep existing calculator modes under `src/components/workspaces/`; these are not the same thing as the new educational-tool workspaces and should not be collapsed into one module.

## Proposed file structure

The following structure reflects the implemented upgrade and preserves the existing calculator architecture:

```text
src/
├── app/
│   ├── App.tsx
│   └── styles.css
├── components/
│   ├── display/
│   ├── keypad/
│   │   └── AdvancedLayerToggle.tsx
│   ├── workspace/
│   │   ├── WorkspaceShell.tsx
│   │   ├── WorkspaceNavigation.tsx
│   │   └── ThemeToggle.tsx
│   └── workspaces/                 # Existing calculator modes
├── features/
│   ├── shared/
│   │   └── ToolFrame.tsx
│   ├── equation-solver/
│   │   ├── EquationSolver.tsx
│   │   └── solveEquation.ts
│   ├── graphing/
│   │   ├── GraphingTool.tsx
│   │   ├── compileGraphExpression.ts
│   │   └── buildGraphPlot.ts
│   └── unit-converter/
│       ├── UnitConverter.tsx
│       └── conversions.ts
├── engine/                         # Existing calculator/domain engine
├── editor/                         # Existing MathLive integration
├── state/
│   └── CalculatorProvider.tsx      # Existing state + narrow workspace API
├── i18n/
│   ├── locale.ts
│   └── en.json
└── tests/
    ├── features/
    │   ├── solveEquation.test.ts
    │   ├── graphing.test.ts
    │   └── conversions.test.ts
    └── ...                         # Existing test suites

tests/e2e/
└── phase2-tools.spec.ts

docs/
└── calc-es-upgrade-architecture.md
```

## Dependency and state rules

1. `WorkspaceShell` selects which feature UI is visible; it should not implement the math for those features.
2. A feature component may import its own domain helper and the shared `ToolFrame`, but should not reach into another feature's internals.
3. Feature calculations remain testable without rendering React. Shared state changes cross the workspace boundary through callbacks such as return-to-calculator and insert-constant.
4. The calculator provider owns editor/state concerns; feature components do not manipulate the MathLive element directly.
5. Shared translation keys and design tokens stay centralized; tool-specific markup and interaction styles stay scoped to the tool's classes.

This proposal requires no HTML transplant and no restructuring of the existing calculator engine. The current feature directories already follow these boundaries.
