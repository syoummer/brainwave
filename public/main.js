// Global state
let ws, audioContext, processor, source, stream;
let isRecording = false;
let timerInterval;
let startTime;
let audioBuffer = new Int16Array(0);
let wsConnected = false;
let streamInitialized = false;
let isAutoStarted = false;
let spaceKeyHeld = false;
let spaceRecordingActive = false;
let spaceStartInProgress = false;
let currentStatus = 'disconnected';
let currentLanguage = 'zh';

// DOM elements
const recordButton = document.getElementById('recordButton');
const transcript = document.getElementById('transcript');
const copyButton = document.getElementById('copyButton');
const themeToggleButton = document.getElementById('themeToggle');
const settingsButton = document.getElementById('settingsButton');
const languageToggle = document.getElementById('languageToggle');
const hotkeyHint = document.getElementById('hotkeyHelp');
const recordLabel = document.querySelector('.record-label');
const transcriptTitle = document.querySelector('.transcript-title');
const transcriptArea = document.getElementById('transcript');
const brandSubtitle = document.querySelector('.brand-subtitle');
const historyContainer = document.getElementById('historyContainer');

// Configuration
const targetSeconds = 5;
const urlParams = new URLSearchParams(window.location.search);
const autoStart = urlParams.get('start') === '1';
const prefersDarkScheme = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

const LANGUAGE_MAP = {
    zh: {
        copyButton: '复制',
        copySuccess: '已复制',
        hotkeyHint: '按住 Space 开始录音，松开停止；按左 Shift 在开始和结束之间切换',
        recordStart: '开始',
        recordStop: '停止',
        brandSubtitle: '实时语音笔记助手',
        transcriptTitle: '转录结果',
        transcriptPlaceholder: '转录内容将显示在此处……',
        statuses: {
            disconnected: '未连接',
            connecting: '连接中…',
            connected: '已连接',
            idle: '空闲',
            error: '连接错误'
        }
    },
    en: {
        copyButton: 'Copy',
        copySuccess: 'Copied!',
        hotkeyHint: 'Hold Space to start recording, release to stop; press Left Shift to toggle.',
        recordStart: 'Start',
        recordStop: 'Stop',
        brandSubtitle: 'Real-time notes companion',
        transcriptTitle: 'Transcript',
        transcriptPlaceholder: 'Transcription will appear here…',
        statuses: {
            disconnected: 'Disconnected',
            connecting: 'Connecting…',
            connected: 'Connected',
            idle: 'Idle',
            error: 'Connection error'
        }
    }
};

// Utility functions
const isMobileDevice = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const isTypingContext = () => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    const tagName = activeElement.tagName;
    if (activeElement.isContentEditable) return true;
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || activeElement.getAttribute('role') === 'textbox';
};

const applyThemePreference = (isDark) => {
    document.body.classList.toggle('dark-theme', Boolean(isDark));
    if (themeToggleButton) {
        themeToggleButton.textContent = isDark ? '☀️' : '🌙';
    }
};

const handleSystemThemeChange = (event) => {
    if (localStorage.getItem('darkTheme') === null) {
        applyThemePreference(event.matches);
    }
};

const getTranslations = () => {
    return LANGUAGE_MAP[currentLanguage] || LANGUAGE_MAP.en;
};

// History management functions
const HISTORY_STORAGE_KEY = 'brainwave_transcript_history';
const MAX_HISTORY_ITEMS = 10;

/**
 * Save transcript to history (localStorage)
 * @param {string} text - The transcript text to save
 */
function saveTranscriptToHistory(text) {
    if (!text || !text.trim()) {
        console.log('Empty transcript, skipping history save');
        return;
    }

    try {
        // Get existing history
        const historyJson = localStorage.getItem(HISTORY_STORAGE_KEY);
        let history = [];
        
        if (historyJson) {
            try {
                history = JSON.parse(historyJson);
                if (!Array.isArray(history)) {
                    history = [];
                }
            } catch (e) {
                console.warn('Failed to parse history from localStorage:', e);
                history = [];
            }
        }

        // Add new entry with timestamp
        const newEntry = {
            text: text.trim(),
            timestamp: Date.now()
        };

        // Add to beginning of array (most recent first)
        history.unshift(newEntry);

        // Keep only the most recent MAX_HISTORY_ITEMS entries
        if (history.length > MAX_HISTORY_ITEMS) {
            history = history.slice(0, MAX_HISTORY_ITEMS);
        }

        // Save back to localStorage
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
        console.log(`Saved transcript to history (${history.length}/${MAX_HISTORY_ITEMS} items)`);
        
        // Update history display
        renderHistory();
    } catch (error) {
        console.error('Failed to save transcript to history:', error);
    }
}

