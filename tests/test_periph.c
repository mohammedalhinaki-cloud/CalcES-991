/* test_periph.c — phase 4: SFR device dispatch, timers, interrupt
 * controller delivery, keypad scan lines, LCD control register. */
#include <string.h>

#include "machine/u8_machine.h"
#include "test_common.h"

/* SFR helpers (data-space byte access at flat U8_SFR_BASE + off). */
static void sfrw(u8_bus *bus, unsigned off, uint8_t v)
{
    u8_data_write(bus, 0, U8_SFR_BASE + off, 1, v, NULL);
}

static uint8_t sfrr(u8_bus *bus, unsigned off)
{
    return (uint8_t)u8_data_read(bus, 0, U8_SFR_BASE + off, 1, NULL);
}

static void test_sfr_dispatch(void)
{
    u8_machine m;
    u8_machine_init(&m, U8_ESPLUS_CODE_PAGES);

    /* Unwired offsets stay RAM-like. */
    sfrw(m.bus, 0x30, 0xA5);
    CHECK_EQ(sfrr(m.bus, 0x30), 0xA5);

    /* KEYIN reflects the pressed keys of the driven columns. */
    u8_keypad_press(&m.keypad, 0x23); /* column 2, row 3 */
    sfrw(m.bus, U8_SFR_KEYDRV, 0x04); /* drive column 2 */
    CHECK_EQ(sfrr(m.bus, U8_SFR_KEYIN), 0x08);

    /* KEYIN is read-only: a write is consumed and changes nothing. */
    sfrw(m.bus, U8_SFR_KEYIN, 0xFF);
    CHECK_EQ(sfrr(m.bus, U8_SFR_KEYIN), 0x08);

    /* No drive -> no rows seen even though the key is held. */
    sfrw(m.bus, U8_SFR_KEYDRV, 0x00);
    CHECK_EQ(sfrr(m.bus, U8_SFR_KEYIN), 0x00);

    /* IRQF: latch visible on read, W1C on write. */
    u8_intc_request(&m.intc, 0);
    CHECK_EQ(sfrr(m.bus, U8_SFR_IRQF), 0x01);
    sfrw(m.bus, U8_SFR_IRQF, 0x01);
    CHECK_EQ(sfrr(m.bus, U8_SFR_IRQF), 0x00);

    /* IRQEN is a plain r/w register. */
    sfrw(m.bus, U8_SFR_IRQEN, 0x81);
    CHECK_EQ(sfrr(m.bus, U8_SFR_IRQEN), 0x81);

    u8_machine_dispose(&m);
}

static void test_timer_unit(void)
{
    u8_timer t;

    /* Period = (RLD + 1) ticks at divider /1. */
    u8_timer_init(&t);
    t.rld = 2;
    t.cnt = 2;
    t.ctl = U8_TIMER_CTL_EN | U8_TIMER_CTL_IRQEN;
    CHECK(!u8_timer_tick(&t, 1));
    CHECK_EQ(t.cnt, 1);
    CHECK(!u8_timer_tick(&t, 1));
    CHECK_EQ(t.cnt, 0);
    CHECK(u8_timer_tick(&t, 1)); /* underflow: reload + flag + edge */
    CHECK_EQ(t.cnt, 2);
    CHECK((t.ctl & U8_TIMER_CTL_OVF) != 0);

    /* Divider /4: three cycles do not tick, the fourth does. */
    u8_timer_init(&t);
    t.rld = 5;
    t.cnt = 5;
    t.ctl = U8_TIMER_CTL_EN | (1u << 1);
    CHECK(!u8_timer_tick(&t, 3));
    CHECK_EQ(t.cnt, 5);
    CHECK(!u8_timer_tick(&t, 1));
    CHECK_EQ(t.cnt, 4);

    /* Disabled timer ignores cycles. */
    u8_timer_init(&t);
    t.rld = 1;
    t.cnt = 1;
    t.ctl = 0;
    CHECK(!u8_timer_tick(&t, 100));
    CHECK_EQ(t.cnt, 1);

    /* OVF bit is W1C; the write value also replaces EN/DIV/IRQEN. */
    u8_timer_init(&t);
    t.ctl = U8_TIMER_CTL_EN | U8_TIMER_CTL_OVF;
    CHECK_EQ(u8_timer_ctl_write(&t,
                                (uint8_t)(U8_TIMER_CTL_EN | U8_TIMER_CTL_OVF)),
             U8_TIMER_CTL_EN);

    /* One big tick may carry several overflows. */
    u8_timer_init(&t);
    t.rld = 0;
    t.cnt = 0;
    t.ctl = U8_TIMER_CTL_EN; /* period = 1 tick */
    CHECK(u8_timer_tick(&t, 3));
}

