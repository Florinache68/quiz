// State
let allQuestions = [];
let assignedQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {}; // Map question ID to answer(s)
let shuffledOptionsMap = {}; // Map question ID to shuffled indices array
let score = 0;
let timerInterval;
let timeLimitSeconds = 0; // 0 means unlimited
let endTime;

// Elements
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const startBtn = document.getElementById('start-btn');
const nextBtn = document.getElementById('next-btn');
const restartBtn = document.getElementById('restart-btn');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const progressBar = document.getElementById('progress-bar');
const questionCount = document.getElementById('question-count');
const finalScore = document.getElementById('final-score');
const totalQuestionsSpan = document.querySelector('.total');
const feedbackText = document.getElementById('feedback-text');

// Timer Elements
const timeSelect = document.getElementById('time-select');
const timeDisplayInfo = document.getElementById('time-display-info');
const timerBadge = document.getElementById('timer-badge');
const timerDisplay = document.getElementById('timer-display');

// Init
startBtn.addEventListener('click', startQuiz);
nextBtn.addEventListener('click', nextQuestion);
restartBtn.addEventListener('click', restartQuiz);

// Update info when selection changes
timeSelect.addEventListener('change', (e) => {
    const val = parseInt(e.target.value);
    if (val === 0) timeDisplayInfo.textContent = "Nelimitat";
    else timeDisplayInfo.textContent = `${val / 60} Minute`;
});

// Fetch Questions
async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        allQuestions = await response.json();
    } catch (error) {
        console.error('Error loading questions:', error);
        alert('Eroare la încărcarea întrebărilor. Verifică consola (CORS sau fișier lipsă).');
    }
}

// Helper: Shuffle Array (Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Start Quiz
function startQuiz() {
    score = 0;
    currentQuestionIndex = 0;
    userAnswers = {};
    shuffledOptionsMap = {};

    // Select random questions tracking original data
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
    assignedQuestions = shuffled.slice(0, Math.min(21, shuffled.length));

    // Update Result total text
    totalQuestionsSpan.textContent = `/ ${assignedQuestions.length}`;

    // Timer Setup
    timeLimitSeconds = parseInt(timeSelect.value);
    clearInterval(timerInterval);

    if (timeLimitSeconds > 0) {
        timerBadge.classList.remove('hidden');
        timerBadge.classList.remove('warning');
        // Set end timestamp
        endTime = Date.now() + timeLimitSeconds * 1000;
        updateTimer(); // Immediate update
        timerInterval = setInterval(updateTimer, 1000);
    } else {
        timerBadge.classList.add('hidden');
    }

    // Switch screens
    startScreen.classList.add('hidden');
    startScreen.classList.remove('active');
    quizScreen.classList.remove('hidden');
    quizScreen.classList.add('active');
    resultScreen.classList.add('hidden');
    resultScreen.classList.remove('active');

    renderQuestion();
}

