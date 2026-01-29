// Game State Management
class GameState {
    constructor() {
        this.protagonist = { name: '', description: '' };
        this.companions = [];
        this.storyHistory = [];
        this.currentContext = '';
        this.isAlive = true;
        this.pageNumber = 1;
    }

    toJSON() {
        return {
            protagonist: this.protagonist,
            companions: this.companions,
            storyHistory: this.storyHistory,
            currentContext: this.currentContext,
            isAlive: this.isAlive,
            pageNumber: this.pageNumber
        };
    }

    static fromJSON(data) {
        const state = new GameState();
        Object.assign(state, data);
        return state;
    }
}

// Main Game Controller
class AIChronicle {
    constructor() {
        this.state = new GameState();
        this.initializeUI();
        this.checkHealth();
    }

    initializeUI() {
        this.elements = {
            storyText: document.getElementById('storyText'),
            choicesContainer: document.getElementById('choicesContainer'),
            slotMachine: document.getElementById('slotMachine'),
            rollButton: document.getElementById('rollButton'),
            deathOverlay: document.getElementById('deathOverlay'),
            pageIndicator: document.getElementById('pageIndicator'),
            newGameBtn: document.getElementById('newGameBtn'),
            saveGameBtn: document.getElementById('saveGameBtn'),
            loadGameBtn: document.getElementById('loadGameBtn')
        };

        // Event Listeners
        this.elements.rollButton.addEventListener('click', () => this.rollDice());
        this.elements.newGameBtn.addEventListener('click', () => this.startNewGame());
        this.elements.saveGameBtn.addEventListener('click', () => this.saveGame());
        this.elements.loadGameBtn.addEventListener('click', () => this.loadGame());
    }