static void test_intc_delivery(void)
{
    u8_machine m;
    u8_machine_init(&m, U8_ESPLUS_CODE_PAGES);

    /* Vectors: PC -> main at 0x0100; IRQ line 0 -> handler at 0x0120. */
    u8_bus_poke_code16(m.bus, 0x0002, 0x0100);
    u8_bus_poke_code16(m.bus, 0x000A, 0x0120);
    /* main @ 0x0100: MOV R2,#1 ; MOV PSW,#0x08 (MIE=1) ; NOP ... */
    u8_bus_poke_code16(m.bus, 0x0100, 0x0201);
    u8_bus_poke_code16(m.bus, 0x0102, 0xe908);
    u8_bus_poke_code16(m.bus, 0x0104, 0xfe8f);
    /* handler @ 0x0120: ADD R2,R2 ; RTI */
    u8_bus_poke_code16(m.bus, 0x0120, 0x8221);
    u8_bus_poke_code16(m.bus, 0x0122, 0xfe0f);
    u8_machine_reset(&m);

    /* Latch line 0 while it is still disabled: it must stay pending. */
    u8_intc_request(&m.intc, 0);
    CHECK_EQ(m.intc.flags & 0x01u, 0x01u);
    CHECK_EQ(sfrr(m.bus, U8_SFR_IRQF), 0x01);

    m.intc.enable = 0x01;
    u8_machine_step(&m); /* MOV R2,#1 (no delivery: MIE still 0) */
    CHECK_EQ(u8_regs_get(m.core)->gpr.r[2], 1);
    CHECK_EQ(u8_regs_get(m.core)->psw.b.elevel, 0);

    u8_machine_step(&m); /* MOV PSW,#0x08, then poll delivers line 0 */
    CHECK_EQ(m.irq_delivered, 1);
    CHECK_EQ(u8_regs_get(m.core)->psw.b.elevel, 1);
    CHECK_EQ(u8_regs_get(m.core)->psw.b.mie, 0);
    CHECK_EQ(u8_regs_get(m.core)->pc, 0x0120);
    CHECK_EQ(m.intc.flags & 0x01u, 0x00u); /* latch consumed */

    u8_machine_step(&m); /* handler: ADD R2,R2 */
    CHECK_EQ(u8_regs_get(m.core)->gpr.r[2], 2);

    u8_machine_step(&m); /* RTI restores the interrupted context */
    CHECK_EQ(u8_regs_get(m.core)->pc, 0x0104);
    CHECK_EQ(u8_regs_get(m.core)->psw.b.elevel, 0);
    CHECK_EQ(u8_regs_get(m.core)->psw.b.mie, 1);
    CHECK_EQ(m.irq_delivered, 1);

    u8_machine_dispose(&m);
}

static void test_timer_irq_latch(void)
{
    u8_machine m;
    u8_machine_init(&m, U8_ESPLUS_CODE_PAGES);

    /* 6 NOPs at 0x0100; nothing delivered while MIE = 0. */
    for (unsigned i = 0; i < 6; i++) {
        u8_bus_poke_code16(m.bus, 0x0100u + 2u * i, 0xfe8f);
    }
    u8_bus_poke_code16(m.bus, 0x0000, 0x8DFE); /* SP */
    u8_bus_poke_code16(m.bus, 0x0002, 0x0100); /* PC */

    u8_machine_reset(&m);
    sfrw(m.bus, U8_SFR_T1RLD, 2);
    sfrw(m.bus, U8_SFR_T1CNT, 2);
    sfrw(m.bus, U8_SFR_T1CTL,
         U8_TIMER_CTL_EN | U8_TIMER_CTL_IRQEN); /* /1, IRQ enabled */
    u8_machine_run(&m, 5, NULL); /* >= 5 cycles -> >= 3 timer ticks */
    CHECK_EQ(m.intc.flags & 0x01u, 0x01u); /* line 0 latched */
    CHECK_EQ(u8_regs_get(m.core)->psw.b.elevel, 0); /* MIE 0: no delivery */
    CHECK_EQ(m.irq_delivered, 0);

    /* Same setup without IRQEN: no latch at all. */
    u8_machine_reset(&m);
    sfrw(m.bus, U8_SFR_T1RLD, 2);
    sfrw(m.bus, U8_SFR_T1CNT, 2);
    sfrw(m.bus, U8_SFR_T1CTL, U8_TIMER_CTL_EN);
    u8_machine_run(&m, 5, NULL);
    CHECK_EQ(m.intc.flags, 0x00);
    CHECK_EQ(m.irq_delivered, 0);

    /* Timer counter and control are readable back through the SFRs
     * (the run's overflow left OVF set and the counter reloaded to 0). */
    CHECK_EQ(sfrr(m.bus, U8_SFR_T1CTL),
             (uint8_t)(U8_TIMER_CTL_EN | U8_TIMER_CTL_OVF));
    CHECK_EQ(sfrr(m.bus, U8_SFR_T1CNT), 0x00);

    u8_machine_dispose(&m);
}

static int g_updates = 0;
static void fake_update(void *ud) { (void)ud; g_updates++; }

static void test_lcd_ctl(void)
{
    u8_machine m;
    u8_machine_init(&m, U8_ESPLUS_CODE_PAGES);

    u8_lcd_if lif;
    memset(&lif, 0, sizeof(lif));
    lif.update_disp = fake_update;
    u8_machine_attach_lcd(&m, &lif);
    u8_machine_reset(&m);

    /* Display enable + frame-update request in one write. */
    sfrw(m.bus, U8_SFR_LCDCTL, 0x03);
    CHECK_EQ(g_updates, 1);
    CHECK_EQ(sfrr(m.bus, U8_SFR_LCDCTL), 0x01); /* on; request consumed */

    /* Display off, no update request. */
    sfrw(m.bus, U8_SFR_LCDCTL, 0x00);
    CHECK_EQ(g_updates, 1);
    CHECK_EQ(sfrr(m.bus, U8_SFR_LCDCTL), 0x00);

    /* Without a host interface the write is accepted and harmless. */
    u8_machine_attach_lcd(&m, NULL);
    sfrw(m.bus, U8_SFR_LCDCTL, 0x03);
    CHECK_EQ(g_updates, 1);
    CHECK_EQ(sfrr(m.bus, U8_SFR_LCDCTL), 0x01);

    u8_machine_dispose(&m);
}

int main(void)
{
    test_sfr_dispatch();
    test_timer_unit();
    test_intc_delivery();
    test_timer_irq_latch();
    test_lcd_ctl();
    return TEST_REPORT();
}
