import { useEffect, useState } from 'react';

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createCategoryItem(name = '') {
  return {
    id: createId('cat'),
    name,
  };
}

function createFaqItem(categoryId = null) {
  return {
    id: createId('faq'),
    categoryId,
    question: '',
    answer: '',
  };
}

export function createFaqBotDraft(kodeId) {
  return {
    nama: '',
    kodeId,
    categories: [],
    faqs: [createFaqItem()],
  };
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function FaqBotBuilder({ draft, onChange, onSave, onClose }) {
  const [categoryDraft, setCategoryDraft] = useState('');
  const [selectedFaqId, setSelectedFaqId] = useState(draft.faqs[0]?.id ?? null);

  useEffect(() => {
    if (!draft.faqs.length) {
      setSelectedFaqId(null);
      return;
    }

    const stillExists = draft.faqs.some((item) => item.id === selectedFaqId);
    if (!stillExists) {
      setSelectedFaqId(draft.faqs[draft.faqs.length - 1].id);
    }
  }, [draft.faqs, selectedFaqId]);

  const selectedFaq = draft.faqs.find((item) => item.id === selectedFaqId);

  function getCategoryName(categoryId) {
    return draft.categories.find((item) => item.id === categoryId)?.name ?? '';
  }

  function updateField(field, value) {
    onChange({ ...draft, [field]: value });
  }

  function addCategory() {
    const name = categoryDraft.trim();
    if (!name) return;

    onChange({
      ...draft,
      categories: [...draft.categories, createCategoryItem(name)],
    });
    setCategoryDraft('');
  }

  function removeCategory(id) {
    onChange({
      ...draft,
      categories: draft.categories.filter((item) => item.id !== id),
      faqs: draft.faqs.map((item) => (
        item.categoryId === id ? { ...item, categoryId: null } : item
      )),
    });
  }

  function assignCategoryToSelectedFaq(categoryId) {
    if (!selectedFaqId) return;

    onChange({
      ...draft,
      faqs: draft.faqs.map((item) => (
        item.id === selectedFaqId ? { ...item, categoryId } : item
      )),
    });
  }

  function handleCategoryKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addCategory();
    }
  }

  function updateFaq(id, field, value) {
    onChange({
      ...draft,
      faqs: draft.faqs.map((item) => (
        item.id === id ? { ...item, [field]: value } : item
      )),
    });
  }

  function addFaq() {
    const newFaq = createFaqItem(draft.categories[0]?.id ?? null);
    onChange({
      ...draft,
      faqs: [...draft.faqs, newFaq],
    });
    setSelectedFaqId(newFaq.id);
  }

  function removeFaq(id) {
    if (draft.faqs.length <= 1) return;
    onChange({
      ...draft,
      faqs: draft.faqs.filter((item) => item.id !== id),
    });
  }

  return (
    <div className="faq-bot-builder">
      <header className="faq-bot-builder__header">
        <button
          type="button"
          className="faq-bot-builder__back"
          onClick={onClose}
          aria-label="Kembali"
        >
          &lt;
        </button>
        <h2 className="faq-bot-builder__title">Generate Bot FAQ</h2>
      </header>

      <div className="faq-bot-builder__body">
        <div className="faq-bot-builder__fields">
          <label className="faq-bot-field">
            <span className="faq-bot-field__label">Nama</span>
            <input
              type="text"
              className="faq-bot-field__input"
              placeholder="Nama bot FAQ"
              value={draft.nama}
              onChange={(e) => updateField('nama', e.target.value)}
            />
          </label>
          <label className="faq-bot-field">
            <span className="faq-bot-field__label">Kode Id</span>
            <input
              type="text"
              className="faq-bot-field__input faq-bot-field__input--readonly"
              value={draft.kodeId}
              readOnly
            />
          </label>
        </div>

        <p className="faq-bot-flow-hint">
          Alur bot: <strong>Kategorisasi</strong> → <strong>Pertanyaan umum</strong>
          {selectedFaq && (
            <span className="faq-bot-flow-hint__action">
              {' '}— Ketuk kategorisasi untuk FAQ yang dipilih
            </span>
          )}
        </p>

        <div className="faq-bot-section">
          <span className="faq-bot-section__title">Kategorisasi</span>

          <div className="faq-category-compose">
            <input
              type="text"
              className="faq-category-compose__input"
              placeholder="Contoh: Akun & Login"
              value={categoryDraft}
              onChange={(e) => setCategoryDraft(e.target.value)}
              onKeyDown={handleCategoryKeyDown}
              aria-label="Kategorisasi"
            />
            <button
              type="button"
              className="faq-category-compose__add"
              onClick={addCategory}
              disabled={!categoryDraft.trim()}
              aria-label="Tambah kategorisasi"
            >
              <PlusIcon />
            </button>
          </div>

          {draft.categories.length > 0 && (
            <ul className="faq-category-added">
              {draft.categories.map((item) => {
                const isActiveForSelectedFaq = selectedFaq?.categoryId === item.id;

                return (
                  <li
                    key={item.id}
                    className={`faq-category-added__item${isActiveForSelectedFaq ? ' faq-category-added__item--active' : ''}`}
                  >
                    <button
                      type="button"
                      className="faq-category-added__select"
                      onClick={() => assignCategoryToSelectedFaq(item.id)}
                      disabled={!selectedFaqId}
                      aria-pressed={isActiveForSelectedFaq}
                    >
                      {item.name}
                    </button>
                    <button
                      type="button"
                      className="faq-category-added__remove"
                      onClick={() => removeCategory(item.id)}
                      aria-label={`Hapus kategorisasi ${item.name}`}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="faq-bot-section faq-bot-section--faq">
          <div className="faq-bot-section__head">
            <button
              type="button"
              className="faq-bot-section__add"
              onClick={addFaq}
              aria-label="Tambah FAQ"
            >
              <PlusIcon />
            </button>
            <span className="faq-bot-section__title">Pertanyaan umum</span>
          </div>

          <div className="faq-bot-list">
            {draft.faqs.map((item, index) => {
              const categoryName = getCategoryName(item.categoryId);

              return (
              <article
                key={item.id}
                className={`faq-bot-card${item.id === selectedFaqId ? ' faq-bot-card--selected' : ''}`}
                onClick={() => setSelectedFaqId(item.id)}
              >
                <button
                  type="button"
                  className="faq-bot-card__remove"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeFaq(item.id);
                  }}
                  disabled={draft.faqs.length <= 1}
                  aria-label="Hapus FAQ"
                >
                  ×
                </button>

                <div className="faq-bot-card__meta">
                  <span className="faq-bot-card__question-title">
                    Pertanyaan umum #{index + 1}
                  </span>
                  <span className={`faq-bot-card__category-badge${categoryName ? '' : ' faq-bot-card__category-badge--empty'}`}>
                    {categoryName || 'Belum pilih kategorisasi'}
                  </span>
                </div>

                <label className="faq-bot-card__question-label">
                  <input
                    type="text"
                    className="faq-bot-card__question-input"
                    placeholder="Contoh: Bagaimana cara reset password?"
                    value={item.question}
                    onClick={(event) => event.stopPropagation()}
                    onFocus={() => setSelectedFaqId(item.id)}
                    onChange={(e) => updateFaq(item.id, 'question', e.target.value)}
                  />
                </label>

                <div className="faq-bot-card__answer">
                  <span className="faq-bot-card__answer-label">Jawaban</span>
                  <textarea
                    className="faq-bot-card__answer-input"
                    placeholder="Tulis jawaban untuk pertanyaan di atas..."
                    rows={3}
                    value={item.answer}
                    onClick={(event) => event.stopPropagation()}
                    onFocus={() => setSelectedFaqId(item.id)}
                    onChange={(e) => updateFaq(item.id, 'answer', e.target.value)}
                  />
                </div>
              </article>
              );
            })}
          </div>
        </div>
      </div>

      <footer className="faq-bot-builder__footer">
        <button
          type="button"
          className="faq-bot-builder__save"
          onClick={onSave}
          disabled={!draft.nama.trim()}
        >
          Simpan Bot FAQ
        </button>
      </footer>
    </div>
  );
}
