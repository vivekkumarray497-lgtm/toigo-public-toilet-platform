/**
 * TOIGO: Mobile Draggable Bottom Sheet Controller
 * Implements a Google Maps-style draggable bottom sheet with 3 snap states:
 * 1. COLLAPSED  — Minimal bottom bar displaying washroom count & grab handle over the full map.
 * 2. HALF       — Covers 50%–60% of the screen height, balancing map visibility and washroom cards.
 * 3. FULL       — Expands to almost full screen height with unrestricted vertical scrolling.
 *
 * Designed with fluid gesture physics, zero scroll locks in either direction,
 * and seamless fallback for desktop viewports.
 */

class BottomSheetController {
    constructor() {
        this.sheetEl = null;
        this.handleEl = null;
        this.headerEl = null;
        this.contentEl = null;
        this.toggleBtn = null;
        this.toggleIcon = null;
        this.countBadge = null;

        // Valid states: 'collapsed' | 'half' | 'full'
        this.currentState = 'half';
        this.isMobile = false;

        // Metrics in pixels
        this.sheetHeight = 0;
        this.collapsedPeek = 96; // Visible height in collapsed state
        this.currentTranslateY = 0;

        // Touch tracking state
        this.isDragging = false;
        this.isContentScrolling = false;
        this.startY = 0;
        this.lastY = 0;
        this.startTranslateY = 0;
        this.startTime = 0;
        this.lastTime = 0;
        this.velocityY = 0;

        // Bound event handlers
        this.boundOnTouchStart = this.onTouchStart.bind(this);
        this.boundOnTouchMove = this.onTouchMove.bind(this);
        this.boundOnTouchEnd = this.onTouchEnd.bind(this);
        this.boundOnResize = this.onResize.bind(this);
    }

