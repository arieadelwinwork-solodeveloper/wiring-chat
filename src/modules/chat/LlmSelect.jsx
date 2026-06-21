import { LLM_OPTIONS, isLlmAvailable } from './llmOptions';
import './LlmSelect.css';

export default function LlmSelect({ value, onChange, id }) {
  function handleSelect(optionValue) {
    if (isLlmAvailable(optionValue)) {
      onChange(optionValue);
    }
  }

  return (
    <div className="llm-card-grid" role="radiogroup" aria-labelledby={id}>
      {LLM_OPTIONS.map((option) => {
        const selected = value === option.value;
        const available = option.available;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={!available}
            disabled={!available}
            className={[
              'llm-card',
              available ? 'llm-card--available' : 'llm-card--unavailable',
              selected && available ? 'llm-card--selected' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => handleSelect(option.value)}
          >
            <span className="llm-card__label">{option.label}</span>
            {option.description && (
              <span className="llm-card__desc">{option.description}</span>
            )}
            <span className="llm-card__badge">
              {available ? (selected ? 'Dipilih' : 'Tersedia') : 'Belum tersedia'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