function updateTimer() {
    const now = Date.now();
    const remaining = Math.ceil((endTime - now) / 1000);

    if (remaining <= 0) {
        timerDisplay.textContent = "00:00";
        finishQuiz();
        return;
    }

    const m = Math.floor(remaining / 60).toString().padStart(2, '0');
    const s = (remaining % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${m}:${s}`;

    // Warning styling (< 30s)
    if (remaining <= 30) {
        timerBadge.classList.add('warning');
    }
}

// Render Current Question
function renderQuestion() {
    const question = assignedQuestions[currentQuestionIndex];
    questionText.textContent = question.question;
    questionCount.textContent = `Întrebarea ${currentQuestionIndex + 1} / ${assignedQuestions.length}`;

    // Update Progress Bar
    const progress = ((currentQuestionIndex) / assignedQuestions.length) * 100;
    progressBar.style.width = `${progress}%`;

    optionsContainer.innerHTML = '';

    // Check if we already have an answer for this question (e.g. if we add back button later)
    // For now nextBtn defaults disabled, unless answer exists
    const hasAnswer = userAnswers[question.id] !== undefined;
    nextBtn.disabled = !hasAnswer;

    // Shuffle options for this specific question instance if not already done
    if (!shuffledOptionsMap[question.id]) {
        // Create array of objects { originalIndex, text }
        const optionsWithIndices = question.options.map((opt, i) => ({ originalIndex: i, text: opt }));
        shuffleArray(optionsWithIndices);
        shuffledOptionsMap[question.id] = optionsWithIndices;
    }

    const currentShuffledOptions = shuffledOptionsMap[question.id];

    if (question.type === 'single') {
        renderSingleChoice(question, currentShuffledOptions);
    } else if (question.type === 'multiple') {
        renderMultipleChoice(question, currentShuffledOptions);
    } else if (question.type === 'dropdown') {
        renderDropdown(question, currentShuffledOptions);
    }
}

function renderSingleChoice(question, options) {
    options.forEach((optObj, visualIndex) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = optObj.text;

        // Restore selected state if exists
        if (userAnswers[question.id] === optObj.originalIndex) {
            btn.classList.add('selected');
        }

        btn.onclick = () => selectSingle(optObj.originalIndex, btn);
        optionsContainer.appendChild(btn);
    });
}

function selectSingle(originalIndex, btn) {
    // Deselect all
    Array.from(optionsContainer.children).forEach(b => b.classList.remove('selected'));
    // Select clicked
    btn.classList.add('selected');

    // Save answer
    userAnswers[assignedQuestions[currentQuestionIndex].id] = originalIndex;
    nextBtn.disabled = false;
}

function renderMultipleChoice(question, options) {
    const currentId = question.id;
    if (!userAnswers[currentId]) userAnswers[currentId] = [];

    options.forEach((optObj, visualIndex) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = optObj.text;

        // Restore state
        if (userAnswers[currentId].includes(optObj.originalIndex)) {
            btn.classList.add('selected');
        }

        btn.onclick = () => toggleMultiple(optObj.originalIndex, btn, currentId);
        optionsContainer.appendChild(btn);
    });
}

function toggleMultiple(originalIndex, btn, questionId) {
    btn.classList.toggle('selected');

    const selectedIndices = userAnswers[questionId];
    if (btn.classList.contains('selected')) {
        selectedIndices.push(originalIndex);
    } else {
        const idx = selectedIndices.indexOf(originalIndex);
        if (idx > -1) selectedIndices.splice(idx, 1);
    }

    // Enable next if at least one selected
    nextBtn.disabled = selectedIndices.length === 0;
}

function renderDropdown(question, options) {
    const select = document.createElement('select');
    select.className = 'quiz-select';

    const defaultOption = document.createElement('option');
    defaultOption.textContent = 'Alege un răspuns...';
    defaultOption.value = '';
    defaultOption.disabled = true;
    if (userAnswers[question.id] === undefined) {
        defaultOption.selected = true;
    }
    select.appendChild(defaultOption);

    options.forEach((optObj, visualIndex) => {
        const option = document.createElement('option');
        option.value = optObj.originalIndex;
        option.textContent = optObj.text;
        if (userAnswers[question.id] === optObj.originalIndex) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    select.onchange = (e) => {
        userAnswers[assignedQuestions[currentQuestionIndex].id] = parseInt(e.target.value);
        nextBtn.disabled = false;
    };

    optionsContainer.appendChild(select);
}

// Next Question
function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < assignedQuestions.length) {
        renderQuestion();
    } else {
        finishQuiz();
    }
}

// Finish & Grading
function finishQuiz() {
    clearInterval(timerInterval); // Stop timer
    calculateScore();

    quizScreen.classList.add('hidden');
    quizScreen.classList.remove('active');
    resultScreen.classList.remove('hidden');
    resultScreen.classList.add('active');

    finalScore.textContent = score;

    // Feedback text
    const percentage = score / assignedQuestions.length;
    if (percentage === 1) feedbackText.textContent = "Perfect! Ești un expert!";
    else if (percentage >= 0.8) feedbackText.textContent = "Foarte bine! Mai ai puțin.";
    else if (percentage >= 0.5) feedbackText.textContent = "Bun, dar mai repetă.";
    else feedbackText.textContent = "Mai învață și revino!";
}

function calculateScore() {
    score = 0;
    const reviewList = document.getElementById('review-list');
    const reviewContainer = document.getElementById('review-container');
    reviewList.innerHTML = '';

    // Collect results
    const results = [];

    assignedQuestions.forEach(q => {
        const userAnswer = userAnswers[q.id];
        let isCorrect = false;

        // Handle no answer (timed out)
        if (userAnswer === undefined || (Array.isArray(userAnswer) && userAnswer.length === 0)) {
            isCorrect = false;
        } else {
            if (q.type === 'single' || q.type === 'dropdown') {
                if (userAnswer === q.correctAnswer) {
                    isCorrect = true;
                }
            } else if (q.type === 'multiple') {
                // Ensure arrays comparison is safe
                const correct = [...q.correctAnswer].sort((a, b) => a - b);
                const user = [...userAnswer].sort((a, b) => a - b); // copy to avoid mutating state

                if (JSON.stringify(correct) === JSON.stringify(user)) {
                    isCorrect = true;
                }
            }
        }

        if (isCorrect) score++;

        results.push({
            question: q,
            userAnswer: userAnswer,
            isCorrect: isCorrect
        });
    });

    // Sort: Correct first
    results.sort((a, b) => {
        if (a.isCorrect && !b.isCorrect) return -1;
        if (!a.isCorrect && b.isCorrect) return 1;
        return 0;
    });

    // Render
    results.forEach(res => {
        const item = document.createElement('div');
        item.className = `review-item ${res.isCorrect ? 'correct' : 'wrong'}`;

        // Icon
        const icon = document.createElement('span');
        icon.className = 'review-result-icon';
        icon.textContent = res.isCorrect ? '✅' : '❌';

        let userText = getUserAnswerText(res.question, res.userAnswer);
        let correctText = getCorrectAnswerText(res.question);

        item.innerHTML = `
            ${icon.outerHTML}
            <div class="review-question">${res.question.question}</div>
            <div class="review-answer ${res.isCorrect ? 'review-correct' : 'review-wrong'}">Răspunsul tău: ${userText}</div>
            ${!res.isCorrect ? `<div class="review-answer review-correct">Răspuns corect: ${correctText}</div>` : ''}
        `;
        reviewList.appendChild(item);
    });

    reviewContainer.classList.remove('hidden');
}

function getUserAnswerText(q, answer) {
    if (answer === undefined || answer === null || (Array.isArray(answer) && answer.length === 0)) return "Niciun răspuns (Timp expirat)";

    if (q.type === 'single' || q.type === 'dropdown') {
        const opt = q.options[answer];
        return opt;
    } else if (q.type === 'multiple') {
        return answer.map(idx => q.options[idx]).join(', ');
    }
    return "";
}

function getCorrectAnswerText(q) {
    if (q.type === 'single' || q.type === 'dropdown') {
        return q.options[q.correctAnswer];
    } else if (q.type === 'multiple') {
        return q.correctAnswer.map(idx => q.options[idx]).join(', ');
    }
    return "";
}

function restartQuiz() {
    // Reset selection in UI to unlimited or keep last choice? 
    // Usually keep last choice is better UX or reset to default. 
    // Let's just call startQuiz which reads the dropdown current value.
    startQuiz();
}

// Load on start
loadQuestions();
