/* main_gui.cpp — SDL2 + Dear ImGui front-end for casio-u8-emu.
 *
 * Host-side UI only: the emulator core stays clean-room C (src/core, src/mem,
 * src/machine). This file is presentation — LCD view over VRAM, keypad input,
 * debug panels (registers, disassembly, memory, peripherals) and run control.
 *
 * Legal note: no Casio firmware is shipped; the user supplies a ROM (--rom).
 */
#include <SDL.h>

#include "imgui.h"
#include "backends/imgui_impl_sdl2.h"
#include "backends/imgui_impl_sdlrenderer2.h"

#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cstdarg>

#include "debug/u8_debugger.h"
#include "disasm/u8_disasm.h"
#include "machine/u8_machine.h"
#include "periph/u8_lcd.h"

extern "C" { /* new file; guard independent of the header's own guard */
#include "gui/u8_keymap.h"
}

#define U8_GUI_ZOOM_DEFAULT 4
#define U8_GUI_WIN_W 1280
#define U8_GUI_WIN_H 760
#define U8_GUI_MEM_DUMP 128u

struct App {
    u8_machine    m;
    bool          running = true;
    u8_status     last_st = U8_OK;
    unsigned long executed = 0;
    int           steps_per_frame = 50000;
    int           zoom = U8_GUI_ZOOM_DEFAULT;
    uint32_t      mem_addr = 0x00F800u;
    char          mem_input[16] = "0x00F800";
    char          msg[256] = "";
};

static void set_msg(App *a, const char *fmt, ...)
{
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(a->msg, sizeof(a->msg), fmt, ap);
    va_end(ap);
}

static const char *status_name(int s)
{
    switch (s) {
        case U8_OK:                 return "ok";
        case U8_MEM_UNINIT:         return "memory uninitialised";
        case U8_ILLEGAL_INSTRUCTION:return "illegal instruction";
        case U8_UNIMPLEMENTED:      return "unimplemented";
        case U8_ROM_WRITE:          return "ROM write";
        case U8_UNMAPPED_ACCESS:    return "unmapped access";
        case U8_UNALIGNED_ACCESS:   return "unaligned access";
        case U8_INVALID_ARG:        return "invalid argument";
        default:                    return "other";
    }
}

/* Execute one instruction, update run state on terminal statuses. */
static void app_step(App *a)
{
    a->last_st = u8_machine_step(&a->m);
    a->executed++;
    if (a->last_st != U8_OK) {
        a->running = false;
        set_msg(a, "halted: %s", status_name((int)a->last_st));
    }
}

static void save_screenshot(SDL_Renderer *ren, const char *path)
{
    int w = 0, h = 0;
    SDL_GetRendererOutputSize(ren, &w, &h);
    SDL_Surface *surf = SDL_CreateRGBSurfaceWithFormat(
        0, w, h, 32, SDL_PIXELFORMAT_ABGR8888);
    if (!surf) return;
    if (SDL_RenderReadPixels(ren, NULL, SDL_PIXELFORMAT_ABGR8888,
                             surf->pixels, surf->pitch) == 0) {
        SDL_SaveBMP(surf, path);
        printf("screenshot saved to %s\n", path);
    }
    SDL_FreeSurface(surf);
}

static void usage(const char *argv0)
{
    fprintf(stderr,
        "casio-u8-emu GUI — nX-U8/100 emulator (SDL2 + Dear ImGui)\n"
        "Usage: %s --rom FILE [--steps-per-frame N] [--zoom Z]\n"
        "              [--frames N] [--screenshot FILE]\n"
        "  --rom, -r FILE       ROM image (max %u KiB)\n"
        "  --steps-per-frame N  instructions per frame when running\n"
        "  --zoom Z             LCD zoom factor (2..6, default %d)\n"
        "  --frames N           auto-quit after N frames (smoke tests)\n"
        "  --screenshot FILE    save the final frame as BMP (with --frames)\n",
        argv0, (unsigned)(U8_ESPLUS_CODE_PAGES * 64u), U8_GUI_ZOOM_DEFAULT);
}

static void draw_keypad(App *a)
{
    const ImVec2 bs(56, 24);
    for (int r = 0; r < 8; r++) {
        for (int c = 0; c < 7; c++) {
            if (c) ImGui::SameLine();
            const uint8_t code = (uint8_t)((c << 4) | r);
            char unk[8];
            const char *lab = u8_keymap_label(code);
            if (!lab) { snprintf(unk, sizeof(unk), "%d,%d", c, r); lab = unk; }
            const bool held = (u8_keypad_column_bits(&a->m.keypad, (unsigned)c)
                               >> r) & 1u;
            ImGui::PushID(0x100 + code);
            if (held) ImGui::PushStyleColor(ImGuiCol_Button,
                                            ImVec4(0.85f, 0.55f, 0.10f, 1.0f));
            ImGui::Button(lab, bs);
            if (held) ImGui::PopStyleColor();
            if (ImGui::IsItemActivated())   u8_keypad_press(&a->m.keypad, code);
            if (ImGui::IsItemDeactivated()) u8_keypad_release(&a->m.keypad, code);
            ImGui::PopID();
        }
    }
}

