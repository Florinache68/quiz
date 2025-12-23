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
const bestGradeDisplay = document.getElementById('best-grade-display');

// Timer Elements
const timeSelect = document.getElementById('time-select');
const timeDisplayInfo = document.getElementById('time-display-info');
const timerBadge = document.getElementById('timer-badge');
const timerDisplay = document.getElementById('timer-display');

// Init
startBtn.addEventListener('click', startQuiz);
nextBtn.addEventListener('click', nextQuestion);
restartBtn.addEventListener('click', restartQuiz);
updateBestGradeDisplay(); // Load stored best score on init

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

// Helper: Shuffle Array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Helper: Best Grade
function updateBestGradeDisplay() {
    const stored = localStorage.getItem('quizBestGrade');
    if (stored) {
        bestGradeDisplay.textContent = parseFloat(stored).toFixed(2);
    } else {
        bestGradeDisplay.textContent = "-";
    }
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
        endTime = Date.now() + timeLimitSeconds * 1000;
        updateTimer();
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
    let remaining = Math.ceil((endTime - now) / 1000);

    if (remaining <= 0) {
        timerDisplay.textContent = "00:00";
        finishQuiz();
        return;
    }

    const m = Math.floor(remaining / 60).toString().padStart(2, '0');
    const s = (remaining % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${m}:${s}`;

    if (remaining <= 30) {
        timerBadge.classList.add('warning');
    }
}

// Render Current Question
function renderQuestion() {
    const question = assignedQuestions[currentQuestionIndex];
    questionText.textContent = question.question;
    questionCount.textContent = `Întrebarea ${currentQuestionIndex + 1} / ${assignedQuestions.length}`;

    const progress = ((currentQuestionIndex) / assignedQuestions.length) * 100;
    progressBar.style.width = `${progress}%`;

    optionsContainer.innerHTML = '';

    const hasAnswer = userAnswers[question.id] !== undefined;
    nextBtn.disabled = !hasAnswer;

    if (!shuffledOptionsMap[question.id]) {
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
    options.forEach((optObj) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = optObj.text;

        if (userAnswers[question.id] === optObj.originalIndex) {
            btn.classList.add('selected');
        }

        btn.onclick = () => selectSingle(optObj.originalIndex, btn);
        optionsContainer.appendChild(btn);
    });
}

function selectSingle(originalIndex, btn) {
    Array.from(optionsContainer.children).forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    userAnswers[assignedQuestions[currentQuestionIndex].id] = originalIndex;
    nextBtn.disabled = false;
}

function renderMultipleChoice(question, options) {
    const currentId = question.id;
    if (!userAnswers[currentId]) userAnswers[currentId] = [];

    options.forEach((optObj) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = optObj.text;

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

    options.forEach((optObj) => {
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

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < assignedQuestions.length) {
        renderQuestion();
    } else {
        finishQuiz();
    }
}

function finishQuiz() {
    clearInterval(timerInterval);
    calculateScore();

    quizScreen.classList.add('hidden');
    quizScreen.classList.remove('active');
    resultScreen.classList.remove('hidden');
    resultScreen.classList.add('active');

    // NOTE: score is now a float
    finalScore.textContent = parseFloat(score.toFixed(2));

    // Calculate Grade (1-10)
    // Formula: (Points / TotalMaxPoints) * 9 + 1
    // Calculate max possible points for the assigned questions
    const maxPoints = assignedQuestions.reduce((sum, q) => sum + (q.points || 1), 0);

    let grade = 1;
    if (maxPoints > 0) {
        grade = (score / maxPoints) * 9 + 1;
    }

    // Save High Score
    const storedBest = localStorage.getItem('quizBestGrade');
    let best = storedBest ? parseFloat(storedBest) : 0;

    let messageSuffix = "";
    if (grade > best) {
        localStorage.setItem('quizBestGrade', grade.toFixed(2));
        messageSuffix = " - RECORD NOU! 🌟";
        updateBestGradeDisplay(); // Update UI for when they go back
    }

    // Update Feedback to show Grade
    if (grade >= 10) feedbackText.textContent = `Nota: ${grade.toFixed(2)} - Excelent! 🏆${messageSuffix}`;
    else if (grade >= 9) feedbackText.textContent = `Nota: ${grade.toFixed(2)} - Foarte bine!${messageSuffix}`;
    else if (grade >= 7) feedbackText.textContent = `Nota: ${grade.toFixed(2)} - Bun!${messageSuffix}`;
    else if (grade >= 5) feedbackText.textContent = `Nota: ${grade.toFixed(2)} - Ai trecut.${messageSuffix}`;
    else feedbackText.textContent = `Nota: ${grade.toFixed(2)} - Mai învață.${messageSuffix}`;
}

function calculateScore() {
    score = 0;
    const reviewList = document.getElementById('review-list');
    const reviewContainer = document.getElementById('review-container');
    reviewList.innerHTML = '';

    const results = [];

    assignedQuestions.forEach(q => {
        const userAnswer = userAnswers[q.id];
        const questionValue = q.points || 1; // Default to 1 if not set
        let points = 0;
        let status = 'wrong'; // correct, partial, wrong

        if (userAnswer === undefined || (Array.isArray(userAnswer) && userAnswer.length === 0)) {
            // No answer
            points = 0;
            status = 'wrong';
        } else {
            if (q.type === 'single' || q.type === 'dropdown') {
                if (userAnswer === q.correctAnswer) {
                    points = questionValue;
                    status = 'correct';
                } else {
                    points = 0;
                    status = 'wrong';
                }
            } else if (q.type === 'multiple') {
                // Partial scoring logic
                const correctOptions = q.correctAnswer; // Array of correct indices
                const userOptions = userAnswer || [];

                let matches = 0;
                let mistakes = 0;

                // Count correct picks
                userOptions.forEach(idx => {
                    if (correctOptions.includes(idx)) matches++;
                    else mistakes++;
                });

                // Algorithm: (Matches - Mistakes) / TotalCorrect
                // Clamped at 0
                const rawRatio = (matches - mistakes) / correctOptions.length;
                const ratio = Math.max(0, rawRatio);

                points = ratio * questionValue;

                if (ratio === 1) status = 'correct';
                else if (ratio > 0) status = 'partial';
                else status = 'wrong';
            }
        }

        score += points;

        results.push({
            question: q,
            userAnswer: userAnswer,
            points: points,
            maxPoints: questionValue,
            status: status
        });
    });

    // Sort: Correct -> Partial -> Wrong
    const priority = { 'correct': 0, 'partial': 1, 'wrong': 2 };
    results.sort((a, b) => priority[a.status] - priority[b.status]);

    // Render
    results.forEach(res => {
        const item = document.createElement('div');
        let iconChar = '❌';
        let statusClass = 'wrong';

        if (res.status === 'correct') {
            iconChar = '✅';
            statusClass = 'correct';
        } else if (res.status === 'partial') {
            iconChar = '⚠️';
            statusClass = 'partial';
        }

        item.className = `review-item ${statusClass}`;

        const icon = document.createElement('span');
        icon.className = 'review-result-icon';
        icon.textContent = `${iconChar} (${parseFloat(res.points.toFixed(2))} / ${res.maxPoints}p)`;

        let userText = getUserAnswerText(res.question, res.userAnswer);
        let correctText = getCorrectAnswerText(res.question);

        item.innerHTML = `
            ${icon.outerHTML}
            <div class="review-question">${res.question.question}</div>
            <div class="review-answer">Răspunsul tău: ${userText}</div>
            ${res.status !== 'correct' ? `<div class="review-answer review-correct">Răspuns corect: ${correctText}</div>` : ''}
        `;
        reviewList.appendChild(item);
    });

    reviewContainer.classList.remove('hidden');
}

function getUserAnswerText(q, answer) {
    if (answer === undefined || answer === null || (Array.isArray(answer) && answer.length === 0)) return "Niciun răspuns";

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
    // Return to start screen
    resultScreen.classList.remove('active');
    resultScreen.classList.add('hidden');

    startScreen.classList.remove('hidden');
    startScreen.classList.add('active');

    updateBestGradeDisplay(); // Refresh high score display
}

loadQuestions();
