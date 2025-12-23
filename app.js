// State
let allQuestions = [];
let assignedQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {}; // Map question ID to answer(s)
let score = 0;

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

// Init
startBtn.addEventListener('click', startQuiz);
nextBtn.addEventListener('click', nextQuestion);
restartBtn.addEventListener('click', restartQuiz);

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

// Start Quiz
function startQuiz() {
    score = 0;
    currentQuestionIndex = 0;
    userAnswers = {};

    // Select random questions tracking original data
    // Shuffle copy of array
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
    // Get up to 21 questions
    assignedQuestions = shuffled.slice(0, Math.min(21, shuffled.length));

    // Update Result total text based on actual number of questions
    totalQuestionsSpan.textContent = `/ ${assignedQuestions.length}`;

    // Switch screens
    startScreen.classList.add('hidden');
    startScreen.classList.remove('active');
    quizScreen.classList.remove('hidden');
    quizScreen.classList.add('active');
    resultScreen.classList.add('hidden');
    resultScreen.classList.remove('active');

    renderQuestion();
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
    nextBtn.disabled = true;

    if (question.type === 'single') {
        renderSingleChoice(question);
    } else if (question.type === 'multiple') {
        renderMultipleChoice(question);
    } else if (question.type === 'dropdown') {
        renderDropdown(question);
    }
}

function renderSingleChoice(question) {
    question.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.onclick = () => selectSingle(index, btn);
        optionsContainer.appendChild(btn);
    });
}

function selectSingle(index, btn) {
    // Deselect all
    Array.from(optionsContainer.children).forEach(b => b.classList.remove('selected'));
    // Select clicked
    btn.classList.add('selected');

    // Save answer
    userAnswers[assignedQuestions[currentQuestionIndex].id] = index;
    nextBtn.disabled = false;
}

function renderMultipleChoice(question) {
    // For multiple choice, we initialize the answer array if not present
    const currentId = question.id;
    if (!userAnswers[currentId]) userAnswers[currentId] = [];

    question.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.onclick = () => toggleMultiple(index, btn, currentId);
        optionsContainer.appendChild(btn);
    });
}

function toggleMultiple(index, btn, questionId) {
    btn.classList.toggle('selected');

    const selectedIndices = userAnswers[questionId];
    if (btn.classList.contains('selected')) {
        selectedIndices.push(index);
    } else {
        const idx = selectedIndices.indexOf(index);
        if (idx > -1) selectedIndices.splice(idx, 1);
    }

    // Enable next if at least one selected (optional rule, but good UX)
    nextBtn.disabled = selectedIndices.length === 0;
}

function renderDropdown(question) {
    const select = document.createElement('select');
    select.className = 'quiz-select';

    const defaultOption = document.createElement('option');
    defaultOption.textContent = 'Alege un răspuns...';
    defaultOption.value = '';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    select.appendChild(defaultOption);

    question.options.forEach((opt, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = opt;
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

    // Collect all results first
    const results = [];

    assignedQuestions.forEach(q => {
        const userAnswer = userAnswers[q.id];
        let isCorrect = false;

        if (q.type === 'single' || q.type === 'dropdown') {
            if (userAnswer === q.correctAnswer) {
                isCorrect = true;
            }
        } else if (q.type === 'multiple') {
            const correct = [...q.correctAnswer].sort((a, b) => a - b);
            const user = (userAnswers[q.id] || []).sort((a, b) => a - b);

            if (JSON.stringify(correct) === JSON.stringify(user)) {
                isCorrect = true;
            }
        }

        if (isCorrect) score++;

        results.push({
            question: q,
            userAnswer: userAnswer,
            isCorrect: isCorrect
        });
    });

    // Sort: Correct answers first
    results.sort((a, b) => {
        if (a.isCorrect && !b.isCorrect) return -1;
        if (!a.isCorrect && b.isCorrect) return 1;
        return 0;
    });

    // Render all
    results.forEach(res => {
        const item = document.createElement('div');
        item.className = `review-item ${res.isCorrect ? 'correct' : 'wrong'}`;

        let userText = getUserAnswerText(res.question, res.userAnswer);
        let correctText = getCorrectAnswerText(res.question);

        item.innerHTML = `
            <div class="review-question">${res.question.question}</div>
            <div class="review-answer ${res.isCorrect ? 'review-correct' : 'review-wrong'}">Răspunsul tău: ${userText}</div>
            ${!res.isCorrect ? `<div class="review-answer review-correct">Răspuns corect: ${correctText}</div>` : ''}
        `;
        reviewList.appendChild(item);
    });

    // Always show container now
    reviewContainer.classList.remove('hidden');
}

function getUserAnswerText(q, answer) {
    if (answer === undefined || answer === null || (Array.isArray(answer) && answer.length === 0)) return "Niciun răspuns";

    if (q.type === 'single' || q.type === 'dropdown') {
        return q.options[answer];
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
    startQuiz();
}

// Load on start
loadQuestions();