static void draw_registers(App *a)
{
    const u8_regs *R = u8_regs_get(a->m.core);
    ImGui::Text("PC=0x%04X  CSR=%u  DSR=%u  SP=0x%04X", R->pc, R->csr & 0xFu,
                R->dsr, R->sp);
    ImGui::Text("EA=0x%04X  LR=0x%04X  LCSR=%u", R->ea, R->lr, R->lcsr);
    ImGui::Text("PSW=0x%02X  C=%d Z=%d S=%d OV=%d HC=%d MIE=%d ELEVEL=%d",
                R->psw.raw, R->psw.b.c, R->psw.b.z, R->psw.b.s, R->psw.b.ov,
                R->psw.b.hc, R->psw.b.mie, R->psw.b.elevel);
    ImGui::Text("last instruction: %d cycle(s)", u8_cycles_last(a->m.core));
    ImGui::Separator();
    if (ImGui::BeginTable("gpr", 4, ImGuiTableFlags_Borders |
                                    ImGuiTableFlags_RowBg)) {
        for (int i = 0; i < 16; i++) {
            char bits[12] = "0b";
            for (int b = 0; b < 8; b++)
                bits[2 + b] = (char)('0' + ((R->gpr.r[i] >> (7 - b)) & 1u));
            bits[10] = 0;
            ImGui::TableNextRow();
            ImGui::TableNextColumn(); ImGui::Text("R%d", i);
            ImGui::TableNextColumn(); ImGui::Text("0x%02X", R->gpr.r[i]);
            ImGui::TableNextColumn(); ImGui::Text("%u", R->gpr.r[i]);
            ImGui::TableNextColumn(); ImGui::TextUnformatted(bits);
        }
        ImGui::EndTable();
    }
    ImGui::Separator();
    ImGui::Text("ELR: %04X %04X %04X   ECSR: %u %u %u", R->elr[0], R->elr[1],
                R->elr[2], R->ecsr[0], R->ecsr[1], R->ecsr[2]);
    ImGui::Text("EPSW: %02X %02X %02X", R->epsw[0].raw, R->epsw[1].raw,
                R->epsw[2].raw);
}

static void draw_disasm(App *a)
{
    const u8_regs *R = u8_regs_get(a->m.core);
    u8_bus *bus = u8_core_bus(a->m.core);
    const unsigned csr = R->csr & 0xFu;
    uint16_t pc = R->pc;
    char line[96];
    for (int i = 0; i < 16; i++) {
        u8_status st = U8_OK;
        const uint16_t w = u8_fetch_word(bus, csr, pc, &st);
        if (st != U8_OK) {
            snprintf(line, sizeof(line), "<unmapped>");
            ImGui::Text("  %04X  %s", pc, line);
            break;
        }
        uint16_t ops[1] = {0};
        ops[0] = u8_fetch_word(bus, csr, (uint16_t)(pc + 2u), &st);
        const int used = u8_disasm(w, ops, line, sizeof(line));
        if (i == 0)
            ImGui::TextColored(ImVec4(1.0f, 0.78f, 0.25f, 1.0f), ">%04X  %s",
                               pc, line);
        else
            ImGui::Text(" %04X  %s", pc, line);
        pc = (uint16_t)(pc + 2u * (used > 0 ? used : 1));
    }
    ImGui::TextDisabled("(disassembly from PC; may desync on data words)");
}

static void draw_memory(App *a)
{
    ImGui::SetNextItemWidth(150);
    if (ImGui::InputText("##addr", a->mem_input, sizeof(a->mem_input),
                         ImGuiInputTextFlags_EnterReturnsTrue))
        a->mem_addr = (uint32_t)strtoul(a->mem_input, NULL, 0);
    ImGui::SameLine();
    if (ImGui::Button("Go"))
        a->mem_addr = (uint32_t)strtoul(a->mem_input, NULL, 0);
    ImGui::SameLine();
    ImGui::Text("(hex address; ROM window 0x0000, RAM 0x8000, SFR 0xF000, VRAM 0xF800)");
    char buf[4096];
    u8_dbg_dump_mem(a->m.core, a->mem_addr, U8_GUI_MEM_DUMP, buf, sizeof(buf));
    ImGui::TextUnformatted(buf);
}

