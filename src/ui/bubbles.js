// Bubble rendering utilities. Bursts are wrapped in a "turn" div so:
// - vertical spacing between different speakers' turns is consistent
// - CSS can round bubble corners based on position within the turn
// - an optional attachment row sits at the top of the turn

const TIMESTAMP_GAP_MS = 30 * 60 * 1000; // 30 minutes

function bubble(text, from) {
    const b = document.createElement('div');
    b.className = `sp-bubble sp-bubble-${from === 'user' ? 'user' : 'char'}`;
    b.textContent = text;
    return b;
}

function turnContainer(from, ts) {
    const t = document.createElement('div');
    t.className = `sp-turn sp-turn-${from === 'user' ? 'user' : 'char'}`;
    if (ts) t.dataset.ts = String(ts);
    return t;
}

function timestampHeader(ts, isoTime = null) {
    let displayTime;
    if (isoTime) {
        try {
            const date = new Date(isoTime);
            if (!isNaN(date.getTime())) {
                const hh = String(date.getHours()).padStart(2, '0');
                const mm = String(date.getMinutes()).padStart(2, '0');
                displayTime = `${hh}:${mm}`;
            } else {
                throw new Error('Invalid date');
            }
        } catch {
            // Fallback to timestamp-based time
            const date = new Date(ts);
            const hh = String(date.getHours()).padStart(2, '0');
            const mm = String(date.getMinutes()).padStart(2, '0');
            displayTime = `${hh}:${mm}`;
        }
    } else {
        const date = new Date(ts);
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        displayTime = `${hh}:${mm}`;
    }
    
    const el = document.createElement('div');
    el.className = 'sp-timestamp';
    el.textContent = displayTime;
    return el;
}


function scrollToBottom(el) {
    const threshold = 60;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    if (atBottom) {
        requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    }
}

// Attachment placeholder element. Description is NEVER shown — user-facing
// text is always the generic placeholder. Data model leaves room for a
// future image upload; for now the element is always text-only.
function attachmentPlaceholder(attachment, from) {
    if (!attachment) return null;
    const el = document.createElement('div');
    el.className = `sp-attachment-placeholder sp-attachment-placeholder-${from === 'user' ? 'user' : 'char'} sp-attachment-${attachment.kind}`;
    const icon = attachment.kind === 'video' ? '🎥' : '📷';
    const label = attachment.kind === 'video' ? 'video' : 'image';
    el.textContent = `${icon} ${label} attachment`;
    return el;
}

export function renderThread(thread, containerEl) {
    containerEl.innerHTML = '';
    let lastTs = 0;
    let lastIsoTime = null;
    
    for (let ei = 0; ei < thread.length; ei++) {
        const entry = thread[ei];
        
        // Check if we need to show timestamp based on time gap OR ISO time difference
        let shouldShowTimestamp = false;
        if (!lastTs || entry.ts - lastTs > TIMESTAMP_GAP_MS) {
            shouldShowTimestamp = true;
        } else if (entry.isoTime && lastIsoTime) {
            try {
                const currentIsoDate = new Date(entry.isoTime);
                const lastIsoDate = new Date(lastIsoTime);
                if (!isNaN(currentIsoDate.getTime()) && !isNaN(lastIsoDate.getTime())) {
                    const timeDiff = Math.abs(currentIsoDate - lastIsoDate);
                    if (timeDiff > TIMESTAMP_GAP_MS) {
                        shouldShowTimestamp = true;
                    }
                }
            } catch {
                // Fallback to timestamp-based logic
            }
        }
        
        if (shouldShowTimestamp) {
            containerEl.appendChild(timestampHeader(entry.ts, entry.isoTime));
        }
        
        const turn = turnContainer(entry.from, entry.ts);
        const entryKey = typeof entry.chatIdx === 'number' ? entry.chatIdx : ei;
        const att = attachmentPlaceholder(entry.attachment, entry.from);
        if (att) {
            att.dataset.entryIdx = String(entryKey);
            att.dataset.attachment = '1';
            turn.appendChild(att);
        }
        for (let mi = 0; mi < entry.msgs.length; mi++) {
            const b = bubble(entry.msgs[mi], entry.from);
            b.dataset.entryIdx = String(entryKey);
            b.dataset.msgIdx = String(mi);
            turn.appendChild(b);
        }
        containerEl.appendChild(turn);
        lastTs = entry.ts;
        lastIsoTime = entry.isoTime || null;
    }
    requestAnimationFrame(() => { containerEl.scrollTop = containerEl.scrollHeight; });
}

export function appendBurst(burst, containerEl) {
    const turns = containerEl.querySelectorAll('.sp-turn');
    const last = turns[turns.length - 1];
    const lastTs = last ? Number(last.dataset.ts || 0) : 0;
    
    // Check if we need to show timestamp based on time gap OR ISO time difference
    let shouldShowTimestamp = false;
    if (!lastTs || burst.ts - lastTs > TIMESTAMP_GAP_MS) {
        shouldShowTimestamp = true;
    } else if (burst.isoTime && last?.dataset?.isoTime) {
        try {
            const currentIsoDate = new Date(burst.isoTime);
            const lastIsoDate = new Date(last.dataset.isoTime);
            if (!isNaN(currentIsoDate.getTime()) && !isNaN(lastIsoDate.getTime())) {
                const timeDiff = Math.abs(currentIsoDate - lastIsoDate);
                if (timeDiff > TIMESTAMP_GAP_MS) {
                    shouldShowTimestamp = true;
                }
            }
        } catch {
            // Fallback to timestamp-based logic
        }
    }
    
    if (shouldShowTimestamp) {
        containerEl.appendChild(timestampHeader(burst.ts, burst.isoTime));
    }
    
    const turn = turnContainer(burst.from, burst.ts);
    turn.dataset.isoTime = burst.isoTime || '';
    const att = attachmentPlaceholder(burst.attachment, burst.from);
    if (att) turn.appendChild(att);
    for (const msg of burst.msgs || []) {
        turn.appendChild(bubble(msg, burst.from));
    }
    containerEl.appendChild(turn);
    scrollToBottom(containerEl);
    return turn;
}

export function openTurn(from, ts, containerEl, attachment, isoTime = null) {
    const t = document.createElement('div');
    t.className = `sp-turn sp-turn-${from === 'user' ? 'user' : 'char'}`;
    t.dataset.ts = String(ts);
    if (isoTime) t.dataset.isoTime = isoTime;
    return t;
}

export function appendToTurn(msg, from, turnEl, containerEl) {
    const b = bubble(msg, from);
    turnEl.appendChild(b);
    scrollToBottom(containerEl);
    return b;
}

export function showTyping(containerEl) {
    const existing = containerEl.querySelector('.sp-typing');
    if (existing) return existing;
    const t = document.createElement('div');
    t.className = 'sp-typing';
    t.innerHTML = '<span></span><span></span><span></span>';
    containerEl.appendChild(t);
    scrollToBottom(containerEl);
    return t;
}

export function hideTyping(containerEl) {
    const t = containerEl.querySelector('.sp-typing');
    if (t) t.remove();
}