    init() {
        this.sheetEl = document.getElementById('washroom-bottom-sheet');
        if (!this.sheetEl) return;

        this.handleEl = document.getElementById('bottom-sheet-handle');
        this.headerEl = document.getElementById('bottom-sheet-header');
        this.contentEl = document.getElementById('bottom-sheet-content');
        this.toggleBtn = document.getElementById('sheet-expand-toggle-btn');
        this.toggleIcon = document.getElementById('sheet-toggle-icon');
        this.countBadge = document.getElementById('nearby-toilets-count-badge');

        this.checkMobile();
        this.calculateMetrics();

        // Register Touch Events
        this.sheetEl.removeEventListener('touchstart', this.boundOnTouchStart);
        window.removeEventListener('touchmove', this.boundOnTouchMove);
        window.removeEventListener('touchend', this.boundOnTouchEnd);
        window.removeEventListener('touchcancel', this.boundOnTouchEnd);
        window.removeEventListener('resize', this.boundOnResize);

        this.sheetEl.addEventListener('touchstart', this.boundOnTouchStart, { passive: false });
        window.addEventListener('touchmove', this.boundOnTouchMove, { passive: false });
        window.addEventListener('touchend', this.boundOnTouchEnd, { passive: false });
        window.addEventListener('touchcancel', this.boundOnTouchEnd, { passive: false });
        window.addEventListener('resize', this.boundOnResize);

        // Tap interactions on handle & header
        if (this.handleEl) {
            this.handleEl.onclick = (e) => {
                e.stopPropagation();
                this.cycleNextState();
            };
            this.handleEl.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.cycleNextState();
                }
            };
        }

        if (this.headerEl) {
            this.headerEl.onclick = (e) => {
                if (e.target.closest('button') || e.target.closest('a')) return;
                this.cycleNextState();
            };
        }

        if (this.toggleBtn) {
            this.toggleBtn.onclick = (e) => {
                e.stopPropagation();
                this.cycleNextState();
            };
        }

        // Prevent Leaflet map from capturing touches when interacting with the bottom sheet
        if (window.L && window.L.DomEvent) {
            try {
                window.L.DomEvent.disableScrollPropagation(this.sheetEl);
                window.L.DomEvent.disableClickPropagation(this.sheetEl);
            } catch (err) {
                // Ignore leaflet dom error
            }
        }

        // Apply initial layout
        if (this.isMobile) {
            this.snapTo(this.currentState || 'half', false);
        } else {
            this.sheetEl.style.transform = '';
        }
    }

    checkMobile() {
        this.isMobile = window.innerWidth <= 768;
    }

    onResize() {
        const wasMobile = this.isMobile;
        this.checkMobile();
        this.calculateMetrics();

        if (this.isMobile) {
            this.snapTo(this.currentState, false);
        } else {
            if (this.sheetEl) {
                this.sheetEl.style.transform = '';
            }
        }
    }

    calculateMetrics() {
        if (!this.sheetEl || !this.sheetEl.parentElement) return;
        const parentH = this.sheetEl.parentElement.clientHeight || window.innerHeight;
        this.sheetHeight = Math.max(300, parentH - 12);
        this.collapsedPeek = Math.min(110, Math.max(84, (this.headerEl ? this.headerEl.offsetHeight : 54) + 36));
    }

    getTranslateForState(state) {
        this.calculateMetrics();
        const total = this.sheetHeight;
        switch (state) {
            case 'full':
                return 0;
            case 'half':
                // Covers ~55% of the screen height (leaving top 45% for map)
                return Math.round(total * 0.45);
            case 'collapsed':
            default:
                return Math.max(0, Math.round(total - this.collapsedPeek));
        }
    }

    onTouchStart(e) {
        if (!this.isMobile || !e.touches || e.touches.length === 0) return;

        const touch = e.touches[0];
        this.startY = touch.clientY;
        this.lastY = touch.clientY;
        this.startTime = Date.now();
        this.lastTime = this.startTime;
        this.velocityY = 0;
        this.startTranslateY = this.currentTranslateY;

        const target = e.target;
        const isHandle = this.handleEl && (target === this.handleEl || this.handleEl.contains(target));
        const isHeader = this.headerEl && (target === this.headerEl || this.headerEl.contains(target));
        const isContent = this.contentEl && (target === this.contentEl || this.contentEl.contains(target));

        if (isHandle || isHeader) {
            this.isDragging = true;
            this.isContentScrolling = false;
            this.sheetEl.classList.add('is-dragging');
        } else if (isContent) {
            if (this.currentState === 'collapsed' || this.currentState === 'half') {
                // In collapsed or half state, touch gesture on the list initiates sheet expansion
                this.isDragging = true;
                this.isContentScrolling = false;
                this.sheetEl.classList.add('is-dragging');
            } else {
                // In full expanded state
                const scrollTop = this.contentEl ? this.contentEl.scrollTop : 0;
                if (scrollTop > 1) {
                    this.isContentScrolling = true;
                    this.isDragging = false;
                } else {
                    // At top edge of list (scrollTop <= 1)
                    this.isDragging = false;
                    this.isContentScrolling = false;
                }
            }
        }
    }

    onTouchMove(e) {
        if (!this.isMobile || !e.touches || e.touches.length === 0) return;

        const touch = e.touches[0];
        const currentY = touch.clientY;
        const deltaY = currentY - this.startY;
        const now = Date.now();
        const timeDiff = now - this.lastTime || 1;

        this.velocityY = (currentY - this.lastY) / timeDiff;
        this.lastY = currentY;
        this.lastTime = now;

        // When in full mode and gesture direction hasn't been determined:
        if (!this.isDragging && !this.isContentScrolling && this.currentState === 'full') {
            if (deltaY < -4) {
                // Swiping UP -> scroll list downwards
                this.isContentScrolling = true;
                this.isDragging = false;
            } else if (deltaY > 4 && this.contentEl && this.contentEl.scrollTop <= 1) {
                // Swiping DOWN while at top of content -> drag sheet down smoothly!
                this.isDragging = true;
                this.isContentScrolling = false;
                this.startTranslateY = 0;
                this.sheetEl.classList.add('is-dragging');
            }
        }

        // When scrolling content up, if user reaches top (scrollTop <= 0) and continues pulling down:
        if (this.isContentScrolling && this.contentEl && this.contentEl.scrollTop <= 0 && deltaY > 10) {
            this.isContentScrolling = false;
            this.isDragging = true;
            this.startY = currentY;
            this.startTranslateY = 0;
            this.sheetEl.classList.add('is-dragging');
        }

        if (this.isDragging) {
            // Prevent page overscroll / pull-to-refresh
            if (e.cancelable) {
                e.preventDefault();
            }

            let newTranslateY = this.startTranslateY + (currentY - this.startY);
            const fullY = this.getTranslateForState('full');
            const collapsedY = this.getTranslateForState('collapsed');

            // Apply smooth rubber-band resistance beyond limits
            if (newTranslateY < fullY) {
                newTranslateY = fullY + (newTranslateY - fullY) * 0.25;
            } else if (newTranslateY > collapsedY) {
                newTranslateY = collapsedY + (newTranslateY - collapsedY) * 0.25;
            }

            this.currentTranslateY = newTranslateY;
            this.sheetEl.style.transform = `translateY(${newTranslateY}px)`;
        }
    }

    onTouchEnd(e) {
        if (!this.isMobile) return;

        if (this.isDragging) {
            this.isDragging = false;
            this.sheetEl.classList.remove('is-dragging');

            const totalDeltaY = this.lastY - this.startY;

            // 1. Fast velocity flick gesture
            if (Math.abs(this.velocityY) > 0.35 || Math.abs(totalDeltaY) > 50) {
                if (this.velocityY < -0.35 || totalDeltaY < -50) {
                    // Swiped UP
                    if (this.currentState === 'collapsed') {
                        this.snapTo('half');
                    } else if (this.currentState === 'half') {
                        this.snapTo('full');
                    } else {
                        this.snapTo('full');
                    }
                } else if (this.velocityY > 0.35 || totalDeltaY > 50) {
                    // Swiped DOWN
                    if (this.currentState === 'full') {
                        this.snapTo('half');
                    } else if (this.currentState === 'half') {
                        this.snapTo('collapsed');
                    } else {
                        this.snapTo('collapsed');
                    }
                } else {
                    this.snapToClosest();
                }
            } else {
                // 2. Slow drag: snap to closest state
                this.snapToClosest();
            }
        }

        this.isContentScrolling = false;
    }

    snapToClosest() {
        const fullY = this.getTranslateForState('full');
        const halfY = this.getTranslateForState('half');
        const collapsedY = this.getTranslateForState('collapsed');

        const distFull = Math.abs(this.currentTranslateY - fullY);
        const distHalf = Math.abs(this.currentTranslateY - halfY);
        const distCollapsed = Math.abs(this.currentTranslateY - collapsedY);

        if (distFull <= distHalf && distFull <= distCollapsed) {
            this.snapTo('full');
        } else if (distHalf <= distFull && distHalf <= distCollapsed) {
            this.snapTo('half');
        } else {
            this.snapTo('collapsed');
        }
    }

    snapTo(state, animated = true) {
        this.currentState = state;
        const targetY = this.getTranslateForState(state);
        this.currentTranslateY = targetY;

        if (!this.sheetEl) return;

        if (!animated) {
            this.sheetEl.style.transition = 'none';
        } else {
            this.sheetEl.style.transition = 'transform 0.32s cubic-bezier(0.2, 0.9, 0.3, 1)';
        }

        this.sheetEl.dataset.state = state;
        this.sheetEl.style.transform = `translateY(${targetY}px)`;

        // Update toggle button icon & title
        if (this.toggleIcon) {
            if (state === 'full') {
                this.toggleIcon.textContent = '▼';
                if (this.toggleBtn) this.toggleBtn.title = 'Collapse to half screen';
            } else if (state === 'half') {
                this.toggleIcon.textContent = '▲';
                if (this.toggleBtn) this.toggleBtn.title = 'Expand to full screen';
            } else {
                this.toggleIcon.textContent = '▲';
                if (this.toggleBtn) this.toggleBtn.title = 'Expand washrooms';
            }
        }

        if (this.handleEl) {
            this.handleEl.setAttribute('aria-expanded', state === 'full' ? 'true' : 'false');
        }

        // Manage content scrollability cleanly
        if (this.contentEl) {
            if (state === 'full') {
                this.contentEl.style.overflowY = 'auto';
            } else {
                this.contentEl.style.overflowY = 'hidden';
                if (state === 'collapsed') {
                    this.contentEl.scrollTop = 0;
                }
            }
        }
    }

    cycleNextState() {
        if (!this.isMobile) return;
        if (this.currentState === 'collapsed') {
            this.snapTo('half');
        } else if (this.currentState === 'half') {
            this.snapTo('full');
        } else {
            this.snapTo('collapsed');
        }
    }

    onToiletsRendered(count) {
        if (this.countBadge) {
            this.countBadge.textContent = `${count} nearby`;
        }
        this.calculateMetrics();
        if (this.isMobile && this.currentState) {
            this.snapTo(this.currentState, false);
        }
    }
}

// Global Controller Instance
window.bottomSheet = new BottomSheetController();

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.bottomSheet.init());
    } else {
        window.bottomSheet.init();
    }
}
