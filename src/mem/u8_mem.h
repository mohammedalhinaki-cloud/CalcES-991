/* u8_mem.h — memory system (MMU): code space, data space, region routing. */
#ifndef U8_MEM_H
#define U8_MEM_H
#ifdef __cplusplus
extern "C" {
#endif

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "core/u8_types.h"

/* Model configuration: fx-991ES PLUS (see docs/memory-map.md). */
#define U8_ESPLUS_CODE_PAGES 2u       /* 2 x 64 KiB code pages (CSR bit 0)  */
#define U8_ROM_WINDOW        0x8000u  /* 32 KiB ROM window in data space    */
#define U8_DATA_LOW          0x8000u  /* data backing starts at flat 0x8000 */
#define U8_DATA_SIZE         0x8000u  /* 32 KiB backing (RAM/VRAM holes)    */

typedef struct u8_bus  u8_bus;
struct u8_sfr;

u8_bus *u8_bus_create(unsigned code_pages);
void    u8_bus_destroy(u8_bus *b);

/* Copy a ROM image into code space (max = code_pages * 64 KiB). */
u8_status u8_bus_load_rom(u8_bus *b, const uint8_t *bytes, size_t len);

/* Test/dev helper: poke a 16-bit word (little-endian) into code space. */
void u8_bus_poke_code16(u8_bus *b, uint32_t flat, uint16_t word);

/* Instruction fetch: 16-bit word, always even-aligned, segment banked.
 * Unmapped segments read 0xFFFF. */
uint16_t u8_fetch_word(u8_bus *b, unsigned seg, uint16_t off, u8_status *st);

/* Data access: 1/2/4/8 bytes, little-endian, routed through the region map.
 * size is normalised (0,1 -> 1; 2 -> 2; 3,4 -> 4; else 8). Multi-byte word
 * accesses are even-aligned (odd offsets flag U8_UNALIGNED, non-fatal). */
uint64_t  u8_data_read (u8_bus *b, unsigned seg, uint16_t off,
                        unsigned size, u8_status *st);
u8_status u8_data_write(u8_bus *b, unsigned seg, uint16_t off,
                        unsigned size, uint64_t val, u8_status *st);

/* Number of ROM-window reads since the last call (cycle accounting). */
unsigned u8_bus_take_romwin(u8_bus *b);

/* Direct backing-store access (tests, LCD blit). */
uint8_t *u8_bus_data(u8_bus *b);
uint8_t *u8_bus_code(u8_bus *b, size_t *size);

/* Attach the SFR handler used for the SFR region. */
void u8_bus_attach_sfr(u8_bus *b, struct u8_sfr *s);

#ifdef __cplusplus
}
#endif
#endif /* U8_MEM_H */
