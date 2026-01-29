// Game State Management
class GameState {
    constructor() {
        this.protagonist = { name: '', description: '' };
        this.companions = [];
        this.storyHistory = [];
        this.currentContext = '';
        this.isAlive = true;
        this.chapterNumber = 1;
    }

    toJSON() {
        return {
            protagonist: this.protagonist,
            companions: this.companions,
            storyHistory: this.storyHistory,
            currentContext: this.currentContext,
            isAlive: this.isAlive,
            chapterNumber: this.chapterNumber
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
        this.startNewGame();
    }

    initializeUI() {
        this.elements = {
            storyText: document.getElementById('storyText'),
            choicesContainer: document.getElementById('choicesContainer'),
            slotMachine: document.getElementById('slotMachine'),
            rollButton: document.getElementById('rollButton'),
            protagonistName: document.getElementById('protagonistName'),
            companionsList: document.getElementById('companionsList'),
            deathOverlay: document.getElementById('deathOverlay'),
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

    async startNewGame() {
        this.state = new GameState();
        this.updateUI();
        this.showLoading();

        try {
            const response = await fetch('/api/story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'start',
                    state: this.state.toJSON()
                })
            });

            const data = await response.json();
            this.processStoryResponse(data);
        } catch (error) {
            console.error('Error starting game:', error);
            this.showError('Failed to start the chronicle. Please try again.');
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
        this.elements.storyText.innerHTML = '';

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

        paragraphs.forEach((para, index) => {
            if (para.trim()) {
                const p = document.createElement('p');
                p.textContent = para;
                p.style.animationDelay = `${(imageUrl ? index + 0.5 : index) * 0.3}s`;
                this.elements.storyText.appendChild(p);
            }
        });
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
        this.elements.storyText.innerHTML = `<p style="color: var(--sepia-medium); text-align: center;">${message}</p>`;
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
        // Update protagonist
        this.elements.protagonistName.textContent =
            this.state.protagonist.name || 'Unknown';

        // Update companions
        this.elements.companionsList.innerHTML = '';
        this.state.companions.forEach(companion => {
            const li = document.createElement('li');
            li.textContent = typeof companion === 'string' ? companion : companion.name;
            this.elements.companionsList.appendChild(li);
        });

        if (this.state.companions.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'None';
            li.style.fontStyle = 'italic';
            li.style.opacity = '0.6';
            this.elements.companionsList.appendChild(li);
        }
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
