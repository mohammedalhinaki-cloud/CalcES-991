# casio-u8-emu

An emulator for the **Casio nX-U8/100** CPU core, targeting Casio scientific
calculators — starting with the **fx-991ES PLUS**. The goal is to run the
calculator's original firmware (ROM) with behaviour identical to the real
machine, not to be a new calculator engine.

**Status: all six phases complete** — CPU core (full documented instruction
set), memory system with banking, wired peripherals (interrupt controller,
two cycle-fed timers, keypad scan lines, LCD control), disassembler,
debugger core, headless runner, unit tests, a graphical front-end
(SDL2 + Dear ImGui: LCD view, keypad input, debug panels, run control), an
end-to-end integration test on a synthetic boot ROM, and Windows CI.

## Legal notice — read this first

This project **does not include and does not distribute any Casio firmware**.
To use the emulator you must supply your own ROM image at runtime
(`--rom FILE`). You are responsible for obtaining the ROM legally — typically
by dumping it from a calculator you own, or by extracting it from a copy of
Casio's official emulator software that you licensed. Do not ask the project
maintainers for ROMs. Casio and the model names are trademarks of Casio
Computer Co., Ltd.

## Build

Linux (gcc/clang + CMake ≥ 3.16):

```sh
cmake -S . -B build
cmake --build build
ctest --test-dir build      # runs the unit tests
```

Windows (Visual Studio 2019+ or MinGW):

```sh
cmake -S . -B build -G "Visual Studio 17 2022"   # or "-G MinGW Makefiles"
cmake --build build --config Release
ctest --test-dir build -C Release
```

No third-party libraries are needed for the core, tests, and headless runner.

For the GUI, install the SDL2 development headers first (`sudo apt install
libsdl2-dev pkg-config`, or the equivalent on Windows/macOS); Dear ImGui
v1.93.0 is vendored under `third_party/imgui` (MIT). When SDL2 is absent,
CMake skips the GUI target automatically.

## Usage

```sh
./build/u8emu --rom /path/to/rom.bin --steps 1000000 --regs --vram frame.raw
./build/u8emu --rom /path/to/rom.bin --key 0x23 --steps 2000000 --vram frame.raw
```

- `--rom, -r FILE` — ROM image (up to 128 KiB = 2 × 64 KiB code pages).
- `--steps, -s N` — maximum number of instructions to execute.
- `--key CODE` — hold a key pressed during the run (hex matrix code,
  e.g. `0x23`; repeatable).
- `--regs` — dump register state plus peripheral diagnostics after
  execution (unhandled SFR accesses, IRQ latch/delivery counts, LCD state).
- `--vram, -v FILE` — dump the LCD frame (96×32 bytes) after execution.

GUI (SDL2 window: LCD view, clickable keypad, registers / disassembly /
memory / peripherals panels, run-pause-step-reset):

```sh
./build/u8gui --rom /path/to/rom.bin [--steps-per-frame N] [--zoom Z]
```

- `--frames N` and `--screenshot FILE` are smoke-test options: quit after N
  frames and save the final frame as a BMP (used for off-screen checks).

## Project layout

```
src/core/    CPU: registers, flags, fetch/decode/execute, interrupts
src/mem/     MMU: code pages, 32 KiB ROM window, region map, bus routing
src/sfr/     SFR space: register file + device dispatch, interrupt controller
src/periph/  LCD (VRAM raster + control reg), keypad matrix + scan, timers
src/machine/ Machine layer: SFR routing, timer feeding, IRQ polling
src/gui/     SDL2 + Dear ImGui front-end (LCD, keypad, debug panels)
src/disasm/  nX-U8/100 disassembler
src/debug/   Breakpoints, stepping, register/memory dumps
tests/       Unit tests: ALU/flags, branches/interrupts, MMU, disassembler,
             peripherals, integration (synthetic boot ROM)
docs/        Memory map, SFR map, references
third_party/ Vendored dependencies (Dear ImGui v1.93.0, MIT)
.github/     CI workflow (Windows Debug/Release + Linux with the GUI)
```

## Accuracy statement

The emulator implements the documented ISA behaviour: exact flag semantics
(C/Z/S/OV/HC), segment banking (CSR/DSR with mirroring), the DSR-prefix and
`[EA+]` bus-delay timing quirks, interrupt levels with backup registers, and
per-instruction cycle counts feeding a cycle counter. This is
**instruction-level accuracy with cycle accounting** — bus-level (wait-state,
pipeline) accuracy is not publicly documented for this chip and is out of
scope until verified against hardware. Deviations and open questions are
listed in `docs/` and the comments.

## References and clean-room statement

Written from scratch after studying the public reverse-engineering work of
the Casio calculator community; behaviour was derived from documentation and
observation, no source lines were copied. See `docs/references.md` for the
full list (SimU8, CasioEmuX, u8_emu) and their licenses.

## Roadmap

1. ✅ Scaffolding, build system, license
2. ✅ Target model research (fx-991ES PLUS memory map, SFR window, keypad)
3. ✅ CPU core + unit tests (ALU, branches, MMU, disassembler)
4. ✅ Peripheral SFR wiring (interrupt controller, timers, keypad scan,
   LCD control — provisional register map in `docs/sfr-map.md`)
5. ✅ GUI: SDL2 + Dear ImGui (LCD view, key input, debug panels)
6. ✅ Integration testing with a synthetic boot ROM; Windows CI

CI runs the full test suite on `windows-latest` (MSVC, Debug + Release;
the GUI target is skipped there without SDL2) and on `ubuntu-latest`
(with SDL2, so the GUI target is compiled as well) — see
`.github/workflows/ci.yml`.

## License

MIT — see `LICENSE`.
