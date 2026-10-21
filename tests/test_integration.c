/* test_integration.c — phase 6: synthetic boot ROM, end to end.
 *
 * Builds a ROM image in memory (no firmware file is shipped or loaded),
 * boots it through the full machine layer (core + MMU + SFR devices +
 * timers + interrupt controller + keypad) and asserts the observable
 * results: timer overflow edges raise IRQ line 0, the ROM's handler runs
 * exactly once per delivery and returns via RTI, and the ROM's VRAM
 * writes reach the LCD frame — including a byte echoed from the keypad
 * scan lines.
 *
 * Encodings below follow the implemented decoder (src/core/u8_core.c) and
 * double as executable documentation:
 *   MOV Rd,#imm8   = (Rd << 8) | imm8
 *   MOV EA,#imm16  = 0xF00C, imm16              (LEA EA, adr16 — 2 words)
 *   ST Rd,[EA]     = ((0x90 | Rd) << 8) | 0x31
 *   L  Rd,[EA]     = ((0x90 | Rd) << 8) | 0x30
 *   ADD Rd,Rs      = ((0x80 | Rd) << 8) | (Rs << 4) | 0x1
 *   ADD Rd,#imm8   = 0x1000 | (Rd << 8) | imm8
 *   MOV PSW,#imm8  = 0xE900 | imm8
 *   B<AL> rel8     = 0xCE00 | rel8              (rel8 counted in words)
 *   NOP = 0xFE8F ; RTI = 0xFE0F
 *
 *   The timer period (10 cycles) is longer than the ISR round-trip
 *   (3 cycles): main keeps running between deliveries. A period equal
 *   to the ISR time would re-deliver right after every RTI and starve
 *   main (the machine delivers as soon as the context is restored).
 */
#include <string.h>

#include "machine/u8_machine.h"
#include "test_common.h"

#define HANDLER 0x0170u  /* IRQ0 handler address */
#define PARK    0x0164u  /* self-loop at the end of main */

static void put16(uint8_t *code, uint32_t flat, uint16_t w)
{
    code[flat]     = (uint8_t)(w & 0xffu);
    code[flat + 1] = (uint8_t)(w >> 8);
}

static size_t emit(uint8_t *code, size_t at, const uint16_t *w, unsigned n)
{
    for (unsigned i = 0; i < n; i++) put16(code, (uint32_t)at + 2u * i, w[i]);
    return at + 2u * (size_t)n;
}

static void build_boot_rom(uint8_t *code)
{
    memset(code, 0, (size_t)U8_ESPLUS_CODE_PAGES * 0x10000u);

    /* Vector table. */
    put16(code, 0x0000u, 0x8DFEu);               /* initial SP           */
    put16(code, 0x0002u, 0x0100u);               /* initial PC -> main   */
    put16(code, 0x000Au, (uint16_t)HANDLER);     /* IRQ0 -> handler      */

    /* main, part 1: enable IRQ line 0, start timer 1, enable MIE. */
    static const uint16_t PROLOGUE[] = {
        0x0201,             /* 0x0100  MOV R2,#1      IRQ counter seed  */
        0x01A5,             /* 0x0102  MOV R1,#0xA5   LCD pattern       */
        0x0001,             /* 0x0104  MOV R0,#1                        */
        0xF00C, 0xF001,     /* 0x0106  MOV EA,#0xF001 IRQEN            */
        0x9031,             /* 0x010A  ST R0,[EA]     enable line 0     */
        0x0009,             /* 0x010C  MOV R0,#9                        */
        0xF00C, 0xF005,     /* 0x010E  MOV EA,#0xF005 T1RLD            */
        0x9031,             /* 0x0112  ST R0,[EA]     T1RLD = 9         */
        0xF00C, 0xF004,     /* 0x0114  MOV EA,#0xF004 T1CNT            */
        0x9031,             /* 0x0118  ST R0,[EA]     T1CNT = 9         */
        0x0009,             /* 0x011A  MOV R0,#0x09   EN|IRQEN, /1      */
        0xF00C, 0xF006,     /* 0x011C  MOV EA,#0xF006 T1CTL            */
        0x9031,             /* 0x0120  ST R0,[EA]     start the timer   */
        0xE908,             /* 0x0122  MOV PSW,#0x08  MIE = 1           */
    };
    size_t a = emit(code, 0x0100u, PROLOGUE,
                    (unsigned)(sizeof(PROLOGUE) / sizeof(PROLOGUE[0])));

    /* NOP sled: the timer (period = 3 cycles) overflows repeatedly and
     * interrupts flow while main runs through here. */
    for (unsigned i = 0; i < 16; i++, a += 2u) put16(code, (uint32_t)a, 0xFE8Fu);

    /* main, part 2: quiet the IRQ source, paint VRAM, echo the keypad. */
    static const uint16_t QUIET[] = {
        0x0001,             /* 0x0144  MOV R0,#1      EN only           */
        0xF00C, 0xF006,     /* 0x0146  MOV EA,#0xF006 T1CTL            */
        0x9031,             /* 0x014A  ST R0,[EA]     IRQ line off      */
        0xF00C, 0xF800,     /* 0x014C  MOV EA,#0xF800 VRAM[0]          */
        0x9131,             /* 0x0150  ST R1,[EA]     0xA5              */
        0xF00C, 0xF010,     /* 0x0152  MOV EA,#0xF010 KEYDRV           */
        0x9031,             /* 0x0156  ST R0,[EA]     drive column 0    */
        0xF00C, 0xF011,     /* 0x0158  MOV EA,#0xF011 KEYIN            */
        0x9330,             /* 0x015C  L R3,[EA]      row bits          */
        0xF00C, 0xF801,     /* 0x015E  MOV EA,#0xF801 VRAM[1]          */
        0x9331,             /* 0x0162  ST R3,[EA]     echo the rows     */
    };
    a = emit(code, a, QUIET, (unsigned)(sizeof(QUIET) / sizeof(QUIET[0])));

    put16(code, (uint32_t)a, 0xCEFFu);           /* 0x0164  B -1 (park)  */
    a += 2u;

    /* Pad the gap up to the handler with NOPs (never reached). */
    while (a < HANDLER) { put16(code, (uint32_t)a, 0xFE8Fu); a += 2u; }

    /* IRQ0 handler: increment the counter (proves entry), return. */
    put16(code, HANDLER + 0u, 0x1201u);          /* ADD R2,#1            */
    put16(code, HANDLER + 2u, 0xFE0Fu);          /* RTI                  */

    a = HANDLER + 4u;

    /* Pad the rest of the used page with NOPs (never reached). */
    while (a < 0x0200u) { put16(code, (uint32_t)a, 0xFE8Fu); a += 2u; }
}