/**
 * Get transcript history from localStorage
 * @returns {Array} Array of history entries with text and timestamp
 */
function getTranscriptHistory() {
    try {
        const historyJson = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (!historyJson) {
            return [];
        }
        const history = JSON.parse(historyJson);
        return Array.isArray(history) ? history : [];
    } catch (error) {
        console.error('Failed to get transcript history:', error);
        return [];
    }
}

/**
 * Format timestamp to readable date/time string
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted date/time string
 */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
        return currentLanguage === 'zh' ? '刚刚' : 'Just now';
    } else if (diffMins < 60) {
        return currentLanguage === 'zh' 
            ? `${diffMins}分钟前` 
            : `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return currentLanguage === 'zh' 
            ? `${diffHours}小时前` 
            : `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return currentLanguage === 'zh' 
            ? `${diffDays}天前` 
            : `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
        // Show full date for older entries
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return currentLanguage === 'zh'
            ? `${year}-${month}-${day} ${hours}:${minutes}`
            : `${month}/${day}/${year} ${hours}:${minutes}`;
    }
}

/**
 * Render history items to the DOM
 */
function renderHistory() {
    if (!historyContainer) {
        console.warn('History container not found');
        return;
    }

    const history = getTranscriptHistory();
    
    // Clear existing history items
    historyContainer.innerHTML = '';

    if (history.length === 0) {
        return;
    }

    // Render all history items (most recent first)
    // The current transcript area shows the active/editing content
    // History shows all saved transcripts
    for (let i = 0; i < history.length; i++) {
        const item = history[i];
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';

        const header = document.createElement('div');
        header.className = 'history-item-header';

        const title = document.createElement('h3');
        title.className = 'history-item-title';
        title.textContent = currentLanguage === 'zh' ? '历史记录' : 'History';

        const time = document.createElement('span');
        time.className = 'history-item-time';
        time.textContent = formatTimestamp(item.timestamp);

        header.appendChild(title);
        header.appendChild(time);

        const textarea = document.createElement('textarea');
        textarea.className = 'history-item-textarea';
        textarea.value = item.text;
        textarea.readOnly = true;

        historyItem.appendChild(header);
        historyItem.appendChild(textarea);
        historyContainer.appendChild(historyItem);
    }
}

const updateRecordButtonLabel = () => {
    if (!recordLabel) return;
    const translations = getTranslations();
    recordLabel.textContent = isRecording ? translations.recordStop : translations.recordStart;
};

const applyLanguage = () => {
    const translations = getTranslations();
    if (languageToggle) {
        languageToggle.value = currentLanguage;
        languageToggle.setAttribute('aria-label', currentLanguage === 'zh' ? '选择语言' : 'Select language');
        languageToggle.setAttribute('title', currentLanguage === 'zh' ? '选择语言' : 'Select language');
    }
    updateRecordButtonLabel();
    if (copyButton) {
        copyButton.textContent = translations.copyButton;
    }
    if (hotkeyHint) {
        hotkeyHint.textContent = translations.hotkeyHint;
    }
    if (transcriptTitle) {
        transcriptTitle.textContent = translations.transcriptTitle;
    }
    if (transcriptArea) {
        transcriptArea.setAttribute('placeholder', translations.transcriptPlaceholder);
    }
    if (brandSubtitle) {
        brandSubtitle.textContent = translations.brandSubtitle;
    }
    updateConnectionStatus(currentStatus);
    // Update history display when language changes
    renderHistory();
};

const setLanguage = (lang) => {
    if (!LANGUAGE_MAP[lang]) return;
    currentLanguage = lang;
    localStorage.setItem('uiLanguage', lang);
    applyLanguage();
};

const initializeLanguage = () => {
    let lang = localStorage.getItem('uiLanguage');

    if (!lang || !LANGUAGE_MAP[lang]) {
        const navigatorLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
        lang = navigatorLang.startsWith('zh') ? 'zh' : 'en';
    }

    if (!LANGUAGE_MAP[lang]) {
        lang = 'en';
    }

    currentLanguage = lang;

    if (languageToggle) {
        languageToggle.value = currentLanguage;
        languageToggle.addEventListener('change', (event) => {
            setLanguage(event.target.value);
        });
    }

    applyLanguage();
};

async function copyToClipboard(text, button) {
    if (!text) {
        console.warn('copyToClipboard called with empty text');
        return;
    }
    try {
        console.log('Copying to clipboard:', text.substring(0, 50) + '...');
        await navigator.clipboard.writeText(text);
        const translations = getTranslations();
        showCopiedFeedback(button, translations.copySuccess);
        console.log('Successfully copied to clipboard');
    } catch (err) {
        console.error('Clipboard copy failed:', err);
        // Try fallback method for older browsers
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            const translations = getTranslations();
            showCopiedFeedback(button, translations.copySuccess);
            console.log('Successfully copied using fallback method');
        } catch (fallbackErr) {
            console.error('Fallback copy also failed:', fallbackErr);
        }
    }
}

function showCopiedFeedback(button, message) {
    if (!button) return;
    const originalText = button.textContent;
    button.textContent = message;
    setTimeout(() => {
        button.textContent = originalText;
    }, 2000);
}

// Timer functions
function startTimer() {
    clearInterval(timerInterval);
    document.getElementById('timer').textContent = '00:00';
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

// Audio processing
function createAudioProcessor() {
    processor = audioContext.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (e) => {
        if (!isRecording) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        
        for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-32768, Math.min(32767, Math.floor(inputData[i] * 32767)));
        }
        
        const combinedBuffer = new Int16Array(audioBuffer.length + pcmData.length);
        combinedBuffer.set(audioBuffer);
        combinedBuffer.set(pcmData, audioBuffer.length);
        audioBuffer = combinedBuffer;
        
        if (audioBuffer.length >= 24000) {
            const sendBuffer = audioBuffer.slice(0, 24000);
            audioBuffer = audioBuffer.slice(24000);
            
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(sendBuffer.buffer);
            }
        }
    };
    return processor;
}

async function initAudio(stream) {
    audioContext = new AudioContext();
    source = audioContext.createMediaStreamSource(stream);
    processor = createAudioProcessor();
    source.connect(processor);
    processor.connect(audioContext.destination);
}

// WebSocket handling
function updateConnectionStatus(status) {
    const statusElement = document.getElementById('connectionStatus');
    if (!statusElement) return;

    let normalizedStatus = status;
    if (normalizedStatus === true) normalizedStatus = 'connected';
    if (normalizedStatus === false) normalizedStatus = 'disconnected';
    if (typeof normalizedStatus !== 'string') {
        normalizedStatus = 'disconnected';
    }

    const statusClasses = ['status-connected', 'status-connecting', 'status-idle', 'status-disconnected', 'status-error'];
    statusElement.classList.remove(...statusClasses);

    let className = 'status-disconnected';
    switch (normalizedStatus) {
        case 'connected':
            className = 'status-connected';
            break;
        case 'connecting':
            className = 'status-connecting';
            break;
        case 'idle':
            className = 'status-idle';
            break;
        case 'error':
            className = 'status-error';
            break;
        default:
            normalizedStatus = 'disconnected';
            className = 'status-disconnected';
    }

    const translations = getTranslations();
    const label = translations.statuses[normalizedStatus] || translations.statuses.disconnected;

    statusElement.classList.add(className);
    statusElement.textContent = label;
    currentStatus = normalizedStatus;
}

function initializeWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    updateConnectionStatus('connecting');
    ws = new WebSocket(`${protocol}://${window.location.host}/api/v1/ws`);
    
    ws.onopen = () => {
        wsConnected = true;
        updateConnectionStatus('connected');
        if (autoStart && !isRecording && !isAutoStarted) startRecording();
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        switch (data.type) {
            case 'status':
                updateConnectionStatus(data.status);
                if (data.status === 'idle') {
                    console.log('Received idle status, preparing to copy...');
                    // 延迟确保文本已经完全更新（response.done 可能在最后一个 text.delta 之后）
                    // 使用 requestAnimationFrame 确保 DOM 已更新
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            const text = transcript.value;
                            console.log('Checking transcript value:', text ? text.substring(0, 50) + '...' : 'empty');
                            if (text && text.trim()) {
                                // Save to history before copying
                                saveTranscriptToHistory(text);
                                copyToClipboard(text, copyButton);
                            } else {
                                console.warn('Transcript is empty, skipping copy');
                            }
                        }, 500);
                    });
                }
                break;
            case 'text':
                if (data.isNewResponse) {
                    transcript.value = data.content;
                    stopTimer();
                } else {
                    transcript.value += data.content;
                }
                transcript.scrollTop = transcript.scrollHeight;
                break;
            case 'error':
                alert(data.content);
                updateConnectionStatus('error');
                break;
        }
    };
    
    ws.onclose = () => {
        wsConnected = false;
        updateConnectionStatus('disconnected');
        setTimeout(initializeWebSocket, 1000);
    };
}

