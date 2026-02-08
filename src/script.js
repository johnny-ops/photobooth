/* ========================================
   PHOTOBOOTH - ENHANCED SCRIPT
   ======================================== */

// ========================================
// CONFIGURATION
// ========================================

const CONFIG = {
    PRINT_W: 750,      // 2.5 inches @ 300 DPI
    PRINT_H: 2100,     // 7.0 inches @ 300 DPI
    VIDEO_W: 1280,
    VIDEO_H: 720,
    COUNTDOWN_TIME: 3,
    SHOT_DELAY: 1500,
    FLASH_DURATION: 200,
    // Video recording configuration
    RECORDING_DURATION: 5000, // Fixed 5 seconds per strip (strict, no early stop)
    PREVIEW_DURATION: 3000,  // 3 seconds preview after each strip
    ANIMATION_FPS: 30,       // Animation frame rate
    // Mobile detection
    IS_MOBILE: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    IS_TOUCH: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
};

// ========================================
// RETRO PIXEL TEMPLATES
// ========================================

const TEMPLATES = {
    retro: {
        name: 'Retro Classic',
        borderColor: '#00ff41',
        accentColor: '#ffff00',
        headerBg: '#0a0a0a',
        headerText: '#00ff41',
        draw: drawRetroTemplate,
    },
    neon: {
        name: 'Neon Grid',
        borderColor: '#ff0080',
        accentColor: '#00ffff',
        headerBg: '#0a0a0a',
        headerText: '#ff0080',
        draw: drawNeonGridTemplate,
    },
    arcade: {
        name: 'Arcade Style',
        borderColor: '#ffff00',
        accentColor: '#ff8000',
        headerBg: '#0a0a0a',
        headerText: '#ffff00',
        draw: drawArcadeTemplate,
    },
    cyber: {
        name: 'Cyber Punk',
        borderColor: '#00ffff',
        accentColor: '#ff00ff',
        headerBg: '#0a0a0a',
        headerText: '#00ffff',
        draw: drawCyberTemplate,
    },
};

// ========================================
// DOM ELEMENTS
// ========================================

const DOM = {
    rawVideo: document.getElementById('raw-feed'),
    liveCanvas: document.getElementById('live-canvas'),
    stripCanvas: document.getElementById('final-strip'),
    cameraSelect: document.getElementById('cameraSelect'),
    templateSelect: document.getElementById('templateSelect'),
    templateSelector: document.getElementById('templateSelector'),
    shotCountSelect: document.getElementById('shotCount'),
    countdownEl: document.getElementById('countdown'),
    modal: document.getElementById('resultsModal'),
    printImg: document.getElementById('print-target'),
    startBtn: document.getElementById('startBtn'),
    statusText: document.getElementById('statusText'),
    statusDot: document.querySelector('.status-dot'),
    previewCount: document.getElementById('previewCount'),
    downloadLink: document.getElementById('downloadVidLink'),
    flashEffect: document.getElementById('flashEffect'),
    templateImage: document.getElementById('template-image'),
    // Recording UI elements
    recordingProgress: document.getElementById('recordingProgress'),
    recordingProgressBar: document.getElementById('recordingProgressBar'),
    recordingStatusText: document.getElementById('recordingStatusText'),
    stripPreviewContainer: document.getElementById('stripPreviewContainer'),
    stripPreviewVideo: document.getElementById('stripPreviewVideo'),
    previewContinueBtn: document.getElementById('previewContinueBtn'),
    smileDetectionToggle: document.getElementById('smileDetectionToggle'),
    smileDetectionCanvas: document.getElementById('smile-detection-canvas'),
    smileDetectionIndicator: document.getElementById('smileDetectionIndicator'),
    smileDetectionStatus: document.getElementById('smileDetectionStatus'),
    smileStatusText: document.getElementById('smileStatusText'),
    tutorialModal: document.getElementById('tutorialModal'),
};

// ========================================
// CANVAS CONTEXTS
// ========================================

const CTX = {
    live: DOM.liveCanvas.getContext('2d'),
    strip: DOM.stripCanvas.getContext('2d'),
};

// ========================================
// STATE
// ========================================

let state = {
    stream: null,
    mediaRecorder: null,
    recordedChunks: [],
    photoIndex: 0,
    totalShots: 3, // Fixed to 3 photos
    isRecording: false,
    cameraReady: false,
    sessionStartTime: null,
    photoTimestamps: [],
    // New video clip state
    videoClips: [], // Array to store 2-second video clips
    clipRecorders: [], // Array to store individual clip recorders
    hiddenVideoElements: [], // Array to store hidden video elements for playback
    finalVideoRecorder: null, // Recorder for the final composite video
    isRecordingClip: false, // Flag to track if currently recording a clip
    // Template image state
    templateImageLoaded: false,
    templateImage: null, // Reference to loaded template.png
    availableTemplates: [], // List of available template images
    selectedTemplate: null, // Currently selected template path
    // Captured photos
    capturedPhotos: [], // Store captured photo canvases
    // Simple video recording state
    sessionRecorder: null,   // MediaRecorder for entire session
    sessionVideo: null,      // Final video blob from session
    positionStreams: [],     // Store streams
    stripUpdateAnimationId: null, // Animation ID for updating strip canvas during recording
    // Download state
    downloadVideoBlob: null,
    downloadVideoURL: null,
    downloadFileName: null,
    downloadFileExtension: null,
    cloudVideoURL: null,
    // Smile detection state
    smileDetectionEnabled: true,
    faceMesh: null,
    camera: null,
    smileDetectionActive: false,
    smileDetectedCount: 0,
    smileDetectionThreshold: 8, // Number of consecutive smile detections needed
    smileDetectionTimeout: null,
    lastSmileDetectionTime: 0,
    lastMouthPosition: null,
};

// ========================================
// INITIALIZATION
// ========================================

function init() {
    // Detect mobile and adjust config
    if (CONFIG.IS_MOBILE) {
        // Use smaller dimensions for mobile to improve performance
        CONFIG.VIDEO_W = Math.min(640, window.innerWidth);
        CONFIG.VIDEO_H = Math.min(480, window.innerHeight * 0.6);
        console.log('📱 Mobile device detected - using optimized settings');
    }
    
    // Set canvas dimensions
    DOM.liveCanvas.width = CONFIG.VIDEO_W;
    DOM.liveCanvas.height = CONFIG.VIDEO_H;
    DOM.stripCanvas.width = CONFIG.PRINT_W;
    DOM.stripCanvas.height = CONFIG.PRINT_H;

    // Scan for available templates and build UI
    scanForTemplates();

    DOM.shotCountSelect.addEventListener('change', () => {
        // Always use 3 shots
        state.totalShots = 3;
        DOM.shotCountSelect.value = '3';
        updatePreviewCount();
    });

    DOM.cameraSelect.addEventListener('change', () => {
        if (state.stream) {
            // Stop current stream
            state.stream.getTracks().forEach(track => track.stop());
            state.cameraReady = false;
            DOM.startBtn.disabled = true;
        }
        initCamera();
    });

    // Initialize camera devices and camera
    initCameraDevices();
}

// Scan for available template images
async function scanForTemplates() {
    if (!DOM.templateSelector) return;
    
    DOM.templateSelector.innerHTML = '<div class="template-loading">Loading templates...</div>';
    
    // List of possible template locations and names
    // Templates are now in root for Vercel compatibility
    const templatePaths = [
        'template.png', 'template.jpg', 'template.jpeg',
        'template1.png', 'template2.png', 'template3.png',
        'template1.jpg', 'template2.jpg', 'template3.jpg',
        'public/template.png', 'public/template.jpg', 'public/template.jpeg',
        'public/template1.png', 'public/template2.png', 'public/template3.png',
        'public/templates/template.png', 'public/templates/template.jpg',
        'public/images/template.png', 'public/images/template.jpg'
    ];
    
    const foundTemplates = [];
    
    // Check each template path
    for (const path of templatePaths) {
        try {
            const exists = await checkImageExists(path);
            if (exists) {
                const name = path.split('/').pop().replace(/\.(png|jpg|jpeg)$/i, '');
                foundTemplates.push({
                    path: path,
                    name: name || 'Template'
                });
            }
        } catch (e) {
            // Continue checking other paths
            console.log(`Template check failed for ${path}:`, e.message);
        }
    }
    
    // If no templates found, add default template.png as fallback
    if (foundTemplates.length === 0) {
        foundTemplates.push({
            path: 'template.png',
            name: 'Default Template'
        });
    }
    
    state.availableTemplates = foundTemplates;
    
    // Build template selector UI
    buildTemplateSelector(foundTemplates);
    
    // Select first template by default
    if (foundTemplates.length > 0) {
        state.selectedTemplate = foundTemplates[0].path;
        loadTemplateImage(foundTemplates[0].path);
    }
}

// Check if an image exists
function checkImageExists(path) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = path;
    });
}

// Build template selector UI
function buildTemplateSelector(templates) {
    if (!DOM.templateSelector) return;
    
    if (templates.length === 0) {
        DOM.templateSelector.innerHTML = '<div class="template-empty">No templates found. Place template images in the public/ folder (served from root on Vercel).</div>';
        return;
    }
    
    DOM.templateSelector.innerHTML = '';
    
    templates.forEach((template, index) => {
        const item = document.createElement('div');
        item.className = 'template-item' + (index === 0 ? ' selected' : '');
        item.dataset.path = template.path;
        
        const img = document.createElement('img');
        img.src = template.path;
        img.alt = template.name;
        img.onerror = () => {
            item.style.display = 'none';
        };
        
        const name = document.createElement('div');
        name.className = 'template-name';
        name.textContent = template.name;
        
        item.appendChild(img);
        item.appendChild(name);
        
        item.addEventListener('click', () => {
            // Remove selected class from all items
            document.querySelectorAll('.template-item').forEach(el => {
                el.classList.remove('selected');
            });
            
            // Add selected class to clicked item
            item.classList.add('selected');
            
            // Load the selected template
            state.selectedTemplate = template.path;
            loadTemplateImage(template.path);
        });
        
        DOM.templateSelector.appendChild(item);
    });
}

// Load template image from file - used for strip/photos, NOT camera view
function loadTemplateImage(templatePath = null) {
    const templateImage = DOM.templateImage;
    if (!templateImage) return;

    const pathToLoad = templatePath || state.selectedTemplate || 'template.png';
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        templateImage.src = img.src;
        templateImage.style.display = 'none'; // Hidden element, but image is used for display
        console.log('✅ Template image loaded:', pathToLoad, `${img.width}x${img.height}`);
        state.templateImageLoaded = true;
        state.templateImage = img; // Store reference for use on live canvas and strip
        
        // Redraw strip if already initialized
        if (state.capturedPhotos.length > 0 || state.isRecording) {
            initStrip();
        }
    };
    img.onerror = () => {
        console.warn('Failed to load template:', pathToLoad);
        state.templateImageLoaded = false;
        state.templateImage = null;
    };
    img.src = pathToLoad;
}

// ========================================
// CAMERA DEVICE MANAGEMENT
// ========================================

