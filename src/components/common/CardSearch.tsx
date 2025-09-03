import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, FileText } from 'lucide-react';
import { CardSearchResult } from '../../types/api';
import apiService from '../../services/api';

interface CardSearchProps {
  onCardSelect: (card: CardSearchResult) => void;
}

const CardSearch: React.FC<CardSearchProps> = ({ onCardSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CardSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const performSearch = useCallback(async () => {
    if (query.length < 3) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.searchCards({
        query,
        page: 1,
        page_size: 10
      });

      setResults(response.cards);
      setIsOpen(true);
    } catch (error) {
      console.error('Ошибка поиска карточек:', error);
      setError('Ошибка поиска карточек');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Поиск с задержкой
  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, performSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleCardClick = (card: CardSearchResult) => {
    onCardSelect(card);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setError(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      {/* Поле поиска */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Поиск карточек..."
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm"
        />
        {query && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Результаты поиска */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto"></div>
              <p className="mt-2 text-sm">Поиск...</p>
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">
              <p className="text-sm">{error}</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">Карточки не найдены</p>
            </div>
          ) : (
            <div className="py-1">
              {results.map((card) => (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card)}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <FileText className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {card.title}
                        </h4>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                          {card.status_name}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-500 mb-2">
                        <span className="font-medium">{card.project_name}</span>
                        <span className="mx-1">•</span>
                        <span>{card.pipeline_name}</span>
                      </div>
                      
                      {card.match_fragment && (
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          <span className="font-medium">
                            {card.match_field === 'title' ? 'Название: ' : 'Описание: '}
                          </span>
                          <span dangerouslySetInnerHTML={{ 
                            __html: card.match_fragment.replace(
                              new RegExp(query, 'gi'), 
                              `<mark class="bg-yellow-200">$&</mark>`
                            )
                          }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CardSearch;
