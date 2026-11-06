# Capacitor's consumer rules retain Plugin subclasses, annotated plugin methods,
# and Cordova entry points. Keep those upstream rules intact.

# WebView invokes these methods by name, outside the Java call graph. Protect
# the JS bridge surface without keeping entire application/library packages.
-keepclassmembers,allowoptimization class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Capacitor discovers plugin methods/callbacks through runtime annotations.
-keepattributes *Annotation*

# Keep usable source locations alongside the generated R8 mapping for retrace.
-keepattributes SourceFile,LineNumberTable
