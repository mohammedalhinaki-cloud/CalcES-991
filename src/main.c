/* main.c — headless runner: load a user-supplied ROM, step the machine.
 *
 * Phase 4: runs through the machine layer, so the LCD/keypad/timer SFRs
 * and the interrupt controller are live. Legal note: this program does not
 * ship any Casio firmware; the user supplies their own ROM dump (README.md).
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "debug/u8_debugger.h"
#include "machine/u8_machine.h"
#include "periph/u8_lcd.h"

#define U8_MAX_KEYS 16

static void usage(const char *argv0)
{
    fprintf(stderr,
        "casio-u8-emu (headless) — nX-U8/100 emulator\n"
        "Usage: %s --rom FILE [--steps N] [--vram FILE] [--key CODE]\n"
        "              [--regs]\n"
        "  --rom, -r FILE   ROM image to execute (max %u KiB)\n"
        "  --steps, -s N    max instructions to execute (default 1000000)\n"
        "  --vram, -v FILE  dump the LCD frame (96x32 raw bytes) on exit\n"
        "  --key CODE       hold a key pressed (hex matrix code, e.g. 0x23;\n"
        "                   repeatable)\n"
        "  --regs           print register + peripheral state on exit\n",
        argv0, (unsigned)(U8_ESPLUS_CODE_PAGES * 64u));
}

int main(int argc, char **argv)
{
    const char *rom_path = NULL;
    const char *vram_path = NULL;
    long max_steps = 1000000;
    int want_regs = 0;
    uint8_t keys[U8_MAX_KEYS];
    int n_keys = 0;

    for (int i = 1; i < argc; i++) {
        const char *a = argv[i];
        if (!strcmp(a, "--rom") || !strcmp(a, "-r")) {
            if (++i >= argc) { usage(argv[0]); return 2; }
            rom_path = argv[i];
        } else if (!strcmp(a, "--steps") || !strcmp(a, "-s")) {
            if (++i >= argc) { usage(argv[0]); return 2; }
            max_steps = strtol(argv[i], NULL, 0);
        } else if (!strcmp(a, "--vram") || !strcmp(a, "-v")) {
            if (++i >= argc) { usage(argv[0]); return 2; }
            vram_path = argv[i];
        } else if (!strcmp(a, "--key")) {
            if (++i >= argc || n_keys >= U8_MAX_KEYS) { usage(argv[0]); return 2; }
            keys[n_keys++] = (uint8_t)strtoul(argv[i], NULL, 0);
        } else if (!strcmp(a, "--regs")) {
            want_regs = 1;
        } else {
            usage(argv[0]);
            return 2;
        }
    }
    if (!rom_path) { usage(argv[0]); return 2; }

    FILE *fp = fopen(rom_path, "rb");
    if (!fp) { fprintf(stderr, "error: cannot open ROM '%s'\n", rom_path); return 1; }
    const size_t cap = (size_t)U8_ESPLUS_CODE_PAGES * 0x10000u;
    uint8_t *image = (uint8_t *)malloc(cap);
    const size_t len = fread(image, 1, cap, fp);
    const int too_big = (fgetc(fp) != EOF);
    fclose(fp);
    if (len == 0 || too_big) {
        fprintf(stderr, "error: '%s' is empty or larger than %zu KiB\n",
                rom_path, cap / 1024u);
        free(image);
        return 1;
    }

    u8_machine m;
    u8_machine_init(&m, U8_ESPLUS_CODE_PAGES);
    u8_status st = u8_machine_load_rom(&m, image, len);
    if (st != U8_OK) {
        fprintf(stderr, "error: ROM load failed (%d)\n", (int)st);
        u8_machine_dispose(&m);
        free(image);
        return 1;
    }
    /* Keys are a property of the physical machine: press before reset so
     * they survive u8_machine_reset (the keypad matrix is not cleared). */
    for (int i = 0; i < n_keys; i++) u8_keypad_press(&m.keypad, keys[i]);
    u8_machine_reset(&m);

    u8_status run_st = U8_OK;
    const unsigned long executed = u8_machine_run(&m, (unsigned long)max_steps,
                                                  &run_st);

    printf("executed %lu instruction(s), last status=%d (%s)\n", executed,
           (int)run_st,
           run_st == U8_OK ? "ok" :
           run_st == U8_ILLEGAL_INSTRUCTION ? "illegal instruction" :
           run_st == U8_UNIMPLEMENTED ? "unimplemented" : "other");
    if (want_regs) {
        char buf[1024];
        u8_dbg_dump_regs(m.core, buf, sizeof(buf));
        fputs(buf, stdout);
        printf("SFR: %u unhandled read(s), %u unhandled write(s)\n",
               m.sfr.unhandled_reads, m.sfr.unhandled_writes);
        printf("IRQ: %u delivered, pending=0x%02X, enable=0x%02X\n",
               m.irq_delivered, m.intc.flags, m.intc.enable);
        printf("LCD: %s, %u frame update(s) dispatched\n",
               m.lcd.display_on ? "on" : "off", m.lcd.updates);
    }
    if (vram_path) {
        uint8_t frame[U8_LCD_W * U8_LCD_H];
        u8_lcd_blit(m.bus, frame);
        FILE *out = fopen(vram_path, "wb");
        if (out) {
            fwrite(frame, 1, sizeof(frame), out);
            fclose(out);
            printf("VRAM frame written to %s\n", vram_path);
        } else {
            fprintf(stderr, "error: cannot write '%s'\n", vram_path);
        }
    }

    u8_machine_dispose(&m);
    free(image);
    return (run_st == U8_OK || run_st == U8_ILLEGAL_INSTRUCTION) ? 0 : 1;
}
