import { useState, useEffect, useRef } from 'react';
import { t } from '../i18n';

const CATEGORY_COLORS = {
  dark: '#6b21a8',
  funny: '#ea580c',
  hidden: '#0d9488',
  legendary: '#ca8a04',
  weird: '#db2777',
};

const ANSWER_LETTERS = ['A', 'B', 'C', 'D'];
const TIMER_SECONDS = 20;

export default function QuizCard({ question, lang, onAnswer, onNext, questionNumber, streak, isLast }) {
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const startTime = useRef(Date.now());
  const timerRef = useRef(null);

  useEffect(() => {
    startTime.current = Date.now();
    setTimeLeft(TIMER_SECONDS);

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [question.id]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft === 0 && !revealed) {
      handleSelect(-1); // -1 = timed out
    }
  }, [timeLeft, revealed]);

  const handleSelect = (index) => {
    if (revealed) return;
    clearInterval(timerRef.current);
    setSelected(index);
    setRevealed(true);
    const elapsed = (Date.now() - startTime.current) / 1000;
    onAnswer(index, elapsed);
  };

  const categoryColor = CATEGORY_COLORS[question.category] || '#6366f1';
  const categoryLabels = t(lang, 'categoryLabels');
  const timerPct = (timeLeft / TIMER_SECONDS) * 100;
  const timerUrgent = timeLeft <= 5;

  return (
    <div className={`quiz-card animate-in ${revealed ? 'revealed' : ''}`}>
      {/* Timer bar */}
      <div className="timer-bar-track">
        <div
          className={`timer-bar-fill ${timerUrgent ? 'urgent' : ''}`}
          style={{ width: `${timerPct}%` }}
        />
      </div>

      <div className="quiz-card-body">
        <div className="quiz-card-top-row">
          <div className="quiz-card-meta">
            {question.category && (
              <span
                className="category-badge"
                style={{ backgroundColor: categoryColor }}
              >
                {categoryLabels?.[question.category] || question.category}
              </span>
            )}
            {question.year && <span className="year-badge">{question.year}</span>}
          </div>
          <div className="timer-display">
            <span className={`timer-number ${timerUrgent ? 'urgent' : ''}`}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {streak >= 3 && !revealed && (
          <div className="streak-badge animate-in">
            <span className="streak-fire">&#x1F525;</span>
            {t(lang, 'streak')(streak)}
          </div>
        )}

        <h3 className="quiz-question">{question.question}</h3>

        <div className="quiz-answers">
          {question.answers.map((answer, i) => {
            if (!answer) return null;
            let className = 'answer-btn';
            if (revealed) {
              if (i === question.correctAnswer) className += ' correct';
              else if (i === selected) className += ' wrong';
              else className += ' dimmed';
            }

            return (
              <button
                key={i}
                className={className}
                onClick={() => handleSelect(i)}
                disabled={revealed}
              >
                <span className="answer-letter">{ANSWER_LETTERS[i]}</span>
                <span className="answer-text">{answer}</span>
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className="quiz-fact animate-in">
            {selected === -1 && (
              <p className="timeout-label">{t(lang, 'timesUp')}</p>
            )}
            <p className="fact-label">{t(lang, 'didYouKnow')}</p>
            <p className="fact-text">{question.fact}</p>
            <button className="btn btn-next" onClick={onNext}>
              {isLast ? t(lang, 'seeResults') : t(lang, 'nextQuestion')} &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