// Recording control
async function startRecording() {
    if (isRecording) return;
    
    try {
        transcript.value = '';

        if (!streamInitialized) {
            // Check if getUserMedia is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('getUserMedia is not supported in this browser/environment');
            }

            // Request microphone permission with better error handling
            try {
                console.log('Requesting microphone access...');
                
                stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        channelCount: 1,
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    } 
                });
                
                console.log('Microphone access granted, stream:', stream);
                streamInitialized = true;
            } catch (permissionError) {
                console.error('Microphone permission error:', permissionError);
                console.error('Error name:', permissionError.name);
                console.error('Error message:', permissionError.message);
                
                let errorMessage = 'Failed to access microphone. ';
                if (permissionError.name === 'NotAllowedError') {
                    errorMessage += 'Please allow microphone access in your system settings:\n\n';
                    errorMessage += '1. Open System Settings\n';
                    errorMessage += '2. Go to Privacy & Security > Microphone\n';
                    errorMessage += '3. Enable access for Brainwave app\n';
                    errorMessage += '4. Restart the application';
                } else if (permissionError.name === 'NotFoundError') {
                    errorMessage += 'No microphone found. Please connect a microphone and try again.';
                } else if (permissionError.name === 'NotReadableError') {
                    errorMessage += 'Microphone is being used by another application. Please close other apps using the microphone.';
                } else if (permissionError.name === 'OverconstrainedError') {
                    errorMessage += 'Microphone constraints could not be satisfied. Try using a different microphone.';
                } else {
                    errorMessage += `Error: ${permissionError.message || 'Unknown error occurred.'}`;
                }
                
                alert(errorMessage);
                throw permissionError;
            }
        }

        if (!stream) throw new Error('Failed to initialize audio stream');
        if (!audioContext) await initAudio(stream);

        console.log('Starting recording...');
        isRecording = true;
        await ws.send(JSON.stringify({ type: 'start_recording' }));
        
        startTimer();
        updateRecordButtonLabel();
        recordButton.classList.add('recording');
        console.log('Recording started successfully');
        
        // Notify main process of recording status change
        if (window.electronAPI && window.electronAPI.sendRecordingStatusUpdate) {
            window.electronAPI.sendRecordingStatusUpdate(true);
        }
        
    } catch (error) {
        console.error('Error starting recording:', error);
        isRecording = false;
        updateRecordButtonLabel();
        recordButton.classList.remove('recording');
        
        // Don't show alert if it's already been shown for permission error
        if (error.name !== 'NotAllowedError' && error.name !== 'NotFoundError' && error.name !== 'NotReadableError') {
            alert('Failed to initialize recording: ' + error.message);
        }
    }
}