async function initCameraDevices() {
    try {
        // First request camera permission to get device labels
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            // Stop the stream immediately, we just needed permission
            stream.getTracks().forEach(track => track.stop());
        } catch (permError) {
            console.warn('Camera permission needed:', permError);
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        // Clear existing options except the first one
        if (DOM.cameraSelect) {
        DOM.cameraSelect.innerHTML = '<option value="">Auto-detect</option>';
        
        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Camera ${index + 1}`;
            DOM.cameraSelect.appendChild(option);
        });

        console.log(`Found ${videoDevices.length} camera devices`);
        }
    } catch (err) {
        console.warn('Could not enumerate devices:', err);
    }

    // Initialize camera after device enumeration
    initCamera();
}

// ========================================
// CAMERA INITIALIZATION
// ========================================

async function initCamera() {
    // Check if DOM elements exist
    if (!DOM.statusText) {
        console.error('Status text element not found - DOM not ready');
        setTimeout(initCamera, 100); // Retry after DOM is ready
        return;
    }
    
    if (!DOM.rawVideo) {
        console.error('Video element not found - DOM not ready');
        setTimeout(initCamera, 100); // Retry after DOM is ready
        return;
    }
    
    DOM.statusText.textContent = 'Requesting camera access...';
    if (DOM.statusDot) {
        DOM.statusDot.classList.remove('active');
    }
    
    try {
        // Enhanced camera access with conflict resolution
        await attemptCameraAccessWithRetry();
    } catch (err) {
        console.error('Camera initialization error:', err);
        handleCameraError(err);
    }
}

async function attemptCameraAccessWithRetry() {
    const maxRetries = 8;
    const retryDelay = 1500; // 1.5 seconds between retries
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            DOM.statusText.textContent = `Connecting to camera... (${attempt}/${maxRetries})`;
            console.log(`Camera access attempt ${attempt}/${maxRetries}`);
            
            // Force release any existing camera handles
            await forceReleaseCameraHandles();
            
            // Wait a bit longer if camera might be in use
            if (attempt > 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Try different constraint strategies
            const success = await tryMultipleConstraints();
            
            if (success) {
                console.log('Camera initialized successfully on attempt', attempt);
                return; // Success, exit retry loop
            }
            
            throw new Error('All constraint strategies failed');
            
        } catch (error) {
            console.warn(`Camera attempt ${attempt} failed:`, error);
            
            // Check if it's a NotReadableError (camera in use)
            if (error.name === 'NotReadableError' || error.message.includes('in use')) {
                DOM.statusText.textContent = `Camera is busy. Waiting... (${attempt}/${maxRetries})`;
                // Wait longer for camera to be released
                await new Promise(resolve => setTimeout(resolve, retryDelay * 2));
            } else if (attempt === maxRetries) {
                throw error; // Final attempt failed
            } else {
            // Wait before retrying
                DOM.statusText.textContent = `Retrying... (${attempt}/${maxRetries})`;
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
    }
}

async function forceReleaseCameraHandles() {
    // Stop any existing streams first
    if (state.stream) {
        const tracks = state.stream.getTracks();
        tracks.forEach(track => {
            try {
            track.stop();
            track.enabled = false;
            } catch (e) {
                console.warn('Error stopping track:', e);
            }
        });
        state.stream = null;
    }
    
    // Clear video source and pause
    if (DOM.rawVideo.srcObject) {
        try {
            DOM.rawVideo.pause();
            DOM.rawVideo.srcObject = null;
        } catch (e) {
            console.warn('Error clearing video source:', e);
        }
    }
    
    // Force garbage collection to release camera handles (if available)
    if (window.gc) {
        try {
        window.gc();
        } catch (e) {
            // Ignore if not available
    }
    }
    
    // Longer delay to allow system to fully release handles
    await new Promise(resolve => setTimeout(resolve, 800));
}

async function tryMultipleConstraints() {
    const selectedDeviceId = DOM.cameraSelect.value;
    
    // Multiple constraint strategies for maximum compatibility
    // Start with minimal constraints to avoid conflicts
    const constraintSets = [
        // Strategy 1: Minimal constraints (most compatible)
        {
            video: true,
            audio: false
        },
        // Strategy 2: Low quality for compatibility
        {
            video: {
                width: { min: 320, ideal: 640 },
                height: { min: 240, ideal: 480 },
                frameRate: { ideal: 15, max: 30 }
            },
            audio: false
        },
        // Strategy 3: Medium quality
        {
            video: {
                deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
                width: { min: 480, ideal: 640, max: 1280 },
                height: { min: 360, ideal: 480, max: 720 },
                frameRate: { ideal: 15, max: 30 },
                facingMode: selectedDeviceId ? undefined : 'user'
            },
            audio: false
        },
        // Strategy 4: High quality with specific device
        {
            video: {
                deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
                width: { min: 640, ideal: CONFIG.VIDEO_W, max: 1920 },
                height: { min: 480, ideal: CONFIG.VIDEO_H, max: 1080 },
                frameRate: { ideal: 30, max: 60 },
                facingMode: selectedDeviceId ? undefined : 'user'
            },
            audio: false
        }
    ];
    
    for (let i = 0; i < constraintSets.length; i++) {
        try {
            console.log(`Trying constraint set ${i + 1}:`, constraintSets[i]);
            
            // Add timeout to prevent hanging
            const mediaPromise = navigator.mediaDevices.getUserMedia(constraintSets[i]);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Camera access timeout')), 10000)
            );
            
            state.stream = await Promise.race([mediaPromise, timeoutPromise]);
            
            // Set video source
            DOM.rawVideo.srcObject = state.stream;
            DOM.statusText.textContent = 'Initializing camera feed...';
            
            // Ensure video plays
            try {
                await DOM.rawVideo.play();
            } catch (e) {
                console.warn('Auto-play prevented:', e);
            }
            
            // Wait for video to be ready
            await waitForVideoReady();
            
            console.log(`Success with constraint set ${i + 1}`);
            return true;
            
        } catch (constraintError) {
            console.warn(`Constraint set ${i + 1} failed:`, constraintError);
            
            // Clean up failed attempt
            if (state.stream) {
                try {
                state.stream.getTracks().forEach(track => track.stop());
                } catch (e) {
                    console.warn('Error stopping tracks:', e);
                }
                state.stream = null;
            }
            
            // If it's a NotReadableError, don't try other constraints
            if (constraintError.name === 'NotReadableError') {
                throw constraintError;
            }
            
            // Wait a bit before trying next constraint
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
    
    return false; // All strategies failed
}

async function waitForVideoReady() {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Video ready timeout - camera may be in use by another app'));
        }, 20000); // 20 second timeout
        
        let interval = null;
        
        const checkReady = () => {
            // Check if video has valid dimensions (less strict check)
            if (DOM.rawVideo.readyState >= 2 && 
                DOM.rawVideo.videoWidth > 0 && 
                DOM.rawVideo.videoHeight > 0) {
                
                clearTimeout(timeout);
                if (interval) clearInterval(interval);
                
                console.log(`Video ready: ${DOM.rawVideo.videoWidth}x${DOM.rawVideo.videoHeight}`);
                
                // Try to play the video
                DOM.rawVideo.play().then(() => {
                    console.log('Video playing successfully');
                }).catch(e => {
                    console.warn('Auto-play prevented:', e);
                });
                
                // Set camera ready state
                state.cameraReady = true;
                if (DOM.startBtn) {
                DOM.startBtn.disabled = false;
                }
                if (DOM.statusText) {
                    DOM.statusText.textContent = 'Camera Ready ✓';
                }
                if (DOM.statusDot) {
                DOM.statusDot.classList.add('active');
                }
                startRenderLoop();
                
                // Initialize smile detection if enabled
                if (state.smileDetectionEnabled) {
                    setTimeout(() => initSmileDetection(), 1000);
                }
                
                resolve();
                return true;
            }
            return false;
        };
        
        // Try to play the video immediately
        DOM.rawVideo.play().catch(e => {
            console.warn('Initial play attempt failed (will retry):', e);
        });
        
        // Multiple event listeners for maximum compatibility
        const eventTypes = ['loadedmetadata', 'loadeddata', 'canplay', 'playing'];
        const eventHandlers = {};
        
        eventTypes.forEach(eventType => {
            const handler = () => {
                if (checkReady()) {
                    // Remove all listeners
                    eventTypes.forEach(et => {
                        if (eventHandlers[et]) {
                            DOM.rawVideo.removeEventListener(et, eventHandlers[et]);
                        }
                    });
                }
            };
            eventHandlers[eventType] = handler;
            DOM.rawVideo.addEventListener(eventType, handler, { once: true });
        });
        
        // Start checking immediately and periodically
        if (!checkReady()) {
            interval = setInterval(() => {
                if (checkReady()) {
                    clearInterval(interval);
                }
            }, 200);
        }
    });
}

function handleCameraError(err) {
    console.error('Camera Error:', err);
    DOM.statusText.textContent = 'Camera Error';
    DOM.statusDot.classList.remove('active');

    let message = 'Unable to access camera. ';
    let suggestions = [];

    if (err.name === 'NotAllowedError') {
        message += 'Camera permission was denied.';
        suggestions.push('• Click the camera icon in your browser\'s address bar');
        suggestions.push('• Select "Allow" for camera access');
        suggestions.push('• Refresh the page and allow access when prompted');
    } else if (err.name === 'NotFoundError') {
        message += 'No camera found.';
        suggestions.push('• Make sure your camera is connected');
        suggestions.push('• Check if camera works in other apps');
        suggestions.push('• Try refreshing the page');
    } else if (err.name === 'NotReadableError' || err.message.includes('in use')) {
        message += 'Camera is being used by another app.';
        suggestions.push('• Close Zoom, Teams, Skype, or other video apps');
        suggestions.push('• Close other browser tabs using the camera');
        suggestions.push('• Wait a few seconds and click "Retry Camera"');
        suggestions.push('• On Windows: Check Task Manager for apps using the camera');
    } else if (err.name === 'NotSecureError' || (location.protocol !== 'https:' && location.hostname !== 'localhost')) {
        message += 'Camera requires a secure connection.';
        suggestions.push('• Use HTTPS or localhost');
        suggestions.push('• Try: http://localhost instead of file://');
    } else {
        message += err.message || 'Unknown error occurred.';
        suggestions.push('• Try refreshing the page');
        suggestions.push('• Try a different browser (Chrome, Firefox, Edge)');
        suggestions.push('• Make sure your camera drivers are up to date');
    }

    // Add retry button to the UI
    addRetryButton();

    const fullMessage = message + '\n\nTroubleshooting:\n' + suggestions.join('\n');
    alert('Camera Error\n\n' + fullMessage);
}

function addRetryButton() {
    // Remove existing retry button if any
    const existingBtn = document.getElementById('retryBtn');
    if (existingBtn) {
        existingBtn.remove();
    }

    const retryBtn = document.createElement('button');
    retryBtn.id = 'retryBtn';
    retryBtn.className = 'btn-secondary';
    retryBtn.innerHTML = '<span>🔄</span> Retry Camera';
    retryBtn.onclick = () => {
        retryBtn.disabled = true;
        retryBtn.innerHTML = '<span>⏳</span> Connecting...';
        DOM.statusText.textContent = 'Retrying camera connection...';
        initCamera();
        // Re-enable button after a delay
        setTimeout(() => {
            retryBtn.disabled = false;
            retryBtn.innerHTML = '<span>🔄</span> Retry Camera';
        }, 5000);
    };

    DOM.startBtn.parentNode.insertBefore(retryBtn, DOM.startBtn);
}

// ========================================
// RENDER LOOP
// ========================================

function startRenderLoop() {
    let frameCount = 0;
    
    function render() {
        if (!state.stream || !state.cameraReady) {
            requestAnimationFrame(render);
            return;
        }

        // Check if video is ready and has valid dimensions
        if (DOM.rawVideo.readyState >= 2 && 
            DOM.rawVideo.videoWidth > 0 && 
            DOM.rawVideo.videoHeight > 0) {
            
            // Ensure video is playing
            if (DOM.rawVideo.paused) {
                DOM.rawVideo.play().catch(e => {
                    console.warn('Video play error:', e);
                });
            }
            
            // Clear canvas with black background
            CTX.live.fillStyle = '#000000';
            CTX.live.fillRect(0, 0, CONFIG.VIDEO_W, CONFIG.VIDEO_H);

            // Draw video frame
            try {
                // Ensure video is playing
                if (DOM.rawVideo.paused) {
                    DOM.rawVideo.play().catch(e => console.warn('Play error:', e));
                }
                // Draw video frame (not mirrored - normal camera view)
                CTX.live.drawImage(DOM.rawVideo, 0, 0, CONFIG.VIDEO_W, CONFIG.VIDEO_H);
            } catch (e) {
                console.warn('Error drawing video frame:', e);
                // Show error message on canvas
                CTX.live.fillStyle = '#ff4444';
                CTX.live.font = '16px sans-serif';
                CTX.live.textAlign = 'center';
                CTX.live.fillText('Camera Error', CONFIG.VIDEO_W / 2, CONFIG.VIDEO_H / 2);
            }

            // Template is NOT shown on live camera view
            // Template is only shown on the strip canvas (preview)
            // This keeps the camera feed clear without any green tint or overlay
            // No template overlay, no REC indicator - clean camera view
            
            frameCount++;
        } else {
            // Show loading indicator if video not ready
            CTX.live.fillStyle = '#1a1a1a';
            CTX.live.fillRect(0, 0, CONFIG.VIDEO_W, CONFIG.VIDEO_H);
            CTX.live.fillStyle = '#ffffff';
            CTX.live.font = 'bold 18px sans-serif';
            CTX.live.textAlign = 'center';
            CTX.live.fillText('Loading Camera...', CONFIG.VIDEO_W / 2, CONFIG.VIDEO_H / 2);
            
            // Try to play video if it's paused
            if (DOM.rawVideo.paused && DOM.rawVideo.srcObject) {
                DOM.rawVideo.play().catch(e => console.warn('Auto-play prevented:', e));
            }
        }

        requestAnimationFrame(render);
    }

    render();
}

// ========================================
// RETRO PIXEL TEMPLATE DRAWING FUNCTIONS
// ========================================

function drawRetroTemplate(ctx, w, h) {
    // Classic green terminal border
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#00ff41';
    ctx.strokeRect(10, 10, w - 20, h - 20);
    
    // Inner pixel border
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffff00';
    ctx.strokeRect(20, 20, w - 40, h - 40);
    
    // Corner pixels
    const pixelSize = 8;
    ctx.fillStyle = '#00ff41';
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(5 + i * pixelSize, 5, pixelSize, pixelSize);
        ctx.fillRect(w - 5 - (i + 1) * pixelSize, 5, pixelSize, pixelSize);
        ctx.fillRect(5 + i * pixelSize, h - 5 - pixelSize, pixelSize, pixelSize);
        ctx.fillRect(w - 5 - (i + 1) * pixelSize, h - 5 - pixelSize, pixelSize, pixelSize);
    }
    
    // Retro text
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#ffff00';
    ctx.fillText('REC', 30, 50);
}

function drawNeonGridTemplate(ctx, w, h) {
    // Neon pink border
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ff0080';
    ctx.strokeRect(15, 15, w - 30, h - 30);
    
    // Grid pattern
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;
    const gridSize = 20;
    
    for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    
    for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }
    
    // Neon corners
    ctx.fillStyle = '#ff0080';
    ctx.fillRect(10, 10, 20, 20);
    ctx.fillRect(w - 30, 10, 20, 20);
    ctx.fillRect(10, h - 30, 20, 20);
    ctx.fillRect(w - 30, h - 30, 20, 20);
}

function drawArcadeTemplate(ctx, w, h) {
    // Yellow arcade border
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ffff00';
    ctx.strokeRect(12, 12, w - 24, h - 24);
    
    // Orange accent
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ff8000';
    ctx.strokeRect(25, 25, w - 50, h - 50);
    
    // Pixel decorations
    ctx.fillStyle = '#ffff00';
    const pixelSize = 6;
    
    // Top and bottom pixel strips
    for (let x = 30; x < w - 30; x += pixelSize * 2) {
        ctx.fillRect(x, 30, pixelSize, pixelSize);
        ctx.fillRect(x, h - 30 - pixelSize, pixelSize, pixelSize);
    }
    
    // Side pixel strips
    for (let y = 40; y < h - 40; y += pixelSize * 2) {
        ctx.fillRect(30, y, pixelSize, pixelSize);
        ctx.fillRect(w - 30 - pixelSize, y, pixelSize, pixelSize);
    }
    
    // Score display
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#ff8000';
    ctx.fillText('SCORE: 9999', w - 150, 50);
}

function drawCyberTemplate(ctx, w, h) {
    // Cyan cyber border
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#00ffff';
    ctx.strokeRect(8, 8, w - 16, h - 16);
    
    // Magenta inner border
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ff00ff';
    ctx.strokeRect(18, 18, w - 36, h - 36);
    
    // Cyber circuit lines
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;
    
    // Horizontal lines
    ctx.beginPath();
    ctx.moveTo(0, 30);
    ctx.lineTo(w, 30);
    ctx.moveTo(0, h - 30);
    ctx.lineTo(w, h - 30);
    ctx.stroke();
    
    // Vertical lines
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(30, h);
    ctx.moveTo(w - 30, 0);
    ctx.lineTo(w - 30, h);
    ctx.stroke();
    
    // Cyber nodes
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(25, 25, 10, 10);
    ctx.fillRect(w - 35, 25, 10, 10);
    ctx.fillRect(25, h - 35, 10, 10);
    ctx.fillRect(w - 35, h - 35, 10, 10);
    
    // Cyber text
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#00ffff';
    ctx.fillText('CYBER MODE', 50, 50);
}

// ========================================
// STRIP GENERATION
// ========================================

function initStrip() {
    // Use custom template (image-based)
    const template = TEMPLATES['custom'] || TEMPLATES['retro']; // Fallback

    // Always use template.png (custom image) - automatically loaded and shown
    let useTemplateImage = state.templateImageLoaded && state.templateImage;
    
    if (useTemplateImage) {
        // Use template.png as background (707 × 2000 px vertical strip)
        // Scale it to fit the strip canvas (750 × 2100 px)
        try {
            const templateImg = state.templateImage;
            
            // Clear canvas first
            CTX.strip.fillStyle = '#ffffff';
            CTX.strip.fillRect(0, 0, CONFIG.PRINT_W, CONFIG.PRINT_H);
            
            // Draw template.png to fill the entire strip
            // Template is 707 × 2000, strip is 750 × 2100
            // Scale to fit while maintaining aspect ratio
            const templateAspect = templateImg.width / templateImg.height; // 707/2000 = 0.3535
            const stripAspect = CONFIG.PRINT_W / CONFIG.PRINT_H; // 750/2100 = 0.3571
            
            let drawWidth, drawHeight, drawX, drawY;
            
            if (templateAspect > stripAspect) {
                // Template is wider relative to strip - fit to height
                drawHeight = CONFIG.PRINT_H;
                drawWidth = drawHeight * templateAspect;
                drawX = (CONFIG.PRINT_W - drawWidth) / 2;
                drawY = 0;
            } else {
                // Template is taller relative to strip - fit to width
                drawWidth = CONFIG.PRINT_W;
                drawHeight = drawWidth / templateAspect;
                drawX = 0;
                drawY = (CONFIG.PRINT_H - drawHeight) / 2;
            }
            
            // Draw template.png as background
            CTX.strip.drawImage(templateImg, drawX, drawY, drawWidth, drawHeight);
            console.log('Using template.png for strip background');
        } catch (e) {
            console.warn('Error drawing template.png, using code-based template:', e);
            useTemplateImage = false; // Fallback to code-based
        }
    }
    
    // If template.png not available or error, use code-based template
    if (!useTemplateImage) {
    // Black retro background
    CTX.strip.fillStyle = '#0a0a0a';
    CTX.strip.fillRect(0, 0, CONFIG.PRINT_W, CONFIG.PRINT_H);

    // Header section
    CTX.strip.fillStyle = template.headerBg;
    CTX.strip.fillRect(0, 0, CONFIG.PRINT_W, 220);

    // Retro border around header
    CTX.strip.strokeStyle = template.borderColor;
    CTX.strip.lineWidth = 4;
    CTX.strip.strokeRect(20, 20, CONFIG.PRINT_W - 40, 180);

    // Main title
    CTX.strip.fillStyle = template.headerText;
    CTX.strip.font = 'bold 48px monospace';
    CTX.strip.textAlign = 'center';
    CTX.strip.fillText('ICS PHOTOBOOTH', CONFIG.PRINT_W / 2, 90);

    // Subtitle
    CTX.strip.font = 'bold 20px monospace';
    CTX.strip.fillStyle = template.accentColor;
    CTX.strip.fillText('RETRO PHOTO EXPERIENCE', CONFIG.PRINT_W / 2, 130);

    // Pixel decorative line
    CTX.strip.fillStyle = template.borderColor;
    const pixelSize = 4;
    for (let x = 50; x < CONFIG.PRINT_W - 50; x += pixelSize * 2) {
        CTX.strip.fillRect(x, 160, pixelSize, pixelSize);
    }

    // Date and time
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    });
    const timeStr = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    CTX.strip.font = 'bold 16px monospace';
    CTX.strip.fillStyle = template.accentColor;
    CTX.strip.fillText(`${dateStr} ${timeStr}`, CONFIG.PRINT_W / 2, 2050);
    
    // Bottom pixel decoration
    for (let x = 50; x < CONFIG.PRINT_W - 50; x += pixelSize * 2) {
        CTX.strip.fillRect(x, 2070, pixelSize, pixelSize);
        }
    }
}

function addToStrip(canvasRef, index) {
    const template = TEMPLATES['custom'] || TEMPLATES['retro']; // Use custom template
    // Only use template.png when "custom" option is selected
    const useTemplateImage = state.templateImageLoaded && state.templateImage;
    
    // Photo dimensions on strip
    const destW = 650;
    const destH = 450;
    const startY = 240;
    const gap = 35;
    const x = (CONFIG.PRINT_W - destW) / 2;
    const y = startY + index * (destH + gap);

    // If using template.png, photos blend with template (no extra borders)
    // If using code-based template, add decorative borders
    if (!useTemplateImage) {
        // Retro photo frame background (only for code-based templates)
    CTX.strip.fillStyle = '#1a1a1a';
    CTX.strip.fillRect(x - 20, y - 20, destW + 40, destH + 40);
    
    // Pixel border around photo
    CTX.strip.strokeStyle = template.borderColor;
    CTX.strip.lineWidth = 3;
    CTX.strip.strokeRect(x - 15, y - 15, destW + 30, destH + 30);
    
    // Inner accent border
    CTX.strip.strokeStyle = template.accentColor;
    CTX.strip.lineWidth = 1;
    CTX.strip.strokeRect(x - 10, y - 10, destW + 20, destH + 20);
    }

    // Draw photo on the strip
    // Template.png is already in the strip background (if using template)
    try {
    CTX.strip.drawImage(
        canvasRef,
        0,
        0,
            canvasRef.width || CONFIG.VIDEO_W,
            canvasRef.height || CONFIG.VIDEO_H,
        x,
        y,
        destW,
        destH
    );
        console.log(`Photo ${index + 1} drawn on strip at position (${x}, ${y})`);
    } catch (e) {
        console.error(`Error drawing photo ${index + 1} to strip:`, e);
    }

    // Photo number (only if not using template.png, or make it subtle)
    if (!useTemplateImage) {
    CTX.strip.fillStyle = template.borderColor;
    CTX.strip.fillRect(x + destW - 40, y - 15, 30, 20);
    CTX.strip.fillStyle = '#0a0a0a';
    CTX.strip.font = 'bold 14px monospace';
    CTX.strip.textAlign = 'center';
    CTX.strip.fillText(`${index + 1}`, x + destW - 25, y - 2);
    }
    
    // Reset text alignment
    CTX.strip.textAlign = 'center';
}

// ========================================
// SESSION FLOW
// ========================================

// ========================================
// SIMPLE CONTINUOUS RECORDING SYSTEM
// ========================================

/**
 * Record a single strip with fixed duration
 */
async function recordStrip(stripIndex) {
    // Guard: Validate state
    if (state.recordingState !== RecordingState.IDLE && 
        state.recordingState !== RecordingState.PREVIEW) {
        console.warn('Invalid state for recording:', state.recordingState);
        return;
    }

    // Guard: Validate strip index
    if (stripIndex < 0 || stripIndex >= state.totalShots) {
        console.error('Invalid strip index:', stripIndex);
        return;
    }

    try {
        // Transition to recording state
        state.recordingState = RecordingState.RECORDING;
        state.currentStripIndex = stripIndex;
        state.recordingStartTime = Date.now();
        state.progressPercent = 0;

        // Update UI
        updateRecordingUI(true, stripIndex);
        updatePreviewCount();

        // Capture stream from live canvas
        const liveStream = DOM.liveCanvas.captureStream(CONFIG.ANIMATION_FPS);
        state.stripStreams[stripIndex] = liveStream;

        // Determine mime type
        let mimeType = 'video/webm';
        if (MediaRecorder.isTypeSupported('video/mp4')) {
            mimeType = 'video/mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
            mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
            mimeType = 'video/webm';
        }

        // Create MediaRecorder for strip canvas (full template interface)
        const recorder = new MediaRecorder(stripStream, {
            mimeType: mimeType,
            videoBitsPerSecond: 2500000
        });

        const chunks = [];

        // Setup recorder event handlers
        recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                chunks.push(e.data);
            }
        };

        recorder.onstop = () => {
            // Create video blob
            const videoBlob = new Blob(chunks, { type: mimeType });
            state.videoSegments[stripIndex] = videoBlob;
            
            console.log(`Strip ${stripIndex + 1} recorded:`, 
                (videoBlob.size / 1024 / 1024).toFixed(2), 'MB');

            // Cleanup recorder
            cleanupRecorder(stripIndex);

            // Process recording
            processRecording(stripIndex);
        };

        recorder.onerror = (e) => {
            console.error(`Error recording strip ${stripIndex + 1}:`, e);
            cleanupRecorder(stripIndex);
            handleRecordingError(stripIndex);
        };

        // Store recorder
        state.stripRecorders[stripIndex] = recorder;

        // Start recording
        recorder.start(100); // Request data every 100ms
        console.log(`Recording started for strip ${stripIndex + 1}`);

        // Start progress animation
        startProgressAnimation(stripIndex);

        // Start live preview animation
        startLivePreviewAnimation(stripIndex);

        // Set fixed duration timer (STRICT - no early stop)
        state.recordingTimer = setTimeout(() => {
            stopRecording(stripIndex);
        }, CONFIG.RECORDING_DURATION);

    } catch (error) {
        console.error('Error starting strip recording:', error);
        cleanupRecorder(stripIndex);
        handleRecordingError(stripIndex);
    }
}

/**
 * Stop recording (called by timer - fixed duration)
 */
function stopRecording(stripIndex) {
    // Guard: Check if still recording
    if (state.recordingState !== RecordingState.RECORDING) {
        return;
    }

    // Guard: Check strip index matches
    if (state.currentStripIndex !== stripIndex) {
        return;
    }

    const recorder = state.stripRecorders[stripIndex];
    if (recorder && recorder.state === 'recording') {
        console.log(`Stopping recording for strip ${stripIndex + 1} (fixed duration)`);
        recorder.stop();
    } else {
        // Recorder already stopped or not recording
        console.warn(`Recorder for strip ${stripIndex + 1} not in recording state`);
        processRecording(stripIndex);
    }
}

/**
 * Process recording after stop
 */
function processRecording(stripIndex) {
    // Transition to processing state
    state.recordingState = RecordingState.PROCESSING;

    // Stop progress animation
    stopProgressAnimation();

    // Stop live preview animation
    stopLivePreviewAnimation();

    // Update UI
    updateRecordingUI(false, stripIndex);
    updateStatusText('Processing...');

    // Check if we have the video blob
    if (!state.videoSegments[stripIndex]) {
        console.error(`No video blob for strip ${stripIndex + 1}`);
        handleRecordingError(stripIndex);
        return;
    }

    // Small delay to ensure blob is ready
    setTimeout(() => {
        showPreview(stripIndex);
    }, 500);
}

/**
 * Show preview of recorded strip
 */
function showPreview(stripIndex) {
    // Transition to preview state
    state.recordingState = RecordingState.PREVIEW;

    const videoBlob = state.videoSegments[stripIndex];
    if (!videoBlob) {
        console.error(`No video blob for preview strip ${stripIndex + 1}`);
        skipPreview(stripIndex);
        return;
    }

    try {
        // Replace preview video
        if (DOM.stripPreviewVideo.src) {
            URL.revokeObjectURL(DOM.stripPreviewVideo.src);
        }
        DOM.stripPreviewVideo.src = URL.createObjectURL(videoBlob);
        DOM.stripPreviewVideo.currentTime = 0;

        // Show preview container
        DOM.stripPreviewContainer.style.display = 'flex';

        // Play preview
        DOM.stripPreviewVideo.play().catch(e => {
            console.error('Error playing preview:', e);
        });

        // Store video element for cleanup
        state.previewVideos[stripIndex] = DOM.stripPreviewVideo;

        // Update continue button
        if (DOM.previewContinueBtn) {
            DOM.previewContinueBtn.onclick = () => {
                skipPreview(stripIndex);
            };
        }

        // Auto-continue after preview duration
        state.previewTimer = setTimeout(() => {
            skipPreview(stripIndex);
        }, CONFIG.PREVIEW_DURATION);

    } catch (error) {
        console.error('Error showing preview:', error);
        skipPreview(stripIndex);
    }
}

/**
 * Skip preview and continue to next strip
 */
function skipPreview(stripIndex) {
    // Clear preview timer
    if (state.previewTimer) {
        clearTimeout(state.previewTimer);
        state.previewTimer = null;
    }

    // Hide preview container
    if (DOM.stripPreviewContainer) {
        DOM.stripPreviewContainer.style.display = 'none';
    }

    // Cleanup preview video
    if (DOM.stripPreviewVideo && DOM.stripPreviewVideo.src) {
        URL.revokeObjectURL(DOM.stripPreviewVideo.src);
        DOM.stripPreviewVideo.src = '';
    }

    // Check if all strips recorded
    if (stripIndex + 1 >= state.totalShots) {
        // All strips completed
        completeSession();
    } else {
        // Continue to next strip
        state.recordingState = RecordingState.IDLE;
        recordStrip(stripIndex + 1);
    }
}

/**
 * Complete session - all strips recorded
 */
function completeSession() {
    state.recordingState = RecordingState.COMPLETED;

    // Update UI
    DOM.startBtn.disabled = false;
    DOM.startBtn.innerHTML = '<span class="btn-icon">📸</span> START PHOTO SESSION';
    updateRecordingUI(false, -1);

    // Show modal and create final video
    DOM.modal.style.display = 'flex';
    showProcessingStatus('Creating motion video strip...');

    // Create composite motion video
    setTimeout(() => {
        createMotionVideoStrip();
    }, 1000);
}

/**
 * Update recording UI (progress bar, status)
 */
function updateRecordingUI(isRecording, stripIndex) {
    if (isRecording && stripIndex >= 0 && DOM.recordingProgress) {
        // Show progress bar
        DOM.recordingProgress.style.display = 'block';
        if (DOM.recordingStatusText) {
            DOM.recordingStatusText.textContent = `Recording Strip ${stripIndex + 1}/${state.totalShots}`;
        }
        state.progressPercent = 0;
    } else {
        // Hide progress bar
        if (DOM.recordingProgress) {
            DOM.recordingProgress.style.display = 'none';
        }
        state.progressPercent = 0;
    }
}

/**
 * Start progress animation
 */
function startProgressAnimation(stripIndex) {
    const startTime = Date.now();
    const duration = CONFIG.RECORDING_DURATION;

    function updateProgress() {
        if (state.recordingState !== RecordingState.RECORDING) {
            return;
        }

        const elapsed = Date.now() - startTime;
        state.progressPercent = Math.min((elapsed / duration) * 100, 100);

        // Update progress bar
        if (DOM.recordingProgressBar) {
            DOM.recordingProgressBar.style.width = state.progressPercent + '%';
        }

        if (elapsed < duration) {
            state.progressAnimationId = requestAnimationFrame(updateProgress);
        } else {
            state.progressAnimationId = null;
        }
    }

    updateProgress();
}

/**
 * Stop progress animation
 */
function stopProgressAnimation() {
    if (state.progressAnimationId) {
        cancelAnimationFrame(state.progressAnimationId);
        state.progressAnimationId = null;
    }
    state.progressPercent = 0;
    if (DOM.recordingProgressBar) {
        DOM.recordingProgressBar.style.width = '0%';
    }
}

/**
 * Start live preview animation on strip canvas
 */
function startLivePreviewAnimation(stripIndex) {
    const useTemplateImage = state.templateImageLoaded && state.templateImage;
    
    const destW = 650;
    const destH = 450;
    const startY = 240;
    const gap = 35;
    const x = (CONFIG.PRINT_W - destW) / 2;
    const currentY = startY + stripIndex * (destH + gap);

    function drawLivePreview() {
        if (state.recordingState !== RecordingState.RECORDING || 
            state.currentStripIndex !== stripIndex) {
            return;
        }

        // Redraw template (custom image)
        initStrip();

        // Draw previously recorded strips (static thumbnails)
        for (let i = 0; i < stripIndex; i++) {
            if (state.videoSegments[i]) {
                // Draw placeholder for completed strips
                const y = startY + i * (destH + gap);
                CTX.strip.fillStyle = '#1a1a1a';
                CTX.strip.fillRect(x - 20, y - 20, destW + 40, destH + 40);
                CTX.strip.fillStyle = '#333';
                CTX.strip.font = 'bold 24px Poppins';
                CTX.strip.textAlign = 'center';
                CTX.strip.fillText(`Strip ${i + 1}`, x + destW/2, y + destH/2);
            }
        }

        // Draw live camera feed for current strip
        try {
            CTX.strip.drawImage(
                DOM.liveCanvas,
                0, 0, CONFIG.VIDEO_W, CONFIG.VIDEO_H,
                x, currentY, destW, destH
            );
        } catch (e) {
            console.warn('Error drawing live preview:', e);
        }

        state.previewAnimationId = requestAnimationFrame(drawLivePreview);
    }

    drawLivePreview();
}

/**
 * Stop live preview animation
 */
function stopLivePreviewAnimation() {
    if (state.previewAnimationId) {
        cancelAnimationFrame(state.previewAnimationId);
        state.previewAnimationId = null;
    }
}

/**
 * Cleanup recorder and stream for a strip
 */
function cleanupRecorder(stripIndex) {
    // Stop recorder
    const recorder = state.stripRecorders[stripIndex];
    if (recorder) {
        if (recorder.state === 'recording') {
            try {
                recorder.stop();
            } catch (e) {
                console.warn('Error stopping recorder:', e);
            }
        }
        state.stripRecorders[stripIndex] = null;
    }

    // Stop media tracks
    const stream = state.stripStreams[stripIndex];
    if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
        });
        state.stripStreams[stripIndex] = null;
    }
}

/**
 * Handle recording error
 */
function handleRecordingError(stripIndex) {
    console.error(`Recording error for strip ${stripIndex + 1}`);
    
    // Cleanup
    cleanupRecorder(stripIndex);
    stopProgressAnimation();
    stopLivePreviewAnimation();

    // Reset state
    resetRecordingState();
    
    // Show error message
    alert(`Recording failed for strip ${stripIndex + 1}. Please try again.`);
}

/**
 * Reset recording state
 */
function resetRecordingState() {
    // Clear all timers
    if (state.recordingTimer) {
        clearTimeout(state.recordingTimer);
        state.recordingTimer = null;
    }
    if (state.previewTimer) {
        clearTimeout(state.previewTimer);
        state.previewTimer = null;
    }

    // Stop animations
    stopProgressAnimation();
    stopLivePreviewAnimation();

    // Cleanup all recorders
    state.stripRecorders.forEach((recorder, index) => {
        if (recorder) {
            cleanupRecorder(index);
        }
    });

    // Cleanup preview videos
    state.previewVideos.forEach((video, index) => {
        if (video && video.src) {
            URL.revokeObjectURL(video.src);
        }
    });

    // Reset state
    state.recordingState = RecordingState.IDLE;
    state.currentStripIndex = 0;
    state.progressPercent = 0;
    state.isButtonDisabled = false;

    // Reset UI
    DOM.startBtn.disabled = false;
    DOM.startBtn.innerHTML = '<span class="btn-icon">📸</span> START PHOTO SESSION';
    if (DOM.recordingProgress) {
        DOM.recordingProgress.style.display = 'none';
    }
    if (DOM.stripPreviewContainer) {
        DOM.stripPreviewContainer.style.display = 'none';
    }
}

/**
 * Update status text
 */
function updateStatusText(text) {
    if (DOM.recordingStatusText) {
        DOM.recordingStatusText.textContent = text;
    }
}

function startSession() {
    if (!state.cameraReady) {
        alert('Camera is not ready yet. Please wait...');
        return;
    }

    // Stop smile detection when session starts
    stopSmileDetection();

    DOM.startBtn.disabled = true;
    state.photoIndex = 0;
    state.totalShots = 3;
    state.capturedPhotos = [];
    state.videoSegments = [];
    state.isRecording = true;

    // Initialize strip with selected template
    initStrip();
    
    // Make sure preview is visible
    DOM.stripCanvas.style.display = 'block';
    DOM.stripCanvas.style.visibility = 'visible';

    // Start recording immediately when session starts
    startContinuousRecording();

    // Start the sequence (countdown + capture)
    runSequence();
}

// Start continuous recording for the entire session
// Records from STRIP CANVAS which shows the FULL TEMPLATE INTERFACE
// This captures the complete template image with all frames, overlays, borders, logos, text, and background
function startContinuousRecording() {
    try {
        // Ensure strip canvas is visible and ready
        DOM.stripCanvas.style.display = 'block';
        DOM.stripCanvas.style.visibility = 'visible';
        
        // Initialize strip with template (full template image)
        initStrip();
        
        // Start continuous update of strip canvas with live camera feed
        startStripCanvasUpdate();
        
        // Capture stream from STRIP CANVAS (full template interface)
        // This captures the entire template image as shown on screen
        const stripStream = DOM.stripCanvas.captureStream(30); // 30 FPS
        state.positionStreams = [stripStream]; // Store stream
        
        console.log('📹 Recording source: STRIP CANVAS (Full Template Interface)');
        console.log('📹 Will capture: Complete template image with all frames, overlays, borders, logos, text');
        console.log('📹 Fixed view: Full screen capture, no cropping, no zooming, no reframing');
        console.log('📹 Template: Entire custom image template recorded as one complete layout');

        // Determine mime type
        let mimeType = 'video/webm';
        if (MediaRecorder.isTypeSupported('video/mp4')) {
            mimeType = 'video/mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
            mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
            mimeType = 'video/webm';
        }

        // Create MediaRecorder for strip canvas
        const recorder = new MediaRecorder(stripStream, {
            mimeType: mimeType,
            videoBitsPerSecond: 2500000
        });

        const chunks = [];
        
        recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                chunks.push(e.data);
            }
        };

        recorder.onstop = () => {
            // Stop strip canvas update animation
            if (state.stripUpdateAnimationId) {
                cancelAnimationFrame(state.stripUpdateAnimationId);
                state.stripUpdateAnimationId = null;
            }
            
            const videoBlob = new Blob(chunks, { type: mimeType });
            const videoSizeMB = (videoBlob.size / 1024 / 1024).toFixed(2);
            console.log('✅ Session recording complete:', videoSizeMB, 'MB');
            console.log('📹 Video contains: Full template interface from start to finish');
            console.log('📹 Captured: Complete template image with all graphics, frames, and customer movements');
            console.log('📹 Fixed view: Entire template layout, no cropping or zooming');
            console.log('📹 Includes: All frames, overlays, borders, logos, text, background graphics');
            
            // Store the full session video
            state.sessionVideo = videoBlob;
            
            // Hide recording indicator
            if (DOM.recordingProgress) {
                DOM.recordingProgress.style.display = 'none';
            }
            
            // Cleanup stream tracks
            if (stripStream) {
                stripStream.getTracks().forEach(track => {
                    track.stop();
                });
            }
        };

        recorder.onerror = (e) => {
            console.error('Error recording session:', e);
        };

        // Start recording immediately
        recorder.start(100); // Request data every 100ms
        state.sessionRecorder = recorder;
        
        console.log('✅ Continuous recording started - capturing FULL TEMPLATE INTERFACE');
        console.log('📹 Recording: Complete template image as one unified layout');
        console.log('📹 View: Fixed camera view, full screen capture, no reframing');
        
        // Visual feedback: Show recording indicator
        if (DOM.recordingProgress) {
            DOM.recordingProgress.style.display = 'block';
            if (DOM.recordingStatusText) {
                DOM.recordingStatusText.textContent = 'Recording full template interface...';
            }
        }

    } catch (error) {
        console.error('Error starting continuous recording:', error);
        alert('Failed to start video recording. Please ensure camera is working.');
    }
}

// Continuously update strip canvas with live camera feed during recording
// This keeps the template visible with live customer movements
function startStripCanvasUpdate() {
    const destW = 650;
    const destH = 450;
    const startY = 240;
    const gap = 35;
    const x = (CONFIG.PRINT_W - destW) / 2;
    
    function updateStripCanvas() {
        if (!state.isRecording) {
            if (state.stripUpdateAnimationId) {
                cancelAnimationFrame(state.stripUpdateAnimationId);
                state.stripUpdateAnimationId = null;
            }
            return;
        }
        
        // Redraw full template background (complete template image)
        initStrip();
        
        // Draw all previously captured photos (static)
        for (let i = 0; i < state.photoIndex; i++) {
            if (state.capturedPhotos[i]) {
                addToStrip(state.capturedPhotos[i], i);
            }
        }
        
        // Draw live camera feed for current position (if still capturing)
        if (state.photoIndex < state.totalShots) {
            const currentY = startY + state.photoIndex * (destH + gap);
            try {
                // Draw live camera feed on current position
                // This shows customer movements on the template
                CTX.strip.drawImage(
                    DOM.liveCanvas, // Live camera feed
                    0,
                    0,
                    CONFIG.VIDEO_W,
                    CONFIG.VIDEO_H,
                    x,
                    currentY,
                    destW,
                    destH
                );
            } catch (e) {
                console.warn('Error drawing live feed to strip:', e);
            }
        }
        
        // Continue animation
        state.stripUpdateAnimationId = requestAnimationFrame(updateStripCanvas);
    }
    
    // Start animation
    updateStripCanvas();
}

function runSequence() {
    if (state.photoIndex >= state.totalShots) {
        finishSession();
        return;
    }

    // Start countdown (recording is already running)
    startCountdown();
}

// Start recording video for current position
function startRecordingPosition() {
    if (state.isRecordingPosition) {
        console.warn('Already recording a position');
        return;
    }

    try {
        console.log(`Starting video recording for position ${state.photoIndex + 1}`);
        state.isRecordingPosition = true;

        // Capture stream from live canvas (camera feed)
        const liveStream = DOM.liveCanvas.captureStream(30); // 30 FPS
        state.positionStreams[state.photoIndex] = liveStream;

        // Determine mime type
        let mimeType = 'video/webm';
        if (MediaRecorder.isTypeSupported('video/mp4')) {
            mimeType = 'video/mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
            mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
            mimeType = 'video/webm';
        }

        // Create MediaRecorder for this position
        const recorder = new MediaRecorder(liveStream, {
            mimeType: mimeType,
            videoBitsPerSecond: 2500000 // 2.5 Mbps
        });

        const chunks = [];
        
        recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                chunks.push(e.data);
            }
        };

        recorder.onstop = () => {
            const videoBlob = new Blob(chunks, { type: mimeType });
            state.videoSegments[state.photoIndex] = videoBlob;
            console.log(`Video segment ${state.photoIndex + 1} recorded:`, (videoBlob.size / 1024 / 1024).toFixed(2), 'MB');
            state.isRecordingPosition = false;
            // Stop live preview animation
            if (state.previewAnimationId) {
                cancelAnimationFrame(state.previewAnimationId);
                state.previewAnimationId = null;
            }
        };

        recorder.onerror = (e) => {
            console.error(`Error recording position ${state.photoIndex + 1}:`, e);
            state.isRecordingPosition = false;
            if (state.previewAnimationId) {
                cancelAnimationFrame(state.previewAnimationId);
                state.previewAnimationId = null;
            }
        };

        // Start recording
        recorder.start(100); // Request data every 100ms
        state.positionRecorders[state.photoIndex] = recorder;
        
        console.log(`Recording started for position ${state.photoIndex + 1}`);
        
        // Start live preview animation - show motion on strip in real-time
        startLivePreview();

    } catch (error) {
        console.error('Error starting position recording:', error);
        state.isRecordingPosition = false;
    }
}

// Live preview - continuously draw live camera feed to strip canvas
function startLivePreview() {
    const template = TEMPLATES['custom'] || TEMPLATES['retro']; // Use custom template
    const useTemplateImage = state.templateImageLoaded && state.templateImage;
    
    // Photo dimensions on strip
    const destW = 650;
    const destH = 450;
    const startY = 240;
    const gap = 35;
    const x = (CONFIG.PRINT_W - destW) / 2;
    const currentY = startY + state.photoIndex * (destH + gap);
    
    function drawLivePreview() {
        if (!state.isRecordingPosition || state.photoIndex >= state.totalShots) {
            if (state.previewAnimationId) {
                cancelAnimationFrame(state.previewAnimationId);
                state.previewAnimationId = null;
            }
            return;
        }
        
        // Redraw template
        initStrip();
        
        // Draw all previously captured positions (static thumbnails)
        for (let i = 0; i < state.photoIndex; i++) {
            if (state.capturedPhotos[i]) {
                addToStrip(state.capturedPhotos[i], i);
            }
        }
        
        // Draw live camera feed for current position (showing motion)
        try {
            // Draw borders if not using template image
            if (!useTemplateImage) {
                CTX.strip.fillStyle = '#1a1a1a';
                CTX.strip.fillRect(x - 20, currentY - 20, destW + 40, destH + 40);
                
                CTX.strip.strokeStyle = template.borderColor;
                CTX.strip.lineWidth = 3;
                CTX.strip.strokeRect(x - 15, currentY - 15, destW + 30, destH + 30);
                
                CTX.strip.strokeStyle = template.accentColor;
                CTX.strip.lineWidth = 1;
                CTX.strip.strokeRect(x - 10, currentY - 10, destW + 20, destH + 20);
            }
            
            // Draw live camera feed (includes template overlay from liveCanvas)
            // This ensures template is visible on strip preview during recording
            CTX.strip.drawImage(
                DOM.liveCanvas, // Contains: camera feed + template overlay
                0,
                0,
                CONFIG.VIDEO_W,
                CONFIG.VIDEO_H,
                x,
                currentY,
                destW,
                destH
            );
        } catch (e) {
            console.warn('Error drawing live preview:', e);
        }
        
        // Continue animation
        state.previewAnimationId = requestAnimationFrame(drawLivePreview);
    }
    
    // Start animation
    drawLivePreview();
}

// Stop recording video for current position
function stopRecordingPosition() {
    const recorder = state.positionRecorders[state.photoIndex];
    if (recorder && recorder.state === 'recording') {
        console.log(`Stopping video recording for position ${state.photoIndex + 1}`);
        recorder.stop();
    }
    state.isRecordingPosition = false;
    
    // Stop live preview animation
    if (state.previewAnimationId) {
        cancelAnimationFrame(state.previewAnimationId);
        state.previewAnimationId = null;
    }
}

function startCountdown() {
    let count = CONFIG.COUNTDOWN_TIME;
    DOM.countdownEl.style.display = 'block';
    DOM.countdownEl.innerText = count;

    const timer = setInterval(() => {
        count--;
        if (count > 0) {
            DOM.countdownEl.innerText = count;
        } else {
            clearInterval(timer);
            DOM.countdownEl.style.display = 'none';
            takeShot();
        }
    }, 1000);
}

function takeShot() {
    // Flash effect
    DOM.flashEffect.classList.add('active');
    setTimeout(() => {
        DOM.flashEffect.classList.remove('active');
    }, CONFIG.FLASH_DURATION);

    // Capture current frame from live canvas
    const photoCanvas = document.createElement('canvas');
    photoCanvas.width = CONFIG.VIDEO_W;
    photoCanvas.height = CONFIG.VIDEO_H;
    const photoCtx = photoCanvas.getContext('2d');
    
    // Draw current live canvas (camera feed) to photo canvas
    try {
        photoCtx.drawImage(DOM.liveCanvas, 0, 0, CONFIG.VIDEO_W, CONFIG.VIDEO_H);
        console.log(`Photo ${state.photoIndex + 1} captured: ${photoCanvas.width}x${photoCanvas.height}`);
    } catch (e) {
        console.error('Error capturing photo:', e);
    }
    
    // Store captured photo
    state.capturedPhotos[state.photoIndex] = photoCanvas;
    
    // Add photo to strip (shows in preview)
    addToStrip(photoCanvas, state.photoIndex);
    
    // Force preview update
    if (DOM.stripCanvas) {
        DOM.stripCanvas.style.display = 'block';
        DOM.stripCanvas.style.visibility = 'visible';
        DOM.stripCanvas.style.opacity = '1';
    }
    
    console.log(`Photo ${state.photoIndex + 1} captured (recording continues)`);

    state.photoIndex++;
    updatePreviewCount();

    // Continue to next position (recording continues)
    setTimeout(() => {
        runSequence();
    }, CONFIG.SHOT_DELAY);
}

// Removed: recordVideoClip and createHiddenVideoElement
// Now using simpler approach: static photos + 10-second video after all captures

function updatePreviewCount() {
    DOM.previewCount.textContent = `${state.photoIndex}/${state.totalShots}`;
    
    // Force preview canvas to update
    if (DOM.stripCanvas) {
        // Trigger a redraw by accessing the canvas
        const ctx = DOM.stripCanvas.getContext('2d');
        // Force browser to update the canvas display
        DOM.stripCanvas.style.display = 'block';
        DOM.stripCanvas.style.visibility = 'visible';
    }
}

function finishSession() {
    state.isRecording = false;

    // Show modal with processing status
    DOM.modal.style.display = 'flex';
    showProcessingStatus('Stopping recording and processing video...');

    // Stop continuous recording (this captures the full session)
    if (state.sessionRecorder && state.sessionRecorder.state === 'recording') {
        console.log('🛑 Stopping continuous session recording...');
        console.log('📹 Recording captured: Full session from start to finish');
        state.sessionRecorder.stop();
        
        // Update status
        if (DOM.recordingStatusText) {
            DOM.recordingStatusText.textContent = 'Processing session video...';
        }
    } else {
        console.warn('⚠️ Session recorder not found or not recording');
    }

    // Wait for recording to stop and blob to be created, then create final video
    // Give it enough time for the recorder.onstop event to fire and create the blob
    setTimeout(() => {
        createFinalVideo();
    }, 2000);
}

function showProcessingStatus(message) {
    const processingStatus = document.getElementById('processingStatus');
    const processingProgress = document.getElementById('processingProgress');
    const qrSection = document.getElementById('qr-section');
    
    if (processingStatus && processingProgress) {
        processingStatus.style.display = 'block';
        processingProgress.textContent = message;
        if (qrSection) {
            qrSection.style.display = 'none';
        }
        console.log('Processing status:', message);
    }
}

function hideProcessingStatus() {
    const processingStatus = document.getElementById('processingStatus');
    const qrSection = document.getElementById('qr-section');
    
    if (processingStatus) {
        processingStatus.style.display = 'none';
        if (qrSection) {
            qrSection.style.display = 'block';
        }
    }
}

// Create motion video strip with all 3 video segments playing simultaneously
async function createMotionVideoStrip() {
    console.log('Creating motion video strip...');
    showProcessingStatus('Combining video segments...');

    try {
        // Check if we have all 3 video segments
        if (!state.videoSegments || state.videoSegments.length !== 3) {
            console.warn('Not all video segments recorded, using fallback');
            // Fallback to static photos
            createFinalVideo();
            return;
        }

        // Create video elements for each segment
        const videoPromises = state.videoSegments.map((blob, index) => {
            return new Promise((resolve, reject) => {
    const video = document.createElement('video');
                video.src = URL.createObjectURL(blob);
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    
                let metadataLoaded = false;
                
                video.onloadedmetadata = () => {
                    if (!metadataLoaded) {
                        metadataLoaded = true;
                        video.currentTime = 0;
                        state.videoElements[index] = video;
                        console.log(`Video ${index + 1} loaded, duration: ${video.duration}s`);
                        resolve(video);
                    }
                };
                
                // Handle video loop
                video.addEventListener('ended', () => {
                    video.currentTime = 0;
                    video.play();
                });
                
                // Handle timeupdate to ensure looping
                video.addEventListener('timeupdate', () => {
                    if (video.duration > 0 && video.currentTime >= video.duration - 0.1) {
                        video.currentTime = 0;
                    }
                });
                
                video.onerror = (e) => {
                    console.error(`Error loading video ${index + 1}:`, e);
                    reject(e);
                };
            });
        });

        // Wait for all videos to load
        await Promise.all(videoPromises);
        console.log('All video segments loaded and ready');
        
        // Reset all videos to start and prepare for synchronized playback
        state.videoElements.forEach(video => {
            video.currentTime = 0;
            video.pause();
        });

        // Find the longest video duration
        const durations = state.videoElements.map(v => v.duration);
        const maxDuration = Math.max(...durations.filter(d => isFinite(d) && d > 0));
        const finalDuration = maxDuration > 0 ? Math.min(maxDuration, 10) : 10; // Cap at 10 seconds

        console.log(`Final video duration: ${finalDuration} seconds`);

        // Create composite canvas for recording
        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = CONFIG.PRINT_W;
        compositeCanvas.height = CONFIG.PRINT_H;
        const compositeCtx = compositeCanvas.getContext('2d');

        // Initialize strip with template
        initStrip();
        const template = TEMPLATES[DOM.templateSelect.value];
        const useTemplateImage = state.templateImageLoaded && state.templateImage;

        // Draw template on composite canvas
        if (useTemplateImage && state.templateImage) {
            const templateImg = state.templateImage;
            const templateAspect = templateImg.width / templateImg.height;
            const stripAspect = CONFIG.PRINT_W / CONFIG.PRINT_H;
            
            let drawWidth, drawHeight, drawX, drawY;
            if (templateAspect > stripAspect) {
                drawHeight = CONFIG.PRINT_H;
                drawWidth = drawHeight * templateAspect;
                drawX = (CONFIG.PRINT_W - drawWidth) / 2;
                drawY = 0;
            } else {
                drawWidth = CONFIG.PRINT_W;
                drawHeight = drawWidth / templateAspect;
                drawX = 0;
                drawY = (CONFIG.PRINT_H - drawHeight) / 2;
            }
            compositeCtx.drawImage(templateImg, drawX, drawY, drawWidth, drawHeight);
        } else {
            // Draw code-based template
            compositeCtx.fillStyle = '#0a0a0a';
            compositeCtx.fillRect(0, 0, CONFIG.PRINT_W, CONFIG.PRINT_H);
            compositeCtx.fillStyle = template.headerBg;
            compositeCtx.fillRect(0, 0, CONFIG.PRINT_W, 220);
        }

        // Video dimensions on strip
        const destW = 650;
        const destH = 450;
        const startY = 240;
        const gap = 35;

        // Start recording the composite canvas
        showProcessingStatus('Recording motion video strip...');
        
        const compositeStream = compositeCanvas.captureStream(30); // 30 FPS
        let mimeType = 'video/webm';
        if (MediaRecorder.isTypeSupported('video/mp4')) {
            mimeType = 'video/mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
            mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
            mimeType = 'video/webm';
        }

        const finalRecorder = new MediaRecorder(compositeStream, {
            mimeType: mimeType,
            videoBitsPerSecond: 2500000
        });

        const videoChunks = [];
        finalRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                videoChunks.push(e.data);
            }
        };

        finalRecorder.onstop = () => {
            const fileExtension = mimeType.includes('mp4') ? 'mp4' : 'webm';
            const finalVideoBlob = new Blob(videoChunks, { type: mimeType });
            console.log(`Motion video strip created (${fileExtension}):`, (finalVideoBlob.size / 1024 / 1024).toFixed(2), 'MB');
            
            // Clean up video elements
            state.videoElements.forEach(video => {
                video.pause();
                URL.revokeObjectURL(video.src);
            });
            
            showProcessingStatus('Finalizing video...');
    setTimeout(() => {
                processResultsWithVideo(finalVideoBlob, fileExtension);
    }, 500);
        };

        finalRecorder.onerror = (e) => {
            console.error('Error recording composite video:', e);
            showProcessingStatus('Video recording failed! Using fallback...');
            setTimeout(() => {
                createFinalVideo(); // Fallback to static photos
            }, 2000);
        };

        // Start recording
        finalRecorder.start(100);

        // Animation loop to draw videos on composite canvas
        const startTime = Date.now();
        const duration = finalDuration * 1000; // Convert to milliseconds

        function drawFrame() {
            const elapsed = Date.now() - startTime;
            
            if (elapsed < duration) {
                // Clear and redraw template
                if (useTemplateImage && state.templateImage) {
                    const templateImg = state.templateImage;
                    const templateAspect = templateImg.width / templateImg.height;
                    const stripAspect = CONFIG.PRINT_W / CONFIG.PRINT_H;
                    
                    let drawWidth, drawHeight, drawX, drawY;
                    if (templateAspect > stripAspect) {
                        drawHeight = CONFIG.PRINT_H;
                        drawWidth = drawHeight * templateAspect;
                        drawX = (CONFIG.PRINT_W - drawWidth) / 2;
                        drawY = 0;
                    } else {
                        drawWidth = CONFIG.PRINT_W;
                        drawHeight = drawWidth / templateAspect;
                        drawX = 0;
                        drawY = (CONFIG.PRINT_H - drawHeight) / 2;
                    }
                    compositeCtx.drawImage(templateImg, drawX, drawY, drawWidth, drawHeight);
                } else {
                    compositeCtx.fillStyle = '#0a0a0a';
                    compositeCtx.fillRect(0, 0, CONFIG.PRINT_W, CONFIG.PRINT_H);
                    compositeCtx.fillStyle = template.headerBg;
                    compositeCtx.fillRect(0, 0, CONFIG.PRINT_W, 220);
                }

                // Draw each video in its position
                state.videoElements.forEach((video, index) => {
                    if (video && video.readyState >= 2) { // HAVE_CURRENT_DATA or higher
                        const x = (CONFIG.PRINT_W - destW) / 2;
                        const y = startY + index * (destH + gap);

                        // Draw borders if not using template image
                        if (!useTemplateImage) {
                            compositeCtx.fillStyle = '#1a1a1a';
                            compositeCtx.fillRect(x - 20, y - 20, destW + 40, destH + 40);
                            
                            compositeCtx.strokeStyle = template.borderColor;
                            compositeCtx.lineWidth = 3;
                            compositeCtx.strokeRect(x - 15, y - 15, destW + 30, destH + 30);
                            
                            compositeCtx.strokeStyle = template.accentColor;
                            compositeCtx.lineWidth = 1;
                            compositeCtx.strokeRect(x - 10, y - 10, destW + 20, destH + 20);
                        }

                        // Draw video frame
                        try {
                            compositeCtx.drawImage(video, x, y, destW, destH);
                        } catch (e) {
                            console.warn(`Error drawing video ${index + 1}:`, e);
                        }
                    }
                });

                requestAnimationFrame(drawFrame);
            } else {
                // Stop recording
                if (finalRecorder.state === 'recording') {
                    finalRecorder.stop();
                }
            }
        }

        // Start all videos simultaneously
        const playPromises = state.videoElements.map(video => {
            video.currentTime = 0;
            return video.play();
        });
        
        await Promise.all(playPromises);
        console.log('All videos started playing');
        
        // Start animation loop
        drawFrame();

    } catch (error) {
        console.error('Error creating motion video strip:', error);
        showProcessingStatus('Motion video failed! Using static photos...');
        setTimeout(() => {
            createFinalVideo(); // Fallback to static photos
        }, 2000);
    }
}

// Create final video from session recording
async function createFinalVideo() {
    console.log('Creating final video from session recording...');
    showProcessingStatus('Processing video...');

    try {
        // PRIORITY: Use the full session video (continuous recording from start to finish)
        if (state.sessionVideo && state.sessionVideo.size > 0) {
            console.log('✅ Using full session recording:', (state.sessionVideo.size / 1024 / 1024).toFixed(2), 'MB');
            console.log('📹 This video contains the complete session from start to finish');
            
            // Determine file extension
            const fileExtension = state.sessionVideo.type.includes('mp4') ? 'mp4' : 'webm';
            
            // Process results with session video (full session recording)
            processResultsWithVideo(state.sessionVideo, fileExtension);
            return;
        }

        // If session video not ready yet, wait a bit more
        if (!state.sessionVideo) {
            console.log('⏳ Session video not ready yet, waiting...');
            showProcessingStatus('Waiting for video to process...');
            setTimeout(() => {
                if (state.sessionVideo && state.sessionVideo.size > 0) {
                    const fileExtension = state.sessionVideo.type.includes('mp4') ? 'mp4' : 'webm';
                    processResultsWithVideo(state.sessionVideo, fileExtension);
                } else {
                    console.warn('Session video still not available, using fallback');
                    createFinalVideoFallback();
                }
            }, 2000);
            return;
        }

        // Fallback: Record strip canvas for 10 seconds (if session video fails)
        console.log('No session video available, using fallback...');
        createFinalVideoFallback();
    } catch (error) {
        console.error('Error creating final video:', error);
        showProcessingStatus('Error creating video. Using fallback...');
        setTimeout(() => {
            createFinalVideoFallback();
        }, 1000);
    }
}

// Fallback: Create video from strip canvas (only if session recording fails)
async function createFinalVideoFallback() {
    console.log('Creating fallback video from strip canvas...');
    showProcessingStatus('Recording 10-second video...');

    try {
        // The strip canvas already has all 3 photos with template
        // We just need to record it for 10 seconds
        
        // Ensure strip canvas is ready and visible
        if (!DOM.stripCanvas) {
            throw new Error('Strip canvas not found');
        }
        
        // Make sure strip canvas has content
        if (DOM.stripCanvas.width === 0 || DOM.stripCanvas.height === 0) {
            console.warn('Strip canvas has no dimensions, reinitializing...');
            DOM.stripCanvas.width = CONFIG.PRINT_W;
            DOM.stripCanvas.height = CONFIG.PRINT_H;
            initStrip(); // Reinitialize strip
        }
        
        // Create a MediaRecorder for the strip canvas
        let stripStream;
        try {
            stripStream = DOM.stripCanvas.captureStream(30); // 30 FPS
            if (!stripStream) {
                throw new Error('Failed to capture stream from canvas');
            }
        } catch (streamError) {
            console.error('Error capturing stream:', streamError);
            throw new Error('Failed to create video stream from canvas');
        }
        
        // Try MP4 first, fallback to webm
        let mimeType = 'video/webm';
        if (MediaRecorder.isTypeSupported('video/mp4')) {
            mimeType = 'video/mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
            mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
            mimeType = 'video/webm';
        }
        
        console.log('Using mime type:', mimeType);
        console.log('Strip canvas size:', DOM.stripCanvas.width, 'x', DOM.stripCanvas.height);
        
        const videoRecorder = new MediaRecorder(stripStream, { 
            mimeType: mimeType,
            videoBitsPerSecond: 2500000 // 2.5 Mbps for good quality
        });
        const videoChunks = [];

        videoRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                videoChunks.push(e.data);
                console.log('Video chunk received:', e.data.size, 'bytes');
            }
        };

        videoRecorder.onstop = () => {
            console.log('Video recorder stopped. Chunks:', videoChunks.length);
            
            if (videoChunks.length === 0) {
                console.error('No video chunks recorded');
                showProcessingStatus('Video recording failed! Using fallback...');
        setTimeout(() => {
            hideProcessingStatus();
            processResults();
        }, 2000);
        return;
    }

            // Determine file extension based on mime type
            const fileExtension = mimeType.includes('mp4') ? 'mp4' : 'webm';
            const finalVideoBlob = new Blob(videoChunks, { type: mimeType });
            const videoSizeMB = (finalVideoBlob.size / 1024 / 1024).toFixed(2);
            console.log(`10-second video created (${fileExtension}):`, videoSizeMB, 'MB');
            
            // Check if video is too small (might be 0 seconds)
            if (finalVideoBlob.size < 1000) {
                console.error('Video file too small, likely 0 seconds');
                showProcessingStatus('Video recording failed (0 seconds)! Using fallback...');
                setTimeout(() => {
                    hideProcessingStatus();
                    processResults();
                }, 2000);
                return;
            }
            
            showProcessingStatus('Finalizing video...');
            
            // Process results with the final video
            setTimeout(() => {
                processResultsWithVideo(finalVideoBlob, fileExtension);
            }, 500);
        };

        videoRecorder.onerror = (e) => {
            console.error('Error recording video:', e);
            showProcessingStatus('Video recording failed! Using fallback...');
            setTimeout(() => {
                hideProcessingStatus();
                processResults();
            }, 2000);
        };

        // Ensure strip canvas is visible and ready before recording
        DOM.stripCanvas.style.display = 'block';
        DOM.stripCanvas.style.visibility = 'visible';
        DOM.stripCanvas.style.position = 'relative';
        
        // Redraw the strip with template
        initStrip();
        
        // Redraw all captured photos on the strip
        if (state.capturedPhotos && state.capturedPhotos.length > 0) {
            console.log(`Redrawing ${state.capturedPhotos.length} photos on strip`);
            state.capturedPhotos.forEach((photoCanvas, index) => {
                if (photoCanvas && photoCanvas.width > 0 && photoCanvas.height > 0) {
                    addToStrip(photoCanvas, index);
                    console.log(`Photo ${index + 1} redrawn on strip`);
                } else {
                    console.warn(`Photo ${index + 1} canvas is invalid`);
                }
            });
        } else {
            console.warn('No captured photos found! Photo index:', state.photoIndex);
        }
        
        // Force canvas update
        const ctx = DOM.stripCanvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, 1, 1);
        
        // Wait a moment for canvas to be ready
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Start recording
        try {
            videoRecorder.start(100); // Request data every 100ms
            console.log('Video recorder started, state:', videoRecorder.state);
        } catch (startError) {
            console.error('Error starting video recorder:', startError);
            throw startError;
        }

        // Record for exactly 10 seconds
        const startTime = Date.now();
        const duration = 10000; // 10 seconds
        
        // Keep strip canvas updated during recording
        let animationFrameId;
        let stopTimeout;
        let lastStatusUpdate = 0;
        let frameCount = 0;
        
        function updateProgress() {
            const elapsed = Date.now() - startTime;
            const progress = Math.round((elapsed / duration) * 100);
            frameCount++;
            
            // Update status every 500ms to avoid spam
            if (elapsed - lastStatusUpdate >= 500) {
                showProcessingStatus(`Recording video... ${progress}%`);
                lastStatusUpdate = elapsed;
            }
            
            // Keep canvas visible and ensure it's being captured
            if (elapsed < duration) {
                // Continuously redraw the strip to keep stream active
                // This ensures MediaRecorder captures the content
                const ctx = DOM.stripCanvas.getContext('2d');
                
                // Redraw every 5 frames (about 6 times per second at 30fps)
                if (frameCount % 5 === 0) {
                    // Redraw template
        initStrip();
                    // Redraw all photos
                    if (state.capturedPhotos && state.capturedPhotos.length > 0) {
                        state.capturedPhotos.forEach((photoCanvas, index) => {
                            if (photoCanvas && photoCanvas.width > 0 && photoCanvas.height > 0) {
                                addToStrip(photoCanvas, index);
                            }
                        });
                    }
                }
                
                animationFrameId = requestAnimationFrame(updateProgress);
            }
        }
        
        // Also listen for dataavailable to ensure chunks are being recorded
        let chunkCount = 0;
        const originalOndataavailable = videoRecorder.ondataavailable;
        videoRecorder.ondataavailable = (e) => {
            if (originalOndataavailable) {
                originalOndataavailable(e);
            }
            if (e.data && e.data.size > 0) {
                chunkCount++;
                console.log(`Chunk ${chunkCount} received:`, e.data.size, 'bytes');
            }
        };
        
        // Set timeout to stop recording after exactly 10 seconds
        stopTimeout = setTimeout(() => {
            console.log('10 seconds elapsed, stopping recorder...');
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            
            if (videoRecorder.state === 'recording') {
                console.log('Stopping video recorder after 10 seconds...');
                try {
                    videoRecorder.stop();
                } catch (stopError) {
                    console.error('Error stopping recorder:', stopError);
                }
            } else {
                console.warn('Video recorder state:', videoRecorder.state);
            }
            console.log('10-second video recording complete');
        }, duration);
        
        // Start progress updates
        updateProgress();

    } catch (error) {
        console.error('Error creating video:', error);
        showProcessingStatus('Video creation failed! Using fallback...');
        setTimeout(() => {
            hideProcessingStatus();
            processResults();
        }, 2000);
    }
}

async function recordFinalCompositeVideo() {
    console.log('Recording final composite video...');
    showProcessingStatus('Recording final video (10 seconds)...');

    // Create a MediaRecorder for the final strip canvas
    const stripStream = DOM.stripCanvas.captureStream(30);
    
    // Check codec support
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
        ? 'video/webm;codecs=vp9' 
        : 'video/webm';
    
    state.finalVideoRecorder = new MediaRecorder(stripStream, { mimeType });

    const finalVideoChunks = [];

    state.finalVideoRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            finalVideoChunks.push(e.data);
        }
    };

    state.finalVideoRecorder.onstop = () => {
        // Create final video blob
        const finalVideoBlob = new Blob(finalVideoChunks, { type: 'video/webm' });
        console.log('Final composite video created:', finalVideoBlob.size, 'bytes');
        
        showProcessingStatus('Finalizing video...');
        
        // Process results with the final video
        setTimeout(() => {
            processResultsWithVideo(finalVideoBlob);
        }, 1000);
    };

    state.finalVideoRecorder.onerror = (e) => {
        console.error('Error recording final video:', e);
        showProcessingStatus('Recording failed! Using fallback...');
        setTimeout(() => {
            hideProcessingStatus();
            processResults();
        }, 2000);
    };

    // Start recording the final video
    state.finalVideoRecorder.start(100); // Request data every 100ms

    // Render videos onto strip canvas for 10 seconds (extended from 5)
    const startTime = Date.now();
    const duration = 10000; // 10 seconds (changed from 5000)
    let frameCount = 0;

    function renderFrame() {
        const elapsed = Date.now() - startTime;
        frameCount++;
        
        if (elapsed < duration) {
            // Update progress
            const progress = Math.round((elapsed / duration) * 100);
            showProcessingStatus(`Recording final video... ${progress}%`);
            
            // Clear and reinitialize strip
            initStrip();
            
            // Render each video clip onto the strip
            state.hiddenVideoElements.forEach((video, index) => {
                if (video.readyState >= 2 && !video.paused) {
                    renderVideoToStrip(video, index);
                }
            });
            
            requestAnimationFrame(renderFrame);
        } else {
            // Stop recording after 10 seconds
            console.log(`Final video recording complete. Rendered ${frameCount} frames.`);
            
            if (state.finalVideoRecorder.state === 'recording') {
                state.finalVideoRecorder.stop();
            }
            
            // Stop all video playback
            state.hiddenVideoElements.forEach(video => {
                video.pause();
            });
        }
    }

    // Start the rendering loop
    renderFrame();
}

function renderVideoToStrip(video, index) {
    const template = TEMPLATES['custom'] || TEMPLATES['retro']; // Use custom template
    const destW = 650;
    const destH = 450;
    const startY = 240;
    const gap = 35;
    const x = (CONFIG.PRINT_W - destW) / 2;
    const y = startY + index * (destH + gap);

    // Retro photo frame background
    CTX.strip.fillStyle = '#1a1a1a';
    CTX.strip.fillRect(x - 20, y - 20, destW + 40, destH + 40);
    
    // Pixel border around photo
    CTX.strip.strokeStyle = template.borderColor;
    CTX.strip.lineWidth = 3;
    CTX.strip.strokeRect(x - 15, y - 15, destW + 30, destH + 30);
    
    // Inner accent border
    CTX.strip.strokeStyle = template.accentColor;
    CTX.strip.lineWidth = 1;
    CTX.strip.strokeRect(x - 10, y - 10, destW + 20, destH + 20);

    // Draw the playing video onto the strip
    if (video.videoWidth > 0 && video.videoHeight > 0) {
        CTX.strip.drawImage(video, x, y, destW, destH);
    }

    // Retro photo number with pixel styling
    CTX.strip.fillStyle = template.borderColor;
    CTX.strip.fillRect(x + destW - 40, y - 15, 30, 20);
    CTX.strip.fillStyle = '#0a0a0a';
    CTX.strip.font = 'bold 14px monospace';
    CTX.strip.textAlign = 'center';
    CTX.strip.fillText(`${index + 1}`, x + destW - 25, y - 2);
    
    // Reset text alignment
    CTX.strip.textAlign = 'center';
}

function processResultsWithVideo(finalVideoBlob, fileExtension = 'webm') {
    console.log('Processing results with final video...');
    showProcessingStatus('Uploading to Supabase cloud...');

    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fileName = `photobooth-${timestamp}.${fileExtension}`;

    // Store video blob for download
    state.downloadVideoBlob = finalVideoBlob;
    state.downloadFileName = fileName;
    state.downloadFileExtension = fileExtension;

    // Create local blob URL for immediate download
    const videoURL = URL.createObjectURL(finalVideoBlob);
    setupDownloadLink(videoURL, fileName, fileExtension, finalVideoBlob);

    // Upload to Supabase (pass fileExtension)
    uploadToSupabaseCloud(finalVideoBlob, fileName, fileExtension);
}

// Setup download link with mobile/iOS support
function setupDownloadLink(videoURL, fileName, fileExtension, videoBlob) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Store for later use
    state.downloadVideoURL = videoURL;
    state.downloadVideoBlob = videoBlob;
    
    if (isIOS) {
        // iOS: Show help text and use different approach
    DOM.downloadLink.href = videoURL;
    DOM.downloadLink.download = fileName;
        DOM.downloadLink.textContent = `📱 Download Video (${fileExtension.toUpperCase()})`;
        DOM.downloadLink.target = '_blank'; // Open in new tab for iOS
        
        // Show iOS help
        const iosHelp = document.getElementById('iosDownloadHelp');
        if (iosHelp) {
            iosHelp.style.display = 'block';
        }
    } else if (isMobile) {
        // Android/Other mobile: Try download, fallback to open
        DOM.downloadLink.href = videoURL;
        DOM.downloadLink.download = fileName;
        DOM.downloadLink.textContent = `⬇ Download Video (${fileExtension.toUpperCase()})`;
    } else {
        // Desktop: Standard download
        DOM.downloadLink.href = videoURL;
        DOM.downloadLink.download = fileName;
        DOM.downloadLink.textContent = `⬇ Download Video (${fileExtension.toUpperCase()})`;
    }
}

async function uploadToSupabaseCloud(videoBlob, fileName, fileExtension = null) {
    try {
        // Extract fileExtension from fileName if not provided
        if (!fileExtension) {
            fileExtension = fileName.includes('.mp4') ? 'mp4' : 
                           fileName.includes('.webm') ? 'webm' : 
                           videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
        }
        
        console.log('Starting Supabase upload...');
        showProcessingStatus('Uploading video to cloud...');

        // Dynamically import Supabase config
        let uploadVideoToSupabase, saveSessionMetadata;
        try {
            // Try ES6 module import first
            const supabaseModule = await import('./supabase-config.js');
            uploadVideoToSupabase = supabaseModule.uploadVideoToSupabase || supabaseModule.default?.uploadVideoToSupabase;
            saveSessionMetadata = supabaseModule.saveSessionMetadata || supabaseModule.default?.saveSessionMetadata;
            
            // Fallback to global window object if module import didn't work
            if (!uploadVideoToSupabase && typeof window !== 'undefined' && window.supabaseConfig) {
                uploadVideoToSupabase = window.supabaseConfig.uploadVideoToSupabase;
                saveSessionMetadata = window.supabaseConfig.saveSessionMetadata;
            }
            
            if (!uploadVideoToSupabase) {
                throw new Error('Supabase functions not found');
            }
        } catch (importError) {
            console.warn('Supabase config import error:', importError);
            // Try global fallback
            if (typeof window !== 'undefined' && window.supabaseConfig) {
                uploadVideoToSupabase = window.supabaseConfig.uploadVideoToSupabase;
                saveSessionMetadata = window.supabaseConfig.saveSessionMetadata;
                console.log('Using global Supabase config');
            } else {
                throw new Error('Supabase not configured. Please set up your Supabase credentials in supabase-config.js');
            }
        }

        // Upload video with progress updates
        showProcessingStatus('Uploading video to cloud (this may take a moment)...');
        const cloudURL = await uploadVideoToSupabase(videoBlob, fileName);
        console.log('✅ Cloud upload successful:', cloudURL);

        showProcessingStatus('Saving session data...');

        // Save session metadata (don't fail if this errors)
        try {
        await saveSessionMetadata({
            videoUrl: cloudURL,
            fileName: fileName,
            templateStyle: state.selectedTemplate || 'template.png',
            photoCount: state.totalShots,
            fileSize: videoBlob.size,
            deviceInfo: navigator.userAgent
        });
        } catch (metaError) {
            console.warn('Metadata save failed (non-critical):', metaError);
        }

        showProcessingStatus('Generating QR code...');

        // Store cloud URL in state for QR code and download
        state.cloudVideoURL = cloudURL;

        // Generate QR code with cloud URL (works on all devices)
        const qrContainer = document.getElementById('qrcode');
        if (qrContainer) {
            qrContainer.innerHTML = '';
            try {
            new QRCode(qrContainer, {
            text: cloudURL,
                width: 200,
                height: 200,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H,
        });
                console.log('✅ QR code generated with cloud URL:', cloudURL);
            } catch (qrError) {
                console.error('QR code generation error:', qrError);
                // Fallback: show URL as text
                qrContainer.innerHTML = `<p style="word-break: break-all; font-size: 10px; padding: 10px;">${cloudURL}</p>`;
            }
        }

        // Update download link to cloud URL with proper download handler
        setupCloudDownloadLink(cloudURL, fileName, fileExtension);

        // Prepare print image with template included
        await preparePrintImage();

        // Hide processing status and show results
        setTimeout(() => {
            hideProcessingStatus();
            
            // Trigger print after image loads
            setTimeout(() => {
                window.print();
            }, 500);
        }, 1000);

        // Clean up video elements and URLs
        setTimeout(() => {
            cleanupVideoElements();
        }, 2000);

    } catch (error) {
        console.error('Cloud upload failed:', error);
        
        // Check if it's a configuration error
        if (error.message.includes('not configured') || error.message.includes('YOUR_PROJECT_ID')) {
            showProcessingStatus('Supabase not configured. Using local download...');
        } else {
        showProcessingStatus('Cloud upload failed! Using local download...');
        }
        
        setTimeout(async () => {
            // Fallback to local download with proper file extension
            const fallbackFileExtension = fileExtension || (videoBlob.type.includes('mp4') ? 'mp4' : 'webm');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const downloadFileName = `photobooth-${timestamp}.${fallbackFileExtension}`;
            
            // Store for download
            state.downloadVideoBlob = videoBlob;
            state.downloadFileName = downloadFileName;
            state.downloadFileExtension = fallbackFileExtension;
            
            const localURL = URL.createObjectURL(videoBlob);
            state.downloadVideoURL = localURL;
            
            // Setup download link for local file
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (isIOS) {
                DOM.downloadLink.href = localURL;
                DOM.downloadLink.target = '_blank';
                DOM.downloadLink.download = '';
                DOM.downloadLink.textContent = '📱 Open Video (Local)';
                DOM.downloadLink.onclick = (e) => {
                    e.preventDefault();
                    downloadVideoForIOS(videoBlob, downloadFileName);
                    return false;
                };
            } else {
            DOM.downloadLink.href = localURL;
            DOM.downloadLink.download = downloadFileName;
            DOM.downloadLink.textContent = '⬇ Download Video (Local)';
            DOM.downloadLink.style.color = '#00a8ff';
                DOM.downloadLink.onclick = isMobile ? (e) => handleVideoDownload(e) : null;
            }
            
            // Generate QR code with local URL (note: blob URLs don't work on mobile)
            const qrContainer = document.getElementById('qrcode');
            if (qrContainer) {
                qrContainer.innerHTML = '';
                try {
                    // For mobile devices, show a message that QR won't work with blob URLs
                    if (isMobile) {
                        qrContainer.innerHTML = `
                            <div style="text-align: center; padding: 20px;">
                                <p style="color: #666; margin-bottom: 10px;">⚠️ Cloud upload failed</p>
                                <p style="color: #666; font-size: 12px;">QR code unavailable for local files on mobile.</p>
                                <p style="color: #666; font-size: 12px;">Please use the download button above.</p>
                            </div>
                        `;
                    } else {
                new QRCode(qrContainer, {
                text: localURL,
                    width: 200,
                    height: 200,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H,
            });
                    }
                } catch (qrError) {
                    console.error('QR code generation error:', qrError);
                    qrContainer.innerHTML = `<p style="word-break: break-all; font-size: 10px; color: #666; padding: 10px;">Local file - Use download button</p>`;
                }
            }

            // Prepare print image with template included
            await preparePrintImage();

            hideProcessingStatus();
            
            // Show modal
            DOM.modal.style.display = 'flex';
            
            // Don't auto-trigger print on mobile devices
            if (!isMobile) {
            setTimeout(() => {
                window.print();
            }, 500);
            }
        }, 2000);
    }
}

function cleanupVideoElements() {
    // Remove hidden video elements and revoke URLs
    state.hiddenVideoElements.forEach((video, index) => {
        if (video.src) {
            URL.revokeObjectURL(video.src);
        }
        video.remove();
    });
    
    // Clear arrays
    state.hiddenVideoElements = [];
    state.videoClips = [];
    state.clipRecorders = [];
    
    console.log('Video elements cleaned up');
}

// ========================================
// RESULTS PROCESSING (FALLBACK)
// ========================================

function processResults() {
    console.log('Using fallback results processing...');
    
    // 1. Process video (original session recording)
    const blob = new Blob(state.recordedChunks, { type: 'video/webm' });
    const vidURL = URL.createObjectURL(blob);
    DOM.downloadLink.href = vidURL;

    // 2. Generate QR code
    const qrContainer = document.getElementById('qrcode');
    if (qrContainer) {
        qrContainer.innerHTML = '';
        new QRCode(qrContainer, {
        text: vidURL,
            width: 200,
            height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H,
    });
    }

    // 3. Prepare print image with template included
    preparePrintImage().then(() => {
    // 4. Show modal
    DOM.modal.style.display = 'flex';

    // 5. Trigger print after image loads
    setTimeout(() => {
        window.print();
    }, 500);
    });
}

// ========================================
// PRINT IMAGE PREPARATION
// ========================================

function preparePrintImage() {
    // The strip canvas already contains all photos with template
    // Just export it for printing with proper sizing
    const imgData = DOM.stripCanvas.toDataURL('image/png', 1.0); // High quality
    
    // Store image data for save function
    state.printImageData = imgData;
    
    // Get print container and clear any duplicates
    const printContainer = document.getElementById('print-image-container');
    if (printContainer) {
        // Clear container to remove any duplicate images
        printContainer.innerHTML = '';
        
        // Create fresh image element (only one)
        const printImg = document.createElement('img');
        printImg.id = 'print-target';
        printImg.src = imgData;
        printImg.alt = 'Photobooth Strip';
        printImg.style.width = '100%';
        printImg.style.height = 'auto';
        printImg.style.display = 'block';
        printContainer.appendChild(printImg);
        
        // Update DOM reference
        DOM.printImg = printImg;
        
        // Verify only one image exists (remove any duplicates)
        const images = printContainer.querySelectorAll('img');
        if (images.length > 1) {
            console.warn('Multiple images detected, removing duplicates');
            images.forEach((img, index) => {
                if (index > 0 || img.id !== 'print-target') {
                    img.remove();
                }
            });
        }
        
        console.log('✅ Print image prepared - only one image in container');
    } else {
        // Fallback: use existing image element
    DOM.printImg.src = imgData;
    }
    
    // Ensure image is loaded before printing
    return new Promise((resolve) => {
        const imgToCheck = DOM.printImg;
        if (imgToCheck.complete && imgToCheck.naturalWidth > 0) {
            resolve();
        } else {
            imgToCheck.onload = () => {
                if (imgToCheck.naturalWidth > 0) {
                    resolve();
                } else {
                    setTimeout(() => resolve(), 100);
                }
            };
            imgToCheck.onerror = () => resolve(); // Continue even if error
        }
    });
}

// ========================================
// SAVE PHOTO LOCALLY
// ========================================

async function savePhotoLocally() {
    try {
        // Get image data from state or regenerate from canvas
        let imageData = state.printImageData;
        
        if (!imageData) {
            // Regenerate from canvas if not stored
            imageData = DOM.stripCanvas.toDataURL('image/png', 1.0);
            state.printImageData = imageData; // Store it
        }
        
        if (!imageData) {
            alert('No photo available to save. Please complete a photo session first.');
            return;
        }
        
        // Create download link
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const fileName = `photobooth-strip-${timestamp}.png`;
        
        // Convert data URL to blob (simpler async method)
        const response = await fetch(imageData);
        const blob = await response.blob();
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        
        // Add to body and trigger download
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        setTimeout(() => {
            if (link.parentNode) {
                document.body.removeChild(link);
            }
            URL.revokeObjectURL(url);
        }, 100);
        
        console.log('✅ Photo saved locally:', fileName);
        
        // Show success message
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            alert('Photo saved! Check your downloads folder.');
        }
        
    } catch (error) {
        console.error('Error saving photo:', error);
        alert('Failed to save photo. Please try again or use the print function.');
    }
}

// ========================================
// PRINT FUNCTION WITH COPIES
// ========================================

function printWithCopies() {
    const copiesSelect = document.getElementById('printCopies');
    const copies = copiesSelect ? parseInt(copiesSelect.value) : 1;
    
    console.log(`Printing ${copies} copies...`);
    
    // Prepare print image
    preparePrintImage().then(() => {
        // Ensure print image container is properly set up
        const printContainer = document.getElementById('print-image-container');
        if (printContainer) {
            // Make sure only one image exists
            const images = printContainer.querySelectorAll('img');
            if (images.length > 1) {
                // Keep only the first one (print-target)
                images.forEach((img, index) => {
                    if (index > 0 || img.id !== 'print-target') {
                        img.remove();
                    }
                });
            }
            
            // Ensure container is visible for print
            printContainer.style.display = 'block';
        }
        
        // Small delay to ensure image is ready
            setTimeout(() => {
            try {
                // Trigger print dialog
                window.print();
            } catch (error) {
                console.error('Print error:', error);
                // Fallback: offer to save instead
                if (confirm('Print failed. Would you like to save the photo instead?')) {
                    savePhotoLocally();
                }
            }
        }, 300);
    }).catch(error => {
        console.error('Error preparing print image:', error);
        // Offer save as fallback
        if (confirm('Failed to prepare print. Would you like to save the photo instead?')) {
            savePhotoLocally();
        }
    });
}

function resetBooth() {
    console.log('🔄 Resetting photobooth...');
    
    // Hide modal
    DOM.modal.style.display = 'none';
    
    // Stop any active continuous recording
    if (state.sessionRecorder && state.sessionRecorder.state === 'recording') {
        console.log('Stopping continuous recording...');
        try {
            state.sessionRecorder.stop();
        } catch (e) {
            console.warn('Error stopping recorder:', e);
        }
    }
    
    // Stop media tracks from recording stream
    if (state.positionStreams && state.positionStreams.length > 0) {
        state.positionStreams.forEach(stream => {
            if (stream) {
                stream.getTracks().forEach(track => {
                    track.stop();
                });
            }
        });
        state.positionStreams = [];
    }
    
    // Reset all state
    state.photoIndex = 0;
    state.recordedChunks = [];
    state.isRecording = false;
    state.sessionStartTime = null;
    state.photoTimestamps = [];
    state.isRecordingClip = false;
    state.capturedPhotos = [];
    state.videoSegments = [];
    state.sessionRecorder = null;
    state.sessionVideo = null;
    state.isRecordingPosition = false;
    
    // Clean up video-related state
    cleanupVideoElements();
    
    // Reset UI elements
    DOM.startBtn.disabled = false;
    DOM.startBtn.innerHTML = '<span class="btn-icon">📸</span> START PHOTO SESSION';
    updatePreviewCount();
    
    // Hide recording progress
    if (DOM.recordingProgress) {
        DOM.recordingProgress.style.display = 'none';
    }
    
    // Hide preview container
    if (DOM.stripPreviewContainer) {
        DOM.stripPreviewContainer.style.display = 'none';
    }
    
    // Clear countdown
    if (DOM.countdownEl) {
        DOM.countdownEl.style.display = 'none';
    }
    
    // Clear and reinitialize the strip canvas with selected template
    initStrip();
    
    // Clear QR code
    const qrContainer = document.getElementById('qrcode');
    if (qrContainer) {
        qrContainer.innerHTML = '';
    }
    
    // Reset download link
    DOM.downloadLink.href = '#';
    DOM.downloadLink.download = '';
    DOM.downloadLink.target = '';
    DOM.downloadLink.style.color = '';
    DOM.downloadLink.onclick = null;
    state.downloadVideoBlob = null;
    state.downloadVideoURL = null;
    state.downloadFileName = null;
    state.downloadFileExtension = null;
    state.cloudVideoURL = null;
    
    // Hide iOS help
    const iosHelp = document.getElementById('iosDownloadHelp');
    if (iosHelp) {
        iosHelp.style.display = 'none';
    }
    DOM.downloadLink.textContent = '⬇ Download Video';
    
    // Clear print image
    DOM.printImg.src = '';
    
    // Clear any preview video
    if (DOM.stripPreviewVideo && DOM.stripPreviewVideo.src) {
        URL.revokeObjectURL(DOM.stripPreviewVideo.src);
        DOM.stripPreviewVideo.src = '';
    }
    
    // Restart smile detection if enabled
    if (state.smileDetectionEnabled && state.cameraReady) {
        setTimeout(() => initSmileDetection(), 1000);
    }
    
    console.log('✅ Booth reset successfully - ready for new session');
}

// ========================================
// SMILE DETECTION
// ========================================

function initSmileDetection() {
    if (!state.smileDetectionEnabled || !state.cameraReady || state.smileDetectionActive) {
        return;
    }

    // Wait a bit for video to be fully ready
    setTimeout(() => {
        if (typeof FaceMesh === 'undefined') {
            console.warn('MediaPipe Face Mesh library not loaded - retrying...');
            // Retry after a delay
            setTimeout(initSmileDetection, 2000);
            return;
        }

        try {
            // Initialize MediaPipe Face Mesh for smile detection
            state.faceMesh = new FaceMesh({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                }
            });

            // Optimized settings for mobile
            state.faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: false, // Faster processing
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            state.faceMesh.onResults(onSmileResults);

            // Initialize camera for smile detection
            if (DOM.rawVideo && DOM.smileDetectionCanvas) {
                const videoWidth = DOM.rawVideo.videoWidth || CONFIG.VIDEO_W;
                const videoHeight = DOM.rawVideo.videoHeight || CONFIG.VIDEO_H;
                
                DOM.smileDetectionCanvas.width = videoWidth;
                DOM.smileDetectionCanvas.height = videoHeight;
                
                // Use requestAnimationFrame for better mobile performance
                let lastFrameTime = 0;
                const targetFPS = 15; // Lower FPS for mobile
                const frameInterval = 1000 / targetFPS;
                
                const processFrame = async (currentTime) => {
                    if (state.isRecording || !state.smileDetectionActive) {
                        return;
                    }
                    
                    if (currentTime - lastFrameTime >= frameInterval) {
                        lastFrameTime = currentTime;
                        
                        if (state.faceMesh && DOM.rawVideo.readyState >= 2) {
                            try {
                                await state.faceMesh.send({ image: DOM.rawVideo });
                            } catch (e) {
                                console.warn('Smile detection frame error:', e);
                            }
                        }
                    }
                    
                    if (state.smileDetectionActive && !state.isRecording) {
                        requestAnimationFrame(processFrame);
                    }
                };
                
                // Start processing frames
                requestAnimationFrame(processFrame);
                
                state.smileDetectionActive = true;
                console.log('✅ Smile detection initialized (mobile optimized)');
                
                // Show smile detection status
                if (DOM.smileDetectionStatus && DOM.smileStatusText) {
                    DOM.smileDetectionStatus.style.display = 'flex';
                    DOM.smileStatusText.textContent = 'Smile at the camera...';
                }
            }
        } catch (error) {
            console.error('Error initializing smile detection:', error);
            if (DOM.smileStatusText) {
                DOM.smileStatusText.textContent = 'Smile detection unavailable';
            }
            // Retry after delay
            setTimeout(() => {
                if (state.smileDetectionEnabled && state.cameraReady) {
                    initSmileDetection();
                }
            }, 3000);
        }
    }, 500);
}

function onSmileResults(results) {
    if (!DOM.smileDetectionCanvas || state.isRecording || !state.smileDetectionActive) {
        return;
    }

    const ctx = DOM.smileDetectionCanvas.getContext('2d');
    ctx.clearRect(0, 0, DOM.smileDetectionCanvas.width, DOM.smileDetectionCanvas.height);

    // Check if face is detected
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const face = results.multiFaceLandmarks[0];
        
        // Face Mesh landmarks for mouth
        // Left corner of mouth: 61, Right corner: 291
        // Top lip: 13, 14, 15, 16, 17
        // Bottom lip: 18, 19, 20, 21, 22
        const leftMouth = face[61];
        const rightMouth = face[291];
        const topLipCenter = face[13];
        const bottomLipCenter = face[18];
        
        // Calculate mouth width and height
        const mouthWidth = Math.abs(leftMouth.x - rightMouth.x) * DOM.smileDetectionCanvas.width;
        const mouthHeight = Math.abs(topLipCenter.y - bottomLipCenter.y) * DOM.smileDetectionCanvas.height;
        
        // Calculate mouth opening (smile detection)
        // When smiling, mouth width increases and height may increase slightly
        const mouthAspectRatio = mouthWidth / (mouthHeight + 1); // +1 to avoid division by zero
        
        // Smile threshold: mouth should be wider than tall (typical smile ratio > 2.5)
        const isSmiling = mouthAspectRatio > 2.5 && mouthWidth > 30; // Minimum width check
        
        // Check if face is in center area
        const noseTip = face[4]; // Nose tip landmark
        const centerX = DOM.smileDetectionCanvas.width / 2;
        const centerY = DOM.smileDetectionCanvas.height / 2;
        const distanceFromCenter = Math.sqrt(
            Math.pow(noseTip.x * DOM.smileDetectionCanvas.width - centerX, 2) + 
            Math.pow(noseTip.y * DOM.smileDetectionCanvas.height - centerY, 2)
        );
        
        // Face should be in center 70% of screen
        const maxDistance = Math.min(DOM.smileDetectionCanvas.width, DOM.smileDetectionCanvas.height) * 0.35;
        const isCentered = distanceFromCenter < maxDistance;
        
        if (isSmiling && isCentered) {
            // Smile detected in center - increment counter
            state.smileDetectedCount++;
            state.lastSmileDetectionTime = Date.now();
            
            // Show indicator immediately
            if (state.smileDetectedCount >= 3 && !state.isRecording) {
                if (DOM.smileDetectionIndicator) {
                    DOM.smileDetectionIndicator.style.display = 'flex';
                }
                if (DOM.smileStatusText) {
                    const progress = Math.min(100, (state.smileDetectedCount / state.smileDetectionThreshold) * 100);
                    DOM.smileStatusText.textContent = `Smile detected! (${Math.round(progress)}%)`;
                }
            }

            // Start session after threshold
            if (state.smileDetectedCount >= state.smileDetectionThreshold && !state.isRecording && state.cameraReady) {
                console.log('😊 Smile detected - starting session automatically');
                if (DOM.smileDetectionIndicator) {
                    DOM.smileDetectionIndicator.style.display = 'none';
                }
                stopSmileDetection();
                // Small delay to ensure UI updates
                setTimeout(() => {
                    startSession();
                }, 100);
            }
        } else {
            // Not smiling or not centered - reset counter gradually
            if (Date.now() - state.lastSmileDetectionTime > 400) {
                state.smileDetectedCount = Math.max(0, state.smileDetectedCount - 1);
                
                if (state.smileDetectedCount === 0) {
                    if (DOM.smileDetectionIndicator) {
                        DOM.smileDetectionIndicator.style.display = 'none';
                    }
                    if (DOM.smileStatusText && isCentered) {
                        DOM.smileStatusText.textContent = 'Smile bigger! 😊';
                    } else if (DOM.smileStatusText) {
                        DOM.smileStatusText.textContent = 'Move to center and smile';
                    }
                }
            }
        }
    } else {
        // No face detected - reset counter
        if (Date.now() - state.lastSmileDetectionTime > 300) {
            state.smileDetectedCount = Math.max(0, state.smileDetectedCount - 2);
            
            if (state.smileDetectedCount === 0) {
                if (DOM.smileDetectionIndicator) {
                    DOM.smileDetectionIndicator.style.display = 'none';
                }
                if (DOM.smileStatusText) {
                    DOM.smileStatusText.textContent = 'Face the camera and smile';
                }
            }
        }
    }
}

function stopSmileDetection() {
    state.smileDetectionActive = false;
    state.smileDetectedCount = 0;
    state.lastSmileDetectionTime = 0;
    state.lastMouthPosition = null;
    
    if (state.camera) {
        try {
            state.camera.stop();
        } catch (e) {
            console.warn('Error stopping camera:', e);
        }
        state.camera = null;
    }
    
    if (state.smileDetectionTimeout) {
        clearTimeout(state.smileDetectionTimeout);
        state.smileDetectionTimeout = null;
    }
    
    if (DOM.smileDetectionIndicator) {
        DOM.smileDetectionIndicator.style.display = 'none';
    }
    
    if (DOM.smileDetectionStatus) {
        DOM.smileDetectionStatus.style.display = 'none';
    }
    
    if (DOM.smileDetectionCanvas) {
        const ctx = DOM.smileDetectionCanvas.getContext('2d');
        ctx.clearRect(0, 0, DOM.smileDetectionCanvas.width, DOM.smileDetectionCanvas.height);
    }
}

// ========================================
// VIDEO DOWNLOAD (MOBILE/iOS COMPATIBLE)
// ========================================

// Setup cloud download link
function setupCloudDownloadLink(cloudURL, fileName, fileExtension) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Store cloud URL in state
    state.cloudVideoURL = cloudURL;
    state.downloadFileName = fileName;
    state.downloadFileExtension = fileExtension || (fileName.includes('.mp4') ? 'mp4' : 'webm');
    
    try {
        if (isIOS) {
            // iOS: Open in new tab, user can use share button
            DOM.downloadLink.href = cloudURL;
            DOM.downloadLink.target = '_blank';
            DOM.downloadLink.download = ''; // Remove download attribute for iOS
            DOM.downloadLink.textContent = '📱 Open Video (Tap to Download)';
            DOM.downloadLink.style.color = '#00a8ff';
            DOM.downloadLink.onclick = (e) => {
                e.preventDefault();
                try {
                    window.open(cloudURL, '_blank');
                } catch (err) {
                    console.error('iOS open error:', err);
                    // Fallback: try direct link
                    window.location.href = cloudURL;
                }
                return false;
            };
            
            // Show iOS help
            const iosHelp = document.getElementById('iosDownloadHelp');
            if (iosHelp) {
                iosHelp.style.display = 'block';
            }
        } else if (isMobile) {
            // Android/Other mobile: Try to download, fallback to open
            DOM.downloadLink.href = cloudURL;
            DOM.downloadLink.download = fileName;
            DOM.downloadLink.target = '_blank';
            DOM.downloadLink.textContent = '⬇ Download Video';
            DOM.downloadLink.style.color = '#00a8ff';
            DOM.downloadLink.onclick = (e) => {
                // Let default behavior try first, then handle if needed
                return handleVideoDownload(e);
            };
        } else {
            // Desktop: Direct download via fetch
            DOM.downloadLink.href = '#';
            DOM.downloadLink.textContent = '⬇ Download Video';
            DOM.downloadLink.style.color = '#00a8ff';
            DOM.downloadLink.onclick = async (e) => {
                e.preventDefault();
                try {
                    const response = await fetch(cloudURL);
                    if (!response.ok) throw new Error('Failed to fetch video');
                    
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    
                    let fileExt = state.downloadFileExtension || 'mp4';
                    if (blob.type.includes('webm')) fileExt = 'webm';
                    else if (cloudURL.includes('.webm')) fileExt = 'webm';
                    else if (cloudURL.includes('.mp4')) fileExt = 'mp4';
                    
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                    const downloadFileName = `photobooth-${timestamp}.${fileExt}`;
                    
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = downloadFileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    
                    setTimeout(() => URL.revokeObjectURL(url), 100);
                } catch (error) {
                    console.error('Download error:', error);
                    window.open(cloudURL, '_blank');
                }
            };
        }
    } catch (error) {
        console.error('Error setting up download link:', error);
        // Fallback: simple link
        DOM.downloadLink.href = cloudURL;
        DOM.downloadLink.target = '_blank';
        DOM.downloadLink.textContent = '⬇ Download Video';
    }
}

// Handle video download with mobile/iOS support
function handleVideoDownload(event) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    // If we have a cloud URL, use it
    if (state.cloudVideoURL) {
        if (isIOS) {
            event.preventDefault();
            window.open(state.cloudVideoURL, '_blank');
            return false;
        }
        return true;
    }
    
    // If we have a local blob, handle it
    if (state.downloadVideoBlob) {
        if (isIOS) {
            event.preventDefault();
            downloadVideoForIOS(state.downloadVideoBlob, state.downloadFileName);
            return false;
        } else {
            event.preventDefault();
            downloadVideoForMobile(state.downloadVideoBlob, state.downloadFileName);
            return false;
        }
    }
    
    return true;
}

// Download video for iOS devices
function downloadVideoForIOS(videoBlob, fileName) {
    const videoURL = state.downloadVideoURL || URL.createObjectURL(videoBlob);
    
    const newWindow = window.open('', '_blank');
    if (newWindow) {
        newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${fileName}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        margin: 0;
                        padding: 20px;
                        background: #000;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        color: white;
                    }
                    video {
                        max-width: 100%;
                        max-height: 80vh;
                        border-radius: 8px;
                    }
                    .instructions {
                        margin-top: 20px;
                        text-align: center;
                        padding: 15px;
                        background: rgba(255,255,255,0.1);
                        border-radius: 8px;
                    }
                    .instructions h3 {
                        margin: 0 0 10px 0;
                    }
                    .instructions p {
                        margin: 5px 0;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <video controls autoplay>
                    <source src="${videoURL}" type="video/${state.downloadFileExtension === 'mp4' ? 'mp4' : 'webm'}">
                    Your browser does not support the video tag.
                </video>
                <div class="instructions">
                    <h3>📱 How to Save Video</h3>
                    <p>1. Tap the video</p>
                    <p>2. Tap the share button (📤)</p>
                    <p>3. Select "Save to Photos" or "Save to Files"</p>
                </div>
            </body>
            </html>
        `);
        newWindow.document.close();
    } else {
        window.open(videoURL, '_blank');
    }
}

