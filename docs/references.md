# References

This project was written from scratch (clean-room): behaviour was derived
from public documentation and from *observing* the reference emulators, and
no source code was copied. Where a reference has a license, it is noted; the
unlicensed reference is used as a behavioural spec only.

## Primary references

1. **LifeEmu/SimU8** — <https://github.com/LifeEmu/SimU8> (GPL-3.0, C)
   Minimal portable nX-U8/100 emulator: register set (`PC/SP/EA/PSW`,
   `LR/ELR1-3`, `CSR/DSR`, `LCSR/EPSW`), `coreReset`/`coreStep` workflow,
   ROM-window + region-handler MMU design, ES+ memory map, vector table
   layout, DSR-prefix and `[EA+]` delay semantics. Maintained on Cemetech:
   <https://www.cemetech.net/forum/viewtopic.php?t=20311>.

2. **Xyzstk/CasioEmuX** — <https://github.com/Xyzstk/CasioEmuX> (GPL-3.0, C/C++)
   Full emulator + disassembler + SDL2/ImGui/Lua debugging front-end, based
   on LBPHacker's and user202729's work. Source of the fx-991ES PLUS model
   configuration (`models/fx991esplus_emu`), the peripheral inventory
   (Keyboard, Screen, Timer, RTC, Watchdog, Flash, PowerSupply, IOPorts,
   ExternalInterrupts), and the SFR documentation base.

3. **Fraserbc/u8_emu** — <https://github.com/Fraserbc/u8_emu> (no license file
   with an SPDX id — treated as all rights reserved; behavioural reference
   only, credited by SimU8 as its reference implementation for the ISA).

## Background documents

- Casio's nX-U8/100 is a proprietary 8-bit core; a Seiko Epson paper on the
  ultra-low-power 8-bit microcomputer family describes its 3-stage pipeline:
  <https://www.mikrocontroller.net/attachment/356611/203_R06.ja.en.pdf>.
- Community SFR documentation by **user202729** and **Xyzstk** underlies
  nearly all post-2019 discoveries (credited in SimU8's README).
- SimU8 graphical front-end by gamingwithevets:
  <https://github.com/gamingwithevets/simu8-frontend>.

## Known deviations from the references

- `SUB`/`SUBC`/`CMP` overflow flag: the borrow-based formula is implemented
  with an explicit 1-bit mask; the reference emulator misses the mask for
  negative probes (its result differs for cases like `0x00 - 0x01`).
- `PUSH/POP lepa` cycle counts are accumulated per part; the reference
  reports a flat 1 cycle (its own code contradicts its comment there).
- Divergences will be re-examined against real-PC behaviour in the
  peripherals/integration phases.

## Third-party components vendored in this repository

These are host-side UI dependencies, not part of the clean-room emulator
core, and they are unrelated to Casio firmware:

- **Dear ImGui v1.93.0** — <https://github.com/ocornut/imgui> (MIT license;
  vendored under `third_party/imgui` with its own `LICENSE.txt`).
- **SDL2** — <https://www.libsdl.org> (zlib license; used as a system
  library at build time, not vendored).
