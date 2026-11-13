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

    const quizQuestions = [
        { category: "GEOMETRY", question: "If you double a circle’s radius, what happens to its area?", answers: [["same", "It doubles"], ["four", "It becomes four times larger"], ["half", "It gets cut in half"]], correct: "four", explanation: "Area is πr². Doubling r multiplies r² by four." },
        { category: "CALCULUS", question: "For f(x) = x², what is the derivative at x = 3?", answers: [["three", "3"], ["six", "6"], ["nine", "9"]], correct: "six", explanation: "The derivative is f′(x) = 2x, so at x = 3 the slope is 6." },
        { category: "ARITHMETIC", question: "What is 48 ÷ 6 × 2?", answers: [["four", "4"], ["sixteen", "16"], ["twenty-four", "24"]], correct: "sixteen", explanation: "Multiplication and division have equal precedence, so work left to right: 48 ÷ 6 = 8, then 8 × 2 = 16." },
        { category: "TRIGONOMETRY", question: "What is sin(π / 2)?", answers: [["zero", "0"], ["one", "1"], ["minus-one", "−1"]], correct: "one", explanation: "At π / 2 radians, the unit-circle point has a y-coordinate of 1, which is the sine." },
        { category: "GEOMETRY", question: "What is the sum of the interior angles of a triangle?", answers: [["ninety", "90°"], ["one-eighty", "180°"], ["three-sixty", "360°"]], correct: "one-eighty", explanation: "The interior angles of every Euclidean triangle add up to 180°." },
        { category: "CALCULUS", question: "Which is an antiderivative of 2x?", answers: [["x-squared", "x² + C"], ["two-x-squared", "2x² + C"], ["constant", "2 + C"]], correct: "x-squared", explanation: "The derivative of x² is 2x, so ∫2x dx = x² + C." },
        { category: "ARITHMETIC", question: "What is 3/4 + 1/8?", answers: [["five-eighths", "5/8"], ["seven-eighths", "7/8"], ["one", "1"]], correct: "seven-eighths", explanation: "Convert 3/4 to 6/8, then add: 6/8 + 1/8 = 7/8." },
        { category: "TRIGONOMETRY", question: "What is cos(0)?", answers: [["zero", "0"], ["one", "1"], ["undefined", "Undefined"]], correct: "one", explanation: "On the unit circle, the point at angle 0 is (1, 0), so its cosine is 1." }
    ];
    const quizTopics = ["CALCULUS", "ARITHMETIC", "TRIGONOMETRY", "GEOMETRY"];
    const topicQuestionIndexes = { CALCULUS: 0, ARITHMETIC: 0, TRIGONOMETRY: 0, GEOMETRY: 0 };
    const quizLevels = [
        { points: 0, name: "Curious beginner" },
        { points: 40, name: "Pattern finder" },
        { points: 100, name: "Math explorer" },
        { points: 200, name: "Equation wizard" }
    ];
    let activeQuizTopic = "GEOMETRY";
    let quizPoints = Number(localStorage.getItem("curioQuizPoints") || 0);
    if (!Number.isFinite(quizPoints) || quizPoints < 0) quizPoints = 0;

    function currentQuizLevel() {
        let current = quizLevels[0];
        let next = quizLevels[1];
        for (let index = 1; index < quizLevels.length; index += 1) {
            if (quizPoints >= quizLevels[index].points) {
                current = quizLevels[index];
                next = quizLevels[index + 1] || null;
            }
        }
        return { current, next };
    }

    function updateQuizPoints() {
        const { current, next } = currentQuizLevel();
        document.querySelector("#quiz-points").textContent = String(quizPoints);
        document.querySelector("#quiz-level").textContent = current.name;
        if (next) {
            const progress = (quizPoints - current.points) / (next.points - current.points) * 100;
            document.querySelector("#quiz-next-level").textContent = `${quizPoints} / ${next.points} to ${next.name}`;
            document.querySelector("#quiz-progress-fill").style.width = `${Math.max(0, Math.min(100, progress))}%`;
        } else {
            document.querySelector("#quiz-next-level").textContent = "Top level reached!";
            document.querySelector("#quiz-progress-fill").style.width = "100%";
        }
    }

    function getTopicQuestions() {
        return quizQuestions.filter(item => item.category === activeQuizTopic);
    }

    updateQuizPoints();

    function renderQuestion() {
        const topicQuestions = getTopicQuestions();
        const questionIndex = topicQuestionIndexes[activeQuizTopic] % topicQuestions.length;
        const item = topicQuestions[questionIndex];
        document.querySelector("#quiz-question").textContent = item.question;
        document.querySelector("#quiz-category").textContent = item.category;
        document.querySelector("#quiz-number").textContent = `${String(questionIndex + 1).padStart(2, "0")} / ${String(topicQuestions.length).padStart(2, "0")}`;
        document.querySelectorAll(".quiz-topic-button").forEach(button => {
            const selected = button.dataset.topic === activeQuizTopic;
            button.classList.toggle("active", selected);
            button.setAttribute("aria-pressed", String(selected));
        });
        document.querySelector("#quiz-options").replaceChildren(...item.answers.map(([value, label]) => {
            const option = document.createElement("button");
            option.className = "quiz-option";
            option.type = "button";
            option.dataset.answer = value;
            option.textContent = label;
            return option;
        }));
        document.querySelector("#quiz-feedback").textContent = "";
        document.querySelector("#point-award").hidden = true;
        document.querySelector("#point-award").classList.remove("point-pop");
        document.querySelector("#quiz-next").hidden = true;
    }

    document.querySelectorAll(".quiz-topic-button").forEach(button => {
        button.addEventListener("click", () => {
            activeQuizTopic = button.dataset.topic;
            renderQuestion();
        });
    });

    document.querySelector("#quiz-options").addEventListener("click", event => {
        const option = event.target.closest(".quiz-option");
        if (!option || option.disabled) return;
        const topicQuestions = getTopicQuestions();
        const item = topicQuestions[topicQuestionIndexes[activeQuizTopic] % topicQuestions.length];
        const correct = option.dataset.answer === item.correct;
        if (correct) {
            const previousLevel = currentQuizLevel().current.name;
            document.querySelectorAll(".quiz-option").forEach(button => {
                button.disabled = true;
                if (button.dataset.answer === item.correct) button.classList.add("correct");
            });
            quizPoints += 10;
            localStorage.setItem("curioQuizPoints", String(quizPoints));
            updateQuizPoints();
            const pointAward = document.querySelector("#point-award");
            pointAward.textContent = "+10 POINTS!";
            pointAward.hidden = false;
            pointAward.classList.remove("point-pop");
            void pointAward.offsetWidth;
            pointAward.classList.add("point-pop");
            const levelMessage = currentQuizLevel().current.name !== previousLevel ? ` Level up: ${currentQuizLevel().current.name}!` : "";
            document.querySelector("#quiz-feedback").textContent = `${item.explanation}${levelMessage}`;
            document.querySelector("#quiz-next").hidden = false;
        } else {
            option.disabled = true;
            option.classList.add("incorrect");
            document.querySelector("#quiz-feedback").textContent = "Not quite—try another answer. No points deducted.";
        }
    });
    document.querySelector("#quiz-next").addEventListener("click", () => {
        const topicQuestions = getTopicQuestions();
        topicQuestionIndexes[activeQuizTopic] = (topicQuestionIndexes[activeQuizTopic] + 1) % topicQuestions.length;
        renderQuestion();
    });

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