// Download video for Android/other mobile devices
function downloadVideoForMobile(videoBlob, fileName) {
    try {
        const url = state.downloadVideoURL || URL.createObjectURL(videoBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            document.body.removeChild(link);
            if (url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        }, 100);
    } catch (error) {
        console.warn('Mobile download failed, opening in new tab:', error);
        const url = state.downloadVideoURL || URL.createObjectURL(videoBlob);
        window.open(url, '_blank');
    }
}

// Open video in new tab (for iOS users)
function openVideoInNewTab() {
    const videoURL = state.cloudVideoURL || state.downloadVideoURL;
    if (videoURL) {
        window.open(videoURL, '_blank');
    } else if (state.downloadVideoBlob) {
        const url = URL.createObjectURL(state.downloadVideoBlob);
        window.open(url, '_blank');
    }
}

// ========================================
// TUTORIAL
// ========================================

function showTutorial() {
    if (DOM.tutorialModal) {
        DOM.tutorialModal.style.display = 'flex';
    }
}

function closeTutorial() {
    if (DOM.tutorialModal) {
        DOM.tutorialModal.style.display = 'none';
    }
}

// Close tutorial when clicking outside
if (DOM.tutorialModal) {
    DOM.tutorialModal.addEventListener('click', (e) => {
        if (e.target === DOM.tutorialModal) {
            closeTutorial();
        }
    });
}

// ========================================
// STARTUP
// ========================================

document.addEventListener('DOMContentLoaded', init);