static void draw_peripherals(App *a)
{
    u8_machine *m = &a->m;
    ImGui::Text("IRQ: F=%02X EN=%02X  delivered=%u", m->intc.flags,
                m->intc.enable, m->irq_delivered);
    for (unsigned t = 0; t < U8_MACHINE_TIMERS; t++) {
        const u8_timer *tm = &m->timer[t];
        ImGui::Text("T%u: CNT=%02X RLD=%02X CTL=%02X  cycles=%llu", t, tm->cnt,
                    tm->rld, tm->ctl, (unsigned long long)tm->total_cycles);
    }
    ImGui::Text("LCD: %s, %u frame update(s) dispatched",
                m->lcd.display_on ? "on" : "off", m->lcd.updates);
    ImGui::Text("SFR unhandled: %u read(s), %u write(s)",
                m->sfr.unhandled_reads, m->sfr.unhandled_writes);
    ImGui::Text("key drive: %02X, rows: %02X", m->key_drive,
                u8_keypad_scan(&m->keypad, m->key_drive));
}

int main(int argc, char **argv)
{
    const char *rom_path = NULL;
    const char *shot_path = NULL;
    long frames_limit = 0;
    App app;

    for (int i = 1; i < argc; i++) {
        const char *a = argv[i];
        if (!strcmp(a, "--rom") || !strcmp(a, "-r")) {
            if (++i >= argc) { usage(argv[0]); return 2; }
            rom_path = argv[i];
        } else if (!strcmp(a, "--steps-per-frame")) {
            if (++i >= argc) { usage(argv[0]); return 2; }
            app.steps_per_frame = strtol(argv[i], NULL, 0);
        } else if (!strcmp(a, "--zoom")) {
            if (++i >= argc) { usage(argv[0]); return 2; }
            app.zoom = (int)strtol(argv[i], NULL, 0);
        } else if (!strcmp(a, "--frames")) {
            if (++i >= argc) { usage(argv[0]); return 2; }
            frames_limit = strtol(argv[i], NULL, 0);
        } else if (!strcmp(a, "--screenshot")) {
            if (++i >= argc) { usage(argv[0]); return 2; }
            shot_path = argv[i];
        } else {
            usage(argv[0]); return 2;
        }
    }
    if (!rom_path) { usage(argv[0]); return 2; }
    if (app.zoom < 2) app.zoom = 2;
    if (app.zoom > 6) app.zoom = 6;

    /* ROM load (user-supplied; never distributed with the emulator). */
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

    u8_machine_init(&app.m, U8_ESPLUS_CODE_PAGES);
    const u8_status load_st = u8_machine_load_rom(&app.m, image, len);
    if (load_st != U8_OK) {
        fprintf(stderr, "error: ROM load failed (%d)\n", (int)load_st);
        u8_machine_dispose(&app.m);
        free(image);
        return 1;
    }
    u8_machine_reset(&app.m);
    set_msg(&app, "ROM loaded: %s (%zu KiB)", rom_path, len / 1024u);

    if (SDL_Init(SDL_INIT_VIDEO | SDL_INIT_TIMER) != 0) {
        fprintf(stderr, "error: SDL_Init: %s\n", SDL_GetError());
        u8_machine_dispose(&app.m);
        free(image);
        return 1;
    }
    SDL_SetHint(SDL_HINT_RENDER_SCALE_QUALITY, "0"); /* nearest neighbour */
    SDL_Window *win = SDL_CreateWindow("casio-u8-emu — fx-991ES PLUS",
                                       SDL_WINDOWPOS_CENTERED,
                                       SDL_WINDOWPOS_CENTERED,
                                       U8_GUI_WIN_W, U8_GUI_WIN_H,
                                       SDL_WINDOW_RESIZABLE);
    SDL_Renderer *ren = win ? SDL_CreateRenderer(win, -1, SDL_RENDERER_PRESENTVSYNC) : NULL;
    if (!ren && win) ren = SDL_CreateRenderer(win, -1, SDL_RENDERER_SOFTWARE);
    if (!ren && win) ren = SDL_CreateRenderer(win, -1, 0);
    if (!win || !ren) {
        fprintf(stderr, "error: SDL window/renderer: %s\n", SDL_GetError());
        return 1;
    }
    SDL_Texture *lcd_tex = SDL_CreateTexture(ren, SDL_PIXELFORMAT_ABGR8888,
                                             SDL_TEXTUREACCESS_STREAMING,
                                             U8_LCD_W, U8_LCD_H);
    if (!lcd_tex) {
        fprintf(stderr, "error: LCD texture: %s\n", SDL_GetError());
        return 1;
    }

    ImGui::CreateContext();
    ImGuiIO &io = ImGui::GetIO();
    io.IniFilename = NULL; /* no imgui.ini clutter */
    ImGui_ImplSDL2_InitForSDLRenderer(win, ren);
    ImGui_ImplSDLRenderer2_Init(ren);
    ImGui::StyleColorsDark();

    uint8_t frame[U8_LCD_W * U8_LCD_H];
    static uint32_t px[U8_LCD_W * U8_LCD_H];
    bool quit = false;
    long frame_no = 0;

    while (!quit) {
        SDL_Event e;
        while (SDL_PollEvent(&e)) {
            ImGui_ImplSDL2_ProcessEvent(&e);
            if (e.type == SDL_QUIT) quit = true;
            if (e.type == SDL_WINDOWEVENT &&
                e.window.event == SDL_WINDOWEVENT_CLOSE)
                quit = true;
        }

        if (app.running) {
            for (long i = 0; i < app.steps_per_frame; i++) app_step(&app);
            if (app.last_st != U8_OK) app.running = false;
        }

        /* LCD -> texture (lit = dark ink, unlit = pale green). */
        u8_lcd_blit(app.m.bus, frame);
        for (unsigned i = 0; i < U8_LCD_W * U8_LCD_H; i++)
            px[i] = frame[i] ? 0xFF242424u : 0xFFC8F0D0u;
        SDL_UpdateTexture(lcd_tex, NULL, px, U8_LCD_W * 4);

        ImGui_ImplSDLRenderer2_NewFrame();
        ImGui_ImplSDL2_NewFrame();
        ImGui::NewFrame();

        ImGui::SetNextWindowPos(ImVec2(0, 0));
        ImGui::SetNextWindowSize(io.DisplaySize);
        ImGui::Begin("casio-u8-emu", nullptr,
                     ImGuiWindowFlags_NoResize | ImGuiWindowFlags_NoMove |
                         ImGuiWindowFlags_NoCollapse);
        const u8_regs *R = u8_regs_get(app.m.core);

        /* Toolbar. */
        if (ImGui::Button(app.running ? "Pause" : "Run"))
            app.running = !app.running;
        ImGui::SameLine();
        if (ImGui::Button("Step")) app_step(&app);
        ImGui::SameLine();
        if (ImGui::Button("Reset")) u8_machine_reset(&app.m);
        ImGui::SameLine();
        ImGui::SetNextItemWidth(200);
        ImGui::SliderInt("##speed", &app.steps_per_frame, 1, 200000,
                         "steps/frame %d", ImGuiSliderFlags_Logarithmic);
        ImGui::SameLine();
        ImGui::Text("exec: %lu  PC=%04X  %s", app.executed, R->pc,
                    app.running ? "running" : "paused");
        if (app.msg[0]) ImGui::TextDisabled("%s", app.msg);

        /* Left pane: LCD + keypad. */
        ImGui::BeginChild("calc", ImVec2(470, 0),
                          ImGuiChildFlags_Borders);
        ImGui::Image((ImTextureID)(intptr_t)lcd_tex,
                     ImVec2((float)(U8_LCD_W * app.zoom),
                            (float)(U8_LCD_H * app.zoom)));
        ImGui::SliderInt("zoom", &app.zoom, 2, 6);
        ImGui::Separator();
        draw_keypad(&app);
        ImGui::EndChild();

        /* Right pane: debug tabs. */
        ImGui::SameLine();
        ImGui::BeginChild("dbg", ImVec2(0, 0));
        if (ImGui::BeginTabBar("dbgtabs")) {
            if (ImGui::BeginTabItem("Registers")) {
                draw_registers(&app);
                ImGui::EndTabItem();
            }
            if (ImGui::BeginTabItem("Disassembly")) {
                draw_disasm(&app);
                ImGui::EndTabItem();
            }
            if (ImGui::BeginTabItem("Memory")) {
                draw_memory(&app);
                ImGui::EndTabItem();
            }
            if (ImGui::BeginTabItem("Peripherals")) {
                draw_peripherals(&app);
                ImGui::EndTabItem();
            }
            ImGui::EndTabBar();
        }
        ImGui::EndChild();

        ImGui::End();
        ImGui::Render();
        SDL_SetRenderDrawColor(ren, 0x14, 0x16, 0x1A, 255);
        SDL_RenderClear(ren);
        ImGui_ImplSDLRenderer2_RenderDrawData(ImGui::GetDrawData(), ren);
        SDL_RenderPresent(ren);

        frame_no++;
        if (frames_limit > 0 && frame_no >= frames_limit) {
            if (shot_path) save_screenshot(ren, shot_path);
            quit = true;
        }
    }

    ImGui_ImplSDLRenderer2_Shutdown();
    ImGui_ImplSDL2_Shutdown();
    ImGui::DestroyContext();
    SDL_DestroyTexture(lcd_tex);
    SDL_DestroyRenderer(ren);
    SDL_DestroyWindow(win);
    SDL_Quit();
    u8_machine_dispose(&app.m);
    free(image);
    printf("executed %lu instruction(s), last status=%d (%s)\n", app.executed,
           (int)app.last_st, status_name((int)app.last_st));
    return 0;
}
