import re

file_path = "src/components/screens/StoreScreen.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Enhance sub-tabs animation using layoutId and motion.button
subtab_old = '''                  <button
                    role="tab"
                    aria-selected={isSubActive}
                    onClick={() => {
                      uiTap();
                      setTab(sub.id);
                      setNote("");
                    }}
                    className={`text-[13px] font-medium transition-colors py-1 px-2.5 rounded-lg ${
                      isSubActive ? "font-semibold txt bg-[var(--surface-raised)]" : "text-[var(--text-dim)] hover:text-[var(--text)]"
                    }`}
                  >
                    <span>{sub.label}</span>
                    {count > 0 && <span className="ml-1.5 opacity-60 text-[11px] num">({count})</span>}
                  </button>'''

subtab_new = '''                  <button
                    role="tab"
                    aria-selected={isSubActive}
                    onClick={() => {
                      uiTap();
                      setTab(sub.id);
                      setNote("");
                    }}
                    className={`relative text-[13px] font-medium transition-colors py-1 px-2.5 rounded-lg ${
                      isSubActive ? "font-semibold txt" : "text-[var(--text-dim)] hover:text-[var(--text)]"
                    }`}
                  >
                    {isSubActive && (
                      <motion.div
                        layoutId="storeSubTabActive"
                        className="absolute inset-0 rounded-lg bg-[var(--surface-raised)] border border-[var(--panel-border)]"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center">
                      <span>{sub.label}</span>
                      {count > 0 && <span className="ml-1.5 opacity-60 text-[11px] num">({count})</span>}
                    </span>
                  </button>'''

content = content.replace(subtab_old, subtab_new)

# Enhance Modal Preview Stage floating effect
preview_old = '''                  {/* Preview Stage with 3D Tilt */}
                  <TiltCard maxTilt={12} scale={1.03} className="store-modal-preview-stage rounded-2xl my-3">
                    <PreviewFace item={peek} isModal={true} />
                  </TiltCard>'''

preview_new = '''                  {/* Preview Stage with 3D Tilt & Floating Motion */}
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                  >
                    <TiltCard maxTilt={12} scale={1.03} className="store-modal-preview-stage rounded-2xl my-3 shadow-xl">
                      <PreviewFace item={peek} isModal={true} />
                    </TiltCard>
                  </motion.div>'''

content = content.replace(preview_old, preview_new)

with open(file_path, "w") as f:
    f.write(content)

print("Updated StoreScreen.tsx")
