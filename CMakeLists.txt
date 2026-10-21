# casio-u8-emu — Casio nX-U8/100 calculator emulator
# Portable C17 core + headless runner (GUI: SDL2 + Dear ImGui, later phase).
cmake_minimum_required(VERSION 3.16)
project(casio-u8-emu VERSION 0.1.0 LANGUAGES C)

set(CMAKE_C_STANDARD 17)
set(CMAKE_C_STANDARD_REQUIRED ON)

add_library(u8core STATIC
    src/core/u8_alu.c
    src/core/u8_core.c
    src/mem/u8_mem.c
    src/sfr/u8_sfr.c
    src/sfr/u8_intc.c
    src/machine/u8_machine.c
    src/periph/u8_lcd.c
    src/periph/u8_keypad.c
    src/periph/u8_timer.c
    src/disasm/u8_disasm.c
    src/debug/u8_debugger.c
)
target_include_directories(u8core PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/src)

if(MSVC)
    target_compile_options(u8core PRIVATE /W3)
else()
    target_compile_options(u8core PRIVATE -Wall -Wextra)
endif()

# Headless runner: loads a ROM and steps the core (acceptance test vehicle).
add_executable(u8emu src/main.c)
target_link_libraries(u8emu PRIVATE u8core)

enable_testing()
set(U8_TESTS test_alu test_branch test_mmu test_disasm test_periph
             test_integration)
foreach(t ${U8_TESTS})
    add_executable(${t} tests/${t}.c)
    target_link_libraries(${t} PRIVATE u8core)
    add_test(NAME ${t} COMMAND ${t})
endforeach()

# GUI front-end (SDL2 + Dear ImGui). Built only when SDL2 is available;
# Dear ImGui v1.93.0 is vendored under third_party/imgui (MIT — see its
# LICENSE.txt; a vendored dependency, not part of the clean-room core).
option(U8_BUILD_GUI "Build the SDL2 + Dear ImGui front-end" ON)
if(U8_BUILD_GUI)
    find_package(PkgConfig QUIET)
    if(PkgConfig_FOUND)
        pkg_check_modules(SDL2 QUIET IMPORTED_TARGET sdl2)
    endif()
    if(SDL2_FOUND)
        enable_language(CXX)
        add_library(imgui STATIC
            third_party/imgui/imgui.cpp
            third_party/imgui/imgui_draw.cpp
            third_party/imgui/imgui_tables.cpp
            third_party/imgui/imgui_widgets.cpp
            third_party/imgui/backends/imgui_impl_sdl2.cpp
            third_party/imgui/backends/imgui_impl_sdlrenderer2.cpp)
        target_include_directories(imgui PUBLIC
            ${CMAKE_CURRENT_SOURCE_DIR}/third_party/imgui
            ${CMAKE_CURRENT_SOURCE_DIR}/third_party/imgui/backends)
        # The backends (imgui_impl_sdl2 etc.) compile against SDL2 headers.
        target_link_libraries(imgui PRIVATE PkgConfig::SDL2)
        if(MSVC)
            target_compile_options(imgui PRIVATE /w)
        else()
            target_compile_options(imgui PRIVATE -w)
        endif()
        add_executable(u8gui src/gui/main_gui.cpp src/gui/u8_keymap.c)
        target_compile_options(u8gui PRIVATE
            $<$<COMPILE_LANGUAGE:CXX>:-Wall -Wextra>)
        target_link_libraries(u8gui PRIVATE u8core imgui PkgConfig::SDL2)
    else()
        message(STATUS
            "SDL2 not found — the GUI target is skipped (install libsdl2-dev)")
    endif()
endif()