    async checkHealth() {
        this.showLoading();

        try {
            console.log('[Health Check] Starting health check...');
            const response = await fetch('/api/health', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            console.log('[Health Check] Response status:', response.status);
            console.log('[Health Check] Response headers:', Object.fromEntries(response.headers.entries()));

            let health;
            try {
                const text = await response.text();
                console.log('[Health Check] Response body:', text);
                health = JSON.parse(text);
            } catch (parseError) {
                console.error('[Health Check] Failed to parse response:', parseError);
                this.showError(`Server Error\n\nThe server returned an invalid response.\n\nThis might be a deployment issue. Try refreshing the page.\n\nTechnical details: ${parseError.message}`);
                return;
            }

            console.log('[Health Check] Parsed response:', health);

            if (health.status === 'error') {
                const keyStatus = `- ANTHROPIC_API_KEY: ${health.checks?.anthropicKey?.format || 'unknown'}\n- OPENAI_API_KEY: ${health.checks?.openaiKey?.format || 'unknown'}`;
                this.showError(`Configuration Error\n\n${health.message}\n\nAPI Key Status:\n${keyStatus}\n\nTo fix this:\n1. Go to Vercel Dashboard\n2. Select your project\n3. Go to Settings → Environment Variables\n4. Add the missing keys\n5. Redeploy the project`);
                return;
            }

            if (health.status === 'warning') {
                console.warn('[Health Check] Warning:', health.message);
            }

            console.log('[Health Check] Health check passed, starting game...');
            // Health check passed, start the game
            this.startNewGame();

        } catch (error) {
            console.error('[Health Check] Failed:', error);
            console.error('[Health Check] Error stack:', error.stack);
            this.showError(`Failed to Connect to Game Server\n\n${error.message}\n\nPossible causes:\n- Deployment is still in progress\n- Server is temporarily unavailable\n- Network connectivity issues\n\nTry:\n1. Refresh the page\n2. Check your internet connection\n3. Wait a minute and try again`);
        }
    }

    async startNewGame() {
        console.log('[Game] Starting new game...');
        this.state = new GameState();
        this.updateUI();
        this.showLoading();

        try {
            const requestBody = {
                action: 'start',
                state: this.state.toJSON()
            };

            console.log('[Game] Sending request to /api/story:', requestBody);

            const response = await fetch('/api/story', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            console.log('[Game] Response status:', response.status);
            console.log('[Game] Response headers:', Object.fromEntries(response.headers.entries()));

            let data;
            try {
                const text = await response.text();
                console.log('[Game] Response body (first 500 chars):', text.substring(0, 500));
                data = JSON.parse(text);
            } catch (parseError) {
                console.error('[Game] Failed to parse response:', parseError);
                throw new Error(`Server returned invalid JSON: ${parseError.message}`);
            }

            console.log('[Game] Parsed response:', data);

            // Check if response is an error
            if (data.error || !response.ok) {
                const errorMsg = data.message || `HTTP ${response.status}: ${response.statusText}`;
                const hint = data.hint || '';
                const fullError = hint ? `${errorMsg}\n\n${hint}` : errorMsg;
                throw new Error(fullError);
            }

            console.log('[Game] Successfully received story data');
            this.processStoryResponse(data);

        } catch (error) {
            console.error('[Game] Error starting game:', error);
            console.error('[Game] Error stack:', error.stack);

            const detailedError = error.message || 'Unknown error occurred';
            this.showError(`Failed to Start the Chronicle\n\n${detailedError}\n\nDebugging info:\n- Check browser console (F12) for detailed logs\n- Verify API keys are set in Vercel\n- Ensure deployment completed successfully`);
        }
    }

    async makeChoice(choice) {
        this.clearChoices();
        this.showLoading();

        try {
            const response = await fetch('/api/story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'choice',
                    choice: choice,
                    state: this.state.toJSON()
                })
            });

            const data = await response.json();
            this.processStoryResponse(data);
        } catch (error) {
            console.error('Error making choice:', error);
            this.showError('Failed to process your choice. Please try again.');
        }
    }

    processStoryResponse(data) {
        // Update state
        if (data.protagonist) {
            this.state.protagonist = data.protagonist;
        }
        if (data.companions) {
            this.state.companions = data.companions;
        }

        // Add to story history
        if (data.text) {
            this.state.storyHistory.push(data.text);
            this.displayStoryText(data.text, data.imageUrl);
        }

        // Update context
        if (data.context) {
            this.state.currentContext = data.context;
        }

        // Check for death
        if (data.isDead) {
            this.state.isAlive = false;
            this.triggerDeath(data.deathMessage);
            return;
        }

        // Show slot machine if needed
        if (data.requiresDiceRoll) {
            this.showSlotMachine(data.probability, data.rollReason);
            this.pendingRollData = data;
            return;
        }

        // Show choices if available
        if (data.choices && data.choices.length > 0) {
            this.displayChoices(data.choices);
        } else {
            // Continue story automatically
            setTimeout(() => this.continueStory(), 2000);
        }

        this.updateUI();
    }

    async continueStory() {
        this.showLoading();

        try {
            const response = await fetch('/api/story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'continue',
                    state: this.state.toJSON()
                })
            });

            const data = await response.json();
            this.processStoryResponse(data);
        } catch (error) {
            console.error('Error continuing story:', error);
            this.showError('Failed to continue the chronicle.');
        }
    }

    async rollDice() {
        this.elements.rollButton.disabled = true;

        const dice = [
            document.getElementById('die1'),
            document.getElementById('die2'),
            document.getElementById('die3')
        ];

        // Animate dice rolling
        dice.forEach(die => die.classList.add('rolling'));

        const diceFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        let rollCount = 0;
        const maxRolls = 20;

        const rollInterval = setInterval(() => {
            dice.forEach(die => {
                die.textContent = diceFaces[Math.floor(Math.random() * 6)];
            });

            rollCount++;
            if (rollCount >= maxRolls) {
                clearInterval(rollInterval);
                dice.forEach(die => die.classList.remove('rolling'));
                this.resolveDiceRoll();
            }
        }, 100);
    }

    async resolveDiceRoll() {
        const probability = this.pendingRollData?.probability || 0.5;
        const roll = Math.random();
        const success = roll < probability;

        // Show final dice result
        const dice = [
            document.getElementById('die1'),
            document.getElementById('die2'),
            document.getElementById('die3')
        ];

        const resultFaces = success ? ['⚄', '⚄', '⚅'] : ['⚀', '⚁', '⚀'];
        dice.forEach((die, i) => {
            die.textContent = resultFaces[i];
        });

        await this.delay(1500);

        this.hideSlotMachine();
        this.showLoading();

        try {
            const response = await fetch('/api/story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'dice_result',
                    success: success,
                    previousData: this.pendingRollData,
                    state: this.state.toJSON()
                })
            });

            const data = await response.json();
            this.pendingRollData = null;
            this.processStoryResponse(data);
        } catch (error) {
            console.error('Error resolving dice roll:', error);
            this.showError('Failed to resolve the dice roll.');
        }
    }

    showSlotMachine(probability, reason) {
        this.elements.slotMachine.classList.remove('hidden');
        const probText = `Chance of success: ${Math.round(probability * 100)}%`;
        this.elements.slotMachine.querySelector('.slot-probability').textContent = probText;
        this.elements.rollButton.disabled = false;
    }

    hideSlotMachine() {
        this.elements.slotMachine.classList.add('hidden');
    }

    displayStoryText(text, imageUrl = null) {
        // Don't clear - append to existing text for continuous story
        // this.elements.storyText.innerHTML = '';

        // Add image if provided
        if (imageUrl) {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'story-image-container';
            const img = document.createElement('img');
            img.src = imageUrl;
            img.className = 'story-image';
            img.alt = 'Scene illustration';
            imgContainer.appendChild(img);
            this.elements.storyText.appendChild(imgContainer);
        }

        const paragraphs = text.split('\n\n');
        const currentParagraphCount = this.elements.storyText.querySelectorAll('p:not(.loading)').length;

        paragraphs.forEach((para, index) => {
            if (para.trim()) {
                const p = document.createElement('p');
                p.textContent = para;
                p.style.animationDelay = `${index * 0.3}s`;
                this.elements.storyText.appendChild(p);
            }
        });

        // Increment page every ~500 words (roughly 2 pages per story segment)
        const wordCount = text.split(/\s+/).length;
        if (wordCount > 200) {
            this.state.pageNumber += Math.floor(wordCount / 250);
            this.updateUI();
        }

        // Scroll to bottom to show new content
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }

    displayChoices(choices) {
        this.elements.choicesContainer.innerHTML = '';

        choices.forEach(choice => {
            const button = document.createElement('button');
            button.className = 'choice-btn';
            button.innerHTML = `
                <div>${choice.text}</div>
                ${choice.probability ? `<div class="choice-probability">Chance: ${Math.round(choice.probability * 100)}%</div>` : ''}
            `;
            button.addEventListener('click', () => this.makeChoice(choice));
            this.elements.choicesContainer.appendChild(button);
        });
    }

    clearChoices() {
        this.elements.choicesContainer.innerHTML = '';
    }

    showLoading() {
        this.elements.storyText.innerHTML = '<p class="loading">The Chronicle continues...</p>';
    }

    showError(message) {
        // Convert line breaks to HTML with better spacing
        const formattedMessage = message
            .replace(/\n\n/g, '</p><p style="margin: 1rem 0; line-height: 1.6;">')
            .replace(/\n/g, '<br>');

        this.elements.storyText.innerHTML = `
            <div style="color: var(--sepia-medium); padding: 2rem; max-width: 700px; margin: 0 auto; text-align: left;">
                <p style="margin-bottom: 1.5rem; font-weight: bold; font-size: 1.2rem; text-align: center;">⚠️ Error</p>
                <p style="margin: 1rem 0; line-height: 1.6;">${formattedMessage}</p>
                <p style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--sepia-light); font-size: 0.9rem; text-align: center; opacity: 0.8;">
                    Press F12 to open browser console for technical details
                </p>
            </div>
        `;
    }

    triggerDeath(deathMessage) {
        if (deathMessage) {
            this.displayStoryText(deathMessage);
        }

        setTimeout(() => {
            this.elements.deathOverlay.classList.add('active');

            setTimeout(() => {
                if (confirm('Your story has ended. Begin a new chronicle?')) {
                    this.elements.deathOverlay.classList.remove('active');
                    this.startNewGame();
                }
            }, 4000);
        }, 3000);
    }

    updateUI() {
        // Update page number
        this.elements.pageIndicator.textContent = `Page ${this.state.pageNumber}`;
    }

    saveGame() {
        const saveData = JSON.stringify(this.state.toJSON());
        localStorage.setItem('aiChronicle_save', saveData);
        alert('Chronicle saved!');
    }

    loadGame() {
        const saveData = localStorage.getItem('aiChronicle_save');
        if (saveData) {
            try {
                this.state = GameState.fromJSON(JSON.parse(saveData));
                this.updateUI();

                // Display last story entry
                if (this.state.storyHistory.length > 0) {
                    const lastEntry = this.state.storyHistory[this.state.storyHistory.length - 1];
                    this.displayStoryText(lastEntry);
                }

                // Continue story
                this.continueStory();
                alert('Chronicle loaded!');
            } catch (error) {
                console.error('Error loading save:', error);
                alert('Failed to load chronicle.');
            }
        } else {
            alert('No saved chronicle found.');
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new AIChronicle();
});
