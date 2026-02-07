// ========================================
// FIXED DURATION VIDEO RECORDING SYSTEM
// ========================================

/**
 * Clean Architecture for Fixed-Duration Video Recording
 * 
 * Features:
 * - Strict duration control (no early stop, no over-recording)
 * - Visual feedback (progress bar, animations)
 * - Preview after each strip
 * - Race condition prevention
 * - Proper cleanup
 */

// ========================================
// STATE MANAGEMENT
// ========================================

const RecordingState = {
    IDLE: 'idle',
    RECORDING: 'recording',
    PROCESSING: 'processing',
    PREVIEW: 'preview',
    COMPLETED: 'completed'
};

// ========================================
// RECORDING FUNCTIONS
// ========================================

/**
 * Start recording session - Entry point
 */
async function startRecordingSession() {
    // Guard: Check if already recording
    if (state.recordingState !== RecordingState.IDLE) {
        console.warn('Session already in progress');
        return;
    }

    // Guard: Check camera ready
    if (!state.cameraReady) {
        alert('Camera is not ready yet. Please wait...');
        return;
    }

    try {
        // Initialize state
        state.recordingState = RecordingState.IDLE;
        state.currentStripIndex = 0;
        state.videoSegments = [];
        state.stripRecorders = [];
        state.stripStreams = [];
        state.previewVideos = [];
        state.progressPercent = 0;
        state.isButtonDisabled = true;

        // Disable start button
        DOM.startBtn.disabled = true;
        DOM.startBtn.textContent = 'Recording...';

        // Initialize strip canvas
        initStrip();
        DOM.stripCanvas.style.display = 'block';
        DOM.stripCanvas.style.visibility = 'visible';

        // Start first strip recording
        await recordStrip(0);

    } catch (error) {
        console.error('Error starting recording session:', error);
        resetRecordingState();
        alert('Failed to start recording. Please try again.');
    }
}

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

        // Create MediaRecorder
        const recorder = new MediaRecorder(liveStream, {
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
        // Create video element
        const video = document.createElement('video');
        video.src = URL.createObjectURL(videoBlob);
        video.muted = true;
        video.playsInline = true;
        video.controls = false;
        video.loop = false;

        // Replace preview video
        if (DOM.stripPreviewVideo.src) {
            URL.revokeObjectURL(DOM.stripPreviewVideo.src);
        }
        DOM.stripPreviewVideo.src = video.src;
        DOM.stripPreviewVideo.currentTime = 0;

        // Show preview container
        DOM.stripPreviewContainer.style.display = 'flex';

        // Play preview
        DOM.stripPreviewVideo.play().catch(e => {
            console.error('Error playing preview:', e);
        });

        // Store video element for cleanup
        state.previewVideos[stripIndex] = video;

        // Update continue button
        DOM.previewContinueBtn.onclick = () => {
            skipPreview(stripIndex);
        };

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
    DOM.stripPreviewContainer.style.display = 'none';

    // Cleanup preview video
    if (DOM.stripPreviewVideo.src) {
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
    DOM.startBtn.textContent = 'START PHOTO SESSION';
    updateRecordingUI(false, -1);

    // Show modal and create final video
    DOM.modal.style.display = 'flex';
    showProcessingStatus('Creating motion video strip...');

    // Create composite motion video
    setTimeout(() => {
        createMotionVideoStrip();
    }, 1000);
}

// ========================================
// VISUAL FEEDBACK
// ========================================

/**
 * Update recording UI (progress bar, status)
 */
function updateRecordingUI(isRecording, stripIndex) {
    if (isRecording && stripIndex >= 0) {
        // Show progress bar
        DOM.recordingProgress.style.display = 'block';
        DOM.recordingStatusText.textContent = `Recording Strip ${stripIndex + 1}/${state.totalShots}`;
        state.progressPercent = 0;
    } else {
        // Hide progress bar
        DOM.recordingProgress.style.display = 'none';
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
    const template = TEMPLATES[DOM.templateSelect.value];
    const useTemplateImage = state.templateImageLoaded && state.templateImage && DOM.templateSelect.value === 'custom';
    
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

        // Redraw template
        initStrip();

        // Draw previously recorded strips (static)
        for (let i = 0; i < stripIndex; i++) {
            if (state.videoSegments[i]) {
                // Draw thumbnail from video blob if available
                drawVideoThumbnail(i);
            }
        }

        // Draw live camera feed for current strip
        try {
            if (!useTemplateImage) {
                CTX.strip.fillStyle = '#1a1a1a';
                CTX.strip.fillRect(x - 20, currentY - 20, destW + 40, destH + 40);
                
                CTX.strip.strokeStyle = template.borderColor;
                CTX.strip.lineWidth = 3;
                CTX.strip.strokeRect(x - 15, currentY - 15, destW + 30, destH + 30);
            }

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
 * Draw video thumbnail on strip
 */
function drawVideoThumbnail(stripIndex) {
    // This would create a thumbnail from the video blob
    // For now, we'll use a placeholder
    // In production, you'd extract a frame from the video
}

// ========================================
// CLEANUP & ERROR HANDLING
// ========================================

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
    DOM.startBtn.textContent = 'START PHOTO SESSION';
    DOM.recordingProgress.style.display = 'none';
    DOM.stripPreviewContainer.style.display = 'none';
}

/**
 * Update status text
 */
function updateStatusText(text) {
    if (DOM.recordingStatusText) {
        DOM.recordingStatusText.textContent = text;
    }
}


