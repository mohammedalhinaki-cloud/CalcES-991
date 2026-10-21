/* u8_machine.c — SFR dispatch and the stepping loop. */
#include <string.h>

#include "machine/u8_machine.h"

/* Timer register block per timer: CNT, RLD, CTL consecutive. */
static u8_timer *timer_at(u8_machine *m, uint8_t off, uint8_t *sel)
{
    if (off >= U8_SFR_T1CNT && off <= U8_SFR_T1CTL) {
        *sel = (uint8_t)(off - U8_SFR_T1CNT);
        return &m->timer[0];
    }
    if (off >= U8_SFR_T2CNT && off <= U8_SFR_T2CTL) {
        *sel = (uint8_t)(off - U8_SFR_T2CNT);
        return &m->timer[1];
    }
    return NULL;
}

static bool dev_rd(void *ud, uint32_t flat, uint8_t off, uint8_t *out)
{
    u8_machine *m = (u8_machine *)ud;
    uint8_t sel;
    (void)flat;
    switch (off) {
        case U8_SFR_IRQF:   *out = m->intc.flags;  return true;
        case U8_SFR_IRQEN:  *out = m->intc.enable; return true;
        case U8_SFR_KEYDRV: *out = m->key_drive;   return true;
        case U8_SFR_KEYIN:
            *out = u8_keypad_scan(&m->keypad, m->key_drive);
            return true;
        case U8_SFR_LCDCTL:
            *out = u8_lcd_ctl_read(&m->lcd);
            return true;
        default: break;
    }
    u8_timer *t = timer_at(m, off, &sel);
    if (t) {
        switch (sel) {
            case 0:  *out = t->cnt; break;
            case 1:  *out = t->rld; break;
            default: *out = t->ctl; break;
        }
        return true;
    }
    return false;
}

static bool dev_wr(void *ud, uint32_t flat, uint8_t off, uint8_t v)
{
    u8_machine *m = (u8_machine *)ud;
    uint8_t sel;
    (void)flat;
    switch (off) {
        case U8_SFR_IRQF:
            m->intc.flags &= (uint8_t)~v; /* write 1 to clear */
            return true;
        case U8_SFR_IRQEN:
            m->intc.enable = v;
            return true;
        case U8_SFR_KEYDRV:
            m->key_drive = (uint8_t)(v & 0x7fu); /* 7 column lines */
            return true;
        case U8_SFR_KEYIN:
            return true; /* read-only: write ignored */
        case U8_SFR_LCDCTL:
            u8_lcd_ctl_write(&m->lcd, &m->lcd_host, v);
            return true;
        default: break;
    }
    u8_timer *t = timer_at(m, off, &sel);
    if (t) {
        switch (sel) {
            case 0:  t->cnt = v; break;
            case 1:  t->rld = v; break;
            default: (void)u8_timer_ctl_write(t, v); break;
        }
        return true;
    }
    return false;
}

void u8_machine_init(u8_machine *m, unsigned code_pages)
{
    memset(m, 0, sizeof(*m));
    m->bus  = u8_bus_create(code_pages);
    m->core = m->bus ? u8_core_create(m->bus) : NULL;
    u8_sfr_init(&m->sfr);
    m->sfr.rd = dev_rd;
    m->sfr.wr = dev_wr;
    m->sfr.ud = m;
    u8_bus_attach_sfr(m->bus, &m->sfr);
    u8_intc_init(&m->intc);
    for (unsigned i = 0; i < U8_MACHINE_TIMERS; i++) u8_timer_init(&m->timer[i]);
    u8_keypad_init(&m->keypad);
    u8_lcd_ctl_init(&m->lcd);
}

void u8_machine_dispose(u8_machine *m)
{
    if (m->core) u8_core_destroy(m->core);
    if (m->bus)  u8_bus_destroy(m->bus);
    m->core = NULL;
    m->bus  = NULL;
}

u8_status u8_machine_load_rom(u8_machine *m, const uint8_t *bytes, size_t len)
{
    return u8_bus_load_rom(m->bus, bytes, len);
}

void u8_machine_reset(u8_machine *m)
{
    if (m->core) u8_core_reset(m->core);
    u8_sfr_init(&m->sfr); /* re-zeros counters and hooks; re-install: */
    m->sfr.rd = dev_rd;
    m->sfr.wr = dev_wr;
    m->sfr.ud = m;
    u8_intc_init(&m->intc);
    for (unsigned i = 0; i < U8_MACHINE_TIMERS; i++) u8_timer_init(&m->timer[i]);
    u8_lcd_ctl_init(&m->lcd);
    m->key_drive = 0;
    m->irq_delivered = 0;
}

void u8_machine_attach_lcd(u8_machine *m, const u8_lcd_if *lif)
{
    if (lif) m->lcd_host = *lif;
    else     memset(&m->lcd_host, 0, sizeof(m->lcd_host));
}

u8_status u8_machine_step(u8_machine *m)
{
    const u8_status s = u8_step(m->core);
    const unsigned cyc = (unsigned)u8_cycles_last(m->core);
    for (unsigned i = 0; i < U8_MACHINE_TIMERS; i++) {
        u8_timer *t = &m->timer[i];
        if (u8_timer_tick(t, cyc) && (t->ctl & U8_TIMER_CTL_IRQEN)) {
            u8_intc_request(&m->intc, i); /* overflow edge -> IRQ line n */
        }
    }
    if (u8_intc_poll(&m->intc, m->core)) m->irq_delivered++;
    return s;
}

unsigned long u8_machine_run(u8_machine *m, unsigned long max_steps,
                             u8_status *status_out)
{
    u8_status s = U8_OK;
    unsigned long n = 0;
    for (; n < max_steps; n++) {
        s = u8_machine_step(m);
        if (s != U8_OK) { n++; break; } /* the failing step executed too */
    }
    if (status_out) *status_out = s;
    return n;
}
