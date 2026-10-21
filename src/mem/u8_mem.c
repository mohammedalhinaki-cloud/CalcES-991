/* u8_mem.c — region map and bus routing for the fx-991ES PLUS memory map.
 *
 * Data-space regions follow the documented ES+ layout (docs/memory-map.md):
 *   0x000000..0x007FFF  ROM window   (reads from code page 0, write = error)
 *   0x008000..0x008DFF  RAM
 *   0x00F000..0x00F04F  SFR space    (routed to the attached SFR handler)
 *   0x00F800..0x00F9FF  VRAM         (holes: (addr & 0xF) >= 0xC)
 *   0x010000..0x01FFFF  code page 1 (data reads)
 *   0x080000..0x09FFFF  code mirror (segments 8+)
 *   otherwise           unmapped     (reads 0, writes ignored)
 */
#include <stdlib.h>
#include <string.h>

#include "mem/u8_mem.h"
#include "sfr/u8_sfr.h"

typedef enum {
    REG_RAM,
    REG_VRAM,
    REG_SFR,
    REG_ROM_WINDOW,
    REG_CODE,
    REG_UNMAPPED
} region_kind;

typedef struct {
    uint32_t    start;
    uint32_t    end;    /* exclusive */
    region_kind kind;
} u8_region;

/* fx-991ES PLUS default map (order matters: first match wins). */
static const u8_region ESPLUS_MAP[] = {
    { 0x008000u, 0x008e00u, REG_RAM },
    { 0x00f800u, 0x00fa00u, REG_VRAM },
    { 0x00f000u, 0x00f050u, REG_SFR },
    { 0x000000u, 0x008000u, REG_ROM_WINDOW },
    { 0x010000u, 0x020000u, REG_CODE },
    { 0x080000u, 0x0a0000u, REG_CODE },
    { 0x000000u, 0x1000000u, REG_UNMAPPED },
};
#define MAP_LEN (sizeof(ESPLUS_MAP) / sizeof(ESPLUS_MAP[0]))

struct u8_bus {
    uint8_t *code;          /* code_pages * 64 KiB */
    size_t   code_size;
    unsigned code_pages;
    uint8_t *data;          /* 32 KiB backing at flat 0x8000..0xFFFF */
    struct u8_sfr *sfr;
    unsigned romwin_pending;
    const u8_region *map;
    size_t   map_len;
};

u8_bus *u8_bus_create(unsigned code_pages)
{
    u8_bus *b = (u8_bus *)calloc(1, sizeof(*b));
    if (!b) return NULL;
    if (code_pages == 0u) { free(b); return NULL; }
    b->code_pages = code_pages;
    b->code_size  = (size_t)code_pages * 0x10000u;
    b->code = (uint8_t *)calloc(1, b->code_size);
    b->data = (uint8_t *)calloc(1, U8_DATA_SIZE);
    if (!b->code || !b->data) {
        u8_bus_destroy(b);
        return NULL;
    }
    b->map = ESPLUS_MAP;
    b->map_len = MAP_LEN;
    return b;
}

void u8_bus_destroy(u8_bus *b)
{
    if (!b) return;
    free(b->code);
    free(b->data);
    free(b);
}

u8_status u8_bus_load_rom(u8_bus *b, const uint8_t *bytes, size_t len)
{
    if (!b || !bytes) return U8_INVALID_ARG;
    if (len > b->code_size) return U8_INVALID_ARG;
    memcpy(b->code, bytes, len);
    return U8_OK;
}

void u8_bus_poke_code16(u8_bus *b, uint32_t flat, uint16_t word)
{
    if (!b || (flat + 1u) >= b->code_size) return;
    b->code[flat]     = (uint8_t)(word & 0xffu);
    b->code[flat + 1] = (uint8_t)(word >> 8);
}

unsigned u8_bus_take_romwin(u8_bus *b)
{
    unsigned n = b->romwin_pending;
    b->romwin_pending = 0;
    return n;
}

uint8_t *u8_bus_data(u8_bus *b) { return b->data; }
uint8_t *u8_bus_code(u8_bus *b, size_t *size)
{
    if (size) *size = b->code_size;
    return b->code;
}

void u8_bus_attach_sfr(u8_bus *b, struct u8_sfr *s) { b->sfr = s; }

