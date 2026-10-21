# fx-991ES PLUS — memory map and model notes

Facts below were extracted from the public reverse-engineering work of the
community (see `references.md`). Items marked TODO(verify) still need
confirmation against a real ROM dump.

## Code space

- 16-bit instruction words, little-endian, always even-aligned.
- Code segment register `CSR` (4 bits) selects a 64 KiB page; the documented
  ES+ configuration uses **2 real pages** (`csr_mask = 0x0001`, per the
  CasioEmuX model file) — segments 0 and 1 are real, segments ≥ 2 mirror
  `CSR & 1`.
- Reset vectors (physical code addresses): initial `SP` = word at `0x0000`,
  initial `PC` = word at `0x0002`, `BRK` = `0x0004`, `NMI` = `0x0008`,
  maskable IRQs = `0x000A + index*2` (index < 59), SWI = `0x0080 + index*2`
  (index < 64).

## Data space (flat = segment << 16 | offset)

| Range                 | Region      | Notes                                        |
|-----------------------|-------------|----------------------------------------------|
| `0x000000..0x007FFF`  | ROM window  | reads code page 0; writes fail               |
| `0x008000..0x008DFF`  | RAM         | 3.5 KiB                                      |
| `0x00F000..0x00F04F`  | SFR         | peripheral registers (see sfr-map.md)        |
| `0x00F800..0x00F9FF`  | VRAM        | holes: bytes with `(addr & 0xF) >= 0xC` absent |
| `0x010000..0x01FFFF`  | code page 1 | data reads of the second code page           |
| `0x080000..0x09FFFF`  | code mirror | segments 8+ alias lower pages                |
| otherwise             | unmapped    | reads 0, writes ignored                      |

- The `DSR` prefix (`_LDSR`) selects the data segment for exactly the next
  step's data accesses; default segment is 0.
- Multi-byte data accesses are little-endian; word accesses are even-aligned
  (odd addresses are masked and flagged).

## LCD

- Main matrix assumed **96×32 dots** (12 usable bytes per 16-byte VRAM row).
  TODO(verify): bit order within bytes and the location of indicator icons
  (the CasioEmuX model file describes separate indicator sprites).

## Keyboard

- Documented key codes are `0x00..0x67` plus `0xFF` (none):
  column = `code >> 4` (0..6), row = `code & 0x0F` (0..7) — a 7×8 matrix.
  Examples from the CasioEmuX model file: `0x00` = "1", `0x20` = "3",
  `0x32` = Backspace, `0x40` = "-", `0x60` = Return, `0x62` = "E" (EXP).
- Phase 4: the scan lines are wired as **provisional** SFRs `KEYDRV`
  (column drive, offset 0x10) and `KEYIN` (row input, read-only, offset
  0x11) — see sfr-map.md. The GUI key labels are provisional too; only the
  six documented codes above are exact (TODO(verify): full mapping).

## Model configuration (from CasioEmuX `models/fx991esplus_emu/model.lua`)

- `hardware_id = 3`, `csr_mask = 0x0001`, `pd_value = 0x00`.
- ROM path convention: `rom.bin` next to the model file (not distributed).
