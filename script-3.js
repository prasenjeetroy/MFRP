(() => {
    "use strict";

    const graphCanvas = document.querySelector("#function-graph");
    const equationInput = document.querySelector("#equation-input");
    const graphError = document.querySelector("#graph-error");
    const graphReadout = document.querySelector("#graph-readout");
    const zoomLabel = document.querySelector("#zoom-label");
    const graphTooltip = document.querySelector("#graph-tooltip");
    const graphContext = graphCanvas.getContext("2d");
    const graphState = { expression: "sin(x)", fn: Math.sin, xMin: -10, xMax: 10, yMin: -3, yMax: 3 };
    const parserFunctions = {
        sin: Math.sin, cos: Math.cos, tan: Math.tan,
        asin: Math.asin, acos: Math.acos, atan: Math.atan,
        sqrt: Math.sqrt, abs: Math.abs, log: Math.log, ln: Math.log,
        log10: Math.log10, exp: Math.exp, floor: Math.floor,
        ceil: Math.ceil, round: Math.round
    };
    const parserConstants = { pi: Math.PI, e: Math.E };

    function tokenize(source) {
        const tokens = [];
        let index = 0;
        while (index < source.length) {
            const rest = source.slice(index);
            if (/^\s/.test(rest)) { index += 1; continue; }
            const number = rest.match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
            if (number) { tokens.push({ type: "number", value: Number(number[0]) }); index += number[0].length; continue; }
            const name = rest.match(/^[a-zA-Z]+/);
            if (name) { tokens.push({ type: "name", value: name[0].toLowerCase() }); index += name[0].length; continue; }
            if ("+-*/^(),".includes(source[index])) { tokens.push({ type: source[index], value: source[index] }); index += 1; continue; }
            throw new Error(`Unexpected character “${source[index]}”.`);
        }
        return tokens;
    }

    function compileExpression(source) {
        const tokens = tokenize(source);
        let cursor = 0;
        const peek = () => tokens[cursor];
        const take = () => tokens[cursor++];
        const fail = () => { throw new Error("Check the expression and try again."); };

        function parsePrimary() {
            const token = take();
            if (!token) return fail();
            if (token.type === "number") return () => token.value;
            if (token.type === "(") {
                const inside = parseAdditive();
                if (!peek() || take().type !== ")") return fail();
                return inside;
            }
            if (token.type === "name") {
                if (token.value === "x") return x => x;
                if (Object.prototype.hasOwnProperty.call(parserConstants, token.value)) return () => parserConstants[token.value];
                const fn = parserFunctions[token.value];
                if (fn) {
                    if (!peek() || take().type !== "(") return fail();
                    const argument = parseAdditive();
                    if (!peek() || take().type !== ")") return fail();
                    return x => fn(argument(x));
                }
                throw new Error(`Unknown name “${token.value}”.`);
            }
            return fail();
        }

        function parsePower() {
            let left;
            if (peek() && (peek().type === "+" || peek().type === "-")) {
                const sign = take().type;
                const value = parsePower();
                left = sign === "-" ? x => -value(x) : value;
            } else {
                left = parsePrimary();
            }
            if (peek() && peek().type === "^") {
                take();
                const right = parsePower();
                const base = left;
                left = x => Math.pow(base(x), right(x));
            }
            return left;
        }

        function parseMultiplicative() {
            let left = parsePower();
            while (peek() && (peek().type === "*" || peek().type === "/")) {
                const operator = take().type;
                const right = parsePower();
                const previous = left;
                left = operator === "*" ? x => previous(x) * right(x) : x => previous(x) / right(x);
            }
            return left;
        }

        function parseAdditive() {
            let left = parseMultiplicative();
            while (peek() && (peek().type === "+" || peek().type === "-")) {
                const operator = take().type;
                const right = parseMultiplicative();
                const previous = left;
                left = operator === "+" ? x => previous(x) + right(x) : x => previous(x) - right(x);
            }
            return left;
        }

        if (!tokens.length) throw new Error("Enter a function to plot.");
        const fn = parseAdditive();
        if (cursor !== tokens.length) fail();
        const probe = fn(0);
        if (Number.isNaN(probe)) throw new Error("This expression is undefined at x = 0. Try another function.");
        return fn;
    }

    function graphColors() {
        const styles = getComputedStyle(document.body);
        return {
            grid: styles.getPropertyValue("--line").trim() || "rgba(233,239,255,.1)",
            text: styles.getPropertyValue("--subtle").trim() || "#68748e",
            curve: styles.getPropertyValue("--mint").trim() || "#75efcf"
        };
    }

    function drawGraph() {
        const rect = graphCanvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const ratio = window.devicePixelRatio || 1;
        graphCanvas.width = Math.round(rect.width * ratio);
        graphCanvas.height = Math.round(rect.height * ratio);
        graphContext.setTransform(ratio, 0, 0, ratio, 0, 0);
        const width = rect.width;
        const height = rect.height;
        const colors = graphColors();
        const xToPixel = x => (x - graphState.xMin) / (graphState.xMax - graphState.xMin) * width;
        const yToPixel = y => height - (y - graphState.yMin) / (graphState.yMax - graphState.yMin) * height;
        const xStep = graphState.xMax - graphState.xMin > 15 ? 2 : 1;
        const yStep = graphState.yMax - graphState.yMin > 10 ? 2 : 1;

        graphContext.clearRect(0, 0, width, height);
        graphContext.lineWidth = 1;
        graphContext.strokeStyle = colors.grid;
        graphContext.fillStyle = colors.text;
        graphContext.font = '10px "DM Mono", Consolas, monospace';
        graphContext.textAlign = "center";
        graphContext.textBaseline = "top";
        for (let x = Math.ceil(graphState.xMin / xStep) * xStep; x <= graphState.xMax; x += xStep) {
            const px = xToPixel(x);
            graphContext.beginPath();
            graphContext.moveTo(px, 0);
            graphContext.lineTo(px, height);
            graphContext.stroke();
            if (Math.abs(x) > 0.001) graphContext.fillText(String(x), px, Math.min(height - 13, Math.max(5, yToPixel(0) + 6)));
        }
        graphContext.textAlign = "right";
        graphContext.textBaseline = "middle";
        for (let y = Math.ceil(graphState.yMin / yStep) * yStep; y <= graphState.yMax; y += yStep) {
            const py = yToPixel(y);
            graphContext.beginPath();
            graphContext.moveTo(0, py);
            graphContext.lineTo(width, py);
            graphContext.stroke();
            if (Math.abs(y) > 0.001) graphContext.fillText(String(y), Math.max(23, xToPixel(0) - 6), py);
        }
        graphContext.strokeStyle = colors.text;
        graphContext.globalAlpha = 0.5;
        graphContext.beginPath();
        graphContext.moveTo(0, yToPixel(0));
        graphContext.lineTo(width, yToPixel(0));
        graphContext.moveTo(xToPixel(0), 0);
        graphContext.lineTo(xToPixel(0), height);
        graphContext.stroke();
        graphContext.globalAlpha = 1;

        graphContext.beginPath();
        graphContext.strokeStyle = colors.curve;
        graphContext.lineWidth = 2.5;
        graphContext.shadowColor = colors.curve;
        graphContext.shadowBlur = 9;
        let drawing = false;
        for (let px = 0; px <= width; px += 1) {
            const x = graphState.xMin + px / width * (graphState.xMax - graphState.xMin);
            const y = graphState.fn(x);
            if (!Number.isFinite(y) || y < graphState.yMin - (graphState.yMax - graphState.yMin) || y > graphState.yMax + (graphState.yMax - graphState.yMin)) {
                drawing = false;
                continue;
            }
            const py = yToPixel(y);
            if (!drawing) { graphContext.moveTo(px, py); drawing = true; }
            else graphContext.lineTo(px, py);
        }
        graphContext.stroke();
        graphContext.shadowBlur = 0;
        graphContext.textAlign = "left";
        graphContext.textBaseline = "top";
    }

    function updateGraph(source) {
        const expression = source.trim();
        try {
            const fn = compileExpression(expression);
            graphState.expression = expression;
            graphState.fn = fn;
            graphError.textContent = "";
            graphReadout.textContent = `f(x) = ${expression}`;
            drawGraph();
            return true;
        } catch (error) {
            graphError.textContent = error.message;
            return false;
        }
    }

    document.querySelector("#plot-button").addEventListener("click", () => updateGraph(equationInput.value));
    equationInput.addEventListener("keydown", event => {
        if (event.key === "Enter") updateGraph(equationInput.value);
    });
    document.querySelectorAll(".preset-button").forEach(button => {
        button.addEventListener("click", () => {
            equationInput.value = button.dataset.equation;
            document.querySelectorAll(".preset-button").forEach(item => item.classList.toggle("active", item === button));
            updateGraph(equationInput.value);
        });
    });
    document.querySelector(".reset-graph").addEventListener("click", () => {
        graphState.xMin = -10;
        graphState.xMax = 10;
        graphState.yMin = -3;
        graphState.yMax = 3;
        equationInput.value = "sin(x)";
        document.querySelectorAll(".preset-button").forEach(item => item.classList.toggle("active", item.dataset.equation === "sin(x)"));
        updateGraph(equationInput.value);
        zoomLabel.textContent = "−10 to 10";
    });
    document.querySelectorAll(".zoom-button").forEach(button => {
        button.addEventListener("click", () => {
            const factor = button.dataset.zoom === "in" ? 0.75 : 1.33;
            const center = (graphState.xMin + graphState.xMax) / 2;
            const halfRange = (graphState.xMax - graphState.xMin) * factor / 2;
            graphState.xMin = center - halfRange;
            graphState.xMax = center + halfRange;
            graphState.yMin *= factor;
            graphState.yMax *= factor;
            zoomLabel.textContent = `${graphState.xMin.toFixed(1)} to ${graphState.xMax.toFixed(1)}`;
            drawGraph();
        });
    });
    graphCanvas.addEventListener("pointermove", event => {
        const bounds = graphCanvas.getBoundingClientRect();
        const x = graphState.xMin + (event.clientX - bounds.left) / bounds.width * (graphState.xMax - graphState.xMin);
        const y = graphState.fn(x);
        if (!Number.isFinite(y)) { graphTooltip.style.display = "none"; return; }
        graphTooltip.textContent = `x: ${x.toFixed(2)}   y: ${y.toFixed(2)}`;
        graphTooltip.style.display = "block";
        graphTooltip.style.left = `${Math.max(4, Math.min(bounds.width - graphTooltip.offsetWidth - 4, event.clientX - bounds.left + 12))}px`;
        graphTooltip.style.top = `${Math.max(4, Math.min(bounds.height - 25, event.clientY - bounds.top - 23))}px`;
    });
    graphCanvas.addEventListener("pointerleave", () => { graphTooltip.style.display = "none"; });
    window.addEventListener("resize", drawGraph);
    if ("ResizeObserver" in window) new ResizeObserver(drawGraph).observe(graphCanvas);

    const insights = [
        ["Why does sine repeat?", "A point moving around a circle keeps returning to the same height. That height is sin(x)—so the wave is a circle, seen from the side."],
        ["What does a parabola know?", "A squared term grows faster the farther you move from zero. The curve mirrors itself because (−x)² and x² are always equal."],
        ["When is a graph continuous?", "Imagine tracing the curve without lifting your pencil. Continuity means no sudden jumps or missing points at that spot."]
    ];
    let insightIndex = 0;
    document.querySelector(".insight-next").addEventListener("click", () => {
        insightIndex = (insightIndex + 1) % insights.length;
        document.querySelector("#insight-title").textContent = insights[insightIndex][0];
        document.querySelector("#insight-copy").textContent = insights[insightIndex][1];
    });

    /* ==================================================================
       CHALLENGE ARENA
       Four modes, six topics, three difficulties. Most questions are
       generated fresh with random numbers, so rounds never repeat, and
       scoring rewards first-try answers and streaks instead of clicking
       through options.
       ================================================================== */

    /* QUIZ-ENGINE START — pure logic, no DOM access below this line until QUIZ-ENGINE END */
    const QUIZ_TOPICS = ["ARITHMETIC", "ALGEBRA", "GEOMETRY", "TRIGONOMETRY", "CALCULUS", "PROBABILITY"];
    const DIFFICULTY_ORDER = ["easy", "medium", "hard"];
    const DIFFICULTY = {
        easy: { label: "Easy", points: 10 },
        medium: { label: "Medium", points: 15 },
        hard: { label: "Hard", points: 25 }
    };

    const SUPERSCRIPT_DIGITS = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹", "-": "⁻" };
    const SUBSCRIPT_DIGITS = { 0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉" };
    const sup = power => power === 1 ? "" : String(power).split("").map(char => SUPERSCRIPT_DIGITS[char]).join("");
    const sub = value => String(value).split("").map(char => SUBSCRIPT_DIGITS[char]).join("");
    const ROMAN = ["I", "II", "III", "IV"];

    function fmt(value) {
        const rounded = Math.round(value * 1000) / 1000;
        return String(Object.is(rounded, -0) ? 0 : rounded).replace("-", "−");
    }
    const paren = value => value < 0 ? `(${fmt(value)})` : fmt(value);
    const signed = value => value < 0 ? `− ${fmt(-value)}` : `+ ${fmt(value)}`;
    const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };

    function frac(numerator, denominator) {
        if (denominator < 0) { numerator = -numerator; denominator = -denominator; }
        const divisor = gcd(numerator, denominator);
        const n = numerator / divisor;
        const d = denominator / divisor;
        return { n, d, value: n / d, text: d === 1 ? fmt(n) : `${fmt(n)}/${d}` };
    }

    function piText(numerator, denominator) {
        const { n, d } = frac(numerator, denominator);
        if (n === 0) return "0";
        const coefficient = n === 1 ? "" : n === -1 ? "−" : fmt(n);
        return `${coefficient}π${d === 1 ? "" : `/${d}`}`;
    }

    function polyText(coefficients) {
        const degree = coefficients.length - 1;
        let out = "";
        coefficients.forEach((coefficient, index) => {
            if (coefficient === 0) return;
            const power = degree - index;
            const size = Math.abs(coefficient);
            const number = power > 0 && size === 1 ? "" : fmt(size);
            const variable = power === 0 ? "" : `x${sup(power)}`;
            const sign = coefficient < 0 ? (out ? " − " : "−") : (out ? " + " : "");
            out += sign + number + variable;
        });
        return out || "0";
    }

    const factorial = n => n <= 1 ? 1 : n * factorial(n - 1);
    const choose = (n, k) => factorial(n) / (factorial(k) * factorial(n - k));

    function mulberry32(seed) {
        return () => {
            seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function hashString(text) {
        let hash = 2166136261;
        for (const char of text) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
        return hash >>> 0;
    }

    const ri = (ctx, min, max) => Math.floor(ctx.rng() * (max - min + 1)) + min;
    const pickFrom = (ctx, list) => list[Math.floor(ctx.rng() * list.length)];
    function nonZero(ctx, min, max) { let value; do { value = ri(ctx, min, max); } while (value === 0); return value; }
    function shuffle(rng, list) {
        const copy = list.slice();
        for (let index = copy.length - 1; index > 0; index -= 1) {
            const swap = Math.floor(rng() * (index + 1));
            [copy[index], copy[swap]] = [copy[swap], copy[index]];
        }
        return copy;
    }

    /* Turns typed answers like "−3", "3/4", "12 cm²", "$7.5" or "25%" into numbers. */
    function parseAnswer(text) {
        const cleaned = String(text).trim()
            .replace(/[−–]/g, "-")
            .replace(/[\s$°%,]/g, "")
            .replace(/(cm|m)?[²³]?$/i, "");
        if (!cleaned) return NaN;
        const fraction = cleaned.match(/^([+-]?\d*\.?\d+)\/([+-]?\d*\.?\d+)$/);
        if (fraction) return Number(fraction[1]) / Number(fraction[2]);
        if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return NaN;
        return Number(cleaned);
    }
    function answerMatches(question, text) {
        const parsed = parseAnswer(text);
        if (!Number.isFinite(parsed)) return null;
        const tolerance = Number.isInteger(question.value) ? 1e-9 : 0.005;
        return Math.abs(parsed - question.value) <= tolerance;
    }

    function choiceQuestion(ctx, { prompt, answer, distractors, explanation, hint, numeric, unit = "", bounded = false }) {
        const seen = new Set([answer]);
        const wrong = [];
        // Probabilities: never offer an option outside 0…1, it gives the game away.
        const outOfRange = text => { const value = parseAnswer(text); return bounded && Number.isFinite(value) && (value < 0 || value > 1); };
        for (const option of distractors) {
            if (wrong.length === 3) break;
            if (option == null || /NaN|Infinity/.test(option) || seen.has(option) || outOfRange(option)) continue;
            seen.add(option);
            wrong.push(option);
        }
        // Top up with near-misses in the same style as the answer (fractions stay fractions).
        const fractionParts = answer.match(/^(−?)(\d+)\/(\d+)$/);
        let offset = 1;
        while (wrong.length < 3 && offset < 60) {
            let candidates;
            if (fractionParts) {
                const n = Number(fractionParts[2]) * (fractionParts[1] ? -1 : 1), d = Number(fractionParts[3]);
                candidates = [frac(n, d + offset).text, frac(n + offset, d + offset).text, frac(n + offset, d).text];
            } else if (typeof numeric === "number") {
                candidates = [fmt(numeric + offset) + unit, fmt(numeric - offset) + unit];
            } else break;
            for (const text of candidates) {
                if (wrong.length < 3 && !seen.has(text) && !outOfRange(text)) { seen.add(text); wrong.push(text); }
            }
            offset += offset < 3 ? 1 : 2;
        }
        return { type: "choice", prompt, answer, options: shuffle(ctx.rng, [answer, ...wrong]), explanation, hint };
    }

    function numberQuestion(ctx, { prompt, value, answer, distractors, explanation, hint, unit = "", bounded = false }) {
        const answerText = (answer ?? fmt(value)) + unit;
        const typedChance = { easy: 0, medium: 0.3, hard: 0.55 }[ctx.difficulty];
        if (!ctx.choiceOnly && ctx.rng() < typedChance) {
            return { type: "input", prompt, value, answer: answerText, explanation, hint };
        }
        const options = distractors.map(item => typeof item === "number" ? fmt(item) + unit : item);
        return choiceQuestion(ctx, { prompt, answer: answerText, distractors: options, explanation, hint, numeric: value, unit, bounded });
    }

    /* ---------- Exact trigonometry helpers ---------- */
    const TRIG_SIN = { 0: "0", 30: "1/2", 45: "√2/2", 60: "√3/2", 90: "1" };
    const TRIG_TAN = { 0: "0", 30: "√3/3", 45: "1", 60: "√3" };
    const SIN_POOL = ["0", "1/2", "−1/2", "√2/2", "−√2/2", "√3/2", "−√3/2", "1", "−1"];
    const TAN_POOL = ["0", "√3/3", "−√3/3", "1", "−1", "√3", "−√3", "undefined"];
    const withSign = (text, sign) => text === "0" ? "0" : sign < 0 ? `−${text}` : text;
    const flipSign = text => text.startsWith("−") ? text.slice(1) : `−${text}`;
    function referenceAngle(degrees) {
        const deg = ((degrees % 360) + 360) % 360;
        return deg <= 90 ? deg : deg <= 180 ? 180 - deg : deg <= 270 ? deg - 180 : 360 - deg;
    }
    function exactTrig(fn, degrees) {
        const ref = referenceAngle(degrees);
        const radians = degrees * Math.PI / 180;
        const sinSign = Math.sign(Math.round(Math.sin(radians) * 1e9));
        const cosSign = Math.sign(Math.round(Math.cos(radians) * 1e9));
        if (fn === "sin") return withSign(TRIG_SIN[ref], sinSign);
        if (fn === "cos") return withSign(TRIG_SIN[90 - ref], cosSign);
        if (cosSign === 0) return "undefined";
        return withSign(TRIG_TAN[ref], sinSign * cosSign);
    }
    const radText = degrees => piText(degrees, 180);
    const TRIG_HINTS = {
        sin: "On the unit circle, sine is the y-coordinate.",
        cos: "On the unit circle, cosine is the x-coordinate.",
        tan: "tan θ = sin θ ÷ cos θ."
    };

    function trigValueQuestion(ctx, fn, degrees, useRadians) {
        const answer = exactTrig(fn, degrees);
        const angle = useRadians ? radText(degrees) : `${degrees}°`;
        const partner = fn === "tan" ? null : exactTrig(fn === "sin" ? "cos" : "sin", degrees);
        const mirrored = answer === "0" || answer === "undefined" ? null : flipSign(answer);
        const ref = referenceAngle(degrees);
        const explanation = degrees > 90
            ? `${fn}(${angle}) = ${answer}. Use the ${ref}° reference angle, then take the sign from the quadrant.`
            : `${fn}(${angle}) = ${answer} — one of the special-angle values worth knowing by heart.`;
        return choiceQuestion(ctx, {
            prompt: `What is ${fn}(${angle})?`,
            answer,
            distractors: [partner, mirrored, ...shuffle(ctx.rng, fn === "tan" ? TAN_POOL : SIN_POOL)],
            explanation,
            hint: TRIG_HINTS[fn]
        });
    }

    const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]];
    const POLYGON_NAMES = { 5: "pentagon", 6: "hexagon", 7: "heptagon", 8: "octagon", 9: "nonagon", 10: "decagon", 11: "hendecagon", 12: "dodecagon" };
    const quadrantSigns = quadrant => [[1, 1], [1, -1], [-1, -1], [-1, 1]][quadrant - 1];

    /* ---------- Question generators: topic → difficulty → [generator] ---------- */
    const GENERATORS = {
        ARITHMETIC: {
            easy: [
                ctx => { const a = ri(ctx, 12, 89), b = ri(ctx, 12, 89), v = a + b;
                    return numberQuestion(ctx, { prompt: `What is ${a} + ${b}?`, value: v, distractors: [v + 10, v - 10, v + 1, v - 1], hint: "Add the tens first, then the ones.", explanation: `${a} + ${b} = ${v}.` }); },
                ctx => { const a = ri(ctx, 45, 140), b = ri(ctx, 12, a - 8), v = a - b;
                    return numberQuestion(ctx, { prompt: `What is ${a} − ${b}?`, value: v, distractors: [v + 10, v - 10, v + 2, a + b], hint: "Take away the tens, then the ones.", explanation: `${a} − ${b} = ${v}.` }); },
                ctx => { const a = ri(ctx, 3, 12), b = ri(ctx, 3, 12), v = a * b;
                    return numberQuestion(ctx, { prompt: `What is ${a} × ${b}?`, value: v, distractors: [v + a, v - b, a + b, v + 1], hint: `Think of ${a} groups of ${b}.`, explanation: `${a} × ${b} = ${v}.` }); },
                ctx => { const a = ri(ctx, 2, 9), b = ri(ctx, 2, 9), c = ri(ctx, 2, 9), v = a + b * c;
                    return numberQuestion(ctx, { prompt: `What is ${a} + ${b} × ${c}?`, value: v, distractors: [(a + b) * c, a * b + c, a + b + c], hint: "Multiplication happens before addition.", explanation: `First ${b} × ${c} = ${b * c}, then add ${a} to get ${v}.` }); }
            ],
            medium: [
                ctx => { const a = ri(ctx, 12, 49), b = ri(ctx, 11, 29), v = a * b;
                    return numberQuestion(ctx, { prompt: `What is ${a} × ${b}?`, value: v, distractors: [v + 10, v - 10, a * (b + 1), (a + 1) * b], hint: "Split one number into tens and ones, multiply each part, then add.", explanation: `${a} × ${b} = ${v}.` }); },
                ctx => { const b = ri(ctx, 6, 19), q = ri(ctx, 7, 25), a = b * q;
                    return numberQuestion(ctx, { prompt: `What is ${a} ÷ ${b}?`, value: q, distractors: [q + 1, q - 1, q + 2, q * 2], hint: `Which number times ${b} gives ${a}?`, explanation: `${b} × ${q} = ${a}, so ${a} ÷ ${b} = ${q}.` }); },
                ctx => { const p = pickFrom(ctx, [10, 15, 20, 25, 30, 40, 60, 75]), n = ri(ctx, 2, 15) * 20, v = p * n / 100;
                    return numberQuestion(ctx, { prompt: `What is ${p}% of ${n}?`, value: v, distractors: [v * 2, v / 2, n - v, v + 10], hint: `${p}% means ${p} out of every 100. Try finding 10% first.`, explanation: `${p}% of ${n} = ${p}/100 × ${n} = ${fmt(v)}.` }); },
                ctx => { const d = ri(ctx, 5, 12), a = ri(ctx, 1, d - 2), b = ri(ctx, 1, d - 1 - a), f = frac(a + b, d);
                    const raw = `${a + b}/${d}`;
                    return numberQuestion(ctx, { prompt: `What is ${a}/${d} + ${b}/${d}?`, value: f.value, answer: f.text, distractors: [frac(a + b, 2 * d).text, frac(a + b + 1, d).text, frac(a * b, d).text, frac(Math.abs(a - b) || 1, d).text], hint: "The denominators already match, so only the numerators add.", explanation: `${a}/${d} + ${b}/${d} = ${raw}${raw === f.text ? "" : `, which simplifies to ${f.text}`}.` }); },
                ctx => { const a = ri(ctx, 2, 12), b = ri(ctx, 2, 12);
                    if (ctx.rng() < 0.5) return numberQuestion(ctx, { prompt: `What is (−${a}) × (−${b})?`, value: a * b, distractors: [-a * b, a + b, -(a + b)], hint: "A negative times a negative is positive.", explanation: `The signs cancel: (−${a}) × (−${b}) = ${a * b}.` });
                    return numberQuestion(ctx, { prompt: `What is −${a} − ${b}?`, value: -(a + b), distractors: [b - a, a - b, a + b], hint: "Starting below zero and taking away more moves you further down.", explanation: `Start at −${a} and move ${b} further down: ${fmt(-(a + b))}.` }); }
            ],
            hard: [
                ctx => { const a = ri(ctx, 2, 6), b = ri(ctx, 1, 5), c = ri(ctx, 2, 4), d = ri(ctx, 2, 9), square = (a + b) ** 2, v = square - c * d;
                    return numberQuestion(ctx, { prompt: `What is (${a} + ${b})² − ${c} × ${d}?`, value: v, distractors: [a * a + b * b - c * d, (square - c) * d, (a + b) * 2 - c * d], hint: "Brackets first, then the power, then multiply, then subtract.", explanation: `(${a} + ${b})² = ${square} and ${c} × ${d} = ${c * d}, so ${square} − ${c * d} = ${fmt(v)}.` }); },
                ctx => { let d1, d2; do { d1 = pickFrom(ctx, [2, 3, 4, 5, 6]); d2 = pickFrom(ctx, [3, 4, 6, 8, 9, 10]); } while (d1 === d2);
                    const n1 = ri(ctx, 1, d1 - 1), n2 = ri(ctx, 1, d2 - 1), top = n1 * d2 + n2 * d1, f = frac(top, d1 * d2), raw = `${top}/${d1 * d2}`;
                    return numberQuestion(ctx, { prompt: `What is ${n1}/${d1} + ${n2}/${d2}?`, value: f.value, answer: f.text, distractors: [frac(n1 + n2, d1 + d2).text, frac(n1 + n2, d1 * d2).text, frac(n1 * n2, d1 * d2).text, frac(top + 1, d1 * d2).text], hint: "Rewrite both fractions over a common denominator before adding.", explanation: `${n1 * d2}/${d1 * d2} + ${n2 * d1}/${d1 * d2} = ${raw}${raw === f.text ? "" : `, which simplifies to ${f.text}`}.` }); },
                ctx => { const before = ri(ctx, 2, 10) * 40, p = pickFrom(ctx, [10, 20, 25, 50, -10, -20, -25, -50]), after = before * (100 + p) / 100;
                    const pct = value => `${value > 0 ? "+" : ""}${fmt(value)}%`;
                    return numberQuestion(ctx, { prompt: `A price changes from $${before} to $${after}. What is the percentage change?`, value: p, answer: pct(p), distractors: [pct(-p), pct(Math.round((after - before) / after * 1000) / 10), pct(p * 2), pct(after - before)], hint: "Percentage change = (new − old) ÷ old × 100.", explanation: `(${after} − ${before}) ÷ ${before} × 100 = ${pct(p)}.` }); },
                ctx => { const [base, low, high] = pickFrom(ctx, [[2, 5, 10], [3, 3, 6], [4, 2, 5], [5, 2, 4]]), exponent = ri(ctx, low, high), v = base ** exponent;
                    return numberQuestion(ctx, { prompt: `What is ${base}${sup(exponent)}?`, value: v, distractors: [base * exponent, base ** (exponent - 1), base ** (exponent + 1), v / 2], hint: `Multiply ${base} by itself ${exponent} times.`, explanation: `${Array(exponent).fill(base).join(" × ")} = ${v}.` }); }
            ]
        },
        ALGEBRA: {
            easy: [
                ctx => { const x = ri(ctx, -5, 20), a = ri(ctx, 2, 15), b = x + a;
                    return numberQuestion(ctx, { prompt: `Solve for x: x + ${a} = ${fmt(b)}`, value: x, distractors: [b + a, x + 1, x - 1, -x], hint: `Subtract ${a} from both sides.`, explanation: `x = ${fmt(b)} − ${a} = ${fmt(x)}.` }); },
                ctx => { const a = ri(ctx, 2, 9), x = ri(ctx, 2, 12), b = a * x;
                    return numberQuestion(ctx, { prompt: `Solve for x: ${a}x = ${b}`, value: x, distractors: [b - a, b * a, x + 1, b + a], hint: `Divide both sides by ${a}.`, explanation: `x = ${b} ÷ ${a} = ${x}.` }); },
                ctx => { const a = ri(ctx, 2, 6), b = ri(ctx, 1, 9), x = ri(ctx, 1, 5), v = a * x + b;
                    return numberQuestion(ctx, { prompt: `If x = ${x}, what is ${a}x + ${b}?`, value: v, distractors: [Number(`${a}${x}`) + b, a + x + b, a * (x + b)], hint: `${a}x means ${a} × x.`, explanation: `${a} × ${x} + ${b} = ${v}.` }); },
                ctx => { const m = nonZero(ctx, -6, 6), c = nonZero(ctx, -9, 9), line = `y = ${polyText([m, c])}`;
                    if (ctx.rng() < 0.5) return numberQuestion(ctx, { prompt: `What is the slope of the line ${line}?`, value: m, distractors: [c, -m, m + c], hint: "In y = mx + c, the slope is m.", explanation: `The coefficient of x is ${fmt(m)}, so the slope is ${fmt(m)}.` });
                    return numberQuestion(ctx, { prompt: `Where does the line ${line} cross the y-axis (what is y when x = 0)?`, value: c, distractors: [m, -c, 0], hint: "Set x = 0.", explanation: `When x = 0, y = ${fmt(c)}.` }); }
            ],
            medium: [
                ctx => { const a = ri(ctx, 2, 9), x = ri(ctx, -6, 10), b = nonZero(ctx, -12, 12), c = a * x + b;
                    return numberQuestion(ctx, { prompt: `Solve for x: ${a}x ${signed(b)} = ${fmt(c)}`, value: x, distractors: [c - b, -x, x + 1, x - 2], hint: `Undo the ${b > 0 ? "+" : "−"} ${Math.abs(b)} first, then divide by ${a}.`, explanation: `${a}x = ${fmt(c)} ${signed(-b)} = ${fmt(a * x)}, so x = ${fmt(x)}.` }); },
                ctx => { const a = ri(ctx, 1, 3), b = ri(ctx, -6, 6), c = ri(ctx, -9, 9), x = nonZero(ctx, -4, 5), v = a * x * x + b * x + c;
                    return numberQuestion(ctx, { prompt: `If f(x) = ${polyText([a, b, c])}, what is f(${fmt(x)})?`, value: v, distractors: [a * 2 * x + b * x + c, -a * x * x + b * x + c, v + 1, v - b * x * 2], hint: `Substitute x = ${fmt(x)}. Remember (${fmt(x)})² = ${x * x}.`, explanation: `f(${fmt(x)}) = ${a * x * x} ${signed(b * x)} ${signed(c)} = ${fmt(v)}.` }); },
                ctx => { const m = nonZero(ctx, -4, 5), x1 = ri(ctx, -5, 3), dx = ri(ctx, 1, 5), y1 = ri(ctx, -5, 5), x2 = x1 + dx, y2 = y1 + m * dx;
                    return numberQuestion(ctx, { prompt: `What is the slope of the line through (${fmt(x1)}, ${fmt(y1)}) and (${fmt(x2)}, ${fmt(y2)})?`, value: m, distractors: [-m, frac(1, m).text, m + 1, y2 - y1], hint: "Slope = change in y ÷ change in x.", explanation: `(${fmt(y2)} − ${paren(y1)}) ÷ (${fmt(x2)} − ${paren(x1)}) = ${fmt(m * dx)} ÷ ${dx} = ${fmt(m)}.` }); },
                ctx => { const x = ri(ctx, 2, 12), y = ri(ctx, 1, x - 1), s = x + y, d = x - y, askX = ctx.rng() < 0.5;
                    return numberQuestion(ctx, { prompt: `If x + y = ${s} and x − y = ${d}, what is ${askX ? "x" : "y"}?`, value: askX ? x : y, distractors: [askX ? y : x, s, d, s - 1], hint: "Add the two equations: the y terms cancel.", explanation: `Adding gives 2x = ${s + d}, so x = ${x}; then y = ${s} − ${x} = ${y}.` }); }
            ],
            hard: [
                ctx => { let r1, r2; do { r1 = nonZero(ctx, -7, 7); r2 = nonZero(ctx, -7, 7); } while (r1 === r2);
                    const pair = (p, q) => p === q ? null : `x = ${fmt(Math.min(p, q))} or x = ${fmt(Math.max(p, q))}`, equation = polyText([1, -(r1 + r2), r1 * r2]);
                    return choiceQuestion(ctx, { prompt: `Which values solve ${equation} = 0?`, answer: pair(r1, r2), distractors: [pair(-r1, -r2), pair(-r1, r2), pair(r1, -r2), pair(r1 + 1, r2 + 1), pair(r1 + r2, r1 * r2)], hint: `Find two numbers that multiply to ${fmt(r1 * r2)} and add to ${fmt(r1 + r2)}.`, explanation: `${equation} = (x ${signed(-r1)})(x ${signed(-r2)}), so x = ${fmt(r1)} or x = ${fmt(r2)}.` }); },
                ctx => { const a = nonZero(ctx, -9, 9), b = nonZero(ctx, -9, 9), askConstant = ctx.rng() < 0.5, expanded = polyText([1, a + b, a * b]);
                    return numberQuestion(ctx, { prompt: `When (x ${signed(a)})(x ${signed(b)}) is expanded, what is the ${askConstant ? "constant term" : "coefficient of x"}?`, value: askConstant ? a * b : a + b, distractors: askConstant ? [a + b, -(a * b), a * b + a] : [a * b, a - b, 2 * (a + b)], hint: "Multiply out with FOIL: First, Outer, Inner, Last.", explanation: `(x ${signed(a)})(x ${signed(b)}) = ${expanded}.` }); },
                ctx => { const a = ri(ctx, 2, 9), b = ri(ctx, 2, 9), c = ri(ctx, 1, 8), v = a + b - c;
                    return numberQuestion(ctx, { prompt: `x${sup(a)} · x${sup(b)} ÷ x${sup(c)} = xⁿ. What is n?`, value: v, distractors: [a * b - c, a + b + c, a - b + c], hint: "Multiplying adds exponents; dividing subtracts them.", explanation: `${a} + ${b} − ${c} = ${fmt(v)}.` }); },
                ctx => { const a = -ri(ctx, 2, 6), k = ri(ctx, -5, 6), b = nonZero(ctx, -9, 9), c = a * k + b, ineq = (symbol, value) => `x ${symbol} ${fmt(value)}`;
                    return choiceQuestion(ctx, { prompt: `Solve: ${polyText([a, b])} > ${fmt(c)}`, answer: ineq("<", k), distractors: [ineq(">", k), ineq("<", -k), ineq(">", -k), ineq("≤", k)], hint: "Dividing both sides by a negative number flips the inequality.", explanation: `${fmt(a)}x > ${fmt(c - b)}. Dividing by ${fmt(a)} flips the sign, so x < ${fmt(k)}.` }); },
                ctx => { const base = pickFrom(ctx, [2, 3, 5, 10]), n = ri(ctx, 2, base === 2 ? 8 : base === 10 ? 6 : 4), v = base ** n;
                    return numberQuestion(ctx, { prompt: `What is log${sub(base)}(${v})?`, value: n, distractors: [n + 1, n - 1, base * n, v / base], hint: `Ask: ${base} to what power gives ${v}?`, explanation: `${base}${sup(n)} = ${v}, so log${sub(base)}(${v}) = ${n}.` }); }
            ]
        },
        GEOMETRY: {
            easy: [
                ctx => { const w = ri(ctx, 3, 15), h = ri(ctx, 3, 15);
                    return numberQuestion(ctx, { prompt: `A rectangle is ${w} cm by ${h} cm. What is its area?`, value: w * h, unit: " cm²", distractors: [2 * (w + h), w + h, w * h + w], hint: "Area of a rectangle = length × width.", explanation: `${w} × ${h} = ${w * h} cm².` }); },
                ctx => { const w = ri(ctx, 3, 15), h = ri(ctx, 3, 15);
                    return numberQuestion(ctx, { prompt: `A rectangle is ${w} cm by ${h} cm. What is its perimeter?`, value: 2 * (w + h), unit: " cm", distractors: [w * h, w + h, 2 * w + h], hint: "Add up all four sides.", explanation: `2 × (${w} + ${h}) = ${2 * (w + h)} cm.` }); },
                ctx => { const a = ri(ctx, 25, 90), b = ri(ctx, 20, 160 - a), c = 180 - a - b;
                    return numberQuestion(ctx, { prompt: `Two angles of a triangle are ${a}° and ${b}°. What is the third angle?`, value: c, unit: "°", distractors: [360 - a - b, 180 - a, c + 10], hint: "The angles of a triangle add up to 180°.", explanation: `180° − ${a}° − ${b}° = ${c}°.` }); },
                ctx => { let a; do { a = ri(ctx, 20, 160); } while (a === 90);
                    return numberQuestion(ctx, { prompt: `Two angles sit side by side on a straight line. One is ${a}°. What is the other?`, value: 180 - a, unit: "°", distractors: [360 - a, a, 190 - a], hint: "Angles on a straight line add up to 180°.", explanation: `180° − ${a}° = ${180 - a}°.` }); },
                ctx => { const s = ri(ctx, 4, 15), area = s * s;
                    return numberQuestion(ctx, { prompt: `A square has an area of ${area} cm². How long is each side?`, value: s, unit: " cm", distractors: [area / 4, area / 2, s + 1], hint: "Which number times itself gives the area?", explanation: `${s} × ${s} = ${area}, so each side is ${s} cm.` }); }
            ],
            medium: [
                ctx => { const [a0, b0, c0] = pickFrom(ctx, TRIPLES), k = a0 < 6 ? ri(ctx, 1, 3) : 1, a = a0 * k, b = b0 * k, c = c0 * k;
                    return numberQuestion(ctx, { prompt: `A right triangle has legs ${a} and ${b}. How long is the hypotenuse?`, value: c, distractors: [a + b, c + 1, a * b / 2], hint: "Use a² + b² = c².", explanation: `${a}² + ${b}² = ${a * a} + ${b * b} = ${c * c}, and √${c * c} = ${c}.` }); },
                ctx => { if (ctx.rng() < 0.5) { const r = ri(ctx, 2, 12);
                        return choiceQuestion(ctx, { prompt: `A circle has radius ${r} cm. What is its area?`, answer: `${r * r}π cm²`, distractors: [`${2 * r}π cm²`, `${r}π cm²`, `${2 * r * r}π cm²`, `${4 * r * r}π cm²`, `${r * r} cm²`], hint: "Area = πr².", explanation: `π × ${r}² = ${r * r}π cm².` }); }
                    const d = 2 * ri(ctx, 2, 9);
                    return choiceQuestion(ctx, { prompt: `A circle has diameter ${d} cm. What is its circumference?`, answer: `${d}π cm`, distractors: [`${2 * d}π cm`, `${d / 2}π cm`, `${d * d / 4}π cm`, `${d * d}π cm`], hint: "Circumference = πd (or 2πr).", explanation: `π × ${d} = ${d}π cm.` }); },
                ctx => { const n = ri(ctx, 5, 12), v = (n - 2) * 180;
                    return numberQuestion(ctx, { prompt: `What is the sum of the interior angles of a ${POLYGON_NAMES[n]} (${n} sides)?`, value: v, unit: "°", distractors: [n * 180, (n - 1) * 180, 360, (n - 2) * 90], hint: "A polygon with n sides splits into n − 2 triangles.", explanation: `(${n} − 2) × 180° = ${v}°.` }); },
                ctx => { const b = 2 * ri(ctx, 2, 10), h = ri(ctx, 3, 14);
                    return numberQuestion(ctx, { prompt: `A triangle has base ${b} cm and height ${h} cm. What is its area?`, value: b * h / 2, unit: " cm²", distractors: [b * h, b + h, b * h / 4], hint: "Area of a triangle = ½ × base × height.", explanation: `½ × ${b} × ${h} = ${b * h / 2} cm².` }); },
                ctx => { const l = ri(ctx, 2, 9), w = ri(ctx, 2, 9), h = ri(ctx, 2, 9), v = l * w * h;
                    return numberQuestion(ctx, { prompt: `A box measures ${l} cm × ${w} cm × ${h} cm. What is its volume?`, value: v, unit: " cm³", distractors: [2 * (l * w + l * h + w * h), l + w + h, v + l * w], hint: "Volume = length × width × height.", explanation: `${l} × ${w} × ${h} = ${v} cm³.` }); }
            ],
            hard: [
                ctx => { const n = pickFrom(ctx, [5, 6, 8, 9, 10, 12, 15, 18, 20]), v = 180 * (n - 2) / n;
                    return numberQuestion(ctx, { prompt: `What is each interior angle of a regular polygon with ${n} sides?`, value: v, unit: "°", distractors: [360 / n, (n - 2) * 180, 180 - 180 / n, v + 10], hint: "Find the total of all interior angles, then share it equally.", explanation: `(${n} − 2) × 180° ÷ ${n} = ${fmt(v)}°.` }); },
                ctx => { const [a0, b0, c0] = pickFrom(ctx, TRIPLES.slice(0, 3)), k = a0 === 3 ? ri(ctx, 1, 2) : 1, swap = ctx.rng() < 0.5;
                    const dx = (swap ? b0 : a0) * k * (ctx.rng() < 0.5 ? -1 : 1), dy = (swap ? a0 : b0) * k * (ctx.rng() < 0.5 ? -1 : 1), c = c0 * k;
                    const x1 = ri(ctx, -5, 5), y1 = ri(ctx, -5, 5), x2 = x1 + dx, y2 = y1 + dy;
                    return numberQuestion(ctx, { prompt: `What is the distance between (${fmt(x1)}, ${fmt(y1)}) and (${fmt(x2)}, ${fmt(y2)})?`, value: c, distractors: [Math.abs(dx) + Math.abs(dy), c * c, c + 1], hint: "Distance = √((x₂ − x₁)² + (y₂ − y₁)²).", explanation: `√(${dx * dx} + ${dy * dy}) = √${c * c} = ${c}.` }); },
                ctx => { const r = ri(ctx, 2, 6), h = ri(ctx, 2, 10);
                    return choiceQuestion(ctx, { prompt: `A cylinder has radius ${r} cm and height ${h} cm. What is its volume?`, answer: `${r * r * h}π cm³`, distractors: [`${2 * r * h}π cm³`, `${r * h}π cm³`, `${2 * r * r * h}π cm³`, `${r * r * h} cm³`], hint: "Volume = πr²h.", explanation: `π × ${r}² × ${h} = ${r * r * h}π cm³.` }); },
                ctx => { const k = ri(ctx, 2, 5), area = ri(ctx, 3, 12);
                    return numberQuestion(ctx, { prompt: `A shape has an area of ${area} cm². Every length is multiplied by ${k}. What is the new area?`, value: area * k * k, unit: " cm²", distractors: [area * k, area * k ** 3, area * 2 * k], hint: "Areas scale by the square of the length factor.", explanation: `${area} × ${k}² = ${area * k * k} cm².` }); }
            ]
        },
        TRIGONOMETRY: {
            easy: [
                ctx => trigValueQuestion(ctx, pickFrom(ctx, ["sin", "cos"]), pickFrom(ctx, [0, 30, 45, 60, 90]), false),
                ctx => { const angles = [30, 45, 60, 90, 120, 135, 150, 180, 270, 360], deg = pickFrom(ctx, angles);
                    return choiceQuestion(ctx, { prompt: `Convert ${deg}° to radians.`, answer: radText(deg), distractors: [`${deg}π`, ...shuffle(ctx.rng, angles.filter(item => item !== deg)).map(radText)], hint: "Multiply degrees by π/180.", explanation: `${deg}° × π/180 = ${radText(deg)}.` }); },
                ctx => { const [p, q, hyp] = pickFrom(ctx, TRIPLES.slice(0, 4)), [opp, adj] = ctx.rng() < 0.5 ? [p, q] : [q, p], fn = pickFrom(ctx, ["sin", "cos", "tan"]);
                    const ratios = { sin: `${opp}/${hyp}`, cos: `${adj}/${hyp}`, tan: `${opp}/${adj}` };
                    return choiceQuestion(ctx, { prompt: `In a right triangle, the side opposite θ is ${opp}, the adjacent side is ${adj}, and the hypotenuse is ${hyp}. What is ${fn} θ?`, answer: ratios[fn], distractors: [...Object.values(ratios), `${hyp}/${opp}`, `${adj}/${opp}`], hint: "SOH CAH TOA: sin = opposite/hypotenuse, cos = adjacent/hypotenuse, tan = opposite/adjacent.", explanation: `${fn} θ = ${{ sin: "opposite/hypotenuse", cos: "adjacent/hypotenuse", tan: "opposite/adjacent" }[fn]} = ${ratios[fn]}.` }); }
            ],
            medium: [
                ctx => trigValueQuestion(ctx, pickFrom(ctx, ["sin", "cos", "tan"]), pickFrom(ctx, [120, 135, 150, 180, 210, 225, 240, 300, 315, 330]), ctx.rng() < 0.5),
                ctx => { const deg = pickFrom(ctx, [30, 45, 60, 90, 120, 135, 150, 180, 210, 240, 270, 300, 315, 330]);
                    return numberQuestion(ctx, { prompt: `Convert ${radText(deg)} to degrees.`, value: deg, unit: "°", distractors: [deg * 2, deg / 2, Math.abs(180 - deg) || 90, deg + 90], hint: "Replace π with 180°.", explanation: `${radText(deg)} × 180°/π = ${deg}°.` }); },
                ctx => { const quadrant = ri(ctx, 1, 4), [s, c] = quadrantSigns(quadrant), word = sign => sign > 0 ? "positive" : "negative";
                    return choiceQuestion(ctx, { prompt: `If sin θ ${s > 0 ? ">" : "<"} 0 and cos θ ${c > 0 ? ">" : "<"} 0, which quadrant is θ in?`, answer: `Quadrant ${ROMAN[quadrant - 1]}`, distractors: ROMAN.map(numeral => `Quadrant ${numeral}`), hint: "Sine follows the y-coordinate, cosine the x-coordinate.", explanation: `y is ${word(s)} and x is ${word(c)}, which happens in Quadrant ${ROMAN[quadrant - 1]}.` }); },
                ctx => { const a = nonZero(ctx, -9, 9), k = ri(ctx, 2, 6), fn = pickFrom(ctx, ["sin", "cos"]);
                    return numberQuestion(ctx, { prompt: `What is the amplitude of y = ${a === 1 ? "" : a === -1 ? "−" : fmt(a)}${fn}(${k}x)?`, value: Math.abs(a), distractors: [k, 2 * Math.abs(a), Math.abs(a) * k, a], hint: "Amplitude is the distance from the midline to a peak: the size of the number in front.", explanation: `The coefficient is ${fmt(a)}, so the amplitude is |${fmt(a)}| = ${Math.abs(a)}.` }); }
            ],
            hard: [
                ctx => { const k = ri(ctx, 2, 8), fn = pickFrom(ctx, ["sin", "cos"]);
                    return choiceQuestion(ctx, { prompt: `What is the period of y = ${fn}(${k}x)?`, answer: piText(2, k), distractors: [piText(1, k), piText(2 * k, 1), piText(k, 2), piText(4, k), piText(1, 2 * k)], hint: `The period of ${fn}(kx) is 2π ÷ k.`, explanation: `2π ÷ ${k} = ${piText(2, k)}.` }); },
                ctx => { const [a, b, c] = pickFrom(ctx, TRIPLES.slice(0, 4)), quadrant = ri(ctx, 1, 4), [s, co] = quadrantSigns(quadrant);
                    const answer = withSign(`${b}/${c}`, co);
                    return choiceQuestion(ctx, { prompt: `If sin θ = ${withSign(`${a}/${c}`, s)} and θ is in Quadrant ${ROMAN[quadrant - 1]}, what is cos θ?`, answer, distractors: [withSign(`${b}/${c}`, -co), withSign(`${a}/${b}`, co), withSign(`${c}/${b}`, co), withSign(`${a}/${c}`, co)], hint: "Use sin²θ + cos²θ = 1, then pick the sign from the quadrant.", explanation: `cos²θ = 1 − (${a}/${c})² = ${b * b}/${c * c}, so |cos θ| = ${b}/${c}. Cosine is ${co > 0 ? "positive" : "negative"} in Quadrant ${ROMAN[quadrant - 1]}.` }); },
                ctx => { const ref = pickFrom(ctx, [30, 45, 60]), fn = pickFrom(ctx, ["sin", "cos"]), sign = ctx.rng() < 0.5 ? 1 : -1;
                    const pairs = { "sin+": [ref, 180 - ref], "sin-": [180 + ref, 360 - ref], "cos+": [ref, 360 - ref], "cos-": [180 - ref, 180 + ref] };
                    const key = `${fn}${sign > 0 ? "+" : "-"}`, label = ([p, q]) => `θ = ${p}° or ${q}°`;
                    const value = withSign(TRIG_SIN[fn === "sin" ? ref : 90 - ref], sign);
                    return choiceQuestion(ctx, { prompt: `For 0° ≤ θ < 360°, which angles satisfy ${fn} θ = ${value}?`, answer: label(pairs[key]), distractors: Object.keys(pairs).filter(item => item !== key).map(item => label(pairs[item])), hint: "Find the reference angle, then use the two quadrants where the sign matches.", explanation: `The reference angle is ${ref}°. ${fn} is ${sign > 0 ? "positive" : "negative"} in the quadrants giving ${pairs[key][0]}° and ${pairs[key][1]}°.` }); },
                ctx => { const [a, b, c] = pickFrom(ctx, TRIPLES.slice(0, 4)), f = frac(2 * a * b, c * c);
                    return choiceQuestion(ctx, { prompt: `θ is acute, with sin θ = ${a}/${c} and cos θ = ${b}/${c}. What is sin(2θ)?`, answer: f.text, distractors: [frac(2 * a, c).text, frac(a * b, c * c).text, frac(b * b - a * a, c * c).text, frac(a * a, c * c).text], hint: "sin(2θ) = 2 sin θ cos θ.", explanation: `2 × ${a}/${c} × ${b}/${c} = ${f.text}.` }); }
            ]
        },
        CALCULUS: {
            easy: [
                ctx => { const a = ri(ctx, 1, 5), n = ri(ctx, 2, 4), p = ri(ctx, 1, 3), v = a * n * p ** (n - 1), term = `${a === 1 ? "" : a}x${sup(n)}`;
                    return numberQuestion(ctx, { prompt: `If f(x) = ${term}, what is f′(${p})?`, value: v, distractors: [a * p ** n, a * n * p ** n, a * (n - 1) * p ** (n - 1), n * p ** (n - 1)], hint: "Power rule: the derivative of axⁿ is n·a·xⁿ⁻¹.", explanation: `f′(x) = ${a * n}x${sup(n - 1)}, so f′(${p}) = ${v}.` }); },
                ctx => { const m = nonZero(ctx, -9, 9), c = nonZero(ctx, -9, 9);
                    return numberQuestion(ctx, { prompt: `If f(x) = ${polyText([m, c])}, what is f′(x)?`, value: m, distractors: [c, m + c, 0, -m], hint: "A constant has slope 0; mx has slope m.", explanation: `The derivative of ${polyText([m, 0])} is ${fmt(m)} and the constant disappears, so f′(x) = ${fmt(m)}.` }); },
                ctx => { const p = ri(ctx, -3, 4), b = ri(ctx, -9, 9), v = p * p + b;
                    return numberQuestion(ctx, { prompt: `What is the limit of ${polyText([1, 0, b])} as x → ${fmt(p)}?`, value: v, distractors: [2 * p + b, p + b, b], hint: "For a polynomial, the limit is just its value at that point.", explanation: `Substitute x = ${fmt(p)}: ${paren(p)}² ${signed(b)} = ${fmt(v)}.` }); }
            ],
            medium: [
                ctx => { const a = nonZero(ctx, -3, 3), b = ri(ctx, -4, 4), c = ri(ctx, -5, 5), d = ri(ctx, -9, 9), p = ri(ctx, -2, 3);
                    const v = 3 * a * p * p + 2 * b * p + c, fp = a * p ** 3 + b * p * p + c * p + d;
                    return numberQuestion(ctx, { prompt: `If f(x) = ${polyText([a, b, c, d])}, what is f′(${fmt(p)})?`, value: v, distractors: [fp, 3 * a * p * p + 2 * b * p, a * p * p + b * p + c, v + 2], hint: "Differentiate term by term with the power rule, then substitute.", explanation: `f′(x) = ${polyText([3 * a, 2 * b, c])}, so f′(${fmt(p)}) = ${fmt(v)}.` }); },
                ctx => { const k = ri(ctx, 1, 6), b = ri(ctx, 1, 6), f = frac(k * b * b, 2);
                    return numberQuestion(ctx, { prompt: `What is ∫ from 0 to ${b} of ${k === 1 ? "" : k}x dx?`, value: f.value, answer: f.text, distractors: [frac(k * b * b, 1).text, frac(k * b, 1).text, frac(k * b * b, 4).text, frac(k * b * b + 2, 2).text], hint: `An antiderivative of ${k === 1 ? "" : k}x is ${k === 1 ? "x²/2" : `${k}x²/2`}.`, explanation: `[${k}x²/2] from 0 to ${b} = ${k} × ${b * b}/2 = ${f.text}.` }); },
                ctx => { const n = ri(ctx, 1, 4), m = ri(ctx, 1, 4), a = (n + 1) * m, term = (coefficient, power) => power === 0 ? `${coefficient}` : `${coefficient === 1 ? "" : coefficient}x${sup(power)}`;
                    return choiceQuestion(ctx, { prompt: `What is ∫ ${term(a, n)} dx?`, answer: `${term(m, n + 1)} + C`, distractors: [`${term(a * n, n - 1)} + C`, `${term(a, n + 1)} + C`, `${term(m, n)} + C`, `${term(a * (n + 1), n + 1)} + C`], hint: "Raise the power by one, divide by the new power, and don’t forget + C.", explanation: `${a}x${sup(n + 1)}/${n + 1} + C = ${term(m, n + 1)} + C.` }); },
                ctx => { const h = nonZero(ctx, -5, 6), c = ri(ctx, -9, 9);
                    return numberQuestion(ctx, { prompt: `At what x-value does f(x) = ${polyText([1, -2 * h, c])} reach its minimum?`, value: h, distractors: [-h, 2 * h, c, h + 1], hint: "The minimum is where f′(x) = 0.", explanation: `f′(x) = ${polyText([2, -2 * h])} = 0 gives x = ${fmt(h)}.` }); }
            ],
            hard: [
                ctx => { const a = ri(ctx, 2, 3), b = ri(ctx, -2, 2), n = ri(ctx, 2, 3), p = ri(ctx, 0, 2), inner = a * p + b, v = n * a * inner ** (n - 1);
                    return numberQuestion(ctx, { prompt: `If f(x) = (${polyText([a, b])})${sup(n)}, what is f′(${p})?`, value: v, distractors: [n * inner ** (n - 1), inner ** n, a * inner ** n, v * 2], hint: "Chain rule: differentiate the outside, then multiply by the derivative of the inside.", explanation: `f′(x) = ${n} × ${a} × (${polyText([a, b])})${sup(n - 1)}. At x = ${p} the inside is ${fmt(inner)}, giving ${fmt(v)}.` }); },
                ctx => { const b = ri(ctx, 1, 6), f = frac(b ** 3, 3);
                    return numberQuestion(ctx, { prompt: `What is ∫ from 0 to ${b} of x² dx?`, value: f.value, answer: f.text, distractors: [frac(b ** 3, 2).text, frac(b * b, 1).text, frac(b ** 3, 1).text, frac(2 * b, 1).text], hint: "An antiderivative of x² is x³/3.", explanation: `${b}³/3 − 0 = ${f.text}.` }); },
                ctx => { const a = ri(ctx, 2, 9);
                    return numberQuestion(ctx, { prompt: `What is the limit of (x² − ${a * a}) ÷ (x − ${a}) as x → ${a}?`, value: 2 * a, distractors: [a, a * a, 0, "undefined"], hint: "Factor the top: x² − a² = (x − a)(x + a).", explanation: `It simplifies to x + ${a}, which approaches ${2 * a}.` }); },
                ctx => { const a = ri(ctx, 2, 6), k = ri(ctx, 2, 5);
                    return numberQuestion(ctx, { prompt: `If f(x) = ${a}e^(${k}x), what is f′(0)?`, value: a * k, distractors: [a, k, a * k * k, a + k], hint: "d/dx e^(kx) = k·e^(kx), and e⁰ = 1.", explanation: `f′(x) = ${a * k}e^(${k}x), and at x = 0 that is ${a * k}.` }); },
                ctx => { const k = ri(ctx, 2, 9);
                    return numberQuestion(ctx, { prompt: `What is the limit of sin(${k}x) ÷ x as x → 0?`, value: k, distractors: [1, 0, frac(1, k).text, "undefined"], hint: `Rewrite it as ${k} · sin(${k}x)/(${k}x) and use sin(u)/u → 1.`, explanation: `${k} × 1 = ${k}.` }); }
            ]
        },
        PROBABILITY: {
            easy: [
                ctx => { const t = ri(ctx, 1, 4), events = [["an even number", 3], ["a prime number", 3], ["a multiple of 3", 2], ["a 6", 1], [`a number greater than ${t}`, 6 - t], [`a number less than ${t + 1}`, t]];
                    const [label, count] = pickFrom(ctx, events), f = frac(count, 6);
                    return numberQuestion(ctx, { bounded: true, prompt: `You roll a fair six-sided die. What is the probability of rolling ${label}?`, value: f.value, answer: f.text, distractors: [frac(6 - count, 6).text, frac(count + 1, 6).text, frac(count, 12).text, frac(1, 6).text], hint: "Count the faces that work, then divide by 6.", explanation: `${count} of the 6 faces work, so P = ${count}/6${f.text === `${count}/6` ? "" : ` = ${f.text}`}.` }); },
                ctx => { const r = ri(ctx, 2, 9), b = ri(ctx, 2, 9), g = ri(ctx, 1, 6), total = r + b + g, f = frac(r, total);
                    return numberQuestion(ctx, { bounded: true, prompt: `A bag holds ${r} red, ${b} blue and ${g} green marbles. What is the probability of picking red?`, value: f.value, answer: f.text, distractors: [frac(r, b + g).text, frac(b, total).text, frac(1, 3).text, frac(r + 1, total).text], hint: "Probability = favourable outcomes ÷ total outcomes.", explanation: `${r} red out of ${total} marbles: ${f.text}.` }); },
                ctx => { const n = ri(ctx, 2, 4), f = frac(1, 2 ** n);
                    return numberQuestion(ctx, { bounded: true, prompt: `You flip a fair coin ${n} times. What is the probability of getting heads every time?`, value: f.value, answer: f.text, distractors: [frac(1, 2 * n).text, frac(n, 2 ** n).text, "1/2", frac(1, n).text, frac(1, 2 ** (n + 1)).text, frac(1, 2 ** n + 1).text], hint: "Independent flips: multiply ½ by itself.", explanation: `(½)${sup(n)} = ${f.text}.` }); }
            ],
            medium: [
                ctx => { const s = ri(ctx, 2, 12), count = 6 - Math.abs(s - 7), f = frac(count, 36);
                    return numberQuestion(ctx, { bounded: true, prompt: `You roll two fair dice. What is the probability that they sum to ${s}?`, value: f.value, answer: f.text, distractors: [frac(1, 11).text, frac(count, 12).text, frac(count + 1, 36).text, frac(s, 36).text], hint: "There are 36 equally likely pairs. Count the ones that make the sum.", explanation: `${count} of the 36 pairs sum to ${s}, so P = ${f.text}.` }); },
                ctx => { const r = ri(ctx, 2, 6), b = ri(ctx, 2, 6), n = r + b, f = frac(r * (r - 1), n * (n - 1));
                    return numberQuestion(ctx, { bounded: true, prompt: `A bag has ${r} red and ${b} blue marbles. You draw two without putting the first back. What is the probability both are red?`, value: f.value, answer: f.text, distractors: [frac(r * r, n * n).text, frac(r * (r - 1), n * n).text, frac(r, n).text, frac(2 * r, n * n).text], hint: "After one red is drawn, there is one fewer red and one fewer marble.", explanation: `${r}/${n} × ${r - 1}/${n - 1} = ${f.text}.` }); },
                ctx => { const k = ri(ctx, 1, 9);
                    return numberQuestion(ctx, { bounded: true, prompt: `The chance of rain tomorrow is ${fmt(k / 10)}. What is the chance it does not rain?`, value: (10 - k) / 10, distractors: [k / 10, (10 - k) / 100, 1 - k / 100, k / 100, (10 - k === 9 ? 8 : 10 - k + 1) / 10], hint: "P(not A) = 1 − P(A).", explanation: `1 − ${fmt(k / 10)} = ${fmt((10 - k) / 10)}.` }); },
                ctx => { const k = ri(ctx, 1, 6) * 2, money = value => `$${fmt(value)}`;
                    return numberQuestion(ctx, { prompt: `You win $${k} times the number shown on a fair die. What are your expected winnings per roll?`, value: 3.5 * k, answer: money(3.5 * k), distractors: [money(3 * k), money(6 * k), money(4 * k), money(21 * k)], hint: "The average roll of a fair die is (1 + 2 + … + 6) ÷ 6.", explanation: `The average roll is 3.5, so ${k} × 3.5 = ${money(3.5 * k)}.` }); }
            ],
            hard: [
                ctx => { const n = ri(ctx, 2, 5), f = frac(2 ** n - 1, 2 ** n);
                    return numberQuestion(ctx, { bounded: true, prompt: `You flip a fair coin ${n} times. What is the probability of at least one head?`, value: f.value, answer: f.text, distractors: [frac(1, 2 ** n).text, frac(n, 2 ** n).text, "1/2", frac(n, n + 1).text], hint: "P(at least one) = 1 − P(none).", explanation: `1 − (½)${sup(n)} = ${f.text}.` }); },
                ctx => { const n = ri(ctx, 5, 10), k = ri(ctx, 2, 4), v = choose(n, k);
                    return numberQuestion(ctx, { prompt: `How many ways can you choose ${k} people from a group of ${n}, if order doesn’t matter?`, value: v, distractors: [factorial(n) / factorial(n - k), n * k, choose(n, k - 1), v + n], hint: "C(n, k) = n! ÷ (k! (n − k)!).", explanation: `C(${n}, ${k}) = ${v}.` }); },
                ctx => { const n = ri(ctx, 4, 7), v = factorial(n);
                    return numberQuestion(ctx, { prompt: `In how many different orders can ${n} different books stand on a shelf?`, value: v, distractors: [n * n, 2 ** n, n * (n - 1), factorial(n - 1)], hint: `There are ${n} choices for the first spot, ${n - 1} for the next…`, explanation: `${Array.from({ length: n }, (_, i) => n - i).join(" × ")} = ${v}.` }); },
                ctx => { const a = ri(ctx, 1, 9), b = ri(ctx, 1, 9);
                    return numberQuestion(ctx, { bounded: true, prompt: `Events A and B are independent, with P(A) = ${fmt(a / 10)} and P(B) = ${fmt(b / 10)}. What is P(A and B)?`, value: a * b / 100, distractors: [(a + b) / 20, Math.min(a, b) / 10, a * b / 10, Math.abs(a - b) / 10], hint: "For independent events, multiply the probabilities.", explanation: `${fmt(a / 10)} × ${fmt(b / 10)} = ${fmt(a * b / 100)}.` }); },
                ctx => { const n = ri(ctx, 3, 6), k = ri(ctx, 1, n - 1), f = frac(choose(n, k), 2 ** n);
                    return numberQuestion(ctx, { bounded: true, prompt: `You flip a fair coin ${n} times. What is the probability of exactly ${k} head${k === 1 ? "" : "s"}?`, value: f.value, answer: f.text, distractors: [frac(1, 2 ** n).text, frac(k, n).text, frac(k, 2 ** n).text, frac(choose(n, k), 2 * n).text], hint: "Count the arrangements with C(n, k), then divide by 2ⁿ.", explanation: `C(${n}, ${k}) ÷ 2${sup(n)} = ${choose(n, k)}/${2 ** n}${f.text === `${choose(n, k)}/${2 ** n}` ? "" : ` = ${f.text}`}.` }); }
            ]
        }
    };

    /* ---------- Hand-written concept questions (tracked so they are not re-farmed) ---------- */
    const TF = ["True", "False"];
    const QUESTION_BANK = [
        { id: "geo-double-radius", topic: "GEOMETRY", difficulty: "medium", prompt: "If you double a circle’s radius, what happens to its area?", options: ["It doubles", "It becomes four times larger", "It gets cut in half", "It becomes π times larger"], answer: "It becomes four times larger", hint: "Area depends on r².", explanation: "Area is πr². Doubling r multiplies r² by four." },
        { id: "geo-triangle-sum", topic: "GEOMETRY", difficulty: "easy", prompt: "What is the sum of the interior angles of a triangle?", options: ["90°", "180°", "270°", "360°"], answer: "180°", hint: "Tear off the three corners and line them up.", explanation: "The interior angles of every Euclidean triangle add up to 180°." },
        { id: "geo-cube-edges", topic: "GEOMETRY", difficulty: "easy", prompt: "How many edges does a cube have?", options: ["6", "8", "12", "24"], answer: "12", hint: "Count the top square, the bottom square, then the uprights.", explanation: "4 on top, 4 on the bottom, and 4 vertical edges: 12." },
        { id: "geo-two-obtuse", topic: "GEOMETRY", difficulty: "medium", type: "truefalse", prompt: "True or false: a triangle can have two obtuse angles.", options: TF, answer: "False", hint: "An obtuse angle is bigger than 90°.", explanation: "Two obtuse angles already add to more than 180°, leaving nothing for the third." },
        { id: "geo-exterior-sum", topic: "GEOMETRY", difficulty: "medium", prompt: "The exterior angles of any convex polygon add up to…", options: ["180°", "360°", "540°", "It depends on the number of sides"], answer: "360°", hint: "Walk around the shape: how far do you turn in total?", explanation: "Walking once around any convex polygon turns you through one full turn: 360°." },
        { id: "geo-cube-triple", topic: "GEOMETRY", difficulty: "hard", prompt: "If you triple every edge of a cube, its volume is multiplied by…", options: ["3", "9", "27", "81"], answer: "27", hint: "Volume grows with the cube of the length factor.", explanation: "3³ = 27." },
        { id: "geo-rhombus", topic: "GEOMETRY", difficulty: "hard", type: "truefalse", prompt: "True or false: the diagonals of every rhombus cross at right angles.", options: TF, answer: "True", hint: "All four sides of a rhombus are equal.", explanation: "Each diagonal is the perpendicular bisector of the other, because all four sides are equal." },
        { id: "calc-x2-at-3", topic: "CALCULUS", difficulty: "medium", prompt: "For f(x) = x², what is the derivative at x = 3?", options: ["3", "6", "9", "2"], answer: "6", hint: "The derivative of x² is 2x.", explanation: "f′(x) = 2x, so at x = 3 the slope is 6." },
        { id: "calc-anti-2x", topic: "CALCULUS", difficulty: "medium", prompt: "Which is an antiderivative of 2x?", options: ["x² + C", "2x² + C", "2 + C", "x²/2 + C"], answer: "x² + C", hint: "Which function has derivative 2x?", explanation: "The derivative of x² is 2x, so ∫2x dx = x² + C." },
        { id: "calc-exp", topic: "CALCULUS", difficulty: "easy", prompt: "What is the derivative of eˣ?", options: ["eˣ", "x·eˣ⁻¹", "eˣ⁺¹", "1"], answer: "eˣ", hint: "This function is famous for being its own slope.", explanation: "eˣ is its own derivative — that is what makes e special." },
        { id: "calc-constant", topic: "CALCULUS", difficulty: "easy", prompt: "What is the derivative of a constant, such as 7?", options: ["7", "1", "0", "x"], answer: "0", hint: "A flat line has what slope?", explanation: "A constant never changes, so its rate of change is 0." },
        { id: "calc-max", topic: "CALCULUS", difficulty: "medium", prompt: "At a smooth local maximum, the derivative is…", options: ["Positive", "Zero", "Negative", "Undefined"], answer: "Zero", hint: "Picture the very top of a hill.", explanation: "At the top of a smooth hill the tangent is flat, so the slope is 0." },
        { id: "calc-continuous", topic: "CALCULUS", difficulty: "hard", type: "truefalse", prompt: "True or false: every continuous function is differentiable.", options: TF, answer: "False", hint: "Think about the graph of |x| at x = 0.", explanation: "|x| is continuous but has a sharp corner at 0, where no derivative exists." },
        { id: "calc-ln", topic: "CALCULUS", difficulty: "hard", prompt: "What is ∫ 1/x dx (for x ≠ 0)?", options: ["ln|x| + C", "x⁰/0 + C", "−1/x² + C", "1/x² + C"], answer: "ln|x| + C", hint: "The power rule fails here; which function has derivative 1/x?", explanation: "d/dx ln|x| = 1/x, so ∫ 1/x dx = ln|x| + C." },
        { id: "ari-left-right", topic: "ARITHMETIC", difficulty: "medium", prompt: "What is 48 ÷ 6 × 2?", options: ["4", "16", "24", "8"], answer: "16", hint: "× and ÷ share a level: work left to right.", explanation: "48 ÷ 6 = 8, then 8 × 2 = 16." },
        { id: "ari-eighths", topic: "ARITHMETIC", difficulty: "medium", prompt: "What is 3/4 + 1/8?", options: ["4/12", "5/8", "7/8", "1"], answer: "7/8", hint: "Write 3/4 in eighths first.", explanation: "3/4 = 6/8, and 6/8 + 1/8 = 7/8." },
        { id: "ari-prime", topic: "ARITHMETIC", difficulty: "medium", prompt: "Which of these is prime?", options: ["51", "57", "59", "63"], answer: "59", hint: "Check divisibility by 3 and 7.", explanation: "51 = 3 × 17, 57 = 3 × 19 and 63 = 7 × 9, but 59 has no factors besides 1 and itself." },
        { id: "ari-zero-div", topic: "ARITHMETIC", difficulty: "easy", prompt: "What is 0 ÷ 5?", options: ["0", "5", "1", "Undefined"], answer: "0", hint: "Share nothing among 5 people.", explanation: "0 shared into 5 groups is 0 each. It is 5 ÷ 0 that is undefined." },
        { id: "ari-power-zero", topic: "ARITHMETIC", difficulty: "easy", prompt: "What is 7⁰?", options: ["0", "1", "7", "Undefined"], answer: "1", hint: "7³ ÷ 7³ = 7⁰.", explanation: "Any non-zero number to the power 0 is 1." },
        { id: "ari-point-nine", topic: "ARITHMETIC", difficulty: "hard", type: "truefalse", prompt: "True or false: 0.999… (with 9s forever) is exactly equal to 1.", options: TF, answer: "True", hint: "What is 3 × 0.333…?", explanation: "1/3 = 0.333…, so 3 × 1/3 = 0.999… = 1." },
        { id: "ari-mod", topic: "ARITHMETIC", difficulty: "hard", prompt: "What is the remainder when 2¹⁰ is divided by 7?", options: ["1", "2", "3", "4"], answer: "2", hint: "Powers of 2 leave remainders 2, 4, 1, 2, 4, 1… when divided by 7.", explanation: "2¹⁰ = 1024 = 7 × 146 + 2." },
        { id: "trig-sin-half-pi", topic: "TRIGONOMETRY", difficulty: "easy", prompt: "What is sin(π/2)?", options: ["0", "1", "−1", "π/2"], answer: "1", hint: "π/2 is a quarter turn.", explanation: "At π/2 the unit-circle point is (0, 1), and its y-coordinate is the sine." },
        { id: "trig-cos-zero", topic: "TRIGONOMETRY", difficulty: "easy", prompt: "What is cos(0)?", options: ["0", "1", "−1", "Undefined"], answer: "1", hint: "Where does the unit circle start?", explanation: "The point at angle 0 is (1, 0), so its cosine is 1." },
        { id: "trig-pythag", topic: "TRIGONOMETRY", difficulty: "easy", prompt: "sin²θ + cos²θ equals…", options: ["0", "1", "tan θ", "2"], answer: "1", hint: "It is Pythagoras on the unit circle.", explanation: "On the unit circle x² + y² = 1, and x = cos θ, y = sin θ." },
        { id: "trig-tan-def", topic: "TRIGONOMETRY", difficulty: "easy", prompt: "Which expression equals tan θ?", options: ["sin θ ÷ cos θ", "cos θ ÷ sin θ", "sin θ × cos θ", "1 ÷ sin θ"], answer: "sin θ ÷ cos θ", hint: "Opposite ÷ adjacent.", explanation: "tan θ = opposite/adjacent = (opposite/hyp) ÷ (adjacent/hyp) = sin θ ÷ cos θ." },
        { id: "trig-odd", topic: "TRIGONOMETRY", difficulty: "medium", type: "truefalse", prompt: "True or false: sin(−x) = −sin(x) for every x.", options: TF, answer: "True", hint: "Reflect the unit-circle point in the x-axis.", explanation: "Sine is an odd function: going backwards by x flips the y-coordinate." },
        { id: "trig-two-solutions", topic: "TRIGONOMETRY", difficulty: "hard", prompt: "How many solutions does sin(x) = 0.5 have for 0 ≤ x < 2π?", options: ["1", "2", "3", "4"], answer: "2", hint: "Sine is positive in two quadrants.", explanation: "x = π/6 and x = 5π/6." },
        { id: "trig-sum", topic: "TRIGONOMETRY", difficulty: "hard", type: "truefalse", prompt: "True or false: cos(A + B) = cos A + cos B.", options: TF, answer: "False", hint: "Try A = B = 0.", explanation: "cos(0 + 0) = 1, but cos 0 + cos 0 = 2. The real rule is cos A cos B − sin A sin B." },
        { id: "alg-horizontal", topic: "ALGEBRA", difficulty: "easy", prompt: "What is the slope of a horizontal line?", options: ["0", "1", "−1", "Undefined"], answer: "0", hint: "How much does y change as x moves?", explanation: "y never changes, so rise ÷ run = 0." },
        { id: "alg-x2-9", topic: "ALGEBRA", difficulty: "easy", prompt: "How many real solutions does x² = 9 have?", options: ["0", "1", "2", "Infinitely many"], answer: "2", hint: "Negative numbers square to positives too.", explanation: "x = 3 and x = −3." },
        { id: "alg-square", topic: "ALGEBRA", difficulty: "medium", prompt: "Which expression equals (a + b)²?", options: ["a² + b²", "a² + 2ab + b²", "2a + 2b", "a² + ab + b²"], answer: "a² + 2ab + b²", hint: "Write it as (a + b)(a + b) and multiply out.", explanation: "(a + b)(a + b) = a² + ab + ba + b² = a² + 2ab + b²." },
        { id: "alg-root-sum", topic: "ALGEBRA", difficulty: "medium", type: "truefalse", prompt: "True or false: √(a + b) = √a + √b for all positive a and b.", options: TF, answer: "False", hint: "Try a = 9 and b = 16.", explanation: "√(9 + 16) = 5, but √9 + √16 = 7." },
        { id: "alg-2x-x", topic: "ALGEBRA", difficulty: "medium", prompt: "If 2x = x, what is x?", options: ["0", "1", "2", "Any number"], answer: "0", hint: "Subtract x from both sides.", explanation: "2x − x = 0 gives x = 0." },
        { id: "alg-discriminant", topic: "ALGEBRA", difficulty: "hard", prompt: "For which positive k does x² + kx + 9 = 0 have exactly one solution?", options: ["3", "6", "9", "18"], answer: "6", hint: "One solution means the discriminant b² − 4ac is 0.", explanation: "k² − 36 = 0, so k = 6 and the equation is (x + 3)² = 0." },
        { id: "alg-square-equal", topic: "ALGEBRA", difficulty: "hard", type: "truefalse", prompt: "True or false: if a² = b², then a = b.", options: TF, answer: "False", hint: "Try a = 2 and b = −2.", explanation: "2² = (−2)², but 2 ≠ −2. All you can say is a = ±b." },
        { id: "prob-streak", topic: "PROBABILITY", difficulty: "medium", prompt: "A fair coin lands heads 5 times in a row. The chance of heads on the next flip is…", options: ["Less than 1/2", "Exactly 1/2", "More than 1/2", "0"], answer: "Exactly 1/2", hint: "Does the coin remember?", explanation: "Flips are independent, so it is still exactly 1/2." },
        { id: "prob-impossible", topic: "PROBABILITY", difficulty: "easy", prompt: "What is the probability of an impossible event?", options: ["0", "1", "1/2", "−1"], answer: "0", hint: "Probabilities run from 0 to 1.", explanation: "Impossible events have probability 0; certain ones have probability 1." },
        { id: "prob-above-one", topic: "PROBABILITY", difficulty: "easy", type: "truefalse", prompt: "True or false: a probability can be greater than 1.", options: TF, answer: "False", hint: "What does a probability of 1 mean?", explanation: "1 means certain. Nothing can be more certain than certain." },
        { id: "prob-seven", topic: "PROBABILITY", difficulty: "medium", prompt: "Rolling two dice, which sum is most likely?", options: ["2", "6", "7", "12"], answer: "7", hint: "Count the ways each sum can happen.", explanation: "Six of the 36 pairs make 7, more than any other sum." },
        { id: "prob-birthday", topic: "PROBABILITY", difficulty: "hard", prompt: "In a group of 23 people, the chance that two share a birthday is closest to…", options: ["6%", "25%", "50%", "90%"], answer: "50%", hint: "Count pairs of people, not people.", explanation: "23 people form 253 pairs, and the chance of a shared birthday is about 50.7%." },
        { id: "prob-monty", topic: "PROBABILITY", difficulty: "hard", prompt: "In the three-door Monty Hall game, after the host opens a goat door, switching wins with probability…", options: ["1/3", "1/2", "2/3", "1"], answer: "2/3", hint: "Your first pick is right only 1/3 of the time.", explanation: "Your first pick wins 1/3 of the time, so switching wins the other 2/3." }
    ];
    /* QUIZ-ENGINE END */

    /* ---------- Modes, levels, badges ---------- */
    const QUIZ_MODES = {
        classic: { label: "Classic", questions: 8, attempts: 2, note: "8 questions. Two tries each, but the second try earns half points." },
        speed: { label: "Speed run", seconds: 60, attempts: 1, note: "60 seconds, one try per question. Answer within 4 seconds for a speed bonus." },
        survival: { label: "Survival", lives: 3, attempts: 1, note: "Keep going until you lose 3 lives. Difficulty rises every 5 correct answers." },
        daily: { label: "Daily", questions: 5, attempts: 1, note: "Same 5 mixed questions for everyone today, one try each. One attempt per day." }
    };
    const DAILY_DIFFICULTIES = ["easy", "medium", "medium", "hard", "hard"];
    const quizLevels = [
        { points: 0, name: "Curious beginner" },
        { points: 100, name: "Pattern finder" },
        { points: 250, name: "Problem solver" },
        { points: 500, name: "Math explorer" },
        { points: 900, name: "Proof seeker" },
        { points: 1500, name: "Equation wizard" },
        { points: 2500, name: "Theorem master" }
    ];
    const BADGES = [
        { id: "first-steps", glyph: "✦", name: "First steps", description: "Answer a question correctly." },
        { id: "hot-streak", glyph: "≫", name: "Hot streak", description: "Get 5 first-try answers in a row." },
        { id: "unstoppable", glyph: "∞", name: "Unstoppable", description: "Get 10 first-try answers in a row." },
        { id: "perfectionist", glyph: "✓", name: "Perfectionist", description: "Finish a classic round with every answer right on the first try." },
        { id: "speed-demon", glyph: "ϟ", name: "Speed demon", description: "Answer 12 questions correctly in one speed run." },
        { id: "survivor", glyph: "♥", name: "Survivor", description: "Reach 15 correct answers in one survival run." },
        { id: "daily", glyph: "☀", name: "Daily habit", description: "Complete a daily challenge." },
        { id: "polymath", glyph: "∑", name: "Polymath", description: "Answer correctly in all six topics." },
        { id: "hard-hitter", glyph: "▲", name: "Hard hitter", description: "Answer 10 hard questions correctly." }
    ];
    const PRAISE = ["Correct!", "Nice!", "Exactly right.", "Spot on.", "You got it."];
    const streakMultiplier = streak => streak >= 10 ? 2 : streak >= 6 ? 1.5 : streak >= 3 ? 1.25 : 1;
    const pad2 = value => String(value).padStart(2, "0");

    const quizStore = {
        get(key, fallback) {
            try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch { return fallback; }
        },
        set(key, value) {
            try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable: progress lasts for this visit only */ }
        }
    };
    const defaultStats = () => ({ answered: 0, firstTry: 0, bestStreak: 0, rounds: 0, hardCorrect: 0, topics: {}, mastered: [], recent: [], badges: [] });
    const storedStats = quizStore.get("curioQuizStats", {});
    const quizStats = Object.assign(defaultStats(), storedStats && typeof storedStats === "object" ? storedStats : {});
    ["mastered", "recent", "badges"].forEach(key => { if (!Array.isArray(quizStats[key])) quizStats[key] = []; });
    if (!quizStats.topics || typeof quizStats.topics !== "object") quizStats.topics = {};
    const saveStats = () => quizStore.set("curioQuizStats", quizStats);

    let quizPoints = Number(quizStore.get("curioQuizPoints", 0));
    if (!Number.isFinite(quizPoints) || quizPoints < 0) quizPoints = 0;
    const storedSettings = quizStore.get("curioQuizSettings", {}) || {};
    const quizSettings = {
        mode: QUIZ_MODES[storedSettings.mode] ? storedSettings.mode : "classic",
        topic: storedSettings.topic === "MIXED" || QUIZ_TOPICS.includes(storedSettings.topic) ? storedSettings.topic : "MIXED",
        difficulty: DIFFICULTY[storedSettings.difficulty] ? storedSettings.difficulty : "easy"
    };
    let round = null;

    const $ = selector => document.querySelector(selector);
    const quizEls = {
        play: $("#quiz-play"), setup: $("#quiz-setup"), game: $("#quiz-game"), results: $("#quiz-results"),
        topicGroup: $("#topic-group"), difficultyGroup: $("#difficulty-group"), setupNote: $("#setup-note"),
        start: $("#quiz-start"), startLabel: $("#quiz-start-label"),
        modeName: $("#quiz-mode-name"), category: $("#quiz-category"), number: $("#quiz-number"),
        timer: $("#hud-timer"), lives: $("#hud-lives"), streak: $("#hud-streak"), score: $("#hud-score"),
        timerTrack: $("#quiz-timer-track"), timerFill: $("#quiz-timer-fill"), dots: $("#quiz-dots"),
        difficulty: $("#quiz-difficulty"), question: $("#quiz-question"), options: $("#quiz-options"),
        answerForm: $("#quiz-answer-form"), answerInput: $("#quiz-answer-input"), hintText: $("#quiz-hint-text"),
        award: $("#point-award"), feedback: $("#quiz-feedback"), next: $("#quiz-next"), nextLabel: $("#quiz-next-label"),
        hint: $("#quiz-hint"), quit: $("#quiz-quit"),
        resultsEyebrow: $("#results-eyebrow"), resultsTitle: $("#results-title"), resultsPoints: $("#results-points"),
        resultsCorrect: $("#results-correct"), resultsStreak: $("#results-streak"), resultsAccuracy: $("#results-accuracy"),
        resultsBreakdown: $("#results-breakdown"), resultsBadges: $("#results-badges"), again: $("#results-again"), backToSetup: $("#results-setup")
    };

    function todayKey() {
        const now = new Date();
        return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    }
    function dailyRecord() {
        const record = quizStore.get("curioDaily", null);
        return record && record.date === todayKey() ? record : null;
    }

    /* ---------- Points, levels and the left-hand panel ---------- */
    function currentQuizLevel() {
        let index = 0;
        quizLevels.forEach((level, position) => { if (quizPoints >= level.points) index = position; });
        return { current: quizLevels[index], next: quizLevels[index + 1] || null };
    }

    function updateQuizPoints() {
        const { current, next } = currentQuizLevel();
        $("#quiz-points").textContent = String(quizPoints);
        $("#quiz-level").textContent = current.name;
        if (next) {
            const progress = (quizPoints - current.points) / (next.points - current.points) * 100;
            $("#quiz-next-level").textContent = `${quizPoints} / ${next.points} to ${next.name}`;
            $("#quiz-progress-fill").style.width = `${Math.max(0, Math.min(100, progress))}%`;
        } else {
            $("#quiz-next-level").textContent = "Top level reached!";
            $("#quiz-progress-fill").style.width = "100%";
        }
        $("#stat-streak").textContent = String(quizStats.bestStreak);
        $("#stat-accuracy").textContent = quizStats.answered ? `${Math.round(quizStats.firstTry / quizStats.answered * 100)}%` : "—";
        $("#stat-rounds").textContent = String(quizStats.rounds);
    }

    function addPoints(amount) {
        if (amount <= 0) return;
        const before = currentQuizLevel().current.name;
        quizPoints += amount;
        quizStore.set("curioQuizPoints", quizPoints);
        const after = currentQuizLevel().current.name;
        if (after !== before) {
            if (round) round.levelUps.push(after);
            showToast(`Level up! You’re now a ${after}.`);
        }
        updateQuizPoints();
    }

    function renderBadges() {
        const grid = $("#badge-grid");
        grid.replaceChildren(...BADGES.map(badge => {
            const earned = quizStats.badges.includes(badge.id);
            const item = document.createElement("li");
            item.className = `badge${earned ? " earned" : ""}`;
            item.title = `${badge.name}: ${badge.description}${earned ? "" : " (locked)"}`;
            const glyph = document.createElement("span");
            glyph.setAttribute("aria-hidden", "true");
            glyph.textContent = badge.glyph;
            const label = document.createElement("span");
            label.className = "visually-hidden";
            label.textContent = `${badge.name} — ${earned ? "earned" : "locked"}: ${badge.description}`;
            item.append(glyph, label);
            return item;
        }));
        $("#badge-count").textContent = `${quizStats.badges.length} / ${BADGES.length}`;
    }

    function awardBadge(id) {
        if (quizStats.badges.includes(id)) return;
        const badge = BADGES.find(item => item.id === id);
        quizStats.badges.push(id);
        if (round) round.newBadges.push(badge);
        showToast(`Badge unlocked: ${badge.name} ${badge.glyph}`);
        renderBadges();
    }

    /* ---------- Setup screen ---------- */
    function renderSetup() {
        const mode = quizSettings.mode;
        document.querySelectorAll(".quiz-mode-button").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.mode === mode)));
        document.querySelectorAll("[data-quiz-topic]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.quizTopic === quizSettings.topic)));
        document.querySelectorAll("[data-quiz-difficulty]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.quizDifficulty === quizSettings.difficulty)));
        const daily = mode === "daily";
        document.querySelectorAll("[data-quiz-topic], [data-quiz-difficulty]").forEach(button => { button.disabled = daily; });
        quizEls.topicGroup.classList.toggle("is-locked", daily);
        quizEls.difficultyGroup.classList.toggle("is-locked", daily);
        let note = QUIZ_MODES[mode].note;
        let label = "Start round";
        let disabled = false;
        if (daily) {
            const record = dailyRecord();
            if (record) {
                note = `You’ve played today’s challenge: ${record.correct} / ${QUIZ_MODES.daily.questions} correct for ${record.score} points. A new one unlocks at midnight.`;
                label = "Come back tomorrow";
                disabled = true;
            } else {
                label = "Start today’s challenge";
            }
        } else if (mode === "survival") {
            note += ` Starting at ${DIFFICULTY[quizSettings.difficulty].label.toLowerCase()}.`;
        }
        quizEls.setupNote.textContent = note;
        quizEls.startLabel.textContent = label;
        quizEls.start.disabled = disabled;
    }

    function showScreen(name) {
        quizEls.setup.hidden = name !== "setup";
        quizEls.game.hidden = name !== "game";
        quizEls.results.hidden = name !== "results";
    }

    function saveSettings() { quizStore.set("curioQuizSettings", quizSettings); }

    /* ---------- Building questions ---------- */
    function questionDifficulty() {
        if (round.mode === "daily") return DAILY_DIFFICULTIES[round.index] || "hard";
        if (round.mode === "survival") return DIFFICULTY_ORDER[Math.min(2, DIFFICULTY_ORDER.indexOf(round.difficulty) + Math.floor(round.correct / 5))];
        return round.difficulty;
    }

    function questionTopic() {
        if (round.topic !== "MIXED") return round.topic;
        const options = QUIZ_TOPICS.filter(topic => topic !== round.lastTopic);
        return options[Math.floor(round.rng() * options.length)];
    }

    function buildQuestion() {
        const topic = questionTopic();
        const difficulty = questionDifficulty();
        const ctx = { rng: round.rng, difficulty, choiceOnly: round.mode === "speed" };
        round.lastTopic = topic;
        if (round.mode !== "daily" && round.rng() < 0.3) {
            const recent = new Set(quizStats.recent);
            const candidates = QUESTION_BANK.filter(item => item.topic === topic && item.difficulty === difficulty && !round.usedIds.has(item.id) && !recent.has(item.id));
            const fresh = candidates.filter(item => !quizStats.mastered.includes(item.id));
            const pool = fresh.length ? fresh : candidates;
            if (pool.length) {
                const item = pool[Math.floor(round.rng() * pool.length)];
                const type = item.type || "choice";
                return { ...item, type, options: type === "choice" ? shuffle(round.rng, item.options) : item.options, review: quizStats.mastered.includes(item.id) };
            }
        }
        const generators = GENERATORS[topic][difficulty];
        let question = null;
        for (let tries = 0; tries < 15; tries += 1) {
            question = generators[Math.floor(round.rng() * generators.length)](ctx);
            if (!round.usedPrompts.has(question.prompt)) break;
        }
        return { ...question, id: null, topic, difficulty, review: false };
    }

    function potentialPoints(question) {
        let base = DIFFICULTY[question.difficulty].points;
        if (question.review) base *= 0.25;
        if (round.hintUsed) base *= 0.5;
        return Math.max(1, Math.round(base));
    }

    /* ---------- Playing a round ---------- */
    function startRound() {
        stopTimer();
        const mode = quizSettings.mode;
        if (mode === "daily") {
            if (dailyRecord()) { renderSetup(); return; }
            quizStore.set("curioDaily", { date: todayKey(), score: 0, correct: 0, finished: false });
        }
        const dailySeed = hashString(`curio-daily-${todayKey()}`);
        round = {
            mode,
            topic: mode === "daily" ? "MIXED" : quizSettings.topic,
            difficulty: mode === "daily" ? "easy" : quizSettings.difficulty,
            rng: mode === "daily" ? mulberry32(dailySeed) : Math.random,
            total: QUIZ_MODES[mode].questions || null,
            lives: QUIZ_MODES[mode].lives || null,
            index: -1, score: 0, correct: 0, firstTry: 0, streak: 0, bestStreak: 0, hintsUsed: 0,
            history: [], usedPrompts: new Set(), usedIds: new Set(), newBadges: [], levelUps: [],
            lastTopic: null, finished: false, deadline: mode === "speed" ? Date.now() + QUIZ_MODES.speed.seconds * 1000 : null
        };
        quizEls.modeName.textContent = QUIZ_MODES[mode].label.toUpperCase();
        quizEls.timer.hidden = mode !== "speed";
        quizEls.timerTrack.hidden = mode !== "speed";
        quizEls.lives.hidden = mode !== "survival";
        quizEls.dots.hidden = !round.total;
        showScreen("game");
        nextQuestion();
        if (mode === "speed") {
            round.timerId = window.setInterval(tickTimer, 200);
            tickTimer();
        }
    }

    function nextQuestion() {
        if (!round || round.finished) return;
        round.index += 1;
        round.question = buildQuestion();
        round.usedPrompts.add(round.question.prompt);
        if (round.question.id) round.usedIds.add(round.question.id);
        round.attempts = 0;
        round.hintUsed = false;
        round.answered = false;
        round.questionStartedAt = Date.now();
        renderQuestion();
    }

    function renderQuestion() {
        const q = round.question;
        quizEls.category.textContent = q.topic;
        quizEls.number.textContent = round.total ? `${pad2(round.index + 1)} / ${pad2(round.total)}` : `Q${round.index + 1}`;
        renderDifficultyTag();
        quizEls.question.textContent = q.prompt;
        const isTyped = q.type === "input";
        quizEls.options.hidden = isTyped;
        quizEls.answerForm.hidden = !isTyped;
        quizEls.options.replaceChildren(...(isTyped ? [] : q.options.map((label, index) => {
            const option = document.createElement("button");
            option.className = "quiz-option";
            option.type = "button";
            option.dataset.answer = label;
            const key = document.createElement("span");
            key.className = "option-key";
            key.setAttribute("aria-hidden", "true");
            key.textContent = String(index + 1);
            const text = document.createElement("span");
            text.textContent = label;
            option.append(key, text);
            return option;
        })));
        quizEls.answerInput.value = "";
        quizEls.answerInput.disabled = false;
        quizEls.answerInput.classList.remove("correct", "incorrect");
        quizEls.answerForm.querySelector("button").disabled = false;
        quizEls.hintText.hidden = true;
        quizEls.hintText.textContent = "";
        quizEls.hint.disabled = false;
        quizEls.award.hidden = true;
        quizEls.award.classList.remove("point-pop");
        quizEls.feedback.textContent = "";
        quizEls.feedback.className = "quiz-feedback";
        quizEls.next.hidden = true;
        updateHud();
        renderDots();
        (isTyped ? quizEls.answerInput : quizEls.question).focus({ preventScroll: true });
    }

    function renderDifficultyTag() {
        const q = round.question;
        quizEls.difficulty.dataset.level = q.difficulty;
        quizEls.difficulty.textContent = `${DIFFICULTY[q.difficulty].label.toUpperCase()} · ${potentialPoints(q)} PTS${q.review ? " · REVIEW" : ""}${q.type === "input" ? " · TYPE YOUR ANSWER" : ""}`;
    }

    function updateHud() {
        const multiplier = streakMultiplier(round.streak);
        quizEls.streak.textContent = `STREAK ${round.streak}${multiplier > 1 ? ` · ×${multiplier}` : ""}`;
        quizEls.streak.classList.toggle("hot", multiplier > 1);
        quizEls.score.textContent = `${round.score} PTS`;
        if (round.lives !== null) {
            const lives = Math.max(0, round.lives);
            quizEls.lives.textContent = "♥".repeat(lives) + "♡".repeat(QUIZ_MODES.survival.lives - lives);
            quizEls.lives.setAttribute("aria-label", `${lives} ${lives === 1 ? "life" : "lives"} left`);
        }
    }

    function renderDots() {
        if (!round.total) return;
        quizEls.dots.replaceChildren(...Array.from({ length: round.total }, (_, index) => {
            const dot = document.createElement("li");
            if (round.history[index]) dot.className = round.history[index];
            else if (index === round.index) dot.className = "current";
            return dot;
        }));
    }

    function tickTimer() {
        if (!round || round.finished || !round.deadline) return;
        const remaining = Math.max(0, round.deadline - Date.now());
        quizEls.timer.textContent = `${Math.ceil(remaining / 1000)}s`;
        quizEls.timer.classList.toggle("urgent", remaining <= 10000);
        quizEls.timerFill.style.width = `${remaining / (QUIZ_MODES.speed.seconds * 1000) * 100}%`;
        if (remaining > 0) return;
        stopTimer();
        if (!round.answered) {
            round.answered = true;
            lockAnswers();
            quizEls.feedback.textContent = "Time’s up!";
        }
        const current = round;
        window.setTimeout(() => { if (round === current) finishRound(false); }, 900);
    }

    function stopTimer() {
        if (round && round.timerId) { window.clearInterval(round.timerId); round.timerId = null; }
    }

    function lockAnswers() {
        quizEls.options.querySelectorAll(".quiz-option").forEach(button => { button.disabled = true; });
        quizEls.answerInput.disabled = true;
        quizEls.answerForm.querySelector("button").disabled = true;
        quizEls.hint.disabled = true;
    }

    function shake(element) {
        element.classList.remove("shake");
        void element.offsetWidth;
        element.classList.add("shake");
    }

    function submitAnswer(isCorrect, element) {
        if (!round || round.finished || round.answered) return;
        round.attempts += 1;
        if (isCorrect) { resolveQuestion(true); return; }
        const q = round.question;
        element.classList.add("incorrect");
        shake(element);
        if (element.matches(".quiz-option")) {
            element.disabled = true;
            // A disabled button drops focus to <body>; keep it inside the quiz so 1–4 keys keep working.
            quizEls.question.focus({ preventScroll: true });
        }
        const allowed = q.type === "truefalse" ? 1 : QUIZ_MODES[round.mode].attempts;
        if (round.attempts < allowed) {
            quizEls.feedback.textContent = "Not quite. You have one more try, worth half points.";
            quizEls.feedback.className = "quiz-feedback";
            if (q.type === "input") { quizEls.answerInput.select(); quizEls.answerInput.focus({ preventScroll: true }); }
            return;
        }
        resolveQuestion(false);
    }

    function resolveQuestion(correct) {
        const q = round.question;
        round.answered = true;
        lockAnswers();
        quizEls.options.querySelectorAll(".quiz-option").forEach(button => {
            if (button.dataset.answer === q.answer) button.classList.add("correct");
        });
        if (q.type === "input") {
            quizEls.answerInput.classList.remove("incorrect");
            quizEls.answerInput.classList.add(correct ? "correct" : "incorrect");
        }
        const firstTry = correct && round.attempts === 1;
        quizStats.answered += 1;
        let earned = 0;
        const details = [];
        if (correct) {
            round.correct += 1;
            round.streak = firstTry ? round.streak + 1 : 0;
            round.bestStreak = Math.max(round.bestStreak, round.streak);
            const multiplier = streakMultiplier(round.streak);
            let base = DIFFICULTY[q.difficulty].points;
            if (!firstTry) { base *= 0.5; details.push("2ND TRY"); }
            if (round.hintUsed) { base *= 0.5; details.push("HINT"); }
            if (q.review) { base *= 0.25; details.push("REVIEW"); }
            if (multiplier > 1) details.push(`×${multiplier} STREAK`);
            earned = Math.max(1, Math.round(base * multiplier));
            if (round.mode === "speed") {
                const seconds = (Date.now() - round.questionStartedAt) / 1000;
                const bonus = seconds < 4 ? 5 : seconds < 8 ? 2 : 0;
                if (bonus) { earned += bonus; details.push(`+${bonus} SPEED`); }
            }
            if (firstTry) {
                round.firstTry += 1;
                quizStats.firstTry += 1;
                if (q.id && !quizStats.mastered.includes(q.id)) quizStats.mastered.push(q.id);
            }
            quizStats.topics[q.topic] = (quizStats.topics[q.topic] || 0) + 1;
            if (q.difficulty === "hard") quizStats.hardCorrect += 1;
            round.history.push(firstTry ? "right" : "half");
        } else {
            round.streak = 0;
            if (round.lives !== null) round.lives -= 1;
            round.history.push("wrong");
        }
        if (q.id) quizStats.recent = [...quizStats.recent.filter(id => id !== q.id), q.id].slice(-24);
        quizStats.bestStreak = Math.max(quizStats.bestStreak, round.streak);
        round.score += earned;
        addPoints(earned);

        if (correct) {
            quizEls.award.textContent = `+${earned} PTS${details.length ? ` · ${details.join(" · ")}` : ""}`;
            quizEls.award.hidden = false;
            quizEls.award.classList.remove("point-pop");
            void quizEls.award.offsetWidth;
            quizEls.award.classList.add("point-pop");
            quizEls.feedback.textContent = `${PRAISE[Math.floor(Math.random() * PRAISE.length)]} ${q.explanation}`;
            quizEls.feedback.className = "quiz-feedback good";
        } else {
            const livesLeft = round.lives !== null ? ` ${Math.max(0, round.lives)} ${round.lives === 1 ? "life" : "lives"} left.` : "";
            quizEls.feedback.textContent = `The answer is ${q.answer}. ${q.explanation}${livesLeft}`;
            quizEls.feedback.className = "quiz-feedback bad";
        }

        if (correct) awardBadge("first-steps");
        if (round.streak >= 5) awardBadge("hot-streak");
        if (round.streak >= 10) awardBadge("unstoppable");
        if (QUIZ_TOPICS.every(topic => quizStats.topics[topic] > 0)) awardBadge("polymath");
        if (quizStats.hardCorrect >= 10) awardBadge("hard-hitter");
        if (round.mode === "survival" && round.correct >= 15) awardBadge("survivor");
        if (round.mode === "speed" && round.correct >= 12) awardBadge("speed-demon");
        saveStats();
        updateHud();
        renderDots();

        const over = (round.total && round.index + 1 >= round.total) || (round.lives !== null && round.lives <= 0);
        if (round.mode === "speed") {
            const current = round;
            window.setTimeout(() => { if (round === current && !current.finished && Date.now() < current.deadline) nextQuestion(); }, correct ? 700 : 1600);
            return;
        }
        quizEls.nextLabel.textContent = over ? "See results" : "Next question";
        quizEls.next.hidden = false;
        quizEls.next.focus({ preventScroll: true });
    }

    function finishRound(quit) {
        if (!round || round.finished) return;
        round.finished = true;
        stopTimer();
        const answered = round.history.length;
        const bonuses = [];
        if (!quit && answered) {
            if (round.mode === "classic") {
                if (round.firstTry === round.total) bonuses.push(["Perfect round", 50]);
                if (round.hintsUsed === 0 && round.correct >= round.total / 2) bonuses.push(["No hints used", 15]);
            } else if (round.mode === "speed" && round.correct >= 5) {
                bonuses.push([`${round.correct} correct in ${QUIZ_MODES.speed.seconds} seconds`, round.correct * 2]);
            } else if (round.mode === "survival" && round.correct > 0) {
                bonuses.push([`Survived ${round.correct} question${round.correct === 1 ? "" : "s"}`, round.correct * 3]);
            }
        }
        if (round.mode === "daily") {
            bonuses.push(["Daily challenge played", 20]);
            if (round.firstTry === round.total) bonuses.push(["Perfect daily", 50]);
        }
        const bonusTotal = bonuses.reduce((sum, [, value]) => sum + value, 0);
        addPoints(bonusTotal);
        if (answered) quizStats.rounds += 1;
        if (round.mode === "classic" && !quit && round.firstTry === round.total) awardBadge("perfectionist");
        if (round.mode === "daily") {
            awardBadge("daily");
            quizStore.set("curioDaily", { date: todayKey(), score: round.score + bonusTotal, correct: round.correct, finished: true });
        }
        saveStats();
        updateQuizPoints();
        renderResults(bonuses, bonusTotal, quit);
    }

    function renderResults(bonuses, bonusTotal, quit) {
        const answered = round.history.length;
        const accuracy = answered ? Math.round(round.firstTry / answered * 100) : 0;
        const ratio = answered ? round.firstTry / answered : 0;
        let title = ratio >= 0.9 ? "Brilliant work." : ratio >= 0.6 ? "Solid round." : ratio >= 0.3 ? "Good effort. Keep going." : "Every expert started here.";
        if (round.mode === "survival" && !quit) title = `You survived ${round.correct} question${round.correct === 1 ? "" : "s"}.`;
        if (round.mode === "speed" && !quit) title = `${round.correct} correct in ${QUIZ_MODES.speed.seconds} seconds.`;
        if (!answered) title = "Round ended early.";
        quizEls.resultsEyebrow.textContent = `${QUIZ_MODES[round.mode].label.toUpperCase()} · ${quit ? "ENDED EARLY" : "ROUND COMPLETE"}`;
        quizEls.resultsTitle.textContent = title;
        quizEls.resultsPoints.textContent = `+${round.score + bonusTotal}`;
        quizEls.resultsCorrect.textContent = `${round.correct}/${answered}`;
        quizEls.resultsStreak.textContent = String(round.bestStreak);
        quizEls.resultsAccuracy.textContent = `${accuracy}%`;
        const rows = [[`Answers (${round.correct} correct)`, round.score], ...bonuses];
        if (round.levelUps.length) rows.push([`Level up: ${round.levelUps[round.levelUps.length - 1]}`, null]);
        quizEls.resultsBreakdown.replaceChildren(...rows.map(([label, value]) => {
            const row = document.createElement("li");
            const name = document.createElement("span");
            name.textContent = label;
            const amount = document.createElement("span");
            amount.textContent = value === null ? "★" : `+${value}`;
            row.append(name, amount);
            return row;
        }));
        quizEls.resultsBadges.hidden = !round.newBadges.length;
        quizEls.resultsBadges.replaceChildren(...round.newBadges.map(badge => {
            const chip = document.createElement("span");
            chip.className = "results-badge";
            chip.textContent = `${badge.glyph} ${badge.name}`;
            return chip;
        }));
        const daily = round.mode === "daily";
        quizEls.again.hidden = daily;
        quizEls.backToSetup.textContent = daily ? "Choose another mode" : "Change mode";
        showScreen("results");
        quizEls.resultsTitle.focus({ preventScroll: true });
    }

    /* ---------- Events ---------- */
    document.querySelectorAll(".quiz-mode-button").forEach(button => button.addEventListener("click", () => {
        quizSettings.mode = button.dataset.mode;
        saveSettings();
        renderSetup();
    }));
    document.querySelectorAll("[data-quiz-topic]").forEach(button => button.addEventListener("click", () => {
        quizSettings.topic = button.dataset.quizTopic;
        saveSettings();
        renderSetup();
    }));
    document.querySelectorAll("[data-quiz-difficulty]").forEach(button => button.addEventListener("click", () => {
        quizSettings.difficulty = button.dataset.quizDifficulty;
        saveSettings();
        renderSetup();
    }));
    quizEls.start.addEventListener("click", startRound);
    quizEls.options.addEventListener("click", event => {
        const option = event.target.closest(".quiz-option");
        if (!option || option.disabled || !round) return;
        submitAnswer(option.dataset.answer === round.question.answer, option);
    });
    quizEls.answerForm.addEventListener("submit", event => {
        event.preventDefault();
        if (!round || round.answered) return;
        const result = answerMatches(round.question, quizEls.answerInput.value);
        if (result === null) {
            quizEls.feedback.textContent = "Type a number such as 12, −3, 0.5 or 3/4.";
            quizEls.feedback.className = "quiz-feedback";
            shake(quizEls.answerInput);
            return;
        }
        submitAnswer(result, quizEls.answerInput);
    });
    quizEls.hint.addEventListener("click", () => {
        if (!round || round.answered || round.hintUsed) return;
        round.hintUsed = true;
        round.hintsUsed += 1;
        quizEls.hintText.textContent = round.question.hint || "Read the question carefully and rule out the options you know are wrong.";
        quizEls.hintText.hidden = false;
        quizEls.hint.disabled = true;
        quizEls.question.focus({ preventScroll: true });
        renderDifficultyTag();
    });
    quizEls.next.addEventListener("click", () => {
        if (!round) return;
        const over = (round.total && round.index + 1 >= round.total) || (round.lives !== null && round.lives <= 0);
        if (over) finishRound(false);
        else nextQuestion();
    });
    quizEls.quit.addEventListener("click", () => finishRound(true));
    quizEls.again.addEventListener("click", startRound);
    quizEls.backToSetup.addEventListener("click", () => {
        renderSetup();
        showScreen("setup");
        quizEls.start.focus({ preventScroll: true });
    });
    document.addEventListener("keydown", event => {
        if (!round || round.finished || round.answered || quizEls.game.hidden) return;
        // Only react when focus is in the quiz, or nowhere in particular (a just-disabled button drops focus to <body>).
        const target = event.target;
        if (target !== document.body && !quizEls.play.contains(target)) return;
        if (target.matches("input, textarea") || event.altKey || event.ctrlKey || event.metaKey) return;
        if (!/^[1-4]$/.test(event.key)) return;
        const option = quizEls.options.children[Number(event.key) - 1];
        if (option && !option.disabled) {
            event.preventDefault();
            option.click();
        }
    });

    updateQuizPoints();
    renderBadges();
    renderSetup();
    showScreen("setup");

    const loginDialog = document.querySelector("#login-dialog");
    const loginButton = document.querySelector("#login-button");
    const nameInput = document.querySelector("#name-input");
    const nameField = document.querySelector("#name-field");
    const pinInput = document.querySelector("#pin-input");
    const pinLabel = document.querySelector("#pin-label");
    const pinHelp = document.querySelector("#pin-help");
    const backupPinInput = document.querySelector("#backup-pin-input");
    const backupPinField = document.querySelector("#backup-pin-field");
    const loginDescription = document.querySelector("#login-description");
    const authFeedback = document.querySelector("#auth-feedback");
    const authSubmit = document.querySelector("#auth-submit");
    const authRecovery = document.querySelector("#auth-recovery");
    const authCancel = document.querySelector("#auth-cancel");
    let authMode = "setup";
    const pinIterations = 150000;

    function encodeBytes(bytes) {
        return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(""));
    }

    async function derivePin(pin, saltValue) {
        const salt = saltValue ? Uint8Array.from(atob(saltValue), char => char.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
        const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
        const digest = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: pinIterations, hash: "SHA-256" }, keyMaterial, 256);
        return { salt: encodeBytes(salt), hash: encodeBytes(new Uint8Array(digest)) };
    }

    async function verifyPin(pin, saltKey, hashKey) {
        const salt = localStorage.getItem(saltKey);
        const expected = localStorage.getItem(hashKey);
        if (!salt || !expected) return false;
        const result = await derivePin(pin, salt);
        if (result.hash.length !== expected.length) return false;
        let difference = 0;
        for (let index = 0; index < result.hash.length; index += 1) difference |= result.hash.charCodeAt(index) ^ expected.charCodeAt(index);
        return difference === 0;
    }

    function setAuthMode(mode) {
        authMode = mode;
        authFeedback.textContent = "";
        pinInput.value = "";
        backupPinInput.value = "";
        const savedName = localStorage.getItem("curioName") || "";
        const setup = mode === "setup";
        const login = mode === "login";
        const recovery = mode === "recovery";
        nameField.hidden = !setup;
        nameInput.required = setup;
        nameInput.value = savedName;
        backupPinField.hidden = !setup;
        backupPinInput.required = setup;
        authRecovery.hidden = !login;
        authCancel.hidden = !recovery;

        if (setup) {
            document.querySelector("#login-title").textContent = "Create your PIN";
            loginDescription.textContent = "Create a local profile with a 4–8 digit PIN and a separate backup PIN.";
            pinLabel.textContent = "Create a 4–8 digit PIN";
            pinHelp.textContent = "Use this PIN to sign in on this device.";
            authSubmit.textContent = "Create local profile";
        } else if (login) {
            document.querySelector("#login-title").textContent = "Welcome back";
            loginDescription.textContent = `Enter the PIN for ${savedName || "this profile"}.`;
            pinLabel.textContent = "Your PIN";
            pinHelp.textContent = "Enter your 4–8 digit sign-in PIN.";
            authSubmit.textContent = "Sign in";
        } else if (recovery) {
            document.querySelector("#login-title").textContent = "Recover your PIN";
            loginDescription.textContent = "Enter the backup PIN you created for this device.";
            pinLabel.textContent = "Backup PIN";
            pinHelp.textContent = "Enter your 4–8 digit backup PIN to create a new sign-in PIN.";
            authSubmit.textContent = "Verify backup PIN";
        } else {
            document.querySelector("#login-title").textContent = "Set a new PIN";
            loginDescription.textContent = "Your backup PIN remains available for future recovery.";
            pinLabel.textContent = "New 4–8 digit PIN";
            pinHelp.textContent = "Choose a PIN different from your backup PIN.";
            authSubmit.textContent = "Save new PIN";
        }
    }

    function openLogin() {
        const hasPin = Boolean(localStorage.getItem("curioPinHash") && localStorage.getItem("curioBackupPinHash"));
        setAuthMode(hasPin ? "login" : "setup");
        if (typeof loginDialog.showModal === "function") loginDialog.showModal();
        else loginDialog.setAttribute("open", "");
        (hasPin ? pinInput : nameInput).focus();
    }
    loginButton.addEventListener("click", openLogin);
    document.querySelector("#join-button").addEventListener("click", openLogin);
    document.querySelector(".dialog-close").addEventListener("click", () => loginDialog.close());
    authRecovery.addEventListener("click", () => setAuthMode("recovery"));
    authCancel.addEventListener("click", () => setAuthMode("login"));
    loginDialog.addEventListener("close", () => {
        pinInput.value = "";
        backupPinInput.value = "";
    });
    loginDialog.addEventListener("click", event => {
        if (event.target === loginDialog) loginDialog.close();
    });
    document.querySelector("#login-form").addEventListener("submit", async event => {
        event.preventDefault();
        authFeedback.textContent = "";
        try {
            if (authMode === "setup") {
                const name = nameInput.value.trim();
                if (!name) { nameInput.focus(); return; }
                if (pinInput.value === backupPinInput.value) {
                    authFeedback.textContent = "Choose two different PINs so the backup can recover your account.";
                    backupPinInput.focus();
                    return;
                }
                const pin = await derivePin(pinInput.value);
                const backupPin = await derivePin(backupPinInput.value);
                localStorage.setItem("curioPinSalt", pin.salt);
                localStorage.setItem("curioPinHash", pin.hash);
                localStorage.setItem("curioBackupPinSalt", backupPin.salt);
                localStorage.setItem("curioBackupPinHash", backupPin.hash);
                localStorage.setItem("curioName", name);
                loginButton.textContent = `Hi, ${name}`;
                loginDialog.close();
                showToast("Local PIN profile created. This demo is not secure account authentication.");
            } else if (authMode === "login") {
                const valid = await verifyPin(pinInput.value, "curioPinSalt", "curioPinHash");
                if (!valid) {
                    authFeedback.textContent = "That PIN did not match. Try again or recover with your backup PIN.";
                    pinInput.focus();
                    return;
                }
                pinInput.value = "";
                loginDialog.close();
                showToast("PIN accepted for this local demo.");
            } else if (authMode === "recovery") {
                const valid = await verifyPin(pinInput.value, "curioBackupPinSalt", "curioBackupPinHash");
                if (!valid) {
                    authFeedback.textContent = "That backup PIN did not match. Try again.";
                    pinInput.focus();
                    return;
                }
                setAuthMode("reset");
                pinInput.focus();
            } else {
                const backupHash = localStorage.getItem("curioBackupPinHash");
                const backupSalt = localStorage.getItem("curioBackupPinSalt");
                if (!backupHash || !backupSalt) throw new Error("The backup PIN is missing. Create a new local profile to continue.");
                if (await verifyPin(pinInput.value, "curioBackupPinSalt", "curioBackupPinHash")) {
                    authFeedback.textContent = "Choose a new sign-in PIN that differs from your backup PIN.";
                    pinInput.focus();
                    return;
                }
                const newPin = await derivePin(pinInput.value);
                localStorage.setItem("curioPinSalt", newPin.salt);
                localStorage.setItem("curioPinHash", newPin.hash);
                pinInput.value = "";
                loginDialog.close();
                showToast("Your local sign-in PIN has been reset.");
            }
        } catch (error) {
            authFeedback.textContent = `Could not complete the PIN action: ${error.message}`;
        }
    });
    setAuthMode(localStorage.getItem("curioPinHash") && localStorage.getItem("curioBackupPinHash") ? "login" : "setup");

    function showToast(message) {
        const toast = document.querySelector("#toast");
        toast.textContent = message;
        toast.classList.add("visible");
        window.clearTimeout(showToast.timeout);
        showToast.timeout = window.setTimeout(() => toast.classList.remove("visible"), 3500);
    }

    const savedName = localStorage.getItem("curioName");
    if (savedName) loginButton.textContent = `Hi, ${savedName}`;
    const themeButton = document.querySelector(".theme-toggle");
    if (localStorage.getItem("curioTheme") === "light") document.body.classList.add("light-theme");
    function updateThemeButton() {
        const light = document.body.classList.contains("light-theme");
        themeButton.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
        themeButton.title = light ? "Switch to dark theme" : "Switch to light theme";
        themeButton.textContent = light ? "☾" : "☼";
    }
    updateThemeButton();
    themeButton.addEventListener("click", () => {
        document.body.classList.toggle("light-theme");
        localStorage.setItem("curioTheme", document.body.classList.contains("light-theme") ? "light" : "dark");
        updateThemeButton();
        drawGraph();
    });

    const menuToggle = document.querySelector(".menu-toggle");
    const mainNav = document.querySelector(".main-nav");
    menuToggle.addEventListener("click", () => {
        const expanded = menuToggle.getAttribute("aria-expanded") === "true";
        menuToggle.setAttribute("aria-expanded", String(!expanded));
        menuToggle.setAttribute("aria-label", expanded ? "Open navigation" : "Close navigation");
        mainNav.classList.toggle("open", !expanded);
    });
    mainNav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
        mainNav.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open navigation");
    }));

    updateGraph(graphState.expression);
})();