static const u8_region *lookup(const u8_bus *b, uint32_t flat)
{
    for (size_t i = 0; i < b->map_len; i++) {
        if (flat >= b->map[i].start && flat < b->map[i].end) return &b->map[i];
    }
    return &b->map[b->map_len - 1]; /* final catch-all: unmapped */
}

static uint8_t read_byte(u8_bus *b, uint32_t flat, u8_status *st)
{
    const u8_region *r = lookup(b, flat);
    switch (r->kind) {
        case REG_RAM:
            return b->data[flat - U8_DATA_LOW];
        case REG_VRAM:
            /* Documented VRAM holes: 12 of every 16 bytes exist. */
            if ((flat & 0x0fu) >= 0x0cu) return 0x00; /* silent, reads 0 */
            return b->data[flat - U8_DATA_LOW];
        case REG_SFR:
            return b->sfr ? u8_sfr_read(b->sfr, flat) : 0x00;
        case REG_ROM_WINDOW:
            b->romwin_pending++;
            return b->code[flat];           /* maps onto code page 0 */
        case REG_CODE:
            return b->code[flat & (b->code_size - 1u)];
        case REG_UNMAPPED:
        default:
            if (st) *st = U8_UNMAPPED_ACCESS;
            return 0x00;
    }
}

static void write_byte(u8_bus *b, uint32_t flat, uint8_t v, u8_status *st)
{
    const u8_region *r = lookup(b, flat);
    switch (r->kind) {
        case REG_RAM:
            b->data[flat - U8_DATA_LOW] = v;
            break;
        case REG_VRAM:
            if ((flat & 0x0fu) >= 0x0cu) {
                if (st) *st = U8_UNMAPPED_ACCESS; /* hole: write ignored */
            } else {
                b->data[flat - U8_DATA_LOW] = v;
            }
            break;
        case REG_SFR:
            if (b->sfr) u8_sfr_write(b->sfr, flat, v);
            break;
        case REG_ROM_WINDOW:
        case REG_CODE:
            if (st) *st = U8_ROM_WRITE;          /* read-only, ignored */
            break;
        case REG_UNMAPPED:
        default:
            if (st) *st = U8_UNMAPPED_ACCESS;
            break;
    }
}

static unsigned norm_size(unsigned size)
{
    switch (size) {
        case 0: case 1: return 1u;
        case 2:         return 2u;
        case 3: case 4: return 4u;
        default:        return 8u;
    }
}

uint16_t u8_fetch_word(u8_bus *b, unsigned seg, uint16_t off, u8_status *st)
{
    seg &= 0x0fu;
    off &= 0xfffeu;
    const unsigned mask = b->code_pages - 1u;
    if ((seg & mask) >= b->code_pages) {
        if (st) *st = U8_UNMAPPED_ACCESS;
        return 0xffffu;
    }
    if (seg > mask) seg &= mask;   /* mirrored bank */
    const size_t a = ((size_t)seg << 16) | off;
    if (st) *st = U8_OK;
    return (uint16_t)(b->code[a] | (b->code[a + 1] << 8));
}

uint64_t u8_data_read(u8_bus *b, unsigned seg, uint16_t off,
                      unsigned size, u8_status *st)
{
    uint64_t out = 0;
    size = norm_size(size);
    if (size > 1u) {
        if (off & 1u) { if (st) *st = U8_UNALIGNED_ACCESS; }
        off &= 0xfffeu;
    }
    b->romwin_pending = 0;
    /* Highest byte first so the value assembles little-endian, matching the
     * documented byte order and crossing region borders per byte. */
    for (unsigned i = size; i > 0u; i--) {
        const uint32_t a = ((uint32_t)seg << 16) | (uint32_t)(off + i - 1u);
        out = (out << 8) | read_byte(b, a, st);
    }
    if (st && *st == U8_UNALIGNED_ACCESS) { /* keep flag, access succeeded */ }
    return out;
}

u8_status u8_data_write(u8_bus *b, unsigned seg, uint16_t off,
                        unsigned size, uint64_t val, u8_status *st)
{
    u8_status s = U8_OK;
    size = norm_size(size);
    if (size > 1u) {
        if (off & 1u) s = U8_UNALIGNED_ACCESS;
        off &= 0xfffeu;
    }
    b->romwin_pending = 0;
    for (unsigned i = 0; i < size; i++) {
        const uint32_t a = ((uint32_t)seg << 16) | (uint32_t)(off + i);
        write_byte(b, a, (uint8_t)(val >> (8u * i)), &s);
    }
    if (st) *st = s;
    return s;
}