async function stopRecording() {
    if (!isRecording) return;
    
    isRecording = false;
    startTimer();
    
    if (audioBuffer.length > 0 && ws.readyState === WebSocket.OPEN) {
        ws.send(audioBuffer.buffer);
        audioBuffer = new Int16Array(0);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    await ws.send(JSON.stringify({ type: 'stop_recording' }));
    
    updateRecordButtonLabel();
    recordButton.classList.remove('recording');
    
    // Notify main process of recording status change
    if (window.electronAPI && window.electronAPI.sendRecordingStatusUpdate) {
        window.electronAPI.sendRecordingStatusUpdate(false);
    }
}

// Event listeners
recordButton.onclick = () => isRecording ? stopRecording() : startRecording();

// Listen for recording commands from main process (for system tray)
if (window.electronAPI && window.electronAPI.onRecordingStartCommand) {
    window.electronAPI.onRecordingStartCommand(() => {
        console.log('Received start recording command from main process');
        if (!isRecording) {
            startRecording().catch(error => {
                console.error('Failed to start recording from command:', error);
            });
        }
    });
    
    window.electronAPI.onRecordingStopCommand(() => {
        console.log('Received stop recording command from main process');
        if (isRecording) {
            stopRecording().catch(error => {
                console.error('Failed to stop recording from command:', error);
            });
        }
    });
}
copyButton.onclick = () => copyToClipboard(transcript.value, copyButton);

// Settings button handler (only works in Electron)
if (settingsButton) {
    settingsButton.onclick = () => {
        if (window.electronAPI && window.electronAPI.openSettings) {
            window.electronAPI.openSettings().catch(error => {
                console.error('Failed to open settings:', error);
            });
        } else {
            // In web browser, show a simple alert
            alert('Settings are only available in the desktop app.');
        }
    };
}

const finalizeSpaceRelease = () => {
    if (!spaceKeyHeld && spaceRecordingActive && !spaceStartInProgress) {
        spaceRecordingActive = false;
        stopRecording().catch((error) => {
            console.error('Error stopping recording via spacebar:', error);
        });
    }
};

const handleSpaceKeyDown = (event) => {
    if (event.code !== 'Space') return;
    if (isTypingContext()) return;
    if (event.repeat) {
        event.preventDefault();
        return;
    }

    event.preventDefault();
    spaceKeyHeld = true;

    if (spaceRecordingActive || spaceStartInProgress || isRecording) {
        return;
    }

    spaceStartInProgress = true;

    (async () => {
        try {
            await startRecording();
            if (spaceKeyHeld) {
                spaceRecordingActive = true;
                return;
            }

            spaceRecordingActive = true;
            await stopRecording();
            spaceRecordingActive = false;
        } catch (error) {
            console.error('Error starting recording via spacebar:', error);
            spaceRecordingActive = false;
            spaceKeyHeld = false;
        } finally {
            spaceStartInProgress = false;
            finalizeSpaceRelease();
        }
    })();
};

const handleSpaceKeyUp = (event) => {
    if (event.code !== 'Space') return;
    if (isTypingContext()) return;

    event.preventDefault();
    spaceKeyHeld = false;
    finalizeSpaceRelease();
};

const handleShiftKeyDown = (event) => {
    // Only handle Left Shift, Right Shift is reserved for global hotkey
    if (event.code !== 'ShiftLeft') return;
    if (isTypingContext()) return;
    if (event.repeat) {
        event.preventDefault();
        return;
    }

    event.preventDefault();

    if (spaceStartInProgress) {
        return;
    }

    spaceKeyHeld = false;
    spaceRecordingActive = false;

    (async () => {
        try {
            if (isRecording) {
                await stopRecording();
            } else {
                await startRecording();
            }
        } catch (error) {
            console.error('Error toggling recording via Shift:', error);
        }
    })();
};

window.addEventListener('keydown', (event) => {
    handleSpaceKeyDown(event);
    handleShiftKeyDown(event);
}, true);

window.addEventListener('keyup', (event) => {
    handleSpaceKeyUp(event);
}, true);

window.addEventListener('blur', () => {
    if (!spaceKeyHeld && !spaceRecordingActive) return;
    spaceKeyHeld = false;
    finalizeSpaceRelease();
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeLanguage();
    initializeTheme();
    initializeWebSocket();
    renderHistory(); // Load and display history on page load
    if (autoStart) initializeAudioStream();
});

// Theme handling
function toggleTheme() {
    const nextIsDark = !document.body.classList.contains('dark-theme');
    applyThemePreference(nextIsDark);
    localStorage.setItem('darkTheme', nextIsDark ? 'true' : 'false');
}

// Initialize theme from saved preference / system preference
function initializeTheme() {
    const storedPreference = localStorage.getItem('darkTheme');

    if (storedPreference === null) {
        if (prefersDarkScheme) {
            applyThemePreference(prefersDarkScheme.matches);
            if (typeof prefersDarkScheme.addEventListener === 'function') {
                prefersDarkScheme.addEventListener('change', handleSystemThemeChange);
            } else if (typeof prefersDarkScheme.addListener === 'function') {
                prefersDarkScheme.addListener(handleSystemThemeChange);
            }
        } else {
            applyThemePreference(false);
        }
    } else {
        applyThemePreference(storedPreference === 'true');
    }
}

if (themeToggleButton) {
    themeToggleButton.onclick = toggleTheme;
}

// Background recorder support (for hidden window)
if (window.electronAPI && window.electronAPI.onBackgroundRecorderStart) {
    let backgroundRecordingActive = false;
    let backgroundServerUrl = null;
    
    // Listen for start command from main process
    window.electronAPI.onBackgroundRecorderStart((serverUrl) => {
        console.log('Background recorder start requested, serverUrl:', serverUrl);
        backgroundServerUrl = serverUrl;
        backgroundRecordingActive = true;
        
        // Close existing WebSocket if any
        if (ws) {
            ws.close();
        }
        
        // Initialize WebSocket with the provided server URL
        const protocol = serverUrl.startsWith('https') ? 'wss' : 'ws';
        const wsUrl = `${protocol}://${serverUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}/api/v1/ws`;
        console.log('Connecting to WebSocket for background recording:', wsUrl);
        
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log('Background recorder WebSocket connected');
            wsConnected = true;
            // Auto-start recording
            startRecording().then(() => {
                console.log('Background recording started');
            }).catch((error) => {
                console.error('Failed to start background recording:', error);
                if (window.electronAPI && window.electronAPI.sendBackgroundRecorderStatus) {
                    window.electronAPI.sendBackgroundRecorderStatus('error');
                }
            });
        };
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case 'status':
                    if (data.status === 'idle' && backgroundRecordingActive) {
                        // Recording finished, wait a bit for final text updates
                        console.log('Background recording status: idle, waiting for final text...');
                        setTimeout(() => {
                            const text = transcript.value.trim();
                            console.log('Final transcript text:', text ? text.substring(0, 50) + '...' : 'empty', '(length:', text ? text.length : 0, ')');
                            
                            // Save to history
                            if (text) {
                                saveTranscriptToHistory(text);
                            }
                            
                            // Send final text to main process
                            if (text && window.electronAPI) {
                                // Send final text via a dedicated IPC channel
                                if (window.electronAPI.sendBackgroundRecorderFinalText) {
                                    window.electronAPI.sendBackgroundRecorderFinalText(text);
                                } else if (window.electronAPI.sendBackgroundRecorderText) {
                                    // Fallback: send via text-update
                                    window.electronAPI.sendBackgroundRecorderText(text);
                                }
                            }
                            
                            if (window.electronAPI && window.electronAPI.sendBackgroundRecorderStatus) {
                                window.electronAPI.sendBackgroundRecorderStatus('idle');
                            }
                            backgroundRecordingActive = false;
                        }, 1500); // Wait for final text deltas to arrive
                    }
                    break;
                case 'text':
                    if (data.isNewResponse) {
                        transcript.value = data.content;
                    } else {
                        transcript.value += data.content;
                    }
                    transcript.scrollTop = transcript.scrollHeight;
                    
                    // Send text updates to main process incrementally
                    if (window.electronAPI && window.electronAPI.sendBackgroundRecorderText && data.content) {
                        window.electronAPI.sendBackgroundRecorderText(data.content);
                    }
                    break;
                case 'error':
                    console.error('Background recorder error:', data.content);
                    if (window.electronAPI && window.electronAPI.sendBackgroundRecorderStatus) {
                        window.electronAPI.sendBackgroundRecorderStatus('error');
                    }
                    break;
            }
        };
        
        ws.onerror = (error) => {
            console.error('Background recorder WebSocket error:', error);
            if (window.electronAPI && window.electronAPI.sendBackgroundRecorderStatus) {
                window.electronAPI.sendBackgroundRecorderStatus('error');
            }
        };
        
        ws.onclose = () => {
            console.log('Background recorder WebSocket closed');
            wsConnected = false;
            backgroundRecordingActive = false;
        };
    });
    
    // Listen for stop command from main process
    window.electronAPI.onBackgroundRecorderStop(() => {
        console.log('Background recorder stop requested');
        if (isRecording) {
            stopRecording().then(() => {
                console.log('Background recording stopped');
            }).catch((error) => {
                console.error('Failed to stop background recording:', error);
            });
        }
        backgroundRecordingActive = false;
    });
}
