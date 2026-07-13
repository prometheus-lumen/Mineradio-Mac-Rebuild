"use strict";
function lyricTagTimeToSeconds(min, sec, frac) {
    let time = (parseInt(min, 10) || 0) * 60 + (parseInt(sec, 10) || 0);
    if (frac)
        time += (parseInt(frac, 10) || 0) / Math.pow(10, Math.min(3, frac.length));
    return time;
}
function finalizeLyricLineDurations(lines) {
    lines.sort((a, b) => a.t - b.t);
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const next = lines[index + 1];
        const inferred = next && next.t > line.t ? next.t - line.t : 4.8;
        if (!Number.isFinite(line.duration) || Number(line.duration) <= 0)
            line.duration = inferred;
        line.duration = Math.max(0.45, Math.min(12, Number(line.duration)));
        line.charCount = Math.max(1, line.charCount || line.text.length);
    }
    return lines;
}
function parseLyricText(text) {
    const lines = [];
    const timePattern = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]/g;
    text.split(/\r?\n/).forEach((rawLine) => {
        const times = [];
        let match;
        timePattern.lastIndex = 0;
        while ((match = timePattern.exec(rawLine))) {
            times.push(lyricTagTimeToSeconds(match[1], match[2], match[3]));
        }
        if (!times.length)
            return;
        const content = rawLine.replace(timePattern, '').trim();
        if (!content)
            return;
        times.forEach((time) => lines.push({ t: time, text: content, source: 'lrc' }));
    });
    return finalizeLyricLineDurations(lines);
}
function parseYrcText(text) {
    const lines = [];
    String(text || '').split(/\r?\n/).forEach((rawLine) => {
        const lineMatch = rawLine.match(/^\[(\d+),(\d+)\](.*)$/);
        if (!lineMatch)
            return;
        const lineStartMs = parseInt(lineMatch[1], 10) || 0;
        const lineDurMs = parseInt(lineMatch[2], 10) || 0;
        const body = lineMatch[3] || '';
        let fullText = '';
        let wordMatch;
        const words = [];
        const wordPattern = /\((\d+),(\d+),\d+\)([^()]*)/g;
        while ((wordMatch = wordPattern.exec(body))) {
            const content = (wordMatch[3] || '').replace(/\s+/g, ' ');
            if (!content)
                continue;
            const rawStart = parseInt(wordMatch[1], 10) || 0;
            const rawDuration = parseInt(wordMatch[2], 10) || 0;
            const absoluteStartMs = rawStart >= lineStartMs - 500 ? rawStart : lineStartMs + rawStart;
            const start = fullText.length;
            fullText += content;
            words.push({ text: content, t: absoluteStartMs / 1000, d: Math.max(0.06, rawDuration / 1000), c0: start, c1: fullText.length });
        }
        if (!fullText)
            fullText = body.replace(/\(\d+,\d+,\d+\)/g, '').replace(/\s+/g, ' ');
        const leading = (fullText.match(/^\s+/) || [''])[0].length;
        fullText = fullText.replace(/\s+/g, ' ').trim();
        if (!fullText)
            return;
        const normalizedWords = words.filter((word) => {
            word.c0 = Math.max(0, Math.min(fullText.length, word.c0 - leading));
            word.c1 = Math.max(word.c0, Math.min(fullText.length, word.c1 - leading));
            return word.c1 > word.c0;
        });
        lines.push({
            t: lineStartMs / 1000,
            duration: lineDurMs / 1000,
            text: fullText,
            words: normalizedWords,
            charCount: Math.max(1, fullText.length),
            source: normalizedWords.length ? 'yrc-word' : 'yrc-line'
        });
    });
    return finalizeLyricLineDurations(lines);
}
//# sourceMappingURL=lyrics-parser.js.map