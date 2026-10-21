/* u8_types.h — fundamental nX-U8/100 data types shared by the whole core.
 *
 * casio-u8-emu: original clean-room implementation. Behaviour is derived from
 * public reverse-engineering documentation of the nX-U8/100 ISA
 * (see docs/references.md for sources and their licenses).
 */
#ifndef U8_TYPES_H
#define U8_TYPES_H
#ifdef __cplusplus
extern "C" {
#endif

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

/* Status codes returned by core steps and bus accesses. */
typedef enum {
    U8_OK = 0,
    U8_MEM_UNINIT,        /* memory system not initialised            */
    U8_ILLEGAL_INSTRUCTION,
    U8_UNIMPLEMENTED,     /* valid opcode family, not yet implemented */
    U8_ROM_WRITE,         /* write attempt into a read-only region    */
    U8_UNMAPPED_ACCESS,   /* access to no region (read gives 0)       */
    U8_UNALIGNED_ACCESS,  /* multi-byte access at odd address (masked)*/
    U8_INVALID_ARG
} u8_status;

/* Program status word. Bit order follows the hardware documentation. */
typedef union {
    uint8_t raw;
    struct {
        uint8_t elevel : 2; /* exception/interrupt level 0..3       */
        uint8_t hc     : 1; /* half carry (BCD adjust)              */
        uint8_t mie    : 1; /* maskable interrupt enable            */
        uint8_t ov     : 1; /* signed overflow                      */
        uint8_t s      : 1; /* sign (bit 7 of result)               */
        uint8_t z      : 1; /* zero                                 */
        uint8_t c      : 1; /* carry / borrow                       */
    } b;
} u8_psw;

/* General register file: 16 byte registers r0..r15, addressable as
 * 8 words (ER0..ER7), 4 dwords (XR0..XR3) and 2 qwords (QR0..QR1).
 * Little-endian view: ERn = r[2n] (low) : r[2n+1] (high). */
typedef union {
    uint64_t qr[2];
    uint32_t xr[4];
    uint16_t er[8];
    uint8_t  r[16];
} u8_gpr;

/* Complete CPU register state (visible to debugger and unit tests). */
typedef struct {
    uint16_t pc;      /* program counter, inside the code segment      */
    uint8_t  csr;     /* code segment register (4 significant bits)    */
    uint8_t  dsr;     /* data segment register (set by _LDSR prefix)   */
    uint16_t ea;      /* effective address register                    */
    uint16_t sp;      /* stack pointer                                 */
    uint16_t lr;      /* link register (level 0)                       */
    uint8_t  lcsr;    /* link code segment                             */
    uint16_t elr[3];  /* backup link registers for levels 1..3         */
    uint8_t  ecsr[3]; /* backup code segments for levels 1..3          */
    u8_psw   psw;
    u8_psw   epsw[3]; /* backup PSWs for levels 1..3                   */
    u8_gpr   gpr;
} u8_regs;

/* The register union relies on little-endian byte order (like every host
 * this emulator realistically targets; it is also what the reference
 * implementations assume). Fail the build loudly elsewhere. */
#if defined(__BYTE_ORDER__) && (__BYTE_ORDER__ != __ORDER_LITTLE_ENDIAN__)
#error "casio-u8-emu currently requires a little-endian host for u8_gpr views"
#endif

#ifdef __cplusplus
}
#endif
#endif /* U8_TYPES_H */
