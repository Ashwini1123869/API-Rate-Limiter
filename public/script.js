document.addEventListener('DOMContentLoaded', () => {
    // Initialize AOS
    AOS.init({
        duration: 800,
        once: true,
        easing: 'ease-out-cubic'
    });

    const themeToggle = document.getElementById('theme-toggle');
    const sendBtn = document.getElementById('send-request-btn');
    const endpointSelect = document.getElementById('endpoint-select');
    const resultContainer = document.getElementById('result-container');

    // Theme Toggle Logic
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        document.body.classList.toggle('light-mode');

        const icon = themeToggle.querySelector('i');
        if (document.body.classList.contains('dark-mode')) {
            icon.classList.replace('fa-sun', 'fa-moon');
        } else {
            icon.classList.replace('fa-moon', 'fa-sun');
        }
    });

    let isCooldown = false;

    // API Request Logic
    sendBtn.addEventListener('click', async () => {
        if (isCooldown) return;

        const endpoint = endpointSelect.value;
        setLoading(true);

        try {
            const response = await fetch(endpoint);

            // Check if response is JSON
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                console.error("Server returned non-JSON response:", text);
                throw new Error("Server did not return JSON. Check terminal for errors.");
            }

            const data = await response.json();

            if (response.status === 429) {
                showErrorCard(data);
            } else {
                showResultCard(data, response.status);
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            showResultCard({
                error: error.message || "Failed to connect to server",
                tip: "Make sure you RESTARTED the server after code changes."
            }, 500);
        } finally {
            // Only re-enable if not in cooldown
            if (!isCooldown) {
                setLoading(false);
            }
        }
    });

    function setLoading(isLoading) {
        if (isLoading) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
        } else {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<span class="btn-text">Send Request</span> <i class="fas fa-paper-plane"></i>';
        }
    }

    function showResultCard(data, status) {
        resultContainer.innerHTML = '';
        const card = document.createElement('div');
        card.className = 'card glass result-card fade-in';

        card.innerHTML = `
            <div class="card-header">
                <span class="status-badge ${status < 400 ? 'status-success' : 'status-error'}">
                    Status: ${status}
                </span>
                <h3>Response</h3>
            </div>
            <pre><code>${JSON.stringify(data, null, 2)}</code></pre>
        `;

        resultContainer.appendChild(card);
    }

    function showErrorCard(data) {
        resultContainer.innerHTML = '';
        const card = document.createElement('div');
        card.className = 'card glass result-card error-ui fade-in';

        const cooldownSeconds = data.try_after_seconds || 4;

        // Activate cooldown
        isCooldown = true;
        sendBtn.disabled = true;
        sendBtn.classList.add('btn-disabled');
        sendBtn.innerHTML = '<i class="fas fa-lock"></i> Locked';

        card.innerHTML = `
            <div class="error-title">
                <i class="fas fa-exclamation-triangle"></i>
                Rate Limit Exceeded
            </div>
            <p style="margin-top: 1rem;">${data.message}</p>
            <div class="countdown">
                Please wait <span id="timer">${cooldownSeconds}</span> seconds before trying again.
            </div>
            <div style="margin-top: 1.5rem">
                <div class="progress-bar-bg" style="height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px;">
                    <div id="progress" style="height: 100%; background: var(--error-color); width: 100%; transition: width linear;"></div>
                </div>
            </div>
        `;

        resultContainer.appendChild(card);

        // Progress bar animation
        const prog = card.querySelector('#progress');
        prog.style.transition = `width ${cooldownSeconds}s linear`;
        setTimeout(() => prog.style.width = '0%', 10);

        // Countdown timer and re-enable button
        const timerSpan = card.querySelector('#timer');
        let timeLeft = cooldownSeconds;

        const interval = setInterval(() => {
            timeLeft--;
            if (timerSpan) timerSpan.innerText = timeLeft;

            if (timeLeft <= 0) {
                clearInterval(interval);
                isCooldown = false; // Release cooldown
                sendBtn.disabled = false;
                sendBtn.classList.remove('btn-disabled');
                sendBtn.innerHTML = '<span class="btn-text">Send Request</span> <i class="fas fa-paper-plane"></i>';
            }
        }, 1000);
    }
});
