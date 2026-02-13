import { useState, useRef, useEffect, useCallback } from "react";
import Split from "react-split";
import "./App.css";
import { AI_SERVICES, type AIService } from "./constants";
import { translations, type Language } from "./locales";
interface WebviewTag extends HTMLElement {
  src: string;
  setZoomLevel(level: number): void;
  executeJavaScript(script: string): Promise<any>;
  sendInputEvent(event: any): void;
  loadURL(url: string): void;
  addEventListener(event: string, listener: (e: any) => void): void;
  removeEventListener(event: string, listener: (e: any) => void): void;
  openDevTools(): void;
}
declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          allowpopups?: string;
          partition?: string;
          webpreferences?: string;
          useragent?: string;
        },
        HTMLElement
      >;
    }
  }
}
function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem("app_language") as Language;
    return saved === "en" || saved === "zh" ? saved : "zh";
  });
  const t = translations[lang] || translations["zh"];
  const [services, setServices] = useState<AIService[]>(() => {
    const saved = localStorage.getItem("ai_services");
    return saved ? JSON.parse(saved) : AI_SERVICES;
  });
  const [selectedAIs, setSelectedAIs] = useState<string[]>(() => {
    const saved = localStorage.getItem("selected_ais");
    return saved ? JSON.parse(saved) : ["tongyi", "doubao"];
  });
  const SERVICE_BEHAVIORS: Record<
    string,
    {
      mode: "standard" | "clipboard" | "simulation";
      noRangeReset?: boolean;
      clearByKeys?: boolean;
      preferContentEditable?: boolean;
      sendByEnter?: boolean;
      pasteDelay?: number;
      fileInputSelector?: string;
      blurOnClear?: boolean;
    }
  > = {
    deepseek: {
      mode: "clipboard",
      clearByKeys: true,
      sendByEnter: true,
      blurOnClear: true,
      pasteDelay: 4000,
      preferContentEditable: true,
    },
    tongyi: {
      mode: "clipboard",
      clearByKeys: false,
      pasteDelay: 1500,
      preferContentEditable: true,
      sendByEnter: false,
      blurOnClear: false,
    },
    wenxin: {
      mode: "clipboard",
      noRangeReset: true,
      clearByKeys: false,
      preferContentEditable: true,
      sendByEnter: false,
      blurOnClear: false,
      pasteDelay: 2000,
    },
    doubao: {
      mode: "clipboard",
      noRangeReset: true,
      clearByKeys: true,
      preferContentEditable: true,
      sendByEnter: true,
    },
    chatgpt: { mode: "clipboard", pasteDelay: 2000, sendByEnter: true },
    claude: {
      mode: "clipboard",
      pasteDelay: 3500,
      preferContentEditable: true,
      noRangeReset: true,
      fileInputSelector: 'input[type="file"]',
      sendByEnter: true,
    },
    gemini: {
      mode: "clipboard",
      clearByKeys: true,
      sendByEnter: true,
      blurOnClear: true,
      pasteDelay: 2500,
    },
    default: { mode: "standard", clearByKeys: false },
  };
  const getServiceBehavior = (id: string) => {
    return SERVICE_BEHAVIORS[id] || SERVICE_BEHAVIORS.default;
  };
  const [inputText, setInputText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newService, setNewService] = useState<Partial<AIService>>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [zoomLevel, setZoomLevel] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webviewRefs = useRef<{ [key: string]: WebviewTag }>({});
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 1, 9));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 1, -8));
  const handleResetZoom = () => setZoomLevel(0);
  useEffect(() => {
    const ipc = window.electron?.ipcRenderer;
    if (!ipc) return;
    ipc.on("app-zoom-in", handleZoomIn);
    ipc.on("app-zoom-out", handleZoomOut);
    ipc.on("app-reset-zoom", handleResetZoom);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        ipc.send("exit-fullscreen");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      ipc.off("app-zoom-in", handleZoomIn);
      ipc.off("app-zoom-out", handleZoomOut);
      ipc.off("app-reset-zoom", handleResetZoom);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
  useEffect(() => {
    if (window.electron && window.electron.webFrame) {
      window.electron.webFrame.setZoomLevel(zoomLevel);
    }
    Object.values(webviewRefs.current).forEach((webview) => {
      if (webview) {
        try {
          if (typeof webview.setZoomLevel === "function") {
            webview.setZoomLevel(zoomLevel);
          }
        } catch (err) {
          console.warn(
            "Failed to set zoom level on webview (likely not ready yet):",
            err,
          );
        }
      }
    });
  }, [zoomLevel]);
  useEffect(() => {
    const handleLanguageChange = (_: any, newLang: Language) => {
      setLang(newLang);
      localStorage.setItem("app_language", newLang);
    };
    const ipc = window.electron?.ipcRenderer;
    if (ipc) {
      ipc.on("language-changed", handleLanguageChange);
      return () => {
        ipc.off("language-changed", handleLanguageChange);
      };
    }
  }, []);
  useEffect(() => {
    localStorage.setItem("ai_services", JSON.stringify(services));
  }, [services]);
  useEffect(() => {
    localStorage.setItem("selected_ais", JSON.stringify(selectedAIs));
  }, [selectedAIs]);
  useEffect(() => {
    const ipc = window.electron?.ipcRenderer;
    if (ipc) {
      const domesticHosts = services
        .filter((s) => s.isDomestic)
        .map((s) => s.url);
      ipc.invoke("update-domestic-hosts", domesticHosts).catch(console.error);
    }
  }, [services]);
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);
  const toggleAI = (id: string) => {
    setSelectedAIs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  const handleAddService = () => {
    if (!newService.name || !newService.url || !newService.inputSelector) {
      alert("Name, URL, and Input Selector are required");
      return;
    }
    const id = newService.name.toLowerCase().replace(/\s+/g, "-");
    const service: AIService = {
      id,
      name: newService.name,
      url: newService.url,
      inputSelector: newService.inputSelector,
      submitSelector: newService.submitSelector,
      isDomestic: newService.isDomestic,
    };
    setServices([...services, service]);
    setSelectedAIs([...selectedAIs, id]);
    setShowAddModal(false);
    setNewService({});
  };
  const handleDeleteService = (id: string) => {
    if (confirm("Are you sure you want to delete this service?")) {
      setServices(services.filter((s) => s.id !== id));
      setSelectedAIs(selectedAIs.filter((s) => s !== id));
    }
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => {
        const uniqueFiles = [...prev];
        newFiles.forEach((newFile) => {
          if (
            !uniqueFiles.some(
              (f) => f.name === newFile.name && f.size === newFile.size,
            )
          ) {
            uniqueFiles.push(newFile);
          }
        });
        return uniqueFiles;
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const newFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          newFiles.push(file);
        }
      }
    }
    if (newFiles.length > 0) {
      setSelectedFiles((prev) => {
        const uniqueFiles = [...prev];
        newFiles.forEach((newFile) => {
          if (
            !uniqueFiles.some(
              (f) => f.name === newFile.name && f.size === newFile.size,
            )
          ) {
            uniqueFiles.push(newFile);
          }
        });
        e.preventDefault();
        return uniqueFiles;
      });
    }
  };
  const handleSend = async () => {
    if (!inputText.trim() && selectedFiles.length === 0) return;
    const fileDataUrls: string[] = [];
    if (selectedFiles.length > 0) {
      try {
        for (const file of selectedFiles) {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          fileDataUrls.push(dataUrl);
        }
      } catch (err) {
        console.error("Failed to read files", err);
      }
    }
    const promises = selectedAIs.map(async (id) => {
      const service = services.find((s) => s.id === id);
      const webview = webviewRefs.current[id];
      if (service && webview) {
        try {
          const hidePlaceholderScript = `
            (() => {
                if (window.location.hostname.includes('baidu')) {
                    const style = document.createElement('style');
                    style.innerHTML = \`
                        #dialogue-input img {
                            max-height: 100px;
                            width: auto;
                        }
                    \`;
                    document.head.appendChild(style);
                }
            })()
          `;
          webview.executeJavaScript(hidePlaceholderScript).catch(() => {});

          const behavior = getServiceBehavior(id);
          const behaviorJson = JSON.stringify(behavior);
          await webview.executeJavaScript("window.__cleanupId = Date.now();");
          const focusScript = `
            (() => {
              const behavior = ${behaviorJson};
              let input = document.querySelector('${service.inputSelector}');
              if (behavior.preferContentEditable) {
                  const editable = document.querySelector('div[contenteditable="true"]');
                  if (editable) input = editable;
              }
              if (input) { 
                input.focus();
                if (window.location.hostname.includes('baidu')) {
                    document.execCommand('selectAll', false, null);
                } else if (window.location.hostname.includes('deepseek')) {
                    console.log('Clearing input before paste...');
                    document.execCommand('selectAll', false, null);
                    document.execCommand('delete', false, null);
                    input.innerHTML = '<p><br></p>';
                    const images = input.querySelectorAll('img');
                    images.forEach(img => img.remove());
                }

                if (!behavior.noRangeReset) {
                    input.click(); 
                }
                const selection = window.getSelection();
                let hasValidSelection = false;
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    if (input.contains(range.commonAncestorContainer)) {
                        hasValidSelection = true;
                    }
                }
                if (!hasValidSelection || !behavior.noRangeReset) {
                    if (input.isContentEditable || input.getAttribute('contenteditable') === 'true') {
                        if (behavior.noRangeReset) {
                             input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, buttons: 1 }));
                             input.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window, buttons: 1 }));
                        } else {
                             input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, buttons: 1 }));
                             input.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window, buttons: 1 }));
                        }
                        const range = document.createRange();
                        const lastP = input.querySelector('p:last-of-type');
                        if (lastP) {
                            range.selectNodeContents(lastP);
                        } else {
                            range.selectNodeContents(input);
                        }
                        range.collapse(false); 
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                }
                return true; 
              }
              return false;
            })()
`;
          const focused = await webview.executeJavaScript(focusScript);
          if (focused && selectedFiles.length > 0) {
            if (behavior.fileInputSelector) {
              const fileItems = selectedFiles.map((file, i) => ({
                name: file.name,
                type: file.type,
                dataUrl: fileDataUrls[i],
              }));
              const uploadScript = `
                    (async () => {
                        const items = ${JSON.stringify(fileItems)};
                        const selector = '${behavior.fileInputSelector}';
                        let input = document.querySelector(selector);
                        if (!input) {
                            console.log('File input not found, trying to click attach button...');
                            const attachBtn = document.querySelector('button[aria-label*="Upload"], button[data-testid*="attach"]');
                            if (attachBtn) {
                                attachBtn.click();
                                await new Promise(r => setTimeout(r, 200));
                                input = document.querySelector(selector);
                            }
                        }
                        if (!input) {
                            console.error('File input still not found:', selector);
                            return false;
                        }
                        function dataURLtoFile(dataurl, filename, mime) {
                            var arr = dataurl.split(','),
                                bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
                            while(n--){
                                u8arr[n] = bstr.charCodeAt(n);
                            }
                            return new File([u8arr], filename, {type:mime});
                        }
                        const dt = new DataTransfer();
                        for (const item of items) {
                            dt.items.add(dataURLtoFile(item.dataUrl, item.name, item.type));
                        }
                        input.files = dt.files;
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        console.log('Files set on input:', input);
                        return true;
                    })()
`;
              const success = await webview.executeJavaScript(uploadScript);
              if (success) {
                await new Promise((r) =>
                  setTimeout(r, behavior.pasteDelay || 2000),
                );
              } else {
                console.warn(
                  "Native upload failed, falling back to clipboard...",
                );
                if (window.electron?.ipcRenderer) {
                  for (const dataUrl of fileDataUrls) {
                    await window.electron.ipcRenderer.invoke(
                      "copy-image-to-clipboard",
                      dataUrl,
                    );
                    webview.sendInputEvent({
                      type: "keyDown",
                      keyCode: "v",
                      modifiers: ["control"],
                    });
                    webview.sendInputEvent({
                      type: "keyUp",
                      keyCode: "v",
                      modifiers: ["control"],
                    });
                    await new Promise((r) =>
                      setTimeout(r, behavior.pasteDelay || 1000),
                    );
                  }
                }
              }
            } else if (window.electron?.ipcRenderer) {
              for (const dataUrl of fileDataUrls) {
                await window.electron.ipcRenderer.invoke(
                  "copy-image-to-clipboard",
                  dataUrl,
                );
                webview.sendInputEvent({
                  type: "keyDown",
                  keyCode: "v",
                  modifiers: ["control"],
                });
                webview.sendInputEvent({
                  type: "keyUp",
                  keyCode: "v",
                  modifiers: ["control"],
                });
                await new Promise((r) =>
                  setTimeout(r, behavior.pasteDelay || 1000),
                );
              }
            }
          }
          if (
            inputText &&
            behavior.mode === "clipboard" &&
            window.electron?.ipcRenderer
          ) {
            try {
              const useDirectInsert =
                window.location.hostname.includes("deepseek") ||
                id === "deepseek";
              if (!useDirectInsert) {
                await window.electron.ipcRenderer.invoke(
                  "copy-text-to-clipboard",
                  inputText,
                );
                await new Promise((r) => setTimeout(r, 100));
              }
              if (focused) {
                await webview.executeJavaScript(`
                        (async () => {
                           const behavior = ${behaviorJson};
                           const startTime = Date.now();
                           let input = null;
                           if (window.location.hostname.includes('baidu')) {
                               await new Promise(r => setTimeout(r, 1000));
                               const initialInput = document.querySelector('${service.inputSelector}');
                               if (initialInput) {
                                   initialInput.click();
                                   initialInput.focus();
                               }
                           }
                           while (Date.now() - startTime < 3000) { 
                                input = document.querySelector('${service.inputSelector}');
                                if (behavior.preferContentEditable) {
                                    const specific = document.querySelector('#dialogue-input') || document.querySelector('div[contenteditable="true"]') || document.querySelector('textarea');
                                    if (specific) input = specific;
                                }
                                if (input) break;
                                await new Promise(r => setTimeout(r, 100));
                            }
                           if (input) {
                               input.focus();
                               if (window.location.hostname.includes('baidu') || window.location.hostname.includes('deepseek')) {
                                   console.log('Clearing input before paste...');
                                   if (window.location.hostname.includes('deepseek')) {
                                       input.click();
                                   }
                                   document.execCommand('selectAll', false, null);
                                   document.execCommand('delete', false, null);
                                   if (window.location.hostname.includes('baidu')) {
                                       const p = input.querySelector('p');
                                       if (p) p.innerHTML = '<br>';
                                       const images = input.querySelectorAll('img');
                                       images.forEach(img => img.remove());
                                       const previews = input.querySelectorAll('.image-preview, .file-preview');
                                       previews.forEach(p => p.remove());
                                   } else {
                                       input.innerHTML = '<p><br></p>';
                                   }
                               }

                               if ((window.location.hostname.includes('baidu') || window.location.hostname.includes('deepseek')) && (input.isContentEditable || input.getAttribute('contenteditable') === 'true')) {
                                   const range = document.createRange();
                                   const selection = window.getSelection();
                                   if (window.location.hostname.includes('deepseek')) {
                                       range.selectNodeContents(input);
                                       range.collapse(false);
                                   } else {
                                       range.selectNodeContents(input);
                                       range.collapse(false);
                                   }
                                   selection.removeAllRanges();
                                   selection.addRange(range);
                               }
                               return true;
                           }
                           return false;
                        })()
`);
                if (useDirectInsert) {
                  console.log("Using direct insertText for DeepSeek...");
                  await webview.executeJavaScript(`
                               (() => {
                                   const text = ${JSON.stringify(inputText)};
                                   const input = document.activeElement;
                                   if (input) {
                                       if (window.location.hostname.includes('deepseek')) {
                                           input.value = '';
                                           input.textContent = '';
                                           input.innerHTML = '';
                                           input.dispatchEvent(new Event('input', { bubbles: true }));
                                       }
                                       document.execCommand('insertText', false, text);
                                       input.dispatchEvent(new Event('input', { bubbles: true }));
                                       input.dispatchEvent(new Event('change', { bubbles: true }));
                                   }
                               })()
`);
                } else {
                  webview.sendInputEvent({
                    type: "keyDown",
                    keyCode: "v",
                    modifiers: ["control"],
                  });
                  webview.sendInputEvent({
                    type: "keyUp",
                    keyCode: "v",
                    modifiers: ["control"],
                  });
                }
                await new Promise((r) =>
                  setTimeout(r, behavior.pasteDelay || 500),
                );
                await webview.executeJavaScript(`
                           (() => {
                               const input = document.activeElement;
                               if (input) {
                                   const isContentEditable = input.isContentEditable || input.getAttribute('contenteditable') === 'true';
                                   const val = isContentEditable ? (input.textContent || '') : (input.value || '');
                                   if (!val.trim() && '${inputText}'.trim()) {
                                       console.warn('Paste verification failed, attempting execCommand fallback...');
                                       document.execCommand('insertText', false, ${JSON.stringify(inputText)});
                                   }
                                   input.dispatchEvent(new Event('input', { bubbles: true }));
                                   input.dispatchEvent(new Event('change', { bubbles: true }));
                                   const tracker = input._valueTracker;
                                   if (tracker) tracker.setValue(input.value);
                                   if (window.location.hostname.includes('yiyan') || window.location.hostname.includes('deepseek')) {
                                       input.click();
                                   }
                               }
                           })()
`);
              }
            } catch (err) {
              console.error(
                "Clipboard paste failed, falling back to manual injection",
                err,
              );
            }
          }
          const isMixedContentForeign =
            selectedFiles.length > 0 &&
            (id === "chatgpt" ||
              id === "claude" ||
              id === "gemini" ||
              id === "deepseek");
          if (
            behavior.sendByEnter &&
            focused &&
            (inputText || selectedFiles.length > 0) &&
            !isMixedContentForeign
          ) {
            await new Promise((r) => setTimeout(r, 500));
            console.log(`Sending physical Enter to ${id}...`);
            webview.sendInputEvent({ type: "keyDown", keyCode: "Enter" });
            webview.sendInputEvent({ type: "keyUp", keyCode: "Enter" });
          }
          const script = `
          (async () => {
            const behavior = ${behaviorJson};
            const hasFiles = ${fileDataUrls.length > 0};
            let input = document.querySelector('${service.inputSelector}');
            if (behavior.preferContentEditable) {
                const specific = document.querySelector('#dialogue-input') || document.querySelector('div[contenteditable="true"]');
                if (specific) input = specific;
            }
            const startDeepCleanup = (targetInput, force = false) => {
                 if (!behavior.clearByKeys && !force) return;
                 const currentCleanupId = Date.now();
                 window.__cleanupId = currentCleanupId;
                 
                 // Stop cleanup on user interaction
                 const abortCleanup = (e) => {
                    if (e && !e.isTrusted) return; // Ignore script-generated events
                    if (window.__cleanupId === currentCleanupId) {
                        window.__cleanupId = Date.now(); // Invalidate current loop
                        console.log('User interaction detected, aborting cleanup loop.');
                    }
                 };
                 targetInput.addEventListener('keydown', abortCleanup, { once: true });
                 targetInput.addEventListener('mousedown', abortCleanup, { once: true });

                 const performClear = () => {
                     if (window.__cleanupId !== currentCleanupId) return;
                     console.log('Performing deep cleanup...');
                     targetInput.focus();
                     // DeepSeek specific: Force click to ensure focus before clearing
                     if (window.location.hostname.includes('deepseek')) {
                        targetInput.click();
                    }
                    if (!window.location.hostname.includes('baidu')) {
                        // Wenxin: Do not dispatch fake keyboard events, as they may confuse the editor
                        targetInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA', keyCode: 65, which: 65, ctrlKey: true, bubbles: true }));
                        targetInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', code: 'Backspace', keyCode: 8, which: 8, bubbles: true }));
                        targetInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Backspace', code: 'Backspace', keyCode: 8, which: 8, bubbles: true }));
                    }
                    const isEditable = targetInput.isContentEditable || targetInput.getAttribute('contenteditable') === 'true';
                    if (isEditable) {
                        // Wenxin: Do not execute delete command, just handle images below
                        if (!window.location.hostname.includes('baidu')) {
                            document.execCommand('selectAll', false, null);
                            document.execCommand('delete', false, null);
                        }
                        
                        // Wenxin specific: Force clear innerHTML and remove IMG tags directly
                        if (window.location.hostname.includes('baidu')) {
                            // Wenxin: ONLY remove images, do not touch text nodes or innerHTML structure manually
                            // Rely on execCommand('delete') for text clearing to preserve Vue/React bindings
                            const images = targetInput.querySelectorAll('img');
                            images.forEach(img => img.remove());
                            const previews = targetInput.querySelectorAll('.image-preview, .file-preview');
                            previews.forEach(p => p.remove());
                            
                            // Wenxin: DO NOT touch text nodes or use insertText hack
                            // Just remove images and let user handle text if needed
                        } else if (!window.location.hostname.includes('aliyun')) {
                            // Only set innerHTML for services that don't have sensitive React/Vue bindings (like Tongyi)
                            targetInput.innerHTML = '<p><br></p>';
                        }
                     }
                     if (behavior.mode === 'simulation' || window.location.hostname.includes('deepseek')) {
                         if (isEditable) {
                             // Wenxin/Tongyi specific: Avoid destructive innerHTML clear to preserve React state
                             if (!window.location.hostname.includes('baidu') && !window.location.hostname.includes('aliyun')) {
                                 targetInput.innerHTML = '<p><br></p>'; 
                                 targetInput.textContent = '';
                             }
                         } else {
                             targetInput.value = '';
                         }
                     }
                     targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                     targetInput.dispatchEvent(new Event('change', { bubbles: true }));
                     const tracker = targetInput._valueTracker;
                     if (tracker) {
                         tracker.setValue(''); 
                         targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                     }
                     if (behavior.blurOnClear) {
                         targetInput.blur();
                     }
                 };
                 performClear();
                 let checks = 0;
                 const checkLoop = () => {
                     if (window.__cleanupId !== currentCleanupId) return; 
                     if (checks++ > 50) return; // Reduced from 1500 to 50 (approx 10 seconds)
                     const isDisabled = targetInput.disabled || targetInput.readOnly || targetInput.getAttribute('aria-disabled') === 'true';
                     const val = (targetInput.value || targetInput.textContent || '').trim();
                     const hasImage = targetInput.querySelectorAll && targetInput.querySelectorAll('img').length > 0;
                     // Don't treat zero-width space or placeholders as ghost content
                     const hasGhostContent = (val.length > 0 && val !== '\u200B' && val !== ' ') || hasImage; 
                     
                     // Skip ghost text check for Tongyi/Wenxin if we are not in aggressive cleanup mode
                     if (!behavior.clearByKeys && (window.location.hostname.includes('aliyun') || window.location.hostname.includes('baidu'))) {
                        // Exception: If there is an image residue in Wenxin, force clear it even if clearByKeys is false
                        if (window.location.hostname.includes('baidu') && hasImage) {
                            console.log('Wenxin image residue detected, forcing cleanup...');
                        } else {
                            return;
                        }
                     }

                     if (!isDisabled && hasGhostContent) {
                         console.log('Ghost text detected, forcing clear...', val);
                         performClear();
                     }
                     setTimeout(checkLoop, 200); 
                 };
                 setTimeout(checkLoop, 200);
            };
            window.__cleanupId = Date.now();
            if (input) {
              input.focus();
              const text = ${JSON.stringify(inputText)};
              if (behavior.mode !== 'clipboard') {
                  if (text) {
                      const setNativeValue = (el, value) => {
                          const valueSetter = Object.getOwnPropertyDescriptor(el, 'value')?.set;
                          const prototype = Object.getPrototypeOf(el);
                          const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
                          if (valueSetter && valueSetter !== prototypeValueSetter) {
                              prototypeValueSetter.call(el, value);
                          } else if (valueSetter) {
                              valueSetter.call(el, value);
                          } else {
                              el.value = value;
                          }
                      };
                      let manualInsertion = false;
                      if (input.getAttribute('contenteditable') === 'true' || input.isContentEditable) {
                          const selection = window.getSelection();
                          const range = document.createRange();
                          const lastP = input.querySelector('p:last-of-type');
                          if (lastP) {
                              range.selectNodeContents(lastP);
                          } else {
                              range.selectNodeContents(input);
                          }
                          range.collapse(false);
                          selection.removeAllRanges();
                          selection.addRange(range);
                          const initialContent = input.textContent || '';
                          let success = document.execCommand('insertText', false, text);
                          const finalContent = input.textContent || '';
                          let actuallyInserted = success && (finalContent.length > initialContent.length);
                          if (!actuallyInserted) {
                              manualInsertion = true;
                              if (lastP) {
                                  const nativeTextContentSetter = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent')?.set;
                                  if (nativeTextContentSetter) {
                                      nativeTextContentSetter.call(lastP, lastP.textContent + text);
                                  } else {
                                      lastP.textContent += text;
                                  }
                              } else {
                                  input.textContent += text;
                              }
                          }
                      } else {
                          setNativeValue(input, text);
                          manualInsertion = true;
                      }
                      const events = [
                          new Event('input', { bubbles: true }),
                          new Event('change', { bubbles: true })
                      ];
                      if (manualInsertion) {
                           events.push(new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText', data: text }));
                           events.push(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
                      }
                      events.forEach(ev => input.dispatchEvent(ev));
                      if (!behavior.sendByEnter) {
                          input.click();
                          const active = document.activeElement;
                          if (active && active !== input) {
                               events.forEach(ev => active.dispatchEvent(ev));
                          }
                      }
                      const tracker = input._valueTracker;
                      if (tracker) {
                          tracker.setValue(text); 
                      }
                  }
              } else {
                  await new Promise(r => setTimeout(r, 300));
                  input.dispatchEvent(new Event('input', { bubbles: true }));
              }
          if (behavior.sendByEnter) {
              setTimeout(() => {
                 if (input) {
                    const isContentEditable = input.isContentEditable || input.getAttribute('contenteditable') === 'true';
                    const currentContent = isContentEditable ? (input.textContent || '') : (input.value || '');
                    if (behavior.clearByKeys || currentContent.trim().length > 0) {
                        console.log('Cleaning up after Host Enter send...');
                        startDeepCleanup(input);
                    }
                 }
              }, 2000); 
              
          }
          const waitForButtonAndClick = () => {
                let currentInput = input;
                const isDetached = !document.body.contains(input);
                if (isDetached || window.location.hostname.includes('deepseek')) {
                    currentInput = document.querySelector('${service.inputSelector}') || 
                                   (behavior.preferContentEditable ? (document.querySelector('#dialogue-input') || document.querySelector('div[contenteditable="true"]')) : null) || 
                                   input; 
                }
                if (currentInput) {
                     const isContentEditable = currentInput.isContentEditable || currentInput.getAttribute('contenteditable') === 'true';
                     const val = isContentEditable ? (currentInput.textContent || '') : (currentInput.value || '');
                     if (text && !val.trim() && !hasFiles) {
                         const active = document.activeElement;
                         if (active && (active.tagName === 'TEXTAREA' || active.getAttribute('contenteditable') === 'true')) {
                             const activeVal = (active.value || active.textContent || '');
                             if (activeVal.trim()) {
                             } else {
                                 return;
                             }
                         } else {
                             return;
                         }
                     }
                }
                const submitSelector = '${service.submitSelector || ""}';
                const stopSelector = '${service.stopSelector || ""}';
                const startTime = Date.now();
                const timeout = 10000; 
                const findAndClickBtn = () => {
                    if (stopSelector) {
                        const stopBtns = document.querySelectorAll(stopSelector);
                        for (const btn of stopBtns) {
                            const style = window.getComputedStyle(btn);
                            if (style.display !== 'none' && style.visibility !== 'hidden' && !btn.disabled) {
                                console.log('Found Stop button, clicking it first...');
                                clickButton(btn);
                                return false; 
                            }
                        }
                    }
                    if (submitSelector) {
                        const btns = document.querySelectorAll(submitSelector);
                        for (const btn of btns) {
                             const style = window.getComputedStyle(btn);
                             if (style.display !== 'none' && style.visibility !== 'hidden' && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') {
                                 clickButton(btn);
                                 return true;
                             }
                        }
                    }
                     let parent = currentInput ? currentInput.parentElement : (input ? input.parentElement : null);
                     let attempts = 0;
                     // For Doubao, we skip the generic button search to avoid clicking the "More" menu
                     if (window.location.hostname.includes('doubao')) {
                        console.log('Doubao: skipping generic button search.');
                        attempts = 100; // Force skip loop
                     }
                     while (parent && attempts < 5) {
                         const buttons = parent.querySelectorAll('button');
                         for (let i = buttons.length - 1; i >= 0; i--) {
                             const btn = buttons[i];
                             if (btn.querySelector('svg') && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') {
                                 const style = window.getComputedStyle(btn);
                                 if (style.display !== 'none' && style.visibility !== 'hidden') {
                                     const label = (btn.getAttribute('aria-label') || '').toLowerCase();
                                     const excludeKeywords = ['attach', 'upload', 'file', 'image', 'add', 'clip', 'more', 'menu', 'expand', 'options'];
                                     const isExcluded = excludeKeywords.some(kw => label.includes(kw));
                                     if (!isExcluded) {
                                         clickButton(btn);
                                         return true;
                                     }
                                 }
                             }
                         }
                         parent = parent.parentElement;
                         attempts++;
                     }
                    return false;
                };
                const checkAndClick = () => {
                    if (Date.now() - startTime > timeout) {
                        console.warn('Timeout waiting for button enable, forcing click');
                        if (!findAndClickBtn()) {
                            tryEnter();
                        }
                        return;
                    }
                    if (findAndClickBtn()) {
                        return;
                    } else {
                        // Tongyi specific: clear unwanted text
                        if (window.location.hostname.includes('aliyun') && !text) {
                            const val = input.textContent || input.value || '';
                            if (val.includes('帮我分析') || val.includes('分析一下图片')) {
                                console.log('Removing Tongyi auto-generated text...');
                                if (input.isContentEditable || input.getAttribute('contenteditable') === 'true') {
                                    input.textContent = '';
                                } else {
                                    input.value = '';
                                }
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                        }

                        if (Math.random() > 0.8) {
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            // Only dispatch insertText event if not DeepSeek Mixed Content to avoid conflicts
                            if (!((window.location.hostname.includes('deepseek')) && ${selectedFiles.length > 0})) {
                                input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
                            }
                        }
                        setTimeout(checkAndClick, 500);
                    }
                };
                const clickButton = (btn) => {
                    btn.focus();
                    const eventOpts = { bubbles: true, cancelable: true, view: window, buttons: 1 };
                    // Try clicking SVG child if present, as some buttons (like DeepSeek) might respond better to icon clicks
                    const svg = btn.querySelector('svg');
                    if (svg && window.location.hostname.includes('deepseek')) {
                        svg.dispatchEvent(new MouseEvent('mousedown', eventOpts));
                        svg.dispatchEvent(new MouseEvent('mouseup', eventOpts));
                        svg.dispatchEvent(new MouseEvent('click', eventOpts));
                    }
                    btn.dispatchEvent(new MouseEvent('mousedown', eventOpts));
                    btn.dispatchEvent(new MouseEvent('mouseup', eventOpts));
                    btn.click();
                    setTimeout(() => {
                        if (input) {
                            const isContentEditable = input.isContentEditable || input.getAttribute('contenteditable') === 'true';
                            const currentContent = isContentEditable ? (input.textContent || '') : (input.value || '');
                            // Enhanced image detection for Wenxin ghost images
                            const hasImage = input.querySelectorAll && input.querySelectorAll('img, .image-preview, .file-preview, [class*="image-preview"], [class*="file-preview"], [style*="background-image"]').length > 0;
                            if (window.location.hostname.includes('deepseek') && currentContent.trim() && text && currentContent.includes(text.trim())) {
                                console.warn('DeepSeek Send Click might have failed, text still present. Retrying click...');
                                // Refetch button to avoid stale reference
                                const freshBtn = document.querySelector('${service.submitSelector}');
                                if (freshBtn) {
                                    const eventOpts = { bubbles: true, cancelable: true, view: window, buttons: 1 };
                                    freshBtn.dispatchEvent(new MouseEvent('mousedown', eventOpts));
                                    freshBtn.dispatchEvent(new MouseEvent('mouseup', eventOpts));
                                    freshBtn.click();
                                } else {
                                    btn.click();
                                }
                                return;
                            }
                            if (behavior.clearByKeys || currentContent.trim().length > 0 || hasImage || (window.location.hostname.includes('baidu') && !currentContent.trim())) {
                                console.log('Auto-clearing input after send...');
                                input.focus();
                                // DeepSeek specific: Always force deep cleanup to remove residual images
                                if (behavior.clearByKeys || window.location.hostname.includes('deepseek') || (window.location.hostname.includes('baidu') && (hasImage || !currentContent.trim()))) {
                                    startDeepCleanup(input, true);
                                } 
                                else {
                                    if (isContentEditable) {
                                        input.focus();
                                        // Wenxin/Tongyi specific: Avoid destructive innerHTML clear to preserve React state
                                        // Only clear if we are SURE it's safe (e.g. simulation mode or full page reload, but here we are in SPA)
                                        // Better approach: Select All + Delete (simulates user action)
                                        document.execCommand('selectAll', false, null);
                                        document.execCommand('delete', false, null);
                                        
                                        // Avoid aggressive DOM manipulation that breaks frameworks
                                        // if (input.textContent && input.textContent.trim().length > 0) {
                                        //    input.textContent = '';
                                        // }
                                        // Special handling for Wenxin to restore placeholder
                                        if (window.location.hostname.includes('baidu')) {
                                            input.blur();
                                        }
                                    } else {
                                        const nativeValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
                                        if (nativeValueSetter) {
                                            nativeValueSetter.call(input, '');
                                        } else {
                                            input.value = '';
                                        }
                                        const tracker = input._valueTracker;
                                        if (tracker) tracker.setValue('');
                                    }
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                    input.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                            }
                        }
                    }, 1500); 
                };
                const tryEnter = () => {
                     input.dispatchEvent(new Event('input', { bubbles: true }));
                     const eventOptions = { key: 'Enter', code: 'Enter', keyCode: 13, charCode: 13, which: 13, bubbles: true, cancelable: true, view: window };
                     input.dispatchEvent(new KeyboardEvent('keydown', eventOptions));
                     input.dispatchEvent(new KeyboardEvent('keypress', eventOptions));
                     input.dispatchEvent(new KeyboardEvent('keyup', eventOptions));
                     const ctrlOptions = { ...eventOptions, ctrlKey: true, metaKey: true };
                     input.dispatchEvent(new KeyboardEvent('keydown', ctrlOptions));
                     input.dispatchEvent(new KeyboardEvent('keypress', ctrlOptions));
                     input.dispatchEvent(new KeyboardEvent('keyup', ctrlOptions));
                     setTimeout(() => {
                        if (input) {
                            const isContentEditable = input.isContentEditable || input.getAttribute('contenteditable') === 'true';
                            const currentContent = isContentEditable ? (input.textContent || '') : (input.value || '');
                            if (currentContent.trim().length > 0) {
                                console.log('Auto-clearing input after Enter...');
                                if (behavior.clearByKeys) {
                                    input.focus(); 
                                    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA', keyCode: 65, which: 65, ctrlKey: true, bubbles: true }));
                                    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', code: 'Backspace', keyCode: 8, which: 8, bubbles: true }));
                                    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Backspace', code: 'Backspace', keyCode: 8, which: 8, bubbles: true }));
                                    if (behavior.mode === 'simulation') {
                                        if (isContentEditable) {
                                            input.textContent = '';
                                            input.innerHTML = '<p><br></p>';
                                        } else {
                                            input.value = '';
                                        }
                                    }
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                     if (behavior.blurOnClear) {
                                         input.blur(); 
                                     }
                                     setTimeout(() => {
                                         if ((isContentEditable ? input.textContent : input.value).trim().length > 0) {
                                             console.log('Retry cleanup (tryEnter)...');
                                             input.focus();
                                             if (isContentEditable) {
                                                  input.innerHTML = ''; 
                                                  input.textContent = '';
                                             } else {
                                                  input.value = '';
                                             }
                                             input.dispatchEvent(new Event('input', { bubbles: true }));
                                             if (behavior.blurOnClear) {
                                                 input.blur();
                                             }
                                         }
                                     }, 100);
                                } else {
                                    if (isContentEditable) {
                                        input.focus();
                                        document.execCommand('selectAll', false, null);
                                        document.execCommand('delete', false, null);
                                        if (input.textContent && input.textContent.trim().length > 0) {
                                            input.textContent = '';
                                            input.innerHTML = '';
                                        }
                                    } else {
                                        input.value = '';
                                    }
                                }
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }
                    }, 1500);
                };
                checkAndClick();
              };
              setTimeout(waitForButtonAndClick, 500);
              return true; 
            } else {
                return false; 
            }
          })()
`;
          return webview.executeJavaScript(script);
        } catch (err) {
          console.error(`Failed to execute script on ${id}`, err);
          return false;
        }
      } else {
        console.warn(`Service ${id} or webview not found/ready`);
      }
      return false;
    });
    try {
      await Promise.all(promises);
      setInputText("");
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Error sending messages:", error);
    }
  };
  const handleNewChat = useCallback(async () => {
    const promises = selectedAIs.map(async (id) => {
      const service = services.find((s) => s.id === id);
      const webview = webviewRefs.current[id];
      if (service && webview) {
        try {
          if (service.newChatSelector) {
            const script = `
              (() => {
                const btn = document.querySelector('${service.newChatSelector}');
                if (btn) {
                  btn.click();
                  return true;
                }
                return false;
              })()
`;
            const clicked = await webview.executeJavaScript(script);
            if (clicked) return;
          }
          webview.loadURL(service.url);
        } catch (err) {
          console.error(`Failed to start new chat on ${id}`, err);
          webview.loadURL(service.url);
        }
      }
    });
    await Promise.all(promises);
  }, [selectedAIs, services]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNewChat]);
  return (
    <div className="app-container">
      <div className="toolbar">
        <h3>{t.appTitle}</h3>
        <button
          className="add-btn"
          onClick={() => setShowAddModal(true)}
          title={t.addCustomAI}
        >
          +
        </button>
        <button
          className="reset-btn"
          onClick={() => {
            if (confirm(t.resetConfirm)) {
              localStorage.removeItem("ai_services");
              setServices(AI_SERVICES);
              setSelectedAIs(AI_SERVICES.map((s) => s.id));
              setIsDragging(false);
              setShowAddModal(false);
              setInputText("");
            }
          }}
          title={t.resetDefaults}
        >
          ↺
        </button>
        {services.map((service) => (
          <label
            key={service.id}
            style={{ marginLeft: 10 }}
            onContextMenu={(e) => {
              e.preventDefault();
              handleDeleteService(service.id);
            }}
          >
            <input
              type="checkbox"
              checked={selectedAIs.includes(service.id)}
              onChange={() => toggleAI(service.id)}
            />
            {service.name}
          </label>
        ))}
      </div>
      <div className={`ai-grid-container ${isDragging ? "is-dragging" : ""}`}>
        {selectedAIs.length > 0 && (
          <Split
            className="ai-split"
            sizes={services.map((s) =>
              selectedAIs.includes(s.id) ? 100 / selectedAIs.length : 0,
            )}
            minSize={0}
            gutterSize={10}
            snapOffset={30}
            dragInterval={1}
            direction="horizontal"
            cursor="col-resize"
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
          >
            {services.map((service) => {
              const isActive = selectedAIs.includes(service.id);
              return (
                <div
                  key={service.id}
                  className="ai-window"
                  style={{
                    opacity: isActive ? 1 : 0,
                    pointerEvents: isActive ? "auto" : "none",
                  }}
                >
                  <div className="ai-header">{service.name}</div>
                  <div className="webview-container">
                    <div className="webview-overlay"></div>
                    <webview
                      ref={(ref) => {
                        if (ref) {
                          const el = ref as WebviewTag;
                          webviewRefs.current[service.id] = el;
                          el.addEventListener(
                            "before-input-event",
                            (e: any) => {
                              if (
                                e.type === "keyDown" &&
                                (e.control || e.meta)
                              ) {
                                if (e.key === "=" || e.key === "+") {
                                  handleZoomIn();
                                } else if (e.key === "-") {
                                  handleZoomOut();
                                } else if (e.key === "0") {
                                  handleResetZoom();
                                }
                              }
                            },
                          );
                          el.addEventListener("dom-ready", () => {
                            if (service.id === 'wenxin') {
                                const wenxinFixScript = `
                                    const style = document.createElement('style');
                                    style.innerHTML = \`
                                        #dialogue-input:empty::before,
                                        #dialogue-input br:only-child::before,
                                        #dialogue-input[data-placeholder]:empty::before {
                                            content: '自动适配需求，复杂问题自动深析，有什么可以帮助你?';
                                            color: #999;
                                            pointer-events: none;
                                            display: block;
                                            position: absolute;
                                            top: 12px;
                                            left: 12px;
                                        }
                                        #dialogue-input img {
                                            max-height: 100px;
                                            width: auto;
                                        }
                                    \`;
                                    document.head.appendChild(style);
                                    
                                    const input = document.querySelector('#dialogue-input');
                                    if (input) {
                                        input.addEventListener('click', () => {
                                            input.focus();
                                        });
                                        
                                        input.addEventListener('keydown', (e) => {
                                            if (e.key === 'Backspace') {
                                            }
                                        });
                                    }
                                `;
                                el.executeJavaScript(wenxinFixScript).catch(err => console.error('Failed to inject Wenxin fix:', err));
                            }

                            try {
                              if (typeof el.setZoomLevel === "function") {
                                el.setZoomLevel(zoomLevel);
                              }
                            } catch (err) {
                              console.error(
                                "Failed to set initial zoom level",
                                err,
                              );
                            }
                          });
                          el.addEventListener("did-fail-load", (e: any) => {
                            const {
                              errorCode,
                              errorDescription,
                              validatedURL,
                              isMainFrame,
                            } = e;
                            if (errorCode !== -3 && isMainFrame) {
                              console.warn(
                                `Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`,
                              );
                              const isForeign =
                                service.url.includes("claude") ||
                                service.url.includes("google") ||
                                service.url.includes("openai") ||
                                service.url.includes("chatgpt");
                              const message = isForeign
                                ? `无法连接到 ${service.name}。<br>请检查您的 VPN 或网络连接。`
                                : `无法连接到 ${service.name}。<br>请检查您的网络连接。`;
                              const errorHtml = `
                                    document.body.innerHTML = \`
                                      <div style="
                                        display: flex; 
                                        flex-direction: column; 
                                        justify-content: center; 
                                        align-items: center; 
                                        height: 100vh; 
                                        background: #f0f0f0; 
                                        color: #333; 
                                        font-family: system-ui, sans-serif;
                                        text-align: center;
                                        padding: 20px;
                                      ">
                                        <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                                        <h2 style="margin-bottom: 10px;">连接失败</h2>
                                        <p style="margin-bottom: 20px; color: #666; line-height: 1.5;">${message}</p>
                                        <p style="font-size: 12px; color: #999; margin-bottom: 30px;">Error: ${errorDescription} (${errorCode})</p>
                                        <button onclick="window.location.reload()" style="
                                          padding: 10px 20px; 
                                          background: #4B6584; 
                                          color: white; 
                                          border: none; 
                                          border-radius: 4px; 
                                          cursor: pointer; 
                                          font-size: 14px;
                                        ">重试 (Retry)</button>
                                      </div>
                                    \`;
                                 `;
                              try {
                                el.executeJavaScript(errorHtml);
                              } catch (err) {
                                console.error(
                                  "Failed to inject error page",
                                  err,
                                );
                              }
                            }
                          });
                        }
                      }}
                      src={service.url}
                      allowpopups="true"
                      webpreferences="disableBlinkFeatures=AutomationControlled"
                      useragent={
                        service.isDomestic
                          ? undefined // Use default Electron UA (Chrome 130+) instead of forcing old Chrome 120
                          : undefined
                      }
                      partition={`persist:${service.id}`}
                    />
                  </div>
                </div>
              );
            })}
          </Split>
        )}
      </div>
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{t.addCustomAI}</h3>
            <div className="form-group">
              <label>{t.namePlaceholder}</label>
              <input
                placeholder="DeepSeek"
                value={newService.name || ""}
                onChange={(e) =>
                  setNewService({ ...newService, name: e.target.value })
                }
                className="modal-input"
              />
              <small className="field-help">{t.nameHelp}</small>
            </div>
            <div className="form-group">
              <label>{t.urlPlaceholder}</label>
              <input
                placeholder="https://chat.deepseek.com"
                value={newService.url || ""}
                onChange={(e) =>
                  setNewService({ ...newService, url: e.target.value })
                }
                className="modal-input"
              />
              <small className="field-help">{t.urlHelp}</small>
            </div>
            <div className="form-group">
              <label>{t.selectorPlaceholder}</label>
              <input
                value={newService.inputSelector || ""}
                onChange={(e) =>
                  setNewService({
                    ...newService,
                    inputSelector: e.target.value,
                  })
                }
                className="modal-input"
              />
              <small className="field-help">{t.selectorHelp}</small>
            </div>
            <div className="form-group">
              <label>{t.submitSelectorPlaceholder}</label>
              <input
                value={newService.submitSelector || ""}
                onChange={(e) =>
                  setNewService({
                    ...newService,
                    submitSelector: e.target.value,
                  })
                }
                className="modal-input"
              />
              <small className="field-help">{t.submitHelp}</small>
            </div>
            <div className="form-group checkbox-group">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={newService.isDomestic || false}
                  onChange={(e) =>
                    setNewService({
                      ...newService,
                      isDomestic: e.target.checked,
                    })
                  }
                  style={{ marginRight: "8px" }}
                />
                国内 AI 服务 (Domestic Service)
              </label>
              <small
                className="field-help"
                style={{ display: "block", marginTop: "4px" }}
              >
                勾选后将优化国内访问体验（标准化请求头，避免白屏），但不走 VPN
                代理。
              </small>
            </div>
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowAddModal(false)}
              >
                {t.cancel}
              </button>
              <button className="confirm-btn" onClick={handleAddService}>
                {t.add}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="input-area">
        <div className="input-content-wrapper">
          {selectedFiles.length > 0 && (
            <div className="preview-list">
              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="preview-item">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="preview"
                    className="preview-thumbnail"
                  />
                  <span className="preview-name" title={file.name}>
                    {file.name}
                  </span>
                  <span
                    className="preview-remove"
                    onClick={() => handleRemoveFile(index)}
                  >
                    ✕
                  </span>
                </div>
              ))}
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="image/*"
            multiple
            onChange={handleFileSelect}
          />
          <button
            className="attach-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Send Image"
          >
            📎
          </button>
          <div
            className="input-wrapper"
            style={{
              position: "relative",
              flex: 73,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t.inputPlaceholder}
            />
            <span className="char-counter">{inputText.length}</span>
          </div>
          <button className="send-btn" onClick={handleSend}>
            {t.sendToAll}
          </button>
        </div>
      </div>
    </div>
  );
}
export default App;
