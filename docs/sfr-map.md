# SFR map (fx-991ES PLUS) — phase 4 wiring

The SFR space occupies data addresses `0x00F000..0x00F04F` (80 bytes).

## Wiring model (implemented in `src/machine/u8_machine.c`)

- Every SFR access goes through `src/sfr/u8_sfr.c`. Offsets **claimed** by a
  wired peripheral get its semantics; everything else stays **RAM-like**
  (reads/writes stored in a register file) so that running a real ROM keeps
  revealing untouched registers.
- The wired registers below are a **provisional clean-room model**: the real
  ES+ register-to-peripheral assignment is only partially documented
  publicly (user202729 / Xyzstk notes; see references.md). Addresses marked
  TODO(verify) must be confirmed/corrected against a real ROM dump — the
  model is parameterised so remapping is a table edit, not a rewrite.
- Unknown-register accounting: `u8_sfr` counts out-of-range accesses
  (`unhandled_reads` / `unhandled_writes`, printed by `--regs`).

## Provisional register map (offsets from `0x0F000`)

| Off  | Name    | R/W | Semantics (this emulator)                                    |
|------|---------|-----|--------------------------------------------------------------|
| 0x00 | `IRQF`  | r   | interrupt request latch, bit n = line n                      |
|      |         | w   | write 1 clears the corresponding latch bit (W1C)             |
| 0x01 | `IRQEN` | r/w | bit n enables IRQ line n                                     |
| 0x04 | `T1CNT` | r/w | timer 1 counter (down-counting)                              |
| 0x05 | `T1RLD` | r/w | timer 1 reload value                                         |
| 0x06 | `T1CTL` | r/w | timer 1 control (below)                                      |
| 0x08 | `T2CNT` | r/w | timer 2 counter                                              |
| 0x09 | `T2RLD` | r/w | timer 2 reload value                                         |
| 0x0A | `T2CTL` | r/w | timer 2 control                                              |
| 0x10 | `KEYDRV`| r/w | keypad column drive: bit n = column n driven (7 lines)       |
| 0x11 | `KEYIN` | r   | keypad row input: OR of driven columns' row bits (read-only) |
| 0x18 | `LCDCTL`| r/w | bit0 = display enable; bit1 = frame-update request (consumed when dispatched to the host) |

Timer control bits (`T1CTL`/`T2CTL`), identical for both timers:

| Bit    | Name    | Meaning                                             |
|--------|---------|-----------------------------------------------------|
| 0      | `EN`    | enable counting                                     |
| 2:1    | `DIV`   | cycle divider: 00=/1, 01=/4, 10=/16, 11=/64         |
| 3      | `IRQEN` | overflow raises the timer's IRQ line (edge)         |
| 4      | `OVF`   | overflow flag; write 1 clears (W1C), read-only else |

Timer period: one down-count per `DIV` cycles; on underflow the counter
reloads from `RLD` and sets `OVF`. Overflow period = `(RLD + 1) * DIV` CPU
cycles.

## Interrupt model

- 8 request lines (`IRQF`/`IRQEN`, bit n = line n); timer 1 = line 0,
  timer 2 = line 1 (provisional).
- Line n maps to core IRQ vector index `first_index + n`
  (`u8_intc.first_index`, default 0 → vector `0x000A`), provisional until
  the real source-to-vector assignment is confirmed.
- Delivery: after every instruction the machine polls the controller; a
  pending enabled line enters the core at level 1 through `u8_irq()`
  (masked while `MIE=0` or a level-1+ handler is running; the latch keeps
  the request until delivered or cleared via `IRQF`).
- Delivery is immediate: as soon as `RTI` restores the interrupted
  context, a pending enabled line re-enters. An interrupt source whose
  period is shorter than or equal to its ISR round-trip therefore starves
  the main program (level-triggered hardware behaves the same); ROMs must
  keep the ISR strictly shorter than the period (see tests/test_integration.c).

## Still RAM-like (no side effects yet)

Watchdog, power-supply / standby control, RTC, I/O ports and everything
else in `0x0F000..0x0F04F`. They are stored and logged; wire them one at a
time as a real ROM's accesses reveal their roles.