int main(void)
{
    static uint8_t rom[(size_t)U8_ESPLUS_CODE_PAGES * 0x10000u];
    build_boot_rom(rom);

    u8_machine m;
    u8_machine_init(&m, U8_ESPLUS_CODE_PAGES);
    CHECK_EQ(u8_machine_load_rom(&m, rom, sizeof(rom)), U8_OK);

    /* A key held down (column 0, row 3): pressed before reset — the matrix
     * models the physical keyboard and survives a CPU reset. */
    u8_keypad_press(&m.keypad, 0x03);
    u8_machine_reset(&m);

    u8_status st = U8_OK;
    const unsigned long ran = u8_machine_run(&m, 400, &st);
    CHECK(ran >= 400u);                     /* never halted           */
    CHECK_EQ((int)st, (int)U8_OK);

    const u8_regs *R = u8_regs_get(m.core);

    /* Timer 1 overflowed; its IRQ line was raised, delivered, and the
     * ROM's handler returned every time (level 0, MIE restored). */
    CHECK((m.timer[0].ctl & U8_TIMER_CTL_EN) != 0);
    CHECK((m.timer[0].ctl & U8_TIMER_CTL_IRQEN) == 0); /* ROM disabled it */
    CHECK((m.timer[0].ctl & U8_TIMER_CTL_OVF) != 0);
    CHECK(m.irq_delivered >= 2);
    /* R2 = 1 + handler entries (each delivery runs the ISR once). */
    CHECK_EQ(R->gpr.r[2],
             (uint8_t)(1u + m.irq_delivered));
    CHECK_EQ(R->psw.b.elevel, 0);
    CHECK_EQ(R->psw.b.mie, 1);
    CHECK_EQ(R->pc, PARK);                  /* parked in the self-loop */

    /* The ROM's VRAM writes reached the LCD frame memory. */
    CHECK_EQ((int)u8_data_read(m.bus, 0, 0xF800u, 1, NULL), 0xA5);
    CHECK_EQ((int)u8_data_read(m.bus, 0, 0xF801u, 1, NULL), 0x08);

    /* The frame blit reflects both bytes (bit0 of VRAM[0], bit3 of VRAM[1]). */
    uint8_t frame[U8_LCD_W * U8_LCD_H];
    u8_lcd_blit(m.bus, frame);
    CHECK_EQ(frame[0], 1);
    CHECK_EQ(frame[11], 1);

    u8_machine_dispose(&m);
    return TEST_REPORT();
}
